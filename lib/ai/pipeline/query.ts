import { getLLMProvider, getEmbeddingProvider, getVectorDBProvider } from '../factory'
import { generateNamespace } from '@/lib/utils'
import { CategorySlug, MessageSource, VectorSearchResult } from '@/types'
import { stripAiDisclaimer } from '@/lib/ai/disclaimer'
import { getProductForAccount } from '@/lib/products/catalog'
import type { Product } from '@/types'
import { formatWebContext, searchWeb, type WebSearchResult } from '../web-search'

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
  externalResearchEnabled?: boolean
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

function getSystemPromptForQuery(product: Product, externalResearchEnabled: boolean): string {
  const categoryPrompt = product.system_prompt
  if (!externalResearchEnabled) return categoryPrompt
  return `${categoryPrompt}

EXTERNAL RESEARCH MODE:
- The user explicitly enabled External Research.
- Answer relevant questions even when they are outside the workspace category or not covered by the documents.
- Use supplied live web research and reliable general knowledge, cite web sources, and distinguish outside context from document facts.
- Do not respond with the category's off-topic refusal while External Research is enabled.`
}

function isOffTopic(question: string): boolean {
  const offTopicPatterns = [
    /^(hi|hello|hey|what's up|how are you)\b/i,
    /recipe|weather|sport|movie|music|celebrity/i,
    /write.*code|programming|javascript|python/i,
  ]
  return offTopicPatterns.some(p => p.test(question))
}

function buildPromptWithContext(
  question: string,
  chunks: VectorSearchResult[],
  hasContext: boolean,
  categorySlug: CategorySlug,
  webResults: WebSearchResult[],
  externalResearchEnabled: boolean,
): string {
  const webContext = formatWebContext(webResults)
  if (!hasContext) {
    return `${externalResearchEnabled ? `The selected documents do not contain information directly relevant to this question, so answer using External Research and clearly label it as outside context.` : `The selected documents do not contain enough relevant evidence to answer this question. Explain what information is missing and suggest turning on **External Research** for this conversation if the user wants current benchmarks or outside context.`}

${externalResearchEnabled ? `Use reliable general knowledge to answer. ${webContext ? `Use the live web research below when relevant and cite it with Markdown links.\n\nLIVE WEB RESEARCH:\n${webContext}` : 'Clearly label estimates, benchmarks, and assumptions.'}` : 'Do not answer using outside knowledge or invent an estimate.'}

${MARKDOWN_RESPONSE_INSTRUCTION}

User Question: ${question}`
  }

  const contextBlock = chunks
    .map((chunk, i) =>
      `[Source ${i + 1}] Document: "${chunk.payload.docName}" | Chunk ${chunk.payload.chunkIndex}${chunk.payload.pageNumber ? ` | Page ${chunk.payload.pageNumber}` : ''}\n${chunk.payload.text}`
    )
    .join('\n\n---\n\n')

  return `DOCUMENT CONTEXT:
${contextBlock}

${webContext ? `---\n\nLIVE WEB RESEARCH:\n${webContext}` : ''}

---

User Question: ${question}

Use the document context as the source of truth for the user's facts. ${externalResearchEnabled ? 'You may use general professional knowledge and the live web research to provide benchmarks, estimates, comparisons, or practical context.' : 'Answer only from the document context. If outside context is needed, suggest turning on **External Research** instead of supplying it.'} Never let external knowledge override or invent document facts.

When external knowledge is relevant, separate the response into:
- **Document evidence**
- **External context or benchmark**
- **Conclusion and assumptions**

Cite document names/pages for document evidence. Cite live web sources using Markdown links. Clearly label estimates and uncertainty.

${MARKDOWN_RESPONSE_INSTRUCTION}`
}

export async function queryDocuments(options: QueryOptions): Promise<QueryResult> {
  const { userId, categorySlug, question, selectedDocumentIds, externalResearchEnabled = false } = options
  const product = await getProductForAccount(categorySlug)

  // 1. Check for off-topic
  if (!externalResearchEnabled && isOffTopic(question)) {
    return {
      answer: product.off_topic_response,
      sources: [],
      answerType: 'off_topic',
      tokensUsed: 0,
    }
  }

  // 2. Search document embeddings. External Research can still answer when
  // semantic search is temporarily unavailable.
  let results: VectorSearchResult[] = []
  try {
    const embeddingProvider = getEmbeddingProvider()
    const queryVector = await embeddingProvider.embedText(question)
    const namespace = generateNamespace(userId, categorySlug)
    const vectorDB = getVectorDBProvider()
    const filter = selectedDocumentIds.length > 0
      ? { key: 'docId', match: { any: selectedDocumentIds } }
      : undefined
    results = await vectorDB.search(namespace, queryVector, TOP_K, filter)
  } catch (error) {
    if (!externalResearchEnabled) throw error
    console.warn('Semantic search unavailable; continuing with External Research.', error)
  }

  const hasContext = results.length > 0 && results[0].score > 0.5

  // 4. Build prompt
  const webResults = externalResearchEnabled ? await searchWeb(question).catch(() => []) : []
  const prompt = buildPromptWithContext(question, results, hasContext, categorySlug, webResults, externalResearchEnabled)
  const systemPrompt = getSystemPromptForQuery(product, externalResearchEnabled)

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
  options: Pick<QueryOptions, 'categorySlug' | 'question' | 'externalResearchEnabled'> & { documents: RawDocumentContext[] },
): Promise<QueryResult> {
  const { categorySlug, question, externalResearchEnabled = false } = options
  const product = await getProductForAccount(categorySlug)
  if (!externalResearchEnabled && isOffTopic(question)) {
    return {
      answer: product.off_topic_response,
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
  const webResults = externalResearchEnabled ? await searchWeb(question).catch(() => []) : []
  const webContext = formatWebContext(webResults)
  const prompt = `DOCUMENT CONTEXT:
${context}

${webContext ? `---\n\nLIVE WEB RESEARCH:\n${webContext}` : ''}

---

User Question: ${question}

Use document context as the source of truth for document facts. ${externalResearchEnabled ? 'You may use reliable general knowledge and live web research for benchmarks, estimates, and practical context. Separate document evidence from external context, cite document names/pages, link web sources, and clearly label assumptions.' : 'Answer only from the document context. If the documents cannot support the requested outside benchmark or estimate, suggest turning on **External Research** for this conversation.'}

${MARKDOWN_RESPONSE_INSTRUCTION}`
  const answer = stripAiDisclaimer(await getLLMProvider().complete(prompt, getSystemPromptForQuery(product, externalResearchEnabled)))

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
