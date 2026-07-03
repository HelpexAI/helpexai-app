import {
  getLLMProvider,
  getEmbeddingProvider,
  getVectorDBProvider,
} from "../factory";
import { generateNamespace } from "@/lib/utils";
import { CategorySlug, MessageSource, VectorSearchResult } from "@/types";
import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import { getProductForAccount } from "@/lib/products/catalog";
import type { Product } from "@/types";
import {
  formatWebContext,
  searchWeb,
  type WebSearchResult,
} from "../web-search";

const TOP_K = 5;
const FALLBACK_DOCUMENT_CHARACTER_LIMIT = 12_000;
const FALLBACK_TOTAL_CHARACTER_LIMIT = 30_000;
const MARKDOWN_RESPONSE_INSTRUCTION = `Format the answer as clean Markdown:
- Use short paragraphs and descriptive headings when helpful.
- Use bullet or numbered lists for multiple points.
- Use tables only when they make comparisons clearer.
- Use bold text sparingly for important facts.
- Do not wrap the entire answer in a code block.`;
const RETRIEVAL_METADATA_INSTRUCTION = `Use internal metadata such as category, collection, tags, and source type only to understand context and improve relevance.
Do not mention category, collection, tags, source type, source numbers, chunk numbers, vector scores, IDs, payload fields, or retrieval metadata in the final answer.
Cite document evidence using only the document name and page number when available.
Mention category, collection, or tags only if the user directly asks about document organization, classification, category, or tags.
Never say "Chunk 0", "Chunk 1", "Source 1", or similar internal references.
Give a natural user-facing answer.`;

