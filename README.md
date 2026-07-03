# HelpexAI

HelpexAI is a business knowledge workspace for uploading documents, asking AI questions, generating reports, and managing workspace knowledge with usage limits and billing.

This README is the team onboarding guide. It explains how to run the app locally, connect external platforms, apply database migrations, test changes, and prepare a deployment.

## Current Product Scope

- Business-first product experience driven by database products/categories.
- Supabase Auth, PostgreSQL, and Storage.
- Document upload, extraction, validation, embeddings, and Qdrant search.
- Conversations with document mode and workplace-wide mode.
- Optional external research through Tavily.
- Reports, report revisions, finalization, PDF export, and report knowledge indexing.
- Public free document tool with email capture and abuse protection.
- Creem billing integration.
- Internal admin dashboard for users, workspaces, knowledge, reports, usage, health, billing, and settings.
- Admin-managed categories, collections, tags, report templates, plans, and dashboard themes.

## Tech Stack

- Framework: Next.js 15 App Router, React 19, TypeScript
- Styling: Tailwind CSS
- Data/auth/storage: Supabase
- AI chat: Groq or OpenAI through provider abstraction
- Embeddings: OpenAI `text-embedding-3-small`
- Vector database: Qdrant Cloud
- Web research: Tavily
- Billing: Creem
- Logging: Better Stack HTTP logs
- Email: Resend
- Hosting: Vercel

## Local Requirements

- Node.js 22.x
- npm
- Supabase project
- Qdrant Cloud cluster
- Groq API key or OpenAI API key for chat
- OpenAI API key for embeddings
- Creem account for billing tests
- Better Stack source for structured logs, optional but recommended
- Tavily API key, optional external research

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Environment Variables

Start by copying `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### App

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HelpexAI
```

Use your production Vercel domain for `NEXT_PUBLIC_APP_URL` in production. This affects canonical URLs, sitemap, redirects, and webhooks.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Create a private Supabase Storage bucket named:

```text
documents
```

Authentication:

- Enable email/password auth.
- Configure Google OAuth if you want Google login.
- Add local and production redirect URLs in Supabase Auth settings.

Recommended redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

### AI

```env
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=
OPENAI_API_KEY=
```

Notes:

- `GROQ_API_KEY` is used when `LLM_PROVIDER=groq`.
- `OPENAI_API_KEY` is required for embeddings.
- If OpenAI embedding quota is unavailable, selected-document chat can fall back to bounded raw document context, but semantic search requires embeddings.
- After restoring OpenAI billing, reprocess documents to populate Qdrant.

### Qdrant

```env
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=helpexai_alpha
QDRANT_TIMEOUT_MS=4000
VECTOR_SELECTED_DOC_MIN_SCORE=0.3
VECTOR_GLOBAL_MIN_SCORE=0.45
```

Create a Qdrant collection with vector size `1536` and cosine distance for OpenAI `text-embedding-3-small`.

Recommended tenant payload index:

```text
namespace
```

The app filters vector records by workspace namespace and keeps older `docId` payloads backward compatible.

### External Research

```env
TAVILY_API_KEY=
```

Tavily is called only when users explicitly enable External Research for a conversation or public-tool session.

### Creem Billing

```env
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=
CREEM_TEST_MODE=true
CREEM_WEBHOOK_DEV_BYPASS=
```

Creem is the active billing provider. Add product IDs to the `plans.creem_product_id` records through SQL or the admin settings UI.

Required webhook endpoint:

```text
https://your-domain.com/api/billing/creem/webhook
```

For local webhook testing, use ngrok or another HTTPS tunnel.

### Public Tool

```env
PUBLIC_TOOL_SECRET=
```

This must be a unique random value with at least 32 characters. The public tool uses it for hashing session/email identifiers.

### Monitoring

```env
BETTERSTACK_SOURCE_TOKEN=
BETTERSTACK_INGESTING_HOST=
```

Create a Better Stack HTTP Logs source. Logs include operational metadata such as user ID/email, workspace category, document/conversation/report IDs, processing stages, and errors. Raw document text and message content are not intentionally sent to Better Stack.

### Cron

```env
CRON_SECRET=
```

`vercel.json` schedules cleanup jobs. Set `CRON_SECRET` in production so cron endpoints can validate requests.

