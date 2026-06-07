import { getLLMProvider, getEmbeddingProvider, getVectorDBProvider } from '../factory'
import { generateNamespace } from '@/lib/utils'
import { CategorySlug, MessageSource, VectorSearchResult } from '@/types'
import {
  LEGAL_SYSTEM_PROMPT,
  LEGAL_NO_CONTEXT_NOTE,
  LEGAL_OFF_TOPIC_RESPONSE,
} from '../prompts/legal'
import {
  BUSINESS_SYSTEM_PROMPT,
  BUSINESS_NO_CONTEXT_NOTE,
  BUSINESS_OFF_TOPIC_RESPONSE,
} from '../prompts/business'

const TOP_K = 5

export interface QueryOptions {
  userId: string
  categorySlug: CategorySlug
  question: string
  selectedDocumentIds: string[]
}

export interface QueryResult {
  answer: string
  sources: MessageSource[]
  answerType: 'document' | 'general_knowledge' | 'off_topic'
  tokensUsed: number
}

function getSystemPrompt(categorySlug: CategorySlug): string {
  return categorySlug === 'legal' ? LEGAL_SYSTEM_PROMPT : BUSINESS_SYSTEM_PROMPT
}

function getOffTopicResponse(categorySlug: CategorySlug): string {
  return categorySlug === 'legal' ? LEGAL_OFF_TOPIC_RESPONSE : BUSINESS_OFF_TOPIC_RESPONSE
}

function getNoContextNote(categorySlug: CategorySlug): string {
  return categorySlug === 'legal' ? LEGAL_NO_CONTEXT_NOTE : BUSINESS_NO_CONTEXT_NOTE
}

function isOffTopic(question: string): boolean {
  const offTopicPatterns = [
    /^(hi|hello|hey|what's up|how are you)/i,
    /recipe|weather|sport|movie|music|celebrity/i,
    /write.*code|programming|javascript|python/i,
  ]
  return offTopicPatterns.some(p => p.test(question))
}

function buildPromptWithContext(
  question: string,
  chunks: VectorSearchResult[],
  hasContext: boolean,
  categorySlug: CategorySlug
): string {
  if (!hasContext) {
    return `${getNoContextNote(categorySlug)}\n\nUser Question: ${question}`
  }

  const contextBlock = chunks
    .map((chunk, i) =>
      `[Source ${i + 1}] Document: "${chunk.payload.docName}" | Chunk ${chunk.payload.chunkIndex}${chunk.payload.pageNumber ? ` | Page ${chunk.payload.pageNumber}` : ''}\n${chunk.payload.text}`
    )
    .join('\n\n---\n\n')

  return `DOCUMENT CONTEXT:\n${contextBlock}\n\n---\n\nUser Question: ${question}\n\nAnswer based ONLY on the document context above. Cite specific sources (document name, clause, page) in your answer.`
}

export async function queryDocuments(options: QueryOptions): Promise<QueryResult> {
  const { userId, categorySlug, question, selectedDocumentIds } = options

  // 1. Check for off-topic
  if (isOffTopic(question)) {
    return {
      answer: getOffTopicResponse(categorySlug),
      sources: [],
      answerType: 'off_topic',
      tokensUsed: 0,
    }
  }

  // 2. Embed the question
  const embeddingProvider = getEmbeddingProvider()
  const queryVector = await embeddingProvider.embedText(question)

  // 3. Search Qdrant
  const namespace = generateNamespace(userId, categorySlug)
  const vectorDB = getVectorDBProvider()

  const filter = selectedDocumentIds.length > 0
    ? { key: 'payload.docId', match: { any: selectedDocumentIds } }
    : undefined

  const results = await vectorDB.search(namespace, queryVector, TOP_K, filter)

  const hasContext = results.length > 0 && results[0].score > 0.5

  // 4. Build prompt
  const prompt = buildPromptWithContext(question, results, hasContext, categorySlug)
  const systemPrompt = getSystemPrompt(categorySlug)

  // 5. Get LLM answer
  const llm = getLLMProvider()
  const answer = await llm.complete(prompt, systemPrompt)

  // 6. Build sources array
  const sources: MessageSource[] = hasContext
    ? results.map(r => ({
        docId: r.payload.docId,
        docName: r.payload.docName,
        chunkIndex: r.payload.chunkIndex,
        pageNumber: r.payload.pageNumber,
        excerpt: r.payload.text.slice(0, 300),
      }))
    : []

  return {
    answer,
    sources,
    answerType: hasContext ? 'document' : 'general_knowledge',
    tokensUsed: Math.ceil(answer.length / 4), // rough estimate
  }
}
