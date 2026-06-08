import { getLLMProvider, getEmbeddingProvider, getVectorDBProvider } from '../factory'
import { generateNamespace } from '@/lib/utils'
import { CategorySlug, MessageSource, VectorSearchResult } from '@/types'
import { stripAiDisclaimer } from '@/lib/ai/disclaimer'
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
const FALLBACK_DOCUMENT_CHARACTER_LIMIT = 12_000
const FALLBACK_TOTAL_CHARACTER_LIMIT = 30_000
const MARKDOWN_RESPONSE_INSTRUCTION = `Format the answer as clean Markdown:
- Use short paragraphs and descriptive headings when helpful.
- Use bullet or numbered lists for multiple points.
- Use tables only when they make comparisons clearer.
- Use bold text sparingly for important facts.
- Do not wrap the entire answer in a code block.`

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

export interface RawDocumentContext {
  id: string
  name: string
  pages: Array<{ pageNumber: number | null; text: string }>
}

function lexicalScore(question: string, text: string): number {
  const terms = new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])
  const lowerText = text.toLowerCase()
  return [...terms].reduce((score, term) => score + (lowerText.includes(term) ? 1 : 0), 0)
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
    return `${getNoContextNote(categorySlug)}\n\n${MARKDOWN_RESPONSE_INSTRUCTION}\n\nUser Question: ${question}`
  }

  const contextBlock = chunks
    .map((chunk, i) =>
      `[Source ${i + 1}] Document: "${chunk.payload.docName}" | Chunk ${chunk.payload.chunkIndex}${chunk.payload.pageNumber ? ` | Page ${chunk.payload.pageNumber}` : ''}\n${chunk.payload.text}`
    )
    .join('\n\n---\n\n')

  return `DOCUMENT CONTEXT:\n${contextBlock}\n\n---\n\nUser Question: ${question}\n\nAnswer based ONLY on the document context above. Cite specific sources (document name, clause, page) in your answer.\n\n${MARKDOWN_RESPONSE_INSTRUCTION}`
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
    ? { key: 'docId', match: { any: selectedDocumentIds } }
    : undefined

  const results = await vectorDB.search(namespace, queryVector, TOP_K, filter)

  const hasContext = results.length > 0 && results[0].score > 0.5

  // 4. Build prompt
  const prompt = buildPromptWithContext(question, results, hasContext, categorySlug)
  const systemPrompt = getSystemPrompt(categorySlug)

  // 5. Get LLM answer
  const llm = getLLMProvider()
  const answer = stripAiDisclaimer(await llm.complete(prompt, systemPrompt))

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

export function isEmbeddingUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /insufficientquota|insufficient_quota|quota|429|rate.?limit/i.test(message)
}

export async function queryDocumentsFromRawText(
  options: Pick<QueryOptions, 'categorySlug' | 'question'> & { documents: RawDocumentContext[] },
): Promise<QueryResult> {
  const { categorySlug, question } = options
  if (isOffTopic(question)) {
    return {
      answer: getOffTopicResponse(categorySlug),
      sources: [],
      answerType: 'off_topic',
      tokensUsed: 0,
    }
  }

  let remaining = FALLBACK_TOTAL_CHARACTER_LIMIT
  const pages = options.documents
    .flatMap(document => document.pages.map(page => ({
      ...page,
      docId: document.id,
      docName: document.name,
      score: lexicalScore(question, page.text),
    })))
    .filter(page => page.text.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(page => {
      const text = page.text.trim().slice(0, Math.min(FALLBACK_DOCUMENT_CHARACTER_LIMIT, remaining))
      remaining -= text.length
      return { ...page, text }
    })
    .filter(page => page.text.length > 0)

  if (!pages.length) {
    throw new Error('No readable text was found in the selected documents.')
  }

  const context = pages
    .map((page, index) => `[Source ${index + 1}] Document: "${page.docName}"${page.pageNumber ? ` | Page ${page.pageNumber}` : ''}\n${page.text}`)
    .join('\n\n---\n\n')
  const prompt = `DOCUMENT CONTEXT:\n${context}\n\n---\n\nUser Question: ${question}\n\nAnswer based ONLY on the document context above. Cite document names and page numbers when available.\n\n${MARKDOWN_RESPONSE_INSTRUCTION}`
  const answer = stripAiDisclaimer(await getLLMProvider().complete(prompt, getSystemPrompt(categorySlug)))

  return {
    answer,
    sources: pages.map((page, index) => ({
      docId: page.docId,
      docName: page.docName,
      chunkIndex: index,
      pageNumber: page.pageNumber,
      excerpt: page.text.slice(0, 300),
    })),
    answerType: 'document',
    tokensUsed: Math.ceil(answer.length / 4),
  }
}
