import { QdrantClient } from "@qdrant/js-client-rest";
import { VectorDBProvider, VectorSearchResult } from "@/types";

const TEMPORARY_QDRANT_ERROR =
  /eai_again|fetch failed|failed to fetch|etimedout|timeout|econnreset|enotfound/i;
const QDRANT_RETRY_DELAY_MS = 250;
const QDRANT_DEFAULT_TIMEOUT_MS = 30_000;
const QDRANT_DEFAULT_UPSERT_BATCH_SIZE = 100;

function isTemporaryQdrantError(error: unknown): boolean {
  const values: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      values.push(current.name, current.message);
      current = current.cause;
    } else {
      values.push(String(current));
      break;
    }
  }

  return TEMPORARY_QDRANT_ERROR.test(values.join(" "));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export class QdrantProvider implements VectorDBProvider {
  private client: QdrantClient;
  private collectionName: string;
  private indexesReady: Promise<void> | null = null;

  constructor() {
    if (
      !process.env.QDRANT_URL ||
      !process.env.QDRANT_API_KEY ||
      !process.env.QDRANT_COLLECTION_NAME
    ) {
      throw new Error(
        "QDRANT_URL, QDRANT_API_KEY, and QDRANT_COLLECTION_NAME are required for semantic document indexing",
      );
    }
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      // The compatibility probe is an extra network request on every client
      // creation. Semantic operations already surface actionable errors.
      checkCompatibility: false,
      timeout: Number(process.env.QDRANT_TIMEOUT_MS ?? QDRANT_DEFAULT_TIMEOUT_MS),
    });
    this.collectionName = process.env.QDRANT_COLLECTION_NAME;
  }

  private async run<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (attempt === 2 || !isTemporaryQdrantError(error)) break;
        await wait(QDRANT_RETRY_DELAY_MS);
      }
    }

    const cause = lastError instanceof Error
      ? ` Cause: ${lastError.message}${lastError.cause ? ` ${String(lastError.cause)}` : ""}`
      : "";
    throw new Error(
      `Qdrant ${operation} failed for collection "${this.collectionName}".${cause}`,
      { cause: lastError },
    );
  }

  private async ensurePayloadIndexes(): Promise<void> {
    if (!this.indexesReady) {
      this.indexesReady = (async () => {
        const collection = await this.run("collection lookup", () =>
          this.client.getCollection(this.collectionName),
        );
        const schema = collection.payload_schema ?? {};
        for (const field of [
          "namespace",
          "docId",
          "sourceType",
          "sourceId",
          "itemId",
        ]) {
          if (!schema[field]) {
            await this.run(`payload index creation (${field})`, () =>
              this.client.createPayloadIndex(this.collectionName, {
                wait: true,
                field_name: field,
                field_schema: "keyword",
              }),
            );
          }
        }
      })().catch((error) => {
        this.indexesReady = null;
        throw error;
      });
    }
    return this.indexesReady;
  }

  async upsert(
    namespace: string,
    vectors: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const points = vectors.map((v) => ({
      id: v.id,
      vector: v.vector,
      payload: { ...v.payload, namespace },
    }));

    const batchSize = Math.max(
      1,
      Number(
        process.env.QDRANT_UPSERT_BATCH_SIZE ??
          QDRANT_DEFAULT_UPSERT_BATCH_SIZE,
      ),
    );

    for (const [batchIndex, batch] of chunkArray(points, batchSize).entries()) {
      await this.run(`upsert batch ${batchIndex + 1}`, () =>
        this.client.upsert(this.collectionName, {
          wait: true,
          points: batch,
        }),
      );
    }
    void this.ensurePayloadIndexes().catch((error) => {
      console.warn("Qdrant payload index setup failed after upsert.", error);
    });
  }

  async search(
    namespace: string,
    queryVector: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const results = await this.run("search", () =>
      this.client.search(this.collectionName, {
        vector: queryVector,
        limit: topK,
        filter: {
          must: [
            { key: "namespace", match: { value: namespace } },
            ...(filter ? [filter] : []),
          ],
        },
        with_payload: true,
      }),
    );

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload as VectorSearchResult["payload"],
    }));
  }

  async delete(namespace: string, ids: string[]): Promise<void> {
    await this.run("point deletion", () =>
      this.client.delete(this.collectionName, {
        wait: true,
        points: ids,
      }),
    );
  }

  async deleteByFilter(
    namespace: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    // Filtered cleanup is part of the indexing flow and strict-mode Qdrant
    // collections require these payload indexes before filtered updates.
    await this.ensurePayloadIndexes();
    await this.run("filtered deletion", () =>
      this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: "namespace", match: { value: namespace } }, filter],
        },
      }),
    );
  }

  async deleteNamespace(namespace: string): Promise<void> {
    await this.ensurePayloadIndexes();
    await this.run("namespace deletion", () =>
      this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: "namespace", match: { value: namespace } }],
        },
      }),
    );
  }
}