function configuredScore(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface QueryOptions {
  userId: string;
  categorySlug: CategorySlug;
  question: string;
  selectedDocumentIds: string[];
  selectedKnowledgeItemIds?: string[];
  sourceTypes?: string[];
  externalResearchEnabled?: boolean;
}

export interface QueryResult {
  answer: string;
  sources: MessageSource[];
  answerType: "document" | "general_knowledge" | "off_topic";
  tokensUsed: number;
}

export interface RawDocumentContext {
  id: string;
  name: string;
  collectionName?: string;
  collectionContext?: string;
  tags?: string[];
  tagContext?: string;
  pages: Array<{ pageNumber: number | null; text: string }>;
}

function lexicalScore(question: string, text: string): number {
  const terms = new Set(
    question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  );
  const lowerText = text.toLowerCase();
  return [...terms].reduce(
    (score, term) => score + (lowerText.includes(term) ? 1 : 0),
    0,
  );
}

function getSystemPromptForQuery(
  product: Product,
  externalResearchEnabled: boolean,
): string {
  const categoryPrompt = product.system_prompt;
  if (!externalResearchEnabled) return categoryPrompt;
  return `${categoryPrompt}

EXTERNAL RESEARCH MODE:
- The user explicitly enabled External Research.
- If document context is supplied, it remains the primary source. Answer document-specific, keyword, definition, clause, party, amount, date, obligation, risk, or summary questions from the document context first.
- Use supplied live web research and reliable general knowledge only when the documents do not contain the answer or when the user asks for outside benchmarks, current market context, comparisons, or practical external implications.
- Cite web sources only for external context, and clearly separate them from document facts.
- Do not respond with the category's off-topic refusal while External Research is enabled.`;
}

function isOffTopic(question: string): boolean {
  const offTopicPatterns = [
    /^(hi|hello|hey|what's up|how are you)\b/i,
    /recipe|weather|sport|movie|music|celebrity/i,
    /write.*code|programming|javascript|python/i,
  ];
  return offTopicPatterns.some((p) => p.test(question));
}

function buildPromptWithContext(
  question: string,
  chunks: VectorSearchResult[],
  hasContext: boolean,
  categorySlug: CategorySlug,
  webResults: WebSearchResult[],
  externalResearchEnabled: boolean,
): string {
  const webContext = formatWebContext(webResults);
  if (!hasContext) {
    return `${externalResearchEnabled ? `The retrieved document snippets do not contain information directly relevant to this question. If selected documents are available, the application may retry with direct document text before using External Research. Only answer from External Research when no document context is supplied or the document context still does not answer the question, and clearly label it as outside context.` : `The selected documents do not contain enough relevant evidence to answer this question. Explain what information is missing and suggest turning on **External Research** for this conversation if the user wants current benchmarks or outside context.`}

    ${externalResearchEnabled ? `Use reliable general knowledge to answer. ${webContext ? `Use the live web research below when relevant and cite it with Markdown links.\n\nLIVE WEB RESEARCH:\n${webContext}` : "Clearly label estimates, benchmarks, and assumptions."}` : "Do not answer using outside knowledge or invent an estimate."}

    ${RETRIEVAL_METADATA_INSTRUCTION}

    ${MARKDOWN_RESPONSE_INSTRUCTION}

    User Question: ${question}`;
  }

  const contextBlock = chunks
    .map((chunk) => {
      const title =
        chunk.payload.itemTitle ?? chunk.payload.docName ?? "Knowledge Item";
      const sourceType = chunk.payload.sourceType ?? "document";
      return `<context_item>
<internal_metadata>
category: ${categorySlug}
source_type: ${sourceType}
collection: ${chunk.payload.collectionName ?? "Uncategorized"}
collection_context: ${chunk.payload.collectionContext ?? "Not provided"}
tags: ${chunk.payload.tags?.length ? chunk.payload.tags.join(", ") : "None"}
tag_context: ${chunk.payload.tagContext ?? "Not provided"}
</internal_metadata>

<citable_source>
document_name: ${title}
page: ${chunk.payload.pageNumber ?? "Not available"}
</citable_source>

<content>
${chunk.payload.text}
</content>
</context_item>`;
    })
    .join("\n\n");

  return `DOCUMENT CONTEXT:
    ${contextBlock}

    ${webContext ? `---\n\nLIVE WEB RESEARCH:\n${webContext}` : ""}

    ---

    User Question: ${question}

    Use the document context as the source of truth for the user's facts. For keyword, definition, clause, party, amount, date, obligation, risk, summary, or "what does this mean here" questions, answer from the document context before considering external sources. ${externalResearchEnabled ? "Use general professional knowledge and live web research only for outside benchmarks, estimates, comparisons, current market context, or practical implications that the document itself does not provide." : "Answer only from the document context. If outside context is needed, suggest turning on **External Research** instead of supplying it."} Never let external knowledge override, replace, or invent document facts.

    When external knowledge is relevant and genuinely adds value, separate the response into:
    - **Document evidence**
    - **External context or benchmark**
    - **Conclusion and assumptions**

    If the document context answers the question, do not lead with a generic internet definition. Cite document names/pages for document evidence. Cite live web sources using Markdown links only for external context. Clearly label estimates and uncertainty.

    ${RETRIEVAL_METADATA_INSTRUCTION}

    ${MARKDOWN_RESPONSE_INSTRUCTION}`;
}

export async function queryDocuments(
  options: QueryOptions,
): Promise<QueryResult> {
  const {
    userId,
    categorySlug,
    question,
    selectedDocumentIds,
    selectedKnowledgeItemIds = [],
    sourceTypes = [],
    externalResearchEnabled = false,
  } = options;
  const product = await getProductForAccount(categorySlug);

  // 1. Check for off-topic
  if (!externalResearchEnabled && isOffTopic(question)) {
    return {
      answer: product.off_topic_response,
      sources: [],
      answerType: "off_topic",
      tokensUsed: 0,
    };
  }

  // 2. Search document embeddings. External Research can still answer when
  // semantic search is temporarily unavailable.
  let results: VectorSearchResult[] = [];
  try {
    const embeddingProvider = getEmbeddingProvider();
    const queryVector = await embeddingProvider.embedText(question);
    const namespace = generateNamespace(userId, categorySlug);
    const vectorDB = getVectorDBProvider();
    const filter = selectedDocumentIds.length
      ? { key: "docId", match: { any: selectedDocumentIds } }
      : selectedKnowledgeItemIds.length
        ? { key: "itemId", match: { any: selectedKnowledgeItemIds } }
        : sourceTypes.length
          ? { key: "sourceType", match: { any: sourceTypes } }
          : undefined;
    results = await vectorDB.search(namespace, queryVector, TOP_K, filter);
  } catch (error) {
    if (!externalResearchEnabled) throw error;
    console.warn(
      "Semantic search unavailable; continuing with External Research.",
      error,
    );
  }

  const selectedContextThreshold = configuredScore(
    process.env.VECTOR_SELECTED_DOC_MIN_SCORE,
    0.3,
  );

  const globalContextThreshold = configuredScore(
    process.env.VECTOR_GLOBAL_MIN_SCORE,
    0.45,
  );

  const minScore =
    selectedDocumentIds.length > 0
      ? selectedContextThreshold
      : globalContextThreshold;

  const hasContext = results.length > 0 && results[0].score >= minScore;
  console.debug(
    JSON.stringify({
      level: "debug",
      message: "semantic_search_evaluated",
      resultCount: results.length,
      topScore: results[0]?.score ?? null,
      minScore,
      hasContext,
      selectedDocumentIds,
      selectedKnowledgeItemIds,
      sourceTypes,
    }),
  );

  if (
    results.length > 0 &&
    !hasContext &&
    selectedDocumentIds.length > 0 &&
    !externalResearchEnabled
  ) {
    return {
      answer: "",
      sources: [],
      answerType: "general_knowledge",
      tokensUsed: 0,
    };
  }

  // 4. Build prompt
  const webResults = externalResearchEnabled
    ? await searchWeb(question).catch(() => [])
    : [];
  const prompt = buildPromptWithContext(
    question,
    results,
    hasContext,
    categorySlug,
    webResults,
    externalResearchEnabled,
  );
  const systemPrompt = getSystemPromptForQuery(
    product,
    externalResearchEnabled,
  );

  // 5. Get LLM answer
  const llm = getLLMProvider();
  const answer = stripAiDisclaimer(await llm.complete(prompt, systemPrompt));

  // 6. Build sources array
  const sources: MessageSource[] = hasContext
    ? results.map((r) => ({
        // Current UI still consumes docId/docName. Prefer generic payloads,
        // while old document vectors remain fully compatible.
        docId: r.payload.docId ?? r.payload.itemId ?? r.payload.sourceId ?? "",
        docName: r.payload.docName ?? r.payload.itemTitle ?? "Knowledge Item",
        sourceType: r.payload.sourceType ?? "document",
        sourceId: r.payload.sourceId ?? r.payload.docId,
        itemId: r.payload.itemId ?? r.payload.docId,
        itemTitle: r.payload.itemTitle ?? r.payload.docName ?? "Knowledge Item",
        chunkIndex: r.payload.chunkIndex,
        pageNumber: r.payload.pageNumber,
        excerpt: r.payload.text.slice(0, 300),
      }))
    : [];

  return {
    answer,
    sources,
    answerType: hasContext ? "document" : "general_knowledge",
    tokensUsed: Math.ceil(answer.length / 4), // rough estimate
  };
}

export function isEmbeddingUnavailable(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /insufficientquota|insufficient_quota|quota|429|rate.?limit/i.test(
    message,
  );
}

export function isSemanticSearchUnavailable(error: unknown): boolean {
  if (isEmbeddingUnavailable(error)) return true;

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

  return /eai_again|fetch failed|failed to fetch|network|econn|enotfound|etimedout|timeout|socket|tls|certificate|qdrant|collection.*not found|404|401|403/i.test(
    values.join(" "),
  );
}

export async function queryDocumentsFromRawText(
  options: Pick<
    QueryOptions,
    "categorySlug" | "question" | "externalResearchEnabled"
  > & { documents: RawDocumentContext[] },
): Promise<QueryResult> {
  const { categorySlug, question, externalResearchEnabled = false } = options;
  const product = await getProductForAccount(categorySlug);
  if (!externalResearchEnabled && isOffTopic(question)) {
    return {
      answer: product.off_topic_response,
      sources: [],
      answerType: "off_topic",
      tokensUsed: 0,
    };
  }

  let remaining = FALLBACK_TOTAL_CHARACTER_LIMIT;
  const pages = options.documents
    .flatMap((document) =>
      document.pages.map((page) => ({
        ...page,
        docId: document.id,
        docName: document.name,
        collectionName: document.collectionName,
        collectionContext: document.collectionContext,
        tags: document.tags,
        tagContext: document.tagContext,
        score: lexicalScore(question, page.text),
      })),
    )
    .filter((page) => page.text.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((page) => {
      const text = page.text
        .trim()
        .slice(0, Math.min(FALLBACK_DOCUMENT_CHARACTER_LIMIT, remaining));
      remaining -= text.length;
      return { ...page, text };
    })
    .filter((page) => page.text.length > 0);

  if (!pages.length) {
    throw new Error("No readable text was found in the selected documents.");
  }

  const context = pages
    .map(
      (page) => `<context_item>
<internal_metadata>
category: ${categorySlug}
source_type: document
collection: ${page.collectionName ?? "Uncategorized"}
collection_context: ${page.collectionContext ?? "Not provided"}
tags: ${page.tags?.length ? page.tags.join(", ") : "None"}
tag_context: ${page.tagContext ?? "Not provided"}
</internal_metadata>

<citable_source>
document_name: ${page.docName}
page: ${page.pageNumber ?? "Not available"}
</citable_source>

<content>
${page.text}
</content>
</context_item>`,
    )
    .join("\n\n");
  const webResults = externalResearchEnabled
    ? await searchWeb(question).catch(() => [])
    : [];
  const webContext = formatWebContext(webResults);
  const prompt = `DOCUMENT CONTEXT:
${context}

${webContext ? `---\n\nLIVE WEB RESEARCH:\n${webContext}` : ""}

---

User Question: ${question}

Use document context as the source of truth for document facts. For keyword, definition, clause, party, amount, date, obligation, risk, summary, or "what does this mean here" questions, answer from the document context before considering external sources. ${externalResearchEnabled ? "Use reliable general knowledge and live web research only for outside benchmarks, estimates, current market context, comparisons, or practical context that the document itself does not provide. Separate document evidence from external context, cite document names/pages, link web sources only for external context, and clearly label assumptions." : "Answer only from the document context. If the documents cannot support the requested outside benchmark or estimate, suggest turning on **External Research** for this conversation."}

${RETRIEVAL_METADATA_INSTRUCTION}

${MARKDOWN_RESPONSE_INSTRUCTION}`;
  const answer = stripAiDisclaimer(
    await getLLMProvider().complete(
      prompt,
      getSystemPromptForQuery(product, externalResearchEnabled),
    ),
  );

  return {
    answer,
    sources: pages.map((page, index) => ({
      docId: page.docId,
      docName: page.docName,
      chunkIndex: index,
      pageNumber: page.pageNumber,
      excerpt: page.text.slice(0, 300),
    })),
    answerType: "document",
    tokensUsed: Math.ceil(answer.length / 4),
  };
}
