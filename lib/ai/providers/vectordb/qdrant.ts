import { QdrantClient } from '@qdrant/js-client-rest'
import { VectorDBProvider, VectorSearchResult } from '@/types'

export class QdrantProvider implements VectorDBProvider {
  private client: QdrantClient
  private collectionName: string
  private indexesReady: Promise<void> | null = null

  constructor() {
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY || !process.env.QDRANT_COLLECTION_NAME) {
      throw new Error('QDRANT_URL, QDRANT_API_KEY, and QDRANT_COLLECTION_NAME are required for semantic document indexing')
    }
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    })
    this.collectionName = process.env.QDRANT_COLLECTION_NAME
  }

  private async ensurePayloadIndexes(): Promise<void> {
    if (!this.indexesReady) {
      this.indexesReady = (async () => {
        const collection = await this.client.getCollection(this.collectionName)
        const schema = collection.payload_schema ?? {}
        for (const field of ['namespace', 'docId']) {
          if (!schema[field]) {
            await this.client.createPayloadIndex(this.collectionName, {
              wait: true,
              field_name: field,
              field_schema: 'keyword',
            })
          }
        }
      })().catch(error => {
        this.indexesReady = null
        throw error
      })
    }
    return this.indexesReady
  }

  async upsert(
    namespace: string,
    vectors: Array<{
      id: string
      vector: number[]
      payload: Record<string, unknown>
    }>
  ): Promise<void> {
    await this.ensurePayloadIndexes()
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
    await this.ensurePayloadIndexes()
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
    await this.ensurePayloadIndexes()
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
    await this.ensurePayloadIndexes()
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [{ key: 'namespace', match: { value: namespace } }],
      },
    })
  }
}
