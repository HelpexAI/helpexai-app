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
const markdownMessage = await readFile(new URL("../components/conversations/markdown-message.tsx", import.meta.url), "utf8");
const citationPanel = await readFile(new URL("../components/conversations/citation-preview-panel.tsx", import.meta.url), "utf8");
const documentViewerPage = await readFile(new URL("../app/(dashboard)/documents/[id]/page.tsx", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
const publicToolClient = await readFile(new URL("../components/public-tool/public-document-tool.tsx", import.meta.url), "utf8");
const openAIEmbeddings = await readFile(new URL("../lib/ai/providers/embeddings/openai.ts", import.meta.url), "utf8");
const qdrantProvider = await readFile(new URL("../lib/ai/providers/vectordb/qdrant.ts", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.mjs", import.meta.url), "utf8");
const dashboardWorkspace = await readFile(new URL("../lib/dashboard/workspace.ts", import.meta.url), "utf8");
const dashboardPage = await readFile(new URL("../app/(dashboard)/dashboard/page.tsx", import.meta.url), "utf8");
const dashboardShell = await readFile(new URL("../components/dashboard/dashboard-shell.tsx", import.meta.url), "utf8");
const documentServer = await readFile(new URL("../lib/documents/server.ts", import.meta.url), "utf8");
const documentPageRoute = await readFile(new URL("../app/api/documents/[id]/pages/[page]/route.ts", import.meta.url), "utf8");
const documentsPage = await readFile(new URL("../app/(dashboard)/documents/page.tsx", import.meta.url), "utf8");
const conversationsPage = await readFile(new URL("../app/(dashboard)/conversations/page.tsx", import.meta.url), "utf8");
const activeConversationPage = await readFile(new URL("../app/(dashboard)/conversations/[id]/page.tsx", import.meta.url), "utf8");
const queryProvider = await readFile(new URL("../components/providers/query-provider.tsx", import.meta.url), "utf8");
const queryClientHelpers = await readFile(new URL("../lib/client/query.ts", import.meta.url), "utf8");
const conversationsClientPage = await readFile(new URL("../components/conversations/conversations-client-page.tsx", import.meta.url), "utf8");
const readability = await readFile(new URL("../lib/documents/readability.ts", import.meta.url), "utf8");
const webSearch = await readFile(new URL("../lib/ai/web-search.ts", import.meta.url), "utf8");
const monitoring = await readFile(new URL("../lib/monitoring.ts", import.meta.url), "utf8");
const conversationDocuments = await readFile(new URL("../app/api/conversations/[id]/documents/route.ts", import.meta.url), "utf8");
const externalResearchMigration = await readFile(new URL("../supabase/migrations/007_conversation_external_research.sql", import.meta.url), "utf8");
const conversationMessagesRoute = await readFile(new URL("../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
const conversationHub = await readFile(new URL("../components/conversations/conversation-hub.tsx", import.meta.url), "utf8");
const activeConversationClient = await readFile(new URL("../components/conversations/active-conversation.tsx", import.meta.url), "utf8");
const publicResearchMigration = await readFile(new URL("../supabase/migrations/008_public_tool_external_research.sql", import.meta.url), "utf8");
const publicResearchRoute = await readFile(new URL("../app/api/public-tool/research/route.ts", import.meta.url), "utf8");
const documentLibrary = await readFile(new URL("../components/documents/document-library.tsx", import.meta.url), "utf8");
const documentViewer = await readFile(new URL("../components/documents/document-viewer.tsx", import.meta.url), "utf8");
const marketingHeader = await readFile(new URL("../components/marketing-header.tsx", import.meta.url), "utf8");
const authShell = await readFile(new URL("../components/auth/auth-shell.tsx", import.meta.url), "utf8");
const loginForm = await readFile(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");
const signupForm = await readFile(new URL("../components/auth/signup-form.tsx", import.meta.url), "utf8");
const productLanding = await readFile(new URL("../components/marketing/product-landing-page.tsx", import.meta.url), "utf8");
const robotsRoute = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
const sitemapRoute = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const marketingContent = await readFile(new URL("../lib/marketing/content.ts", import.meta.url), "utf8");
const articleRoute = await readFile(new URL("../app/blog/[slug]/page.tsx", import.meta.url), "utf8");
const businessUseCaseRoute = await readFile(new URL("../app/business/[slug]/page.tsx", import.meta.url), "utf8");
const articlePage = await readFile(new URL("../components/marketing/article-page.tsx", import.meta.url), "utf8");
const useCasePage = await readFile(new URL("../components/marketing/use-case-page.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const dashboardLayout = await readFile(new URL("../app/(dashboard)/layout.tsx", import.meta.url), "utf8");
const selectWorkspacePage = await readFile(new URL("../app/(auth)/select-workspace/page.tsx", import.meta.url), "utf8");
const publicToolSession = await readFile(new URL("../lib/public-tool/session.ts", import.meta.url), "utf8");
const textSanitizer = await readFile(new URL("../lib/text/sanitize.ts", import.meta.url), "utf8");
const dynamicProductsMigration = await readFile(new URL("../supabase/migrations/009_dynamic_products.sql", import.meta.url), "utf8");
const productCatalog = await readFile(new URL("../lib/products/catalog.ts", import.meta.url), "utf8");
const documentTaxonomyMigration = await readFile(new URL("../supabase/migrations/010_document_collections_and_tags.sql", import.meta.url), "utf8");
const documentUploader = await readFile(new URL("../components/documents/document-uploader.tsx", import.meta.url), "utf8");
const reportsMigration = await readFile(new URL("../supabase/migrations/014_reports_hardening.sql", import.meta.url), "utf8");
const reportGenerateRoute = await readFile(new URL("../app/api/reports/generate/route.ts", import.meta.url), "utf8");
const reportSaveRoute = await readFile(new URL("../app/api/reports/save/route.ts", import.meta.url), "utf8");
const reportDownloadRoute = await readFile(new URL("../app/api/reports/[id]/download/route.ts", import.meta.url), "utf8");
const reportRevisionMigration = await readFile(new URL("../supabase/migrations/015_report_revision_mode.sql", import.meta.url), "utf8");
const reportRevisionRoute = await readFile(new URL("../app/api/reports/[id]/revise/route.ts", import.meta.url), "utf8");
const reportFinalizeRoute = await readFile(new URL("../app/api/reports/[id]/finalize/route.ts", import.meta.url), "utf8");
const reportRevisionPreview = await readFile(new URL("../components/reports/report-revision-preview.tsx", import.meta.url), "utf8");
const storageReportLimitsMigration = await readFile(new URL("../supabase/migrations/016_storage_and_report_limits.sql", import.meta.url), "utf8");
const workspaceUsage = await readFile(new URL("../lib/usage/workspace.ts", import.meta.url), "utf8");
const billingPage = await readFile(new URL("../app/(dashboard)/billing/page.tsx", import.meta.url), "utf8");
const reportRoute = await readFile(new URL("../app/api/reports/[id]/route.ts", import.meta.url), "utf8");
const workspaceReferenceRoute = await readFile(new URL("../app/api/workspace/reference/route.ts", import.meta.url), "utf8");
const workspaceReferenceClient = await readFile(new URL("../lib/client/workspace-reference.ts", import.meta.url), "utf8");
const documentsSkeleton = await readFile(new URL("../components/documents/documents-skeleton.tsx", import.meta.url), "utf8");
const documentsRoute = await readFile(new URL("../app/api/documents/route.ts", import.meta.url), "utf8");
const conversationUploadModal = await readFile(new URL("../components/conversations/conversation-upload-modal.tsx", import.meta.url), "utf8");

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
  assert.match(plans, /max_storage_bytes: 30 \* 1024 \* 1024/);
  assert.match(plans, /max_queries_day: -1/);
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
  assert.match(ingestion, /pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs/);
  assert.match(ingestion, /getTextContent/);
  assert.match(ingestion, /pageNumber: chunk\.pageNumber/);
  assert.match(queryPipeline, /pageNumber: page\.pageNumber/);
  assert.match(queryPipeline, /lexicalScore/);
});

test("Vercel traces the PDF.js worker for every PDF extraction route", () => {
  assert.match(nextConfig, /pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs/);
  assert.match(nextConfig, /"\/api\/public-tool": pdfTextAssets/);
  assert.match(nextConfig, /"\/api\/conversations\/\*": pdfTextAssets/);
  assert.match(nextConfig, /"\/api\/documents\/\*": pdfRenderAssets/);
  assert.match(nextConfig, /"\/documents\/\*": pdfRenderAssets/);
});

test("Qdrant ingestion uses valid UUID point IDs and correct docId filters", () => {
  assert.match(ingestion, /id: crypto\.randomUUID\(\)/);
  assert.match(ingestion, /key: ["']docId["']/);
  assert.match(queryPipeline, /key: ["']docId["']/);
  assert.doesNotMatch(queryPipeline, /key: ["']payload\.docId["']/);
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

test("assistant conversation messages render safe styled Markdown", () => {
  assert.match(activeConversation, /MarkdownMessage/);
  assert.match(markdownMessage, /ReactMarkdown/);
  assert.match(markdownMessage, /remarkGfm/);
  assert.match(queryPipeline, /Format the answer as clean Markdown/);
});

test("public APIs avoid auth middleware and free tool restores sessions in background", () => {
  assert.doesNotMatch(middleware, /\/\(\(\?!_next/);
  assert.match(middleware, /if \(!isAuthRoute\) return NextResponse\.next/);
  assert.match(publicToolClient, /restoringSession/);
  assert.match(publicToolClient, /interactedRef/);
});

test("dashboard navigation avoids middleware database work and request waterfalls", () => {
  assert.doesNotMatch(middleware, /from\('accounts'\)/);
  assert.doesNotMatch(middleware, /'\/dashboard\/:path\*'/);
  assert.match(dashboardWorkspace, /Promise\.all\(\[/);
  assert.match(dashboardPage, /select\("id, title, selected_document_ids, created_at", \{ count: "exact" \}\)/);
  assert.match(dashboardShell, /router\.prefetch\(href\)/);
  assert.match(dashboardShell, /requestIdleCallback/);
  assert.match(nextConfig, /clientSegmentCache: true/);
  assert.match(nextConfig, /dynamic: 30/);
  assert.match(dashboardShell, /showNavigationFeedback/);
  assert.match(documentServer, /getDocumentAccessContext/);
  assert.match(documentPageRoute, /getDocumentAccessContext/);
  assert.match(documentsPage, /DocumentsClientPage/);
  assert.match(conversationsPage, /ConversationsClientPage/);
  assert.match(activeConversationPage, /ActiveConversationClientPage/);
});

test("TanStack Query caches client pages and supports precise invalidation", () => {
  assert.match(queryProvider, /QueryClientProvider/);
  assert.match(queryProvider, /staleTime: 5 \* 60 \* 1000/);
  assert.match(queryProvider, /refetchOnWindowFocus: true/);
  assert.match(queryClientHelpers, /queryKeys/);
  assert.match(queryClientHelpers, /invalidateWorkspaceQueries/);
  assert.match(conversationsClientPage, /useQuery/);
});

test("document validation rejects image-only PDFs before analysis", () => {
  assert.match(readability, /IMAGE_ONLY_PDF/);
  assert.match(readability, /OCR-processed PDF/);
});

test("document chat can use optional live web research without overriding documents", () => {
  assert.match(webSearch, /TAVILY_API_KEY/);
  assert.match(queryPipeline, /LIVE WEB RESEARCH/);
  assert.match(queryPipeline, /document context as the source of truth/);
});

test("external research bypasses category rejection and unnecessary raw PDF fallback", () => {
  assert.match(queryPipeline, /!\s*externalResearchEnabled && isOffTopic/);
  assert.match(queryPipeline, /\^\(hi\|hello\|hey\|what's up\|how are you\)\\b/);
  assert.match(conversationMessagesRoute, /\|\| externalResearchEnabled/);
  assert.match(ingestion, /standardFontDataUrl/);
  assert.match(queryPipeline, /Do not respond with the category's off-topic refusal/);
});

test("external research is opt-in and persisted per conversation", () => {
  assert.match(externalResearchMigration, /external_research_enabled BOOLEAN NOT NULL DEFAULT false/);
  assert.match(queryPipeline, /const webResults = externalResearchEnabled\s*\?\s*await searchWeb/);
  assert.match(queryPipeline, /suggest turning on \*\*External Research\*\*/);
  assert.match(conversationMessagesRoute, /external_research_enabled/);
  assert.match(conversationHub, /external_research_enabled: externalResearchEnabled/);
  assert.match(activeConversationClient, /conversation\.id}\/research/);
});

test("critical workflows emit Better Stack compatible structured logs", () => {
  assert.match(monitoring, /BETTERSTACK_SOURCE_TOKEN/);
  assert.match(monitoring, /BETTERSTACK_INGESTING_HOST/);
  assert.match(monitoring, /Authorization: `Bearer/);
});

test("active conversations support attaching ready workspace documents", () => {
  assert.match(conversationDocuments, /selected_document_ids: documentIds/);
  assert.match(conversationDocuments, /\.eq\("status", "ready"\)/);
});

test("free tool persists opt-in external research and keeps atomic question protection", () => {
  assert.match(publicResearchMigration, /DROP FUNCTION IF EXISTS reserve_public_tool_question/);
  assert.match(publicResearchMigration, /external_research_enabled BOOLEAN NOT NULL DEFAULT false/);
  assert.match(publicResearchMigration, /v_session\.external_research_enabled/);
  assert.match(publicResearchRoute, /externalResearchEnabled/);
  assert.match(publicQuery, /externalResearchEnabled \? formatWebContext/);
});

test("outdated document locks and Ask AI document actions are removed", () => {
  assert.doesNotMatch(conversationHub, /Document selection locks once the conversation is started/);
  assert.doesNotMatch(documentLibrary, /title="Start conversation"/);
  assert.doesNotMatch(documentViewer, />Ask AI</);
});

test("public navigation is session-aware while Get Started remains signup", () => {
  assert.match(marketingHeader, /supabase\.auth\.getSession/);
  assert.match(marketingHeader, /Open Dashboard/);
  assert.match(marketingHeader, /const signInHref = authCategory/);
  assert.match(marketingHeader, /authenticated\s*\?\s*"\/dashboard"/);
  assert.match(marketingHeader, /const signupHref = authCategory/);
  assert.match(marketingHeader, /`\/signup\?category=\$\{authCategory\}`/);
});

test("single-product marketing hides inactive products and keeps the active conversion path", () => {
  assert.doesNotMatch(marketingHeader, /Helpex Legal/);
  assert.doesNotMatch(marketingHeader, />Products</);
  assert.match(productLanding, /const product = \{/);
  assert.match(productLanding, /FAQPage/);
  assert.match(productLanding, /SoftwareApplication/);
  assert.match(productLanding, /const signupHref = `\/signup\?category=\$\{category\}`/);
  assert.match(robotsRoute, /sitemap/);
  assert.doesNotMatch(sitemapRoute, /absoluteUrl\("\/legal"\)/);
  assert.match(sitemapRoute, /absoluteUrl\("\/business"\)/);
});

test("product auth flows resolve active database products and preserve their theme", () => {
  assert.match(productLanding, /<MarketingHeader authCategory=\{category\} \/>/);
  assert.match(marketingHeader, /`\/login\?category=\$\{authCategory\}`/);
  assert.match(marketingHeader, /const showSignIn = Boolean\(authCategory\) \|\| authenticated !== null/);
  assert.match(authShell, /products\.find/);
  assert.match(authShell, /themeStyle\(product\?\.theme \?\? "main"\)/);
  assert.match(loginForm, /href=\{`\/signup\$\{categoryQuery\}`\}/);
  assert.match(signupForm, /`\/login\?category=\$\{category\}`/);
  assert.match(middleware, /isProductAuthFlow/);
  assert.match(middleware, /user && !isProductAuthFlow/);
});

test("SEO content and high-intent use-case routes are static, structured, and internally linked", () => {
  assert.match(marketingContent, /what-is-a-business-knowledge-workspace/);
  assert.match(marketingContent, /how-to-build-an-ai-business-knowledge-base/);
  assert.match(marketingContent, /how-to-generate-business-reports-with-ai/);
  assert.match(marketingContent, /using-ai-for-business-decisions/);
  assert.match(marketingContent, /slug: "business-knowledge-workspace"/);
  assert.match(marketingContent, /slug: "ai-document-reports"/);
  assert.match(articleRoute, /generateStaticParams/);
  assert.match(businessUseCaseRoute, /generateStaticParams/);
  assert.match(articlePage, /"@type": "Article"/);
  assert.match(articlePage, /"@type": "BreadcrumbList"/);
  assert.match(useCasePage, /"@type": "FAQPage"/);
  assert.match(productLanding, /href: "\/business\/business-knowledge-workspace"/);
  assert.match(productLanding, /href: "\/business\/ai-document-reports"/);
  assert.match(sitemapRoute, /articles\.filter/);
  assert.match(sitemapRoute, /useCases\.filter/);
});

test("products are database-driven and Business is the only active seed", () => {
  assert.match(dynamicProductsMigration, /DROP CONSTRAINT IF EXISTS accounts_category_slug_check/);
  assert.match(dynamicProductsMigration, /ADD COLUMN IF NOT EXISTS theme JSONB/);
  assert.match(dynamicProductsMigration, /ADD COLUMN IF NOT EXISTS marketing JSONB/);
  assert.match(dynamicProductsMigration, /WHERE slug <> 'business'/);
  assert.match(dynamicProductsMigration, /seed_default_product_plans/);
  assert.match(productCatalog, /\.from\("categories"\)/);
  assert.match(productCatalog, /\.eq\("is_active", true\)/);
  assert.match(queryPipeline, /getProductForAccount/);
});

test("documents require dynamic collections and tags that enrich AI context", () => {
  assert.match(documentTaxonomyMigration, /CREATE TABLE IF NOT EXISTS collections/);
  assert.match(documentTaxonomyMigration, /CREATE TABLE IF NOT EXISTS tags/);
  assert.match(documentTaxonomyMigration, /CREATE TABLE IF NOT EXISTS document_tag_assignments/);
  assert.match(documentTaxonomyMigration, /ALTER COLUMN collection_id SET NOT NULL/);
  assert.match(documentTaxonomyMigration, /seed_default_document_taxonomy/);
  assert.match(documentUploader, /formData\.append\("collection_id"/);
  assert.match(documentUploader, /formData\.append\("tag_ids"/);
  assert.match(ingestion, /collectionContext/);
  assert.match(ingestion, /tagContext/);
  assert.match(queryPipeline, /Collection:/);
  assert.doesNotMatch(documentLibrary, /Total Documents/);
});

test("public landing pages avoid app-only providers and defer non-critical rendering", () => {
  assert.doesNotMatch(rootLayout, /QueryProvider/);
  assert.match(dashboardLayout, /QueryProvider/);
  assert.match(selectWorkspacePage, /QueryProvider/);
  assert.match(marketingHeader, /import\("@\/lib\/supabase\/client"\)/);
  assert.match(marketingHeader, /if \(authCategory\) return/);
  assert.match(productLanding, /marketing-deferred/);
});

test("public tool hashing fails closed without a strong dedicated secret", () => {
  assert.match(publicToolSession, /PUBLIC_TOOL_SECRET/);
  assert.match(publicToolSession, /value\.length < 32/);
  assert.doesNotMatch(publicToolSession, /helpex-public-tool/);
  assert.doesNotMatch(publicToolSession, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("extracted and generated text is sanitized before PostgreSQL persistence", () => {
  assert.match(textSanitizer, /code === 0/);
  assert.match(textSanitizer, /code < 32/);
  assert.match(textSanitizer, /0xd800/);
  assert.match(textSanitizer, /sanitizeJsonForStorage/);
  assert.match(ingestion, /sanitizeTextForStorage/);
  assert.match(publicToolRoute, /sanitizeTextForStorage\(pages/);
  assert.match(publicQuestionRoute, /sanitizeTextForStorage\(result\.answer\)/);
  assert.match(conversationMessagesRoute, /sanitizeTextForStorage\(result\.answer\)/);
  assert.match(conversationMessagesRoute, /sanitizeJsonForStorage\(result\.sources\)/);
});

test("public tool accepts low-readability documents and responds without inventing answers", () => {
  assert.match(publicToolRoute, /extractDocumentPages/);
  assert.match(publicToolRoute, /public_tool_document_accepted_with_warning/);
  assert.match(publicToolRoute, /documentReadable/);
  assert.doesNotMatch(publicToolRoute, /status: 422/);
  assert.match(publicQuery, /UNREADABLE_DOCUMENT_ANSWER/);
  assert.match(publicQuery, /context\.replace\(\/\\s\/g, ""\)\.length < 20/);
  assert.match(publicQuery, /do not guess/);
  assert.match(publicToolClient, /Uploaded with limited readable text/);
  assert.match(publicToolClient, /WarningMessage/);
});

test("public tool communicates staged document upload progress", () => {
  assert.match(publicToolClient, /uploadProgress/);
  assert.match(publicToolClient, /Extracting readable text/);
  assert.match(publicToolClient, /Cleaning and preparing content/);
  assert.match(publicToolClient, /Preparing your question session/);
  assert.match(publicToolClient, /transition-\[width\]/);
  assert.match(publicToolClient, /aria-live="polite"/);
});

test("report generation enforces plans, source limits, and safe prompt persistence", () => {
  assert.match(reportGenerateRoute, /PLAN_RANK/);
  assert.match(reportGenerateRoute, /REPORT_PLAN_REQUIRED/);
  assert.match(reportGenerateRoute, /\.limit\(maxDocuments \+ 1\)/);
  assert.match(reportGenerateRoute, /\.replaceAll\(\s*"{{custom_prompt}}"/);
  assert.match(reportGenerateRoute, /max_context_chunks \* 1_500/);
  assert.match(reportGenerateRoute, /Promise\.all/);
  assert.doesNotMatch(reportGenerateRoute, /prompt:\s*finalPrompt/);
});

test("reports and their sources are created atomically inside the active workspace", () => {
  assert.match(reportSaveRoute, /create_report_with_sources/);
  assert.match(reportSaveRoute, /validateSourceDocuments/);
  assert.match(reportsMigration, /REVOKE INSERT, UPDATE, DELETE ON reports, report_sources, report_templates/);
  assert.match(reportsMigration, /CREATE OR REPLACE FUNCTION create_report_with_sources/);
  assert.match(reportsMigration, /Invalid report workspace/);
  assert.match(reportsMigration, /Invalid report collection/);
  assert.match(reportsMigration, /One or more report sources are invalid/);
});

test("report PDF export preserves WinAnsi text and degrades unsupported scripts safely", () => {
  assert.match(reportDownloadRoute, /\\xA0-\\xFF/);
  assert.match(reportDownloadRoute, /EUR /);
  assert.match(reportDownloadRoute, /\.replace\(\/\[\^\\x09\\x0A\\x0D\\x20-\\x7E\\xA0-\\xFF\]\/g, "\?"\)/);
});

test("report revision mode stores clean version history and blocks finalized edits", () => {
  assert.match(reportRevisionMigration, /CREATE TABLE IF NOT EXISTS report_versions/);
  assert.match(reportRevisionMigration, /current_version_id/);
  assert.match(reportRevisionMigration, /status IN \('draft', 'generating', 'completed', 'finalized', 'failed'\)/);
  assert.match(reportRevisionRoute, /\.eq\("report_id", report\.id\)/);
  assert.match(reportRevisionRoute, /Finalized reports cannot be revised/);
  assert.match(reportRevisionRoute, /Do not return HTML, diff symbols, highlights, editing notes, or AI disclaimers/);
  assert.match(reportFinalizeRoute, /status: "finalized"/);
  assert.match(reportFinalizeRoute, /ingestTextDocument/);
});

test("dedicated report preview supports selection, revisions, diff review, and clean finalization", () => {
  assert.match(reportRevisionPreview, /Improve Report/);
  assert.match(reportRevisionPreview, /captureSelection/);
  assert.match(reportRevisionPreview, /Add to improvement/);
  assert.match(reportRevisionPreview, /Show changes/);
  assert.match(reportRevisionPreview, /Save & Finalize/);
  assert.match(reportRevisionPreview, /View previous/);
  assert.match(reportRevisionPreview, /Improve again/);
});

test("report drafts stay out of Documents until optional knowledge-base publishing", () => {
  assert.match(reportSaveRoute, /generated_document_id: null/);
  assert.doesNotMatch(reportSaveRoute, /reserve_document_uploads/);
  assert.doesNotMatch(reportSaveRoute, /ingestTextDocument/);
  assert.match(reportFinalizeRoute, /publishToKnowledgeBase/);
  assert.match(reportFinalizeRoute, /reserve_document_uploads/);
  assert.match(reportFinalizeRoute, /ingestTextDocument/);
  assert.match(reportRevisionPreview, /Keep only as report/);
  assert.match(reportRevisionPreview, /Add to Documents and knowledge base/);
});

test("published report documents hide storage extensions and render Markdown", () => {
  assert.match(reportFinalizeRoute, /name: finalTitle/);
  assert.match(reportFinalizeRoute, /safeStorageFilename\(`\$\{finalTitle\}\.md`\)/);
  assert.match(documentViewer, /isReportDocument/);
  assert.match(documentViewer, /ReportDocumentMarkdown/);
  assert.match(documentViewer, /ReactMarkdown/);
  assert.match(documentLibrary, /documentTypeLabel/);
});

test("workspace usage stays consistent across enforcement, dashboard, billing, and deletions", () => {
  assert.match(storageReportLimitsMigration, /SUM\(file_size\)/);
  assert.match(storageReportLimitsMigration, /action = 'query'/);
  assert.match(storageReportLimitsMigration, /action = 'report_generate'/);
  assert.match(workspaceUsage, /\.from\("documents"\)/);
  assert.match(workspaceUsage, /\.eq\("action", "query"\)/);
  assert.match(workspaceUsage, /\.eq\("action", "report_generate"\)/);
  assert.match(dashboardPage, /getWorkspaceUsage/);
  assert.match(billingPage, /getWorkspaceUsage/);
  assert.match(reportGenerateRoute, /reserve_monthly_report/);
  assert.match(reportGenerateRoute, /\.delete\(\)\.eq\("request_id", usageRequestId\)/);
  assert.doesNotMatch(reportRoute, /\.from\("usage_logs"\)\s*\.delete/);
});

test("stable workspace reference data is cached once and documents use a minimal skeleton", () => {
  const documentsGetRoute = documentsRoute.split("export async function POST")[0];

  assert.match(workspaceReferenceRoute, /\.from\("collections"\)/);
  assert.match(workspaceReferenceRoute, /\.from\("tags"\)/);
  assert.match(workspaceReferenceRoute, /\.from\("plans"\)/);
  assert.match(workspaceReferenceRoute, /\.from\("report_templates"\)/);
  assert.match(workspaceReferenceClient, /staleTime: Infinity/);
  assert.match(workspaceReferenceClient, /gcTime: Infinity/);
  assert.match(queryProvider, /WorkspaceReferenceBootstrap/);
  assert.doesNotMatch(documentsGetRoute, /\.from\("collections"\)/);
  assert.doesNotMatch(documentsGetRoute, /\.from\("tags"\)/);
  assert.match(conversationUploadModal, /useWorkspaceReference/);
  assert.match(documentsSkeleton, /DocumentsContentSkeleton/);
  assert.match(documentsSkeleton, /animate-pulse/);
});
