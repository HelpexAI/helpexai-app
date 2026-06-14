// ─────────────────────────────────────────────
// HelpexAI — Shared TypeScript Types
// ─────────────────────────────────────────────

export type CategorySlug = string;

export interface ProductTheme {
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  soft: string;
  softDark: string;
  softForeground: string;
  softForegroundDark: string;
  border: string;
  borderDark: string;
}

export interface Product {
  slug: CategorySlug;
  name: string;
  short_name: string;
  description: string;
  hero_message: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  system_prompt: string;
  off_topic_response: string;
  disclaimer_text: string;
  theme: ProductTheme;
  marketing: Record<string, unknown>;
}

export type PlanSlug = "free" | "pro" | "premium";

export type FileType = "pdf" | "docx" | "txt";

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export type MessageRole = "user" | "assistant";

export type AnswerType = "document" | "general_knowledge" | "off_topic";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "trialing";

// ── User & Account ────────────────────────────

export interface User {
  id: string;
  email: string;
  category_slug: CategorySlug;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  category_slug: CategorySlug;
  plan: PlanSlug;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Documents ─────────────────────────────────

export interface Document {
  id: string;
  user_id: string;
  category_slug: CategorySlug;
  collection_id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: FileType;
  status: DocumentStatus;
  chunk_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  collection?: DocumentCollection | null;
  document_tag_assignments?: Array<{ tag: DocumentTag }>;
}

export interface DocumentCollection {
  id: string;
  category_slug: CategorySlug;
  name: string;
  description: string;
  ai_context: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface DocumentTag {
  id: string;
  category_slug: CategorySlug;
  name: string;
  description: string;
  ai_context: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface DocumentUploadInput {
  file: File;
  category_slug: CategorySlug;
  collection_id: string;
  tag_ids: string[];
}

// ── Conversations & Messages ──────────────────

export interface Conversation {
  id: string;
  user_id: string;
  category_slug: CategorySlug;
  title: string;
  selected_document_ids: string[];
  external_research_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageSource {
  docId: string;
  docName: string;
  chunkIndex: number;
  pageNumber: number | null;
  excerpt: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: MessageSource[] | null;
  answer_type: AnswerType | null;
  tokens_used: number | null;
  created_at: string;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  category_slug: CategorySlug;
}

// ── Plans & Billing ───────────────────────────

export interface Plan {
  id: string;
  name: string;
  slug: PlanSlug;
  category_slug: CategorySlug;
  price_monthly: number; // cents
  stripe_price_id?: string | null;
  max_storage_bytes: number;
  max_queries_day: number;
  max_reports_month: number;
  creem_prod_id: string | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  category_slug: CategorySlug;
  action: "document_upload" | "query" | "document_delete" | "report_generate";
  tokens_used: number | null;
  created_at: string;
}

// ── Usage Summary (computed) ──────────────────

export interface UsageSummary {
  documents_count: number;
  documents_limit: number;
  questions_today: number;
  questions_limit: number;
}

// ── AI Provider Interfaces ────────────────────

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export interface LLMProvider {
  complete(prompt: string, systemPrompt: string): Promise<string>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: {
    docId: string;
    chunkIndex: number;
    pageNumber: number | null;
    text: string;
    docName: string;
    collectionName?: string;
    collectionContext?: string;
    tags?: string[];
    tagContext?: string;
  };
}

export interface VectorDBProvider {
  upsert(
    namespace: string,
    vectors: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }>,
  ): Promise<void>;
  search(
    namespace: string,
    queryVector: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;
  delete(namespace: string, ids: string[]): Promise<void>;
  deleteByFilter(
    namespace: string,
    filter: Record<string, unknown>,
  ): Promise<void>;
  deleteNamespace(namespace: string): Promise<void>;
}

// ── API Response Wrappers ─────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Reports ───────────────────────────────────

export type ReportStatus =
  | "draft"
  | "generating"
  | "completed"
  | "finalized"
  | "failed";

export type ReportSourceType = "documents" | "collection" | "mixed";

export type ReportTemplateVisibility = "public" | "admin" | "private";

export type ReportTemplateStatus = "draft" | "active" | "archived";

export type ReportTemplateType =
  | "business"
  | "legal"
  | "financial"
  | "operations"
  | "custom";

export interface ReportTemplate {
  id: string;
  category_slug: CategorySlug;

  slug: string;
  name: string;
  description: string | null;
  icon: string | null;

  type: ReportTemplateType;

  goal: string;
  system_prompt: string;
  user_prompt_template: string;

  required_sections: string[];
  output_schema: Record<string, unknown>;
  writing_style: Record<string, unknown>;

  model: string | null;
  temperature: number | null;
  max_documents: number | null;
  max_context_chunks: number | null;

  visibility: ReportTemplateVisibility;
  status: ReportTemplateStatus;
  min_plan: PlanSlug;

  sort_order: number;

  created_by: string | null;
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;

  user_id: string;
  account_id: string | null;
  category_slug: CategorySlug;

  title: string;
  prompt: string;

  template_id: string | null;
  template_slug: string | null;
  template_snapshot: Record<string, unknown>;

  content: string | null;
  content_format: "markdown";

  status: ReportStatus;

  source_type: ReportSourceType;
  collection_id: string | null;

  generated_document_id: string | null;
  current_version_id: string | null;

  model: string | null;
  error_message: string | null;

  metadata: Record<string, unknown>;

  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSource {
  id: string;
  report_id: string;
  document_id: string;
  created_at: string;
}