### Email

```env
RESEND_API_KEY=
FROM_EMAIL=
```

Resend is used for product email flows as they are enabled.

## Database Setup

Run migrations in Supabase SQL Editor in order.

For a fresh database, start with:

```text
supabase/migrations/001_initial_schema.sql
```

Then apply every later migration in filename order:

```text
002_remove_conversation_limits.sql
003_alpha_hardening.sql
004_three_tier_pricing.sql
005_public_tool.sql
006_fix_public_tool_question_reservation.sql
007_conversation_external_research.sql
008_public_tool_external_research.sql
009_dynamic_products.sql
010_document_collections_and_tags.sql
011.sql
012_reports_and_reports_template.sql
013_reports_generated_document_link.sql
014_reports_hardening.sql
015_report_revision_mode.sql
016_storage_and_report_limits.sql
017_generic_knowledge_foundation.sql
018_admin_dashboard.sql
019_theme_options.sql
020_conversation_scopes.sql
```

Important migrations:

- `003_alpha_hardening.sql`: atomic daily query limits and hardening.
- `009_dynamic_products.sql`: database-driven products/categories.
- `010_document_collections_and_tags.sql`: collections and tags.
- `011.sql`: Creem billing columns and webhook idempotency.
- `015_report_revision_mode.sql`: report versions and finalization.
- `016_storage_and_report_limits.sql`: storage/query/report limits.
- `017_generic_knowledge_foundation.sql`: generic knowledge source tables.
- `018_admin_dashboard.sql`: platform admin and system event tables.
- `019_theme_options.sql`: dashboard theme options.
- `020_conversation_scopes.sql`: workplace vs document conversation scope.

## Admin Setup

After applying `018_admin_dashboard.sql`, create the first super admin:

