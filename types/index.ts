// ─────────────────────────────────────────────
// HelpexAI — Shared TypeScript Types
// ─────────────────────────────────────────────

export type CategorySlug = 'legal' | 'business'

export type PlanSlug = 'free' | 'pro' | 'premium'

export type FileType = 'pdf' | 'docx' | 'txt'

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export type MessageRole = 'user' | 'assistant'

export type AnswerType = 'document' | 'general_knowledge' | 'off_topic'

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

// ── User & Account ────────────────────────────

export interface User {
  id: string
  email: string
  category_slug: CategorySlug
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  category_slug: CategorySlug
  plan: PlanSlug
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus | null
  deletion_requested_at: string | null
  created_at: string
  updated_at: string
}

// ── Documents ─────────────────────────────────

export interface Document {
  id: string
  user_id: string
  category_slug: CategorySlug
  name: string
  file_path: string
  file_size: number
  file_type: FileType
  status: DocumentStatus
  chunk_count: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface DocumentUploadInput {
  file: File
  category_slug: CategorySlug
}

// ── Conversations & Messages ──────────────────

export interface Conversation {
  id: string
  user_id: string
  category_slug: CategorySlug
  title: string
  selected_document_ids: string[]
  external_research_enabled: boolean
  created_at: string
  updated_at: string
}

export interface MessageSource {
  docId: string
  docName: string
  chunkIndex: number
  pageNumber: number | null
  excerpt: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  sources: MessageSource[] | null
  answer_type: AnswerType | null
  tokens_used: number | null
  created_at: string
}

export interface SendMessageInput {
  conversation_id: string
  content: string
  category_slug: CategorySlug
}

// ── Plans & Billing ───────────────────────────

export interface Plan {
  id: string
  name: string
  slug: PlanSlug
  category_slug: CategorySlug
  price_monthly: number // cents
  stripe_price_id: string | null
  max_documents: number
  max_queries_day: number
}

export interface UsageLog {
  id: string
  user_id: string
  category_slug: CategorySlug
  action: 'document_upload' | 'query' | 'document_delete'
  tokens_used: number | null
  created_at: string
}

// ── Usage Summary (computed) ──────────────────

export interface UsageSummary {
  documents_count: number
  documents_limit: number
  questions_today: number
  questions_limit: number
}

// ── AI Provider Interfaces ────────────────────

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimensions(): number
}

export interface LLMProvider {
  complete(prompt: string, systemPrompt: string): Promise<string>
}

export interface VectorSearchResult {
  id: string
  score: number
  payload: {
    docId: string
    chunkIndex: number
    pageNumber: number | null
    text: string
    docName: string
  }
}

export interface VectorDBProvider {
  upsert(
    namespace: string,
    vectors: Array<{
      id: string
      vector: number[]
      payload: Record<string, unknown>
    }>
  ): Promise<void>
  search(
    namespace: string,
    queryVector: number[],
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<VectorSearchResult[]>
  delete(namespace: string, ids: string[]): Promise<void>
  deleteByFilter(namespace: string, filter: Record<string, unknown>): Promise<void>
  deleteNamespace(namespace: string): Promise<void>
}

// ── API Response Wrappers ─────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
