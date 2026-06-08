import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/003_alpha_hardening.sql", import.meta.url), "utf8");
const initialMigration = await readFile(new URL("../supabase/migrations/001_initial_schema.sql", import.meta.url), "utf8");
const callback = await readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
const messages = await readFile(new URL("../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
const pricingMigration = await readFile(new URL("../supabase/migrations/004_three_tier_pricing.sql", import.meta.url), "utf8");
const plans = await readFile(new URL("../lib/stripe/plans.ts", import.meta.url), "utf8");
const publicToolMigration = await readFile(new URL("../supabase/migrations/005_public_tool.sql", import.meta.url), "utf8");
const publicQuestionRoute = await readFile(new URL("../app/api/public-tool/question/route.ts", import.meta.url), "utf8");
const publicToolRoute = await readFile(new URL("../app/api/public-tool/route.ts", import.meta.url), "utf8");
const publicToolReservationFix = await readFile(new URL("../supabase/migrations/006_fix_public_tool_question_reservation.sql", import.meta.url), "utf8");
const platformKnowledge = await readFile(new URL("../lib/ai/knowledge/helpexai-platform.ts", import.meta.url), "utf8");
const publicQuery = await readFile(new URL("../lib/ai/public-query.ts", import.meta.url), "utf8");
const legalPrompt = await readFile(new URL("../lib/ai/prompts/legal.ts", import.meta.url), "utf8");
const businessPrompt = await readFile(new URL("../lib/ai/prompts/business.ts", import.meta.url), "utf8");
const ingestion = await readFile(new URL("../lib/ai/pipeline/ingest.ts", import.meta.url), "utf8");
const queryPipeline = await readFile(new URL("../lib/ai/pipeline/query.ts", import.meta.url), "utf8");
const activeConversation = await readFile(new URL("../components/conversations/active-conversation.tsx", import.meta.url), "utf8");
const citationPanel = await readFile(new URL("../components/conversations/citation-preview-panel.tsx", import.meta.url), "utf8");
const documentViewerPage = await readFile(new URL("../app/(dashboard)/documents/[id]/page.tsx", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
const publicToolClient = await readFile(new URL("../components/public-tool/public-document-tool.tsx", import.meta.url), "utf8");
const openAIEmbeddings = await readFile(new URL("../lib/ai/providers/embeddings/openai.ts", import.meta.url), "utf8");
const qdrantProvider = await readFile(new URL("../lib/ai/providers/vectordb/qdrant.ts", import.meta.url), "utf8");

test("account protected writes are revoked from authenticated clients", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "Users can update own accounts"/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON accounts/);
  assert.doesNotMatch(initialMigration, /CREATE POLICY "Users can update own accounts"/);
});

test("fresh migration defines conversations.is_locked once", () => {
  assert.equal((initialMigration.match(/is_locked\s+BOOLEAN/g) ?? []).length, 1);
});

test("auth callback rejects protocol-relative redirects", () => {
  assert.match(callback, /!next\.startsWith\("\/\/"\)/);
});

test("successful query usage is reserved atomically", () => {
  assert.match(messages, /reserve_daily_query/);
  assert.match(messages, /request_id/);
  assert.match(messages, /Semantic search returned no grounded context/);
  assert.match(messages, /querySelectedDocumentsDirectly/);
});

test("three-tier pricing is consistent in code and migration", () => {
  assert.match(pricingMigration, /'Premium', 'premium', 'legal', 4900, NULL, 100, 100/);
  assert.match(pricingMigration, /'Pro', 'pro', 'business', 2900, NULL, 30, 30/);
  assert.match(plans, /max_documents: 3/);
  assert.match(plans, /max_queries_day: 100/);
});

test("public tool enforces one email trial and five atomic answers", () => {
  assert.match(publicToolMigration, /email_hash TEXT NOT NULL UNIQUE/);
  assert.match(publicToolMigration, /questions_used >= 5/);
  assert.match(publicQuestionRoute, /reserve_public_tool_question/);
  assert.match(publicQuestionRoute, /release_public_tool_question/);
  assert.match(publicToolReservationFix, /session\.questions_used \+ 1/);
  assert.match(publicToolRoute, /public-tool-upload-attempt:v2/);
  assert.match(publicToolRoute, /PUBLIC_TOOL_DATABASE_UNAVAILABLE/);
});

test("public tool can answer HelpexAI platform questions without document citations", () => {
  assert.match(platformKnowledge, /Free: \$0 forever, up to 3 documents, up to 5 questions per day/);
  assert.match(platformKnowledge, /Premium: \$49 per month, up to 100 documents/);
  assert.match(publicQuery, /isHelpexAIPlatformQuestion/);
  assert.match(publicQuery, /sources: \[\]/);
});

test("category personas enforce evidence-first domain analysis", () => {
  assert.match(legalPrompt, /DOCUMENT FACTS, REASONABLE INFERENCE, and INFORMATION NOT PROVIDED/);
  assert.match(legalPrompt, /Never invent clauses, facts, cases, statutes, page numbers/);
  assert.match(businessPrompt, /Reconcile related documents whenever possible/);
  assert.match(businessPrompt, /Recalculate arithmetic before reporting discrepancies/);
});

test("PDF ingestion preserves page metadata for citations", () => {
  assert.match(ingestion, /pdfjs-dist\/legacy\/build\/pdf\.mjs/);
  assert.match(ingestion, /getTextContent/);
  assert.match(ingestion, /pageNumber: chunk\.pageNumber/);
  assert.match(queryPipeline, /pageNumber: page\.pageNumber/);
  assert.match(queryPipeline, /lexicalScore/);
});

test("Qdrant ingestion uses valid UUID point IDs and correct docId filters", () => {
  assert.match(ingestion, /id: crypto\.randomUUID\(\)/);
  assert.match(ingestion, /key: 'docId'/);
  assert.match(queryPipeline, /key: 'docId'/);
  assert.doesNotMatch(queryPipeline, /key: 'payload\.docId'/);
  assert.match(ingestion, /unexpected vector count or dimension/);
  assert.match(openAIEmbeddings, /OPENAI_API_KEY is required/);
  assert.match(qdrantProvider, /QDRANT_URL, QDRANT_API_KEY, and QDRANT_COLLECTION_NAME are required/);
  assert.match(qdrantProvider, /ensurePayloadIndexes/);
  assert.match(qdrantProvider, /\['namespace', 'docId'\]/);
});

test("conversation citations open a page-aware highlighted preview", () => {
  assert.match(activeConversation, /CitationPreviewPanel/);
  assert.match(activeConversation, /onPreview=\{setActiveCitation\}/);
  assert.match(citationPanel, /Referenced content/);
  assert.match(citationPanel, /pageNumber/);
  assert.match(documentViewerPage, /highlightExcerpt/);
});

test("public APIs avoid auth middleware and free tool restores sessions in background", () => {
  assert.doesNotMatch(middleware, /\/\(\(\?!_next/);
  assert.match(middleware, /if \(!isProtected && !isAuthRoute\) return NextResponse\.next/);
  assert.match(publicToolClient, /restoringSession/);
  assert.match(publicToolClient, /interactedRef/);
});
