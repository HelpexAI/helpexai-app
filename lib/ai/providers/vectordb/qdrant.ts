import { QdrantClient } from '@qdrant/js-client-rest'
import { VectorDBProvider, VectorSearchResult } from '@/types'

export class QdrantProvider implements VectorDBProvider {
  private client: QdrantClient
  private collectionName: string

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    })
    this.collectionName = process.env.QDRANT_COLLECTION_NAME!
  }

  async upsert(
    namespace: string,
    vectors: Array<{
      id: string
      vector: number[]
      payload: Record<string, unknown>
    }>
  ): Promise<void> {
    const points = vectors.map(v => ({
      id: v.id,
      vector: v.vector,
      payload: { ...v.payload, namespace },
    }))

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    })
  }

  async search(
    namespace: string,
    queryVector: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<VectorSearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: queryVector,
      limit: topK,
      filter: {
        must: [
          { key: 'namespace', match: { value: namespace } },
          ...(filter ? [filter] : []),
        ],
      },
      with_payload: true,
    })

    return results.map(r => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload as VectorSearchResult['payload'],
    }))
  }

  async delete(namespace: string, ids: string[]): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids,
    })
  }

  async deleteByFilter(namespace: string, filter: Record<string, unknown>): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'namespace', match: { value: namespace } },
          filter,
        ],
      },
    })
  }

  async deleteNamespace(namespace: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [{ key: 'namespace', match: { value: namespace } }],
      },
    })
  }
}
