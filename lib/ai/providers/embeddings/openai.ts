import { OpenAIEmbeddings } from '@langchain/openai'
import { EmbeddingProvider } from '@/types'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private model: OpenAIEmbeddings
  private dimensions = 1536

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for semantic document indexing')
    }
    this.model = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
      dimensions: this.dimensions,
    })
  }

  async embedText(text: string): Promise<number[]> {
    return this.model.embedQuery(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.model.embedDocuments(texts)
  }

  getDimensions(): number {
    return this.dimensions
  }
}