```sql
INSERT INTO platform_admins(user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Admin dashboard:

```text
/admin
```

Admin areas:

- Overview
- Users
- Workspaces
- Knowledge
- Reports
- Conversations
- Usage & Cost
- Health
- Billing / Plans
- Settings

Admin settings manage:

- Categories/products
- Collections
- Tags
- Report templates
- Plans
- Dashboard themes

## Core Workflows To Know

### Product and workspace selection

Products are database-driven. If only one active product exists, the app should feel like a single-product app. If more products are added later, signup/login/workspace selection can expose them dynamically.

### Documents

Documents are uploaded into collections and assigned tags. Collections and tags provide AI context during ingestion and retrieval.

Supported file types:

- PDF
- DOCX
- TXT

The app validates readability and handles low-readability documents with user-facing recovery guidance.

### Knowledge

Documents and finalized reports are knowledge sources/items. The generic knowledge model is prepared for future integrations such as Google Drive, Slack, CRM, email, and internal database sources.

Vector payloads preserve old document fields such as `docId` and `docName`, while also storing generic fields such as `sourceType`, `sourceId`, `itemId`, and `itemTitle`.

### Conversations

Conversation modes:

- Document mode: user selects specific documents, citations are shown.
- Workplace mode: user asks across the workspace, document chips and visible citations are hidden.

External Research is opt-in per conversation.

### Reports

Reports support:

- Generation from selected sources
- Dedicated preview page
- Markdown rendering
- Revision mode
- Version history
- Diff preview
- Finalization
- Clean PDF download
- Optional indexing as a report knowledge item after finalization

Report revisions do not count as new reports for plan limits.

### Public free tool

The public tool lets a visitor upload a document, provide an email, and ask limited questions. It stores marketing leads and protects against misuse using hashed identifiers.

## Usage Limits

Current plan structure:

| Plan | Storage | Chat queries/day | Reports/month |
| --- | --- | --- | --- |
| Free | 30 MB | 100 | 5 |
| Pro | 500 MB | 500 | 30 |
| Premium | 2 GB | Unlimited | 100 |

Server-side enforcement exists for:

- Storage before document upload
- Daily query usage before chat
- Monthly report generation before report creation

Report revisions do not count as new reports.

## Development Workflow

Common commands:

```bash
npm run dev
npm run lint
npm test
npm run build
npm run check
```

Recommended before pushing:

```bash
npm run lint
npm test
npm run build
```

`npm run check` runs lint, tests, and build together.

## Testing

Tests live in:

```text
tests/
```

Current tests are Node test-runner checks focused on hardening and architectural guardrails. They verify things like:

- RLS/security expectations
- Atomic usage enforcement
- Public tool limits
- PDF ingestion behavior
- Qdrant payload compatibility
- Conversation citation behavior
- External research opt-in
- Report generation/revision/finalization
- Admin access and settings
- Production readiness health checks

Run:

```bash
npm test
```

## Deployment

Recommended hosting:

```text
Vercel
```

Deployment checklist:

1. Apply all Supabase migrations.
2. Create private Supabase `documents` bucket.
3. Configure Supabase auth redirects for local and production.
4. Create Qdrant collection and payload indexes.
5. Add all env vars in Vercel.
6. Configure Creem product IDs in `plans`.
7. Add Creem webhook endpoint.
8. Set `CRON_SECRET`.
9. Set `PUBLIC_TOOL_SECRET`.
10. Verify `/api/health`.
11. Open `/admin/health` and review Launch readiness.
12. Run smoke tests in production.

Production smoke tests:

- Signup
- Login
- Workspace selection
- Document upload
- Document processing
- Document viewer
- Conversation in document mode
- Conversation in workplace mode
- External Research toggle
- Report generation
- Report revision
- Report finalization
- Report PDF download
- Billing checkout and portal
- Admin dashboard access
- Account deletion request
- Public free tool

## Production Readiness Gate

Before inviting alpha customers, open:

```text
/admin/health
```

Review the Launch readiness table. The app is ready for customer testing only when:

- No readiness row is `blocked`.
- Every `warning` has been reviewed.
- Critical workflows pass in production.
- Monitoring is receiving logs.
- Admin users can see recent failures and system events.

## Troubleshooting

### Free tool says `PUBLIC_TOOL_SECRET must be configured`

Set a unique random value of at least 32 characters in local and production env vars.

### Qdrant search fails with DNS or timeout errors

Check:

- `QDRANT_URL`
- `QDRANT_API_KEY`
- collection name
- Qdrant cluster status
- local network/DNS

The app has selected-document fallback behavior, but semantic search needs Qdrant.

### Chat says it cannot find document context

Check:

- Document status is `ready`.
- OpenAI key has embedding quota.
- Qdrant collection exists.
- Document was processed after embeddings were configured.
- The selected conversation mode is correct.

### Billing does not upgrade the plan

Check:

- Creem webhook endpoint is registered.
- `CREEM_WEBHOOK_SECRET` is correct.
- `plans.creem_product_id` matches the Creem product.
- The webhook event is visible in Creem.
- `/admin/billing` and `/admin/health` show configured status.

### Admin redirects to login

The user must be logged in and present in `platform_admins`.

Run the admin bootstrap SQL again with the correct email.

## Code Map

Important directories:

```text
app/                       Next.js pages and API routes
components/                UI components
lib/ai/                    AI providers, prompts, ingestion, retrieval
lib/admin/                 Admin auth and data queries
lib/billing or lib/creem/  Billing integration
lib/documents/             Document server helpers, deletion, citations
lib/products/              Product/category catalog logic
lib/usage/                 Limits and usage summaries
lib/supabase/              Supabase clients
supabase/migrations/       Database migrations
tests/                     Node test-runner guardrail tests
types/                     Shared TypeScript types
```

Key files:

```text
lib/ai/pipeline/ingest.ts
lib/ai/pipeline/query.ts
app/api/documents/route.ts
app/api/conversations/[id]/messages/route.ts
app/api/reports/generate/route.ts
app/api/reports/[id]/revise/route.ts
app/api/billing/creem/webhook/route.ts
app/admin/health/page.tsx
lib/admin/data.ts
```

## Team Notes

- Prefer adding new product/category behavior through database rows and admin settings rather than hardcoding.
- Keep Supabase service-role access server-side only.
- Keep user-facing errors clear and recoverable.
- Do not send raw document text or full chat messages to monitoring tools.
- Keep Qdrant payloads backward compatible with `docId` and `docName`.
- Run migrations deliberately and record which environment they were applied to.
- Before major launch work, review `/admin/health` and `npm run check`.
