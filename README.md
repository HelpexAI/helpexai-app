# HelpexAI — Document Intelligence Platform

> Upload your documents. Ask anything. Get expert answers. Your data stays yours.

## Phase 0 — Complete ✅

### What's been scaffolded
- Next.js 14 + TypeScript + Tailwind + shadcn/ui
- All dependencies installed
- Complete folder structure
- TypeScript types (`types/index.ts`)
- Zod validation schemas (`lib/validations/schemas.ts`)
- Supabase browser + server clients (`lib/supabase/`)
- Auth middleware protecting dashboard routes (`middleware.ts`)
- AI provider abstraction:
  - LLM: Groq (dev) + OpenAI (prod)
  - Embeddings: OpenAI text-embedding-3-small
  - Vector DB: Qdrant Cloud
  - Factory pattern — swap via `.env` only
- Document ingestion pipeline (`lib/ai/pipeline/ingest.ts`)
- RAG query pipeline (`lib/ai/pipeline/query.ts`)
- Category system prompts: Legal + Business (`lib/ai/prompts/`)
- Stripe client + plan definitions (`lib/stripe/`)
- Database migration SQL (`supabase/migrations/001_initial_schema.sql`)
- Qdrant collection setup guide (`supabase/qdrant_setup.md`)
- Utility functions (`lib/utils/index.ts`)
- Environment variable templates (`.env.local`, `.env.production`)

## Setup Checklist

### 1. Fill in `.env.local`
```
GROQ_API_KEY=           ← from console.groq.com
OPENAI_API_KEY=         ← from platform.openai.com
QDRANT_URL=             ← from cloud.qdrant.io
QDRANT_API_KEY=         ← from cloud.qdrant.io
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_LEGAL_PRO_PRICE_ID=
STRIPE_BUSINESS_PRO_PRICE_ID=
STRIPE_LEGAL_PREMIUM_PRICE_ID=
STRIPE_BUSINESS_PREMIUM_PRICE_ID=
```

### 2. Supabase Setup
1. Go to supabase.com → new project
2. SQL Editor → paste + run `supabase/migrations/001_initial_schema.sql`
3. Storage → create bucket named `documents` (private)
4. Authentication → enable Google OAuth
5. Copy URL + keys to `.env.local`

For an existing project, run `002_remove_conversation_limits.sql`,
`003_alpha_hardening.sql`, `004_three_tier_pricing.sql`, and
`005_public_tool.sql`, then `006_fix_public_tool_question_reservation.sql` in
Supabase SQL Editor. Also apply `007_conversation_external_research.sql` and
`008_public_tool_external_research.sql`. Migration `003` is required
before running the hardened app because API routes use its atomic quota and
rate-limit functions.

### 3. Qdrant Setup
Follow instructions in `supabase/qdrant_setup.md`

### 4. Run development server
```bash
npm run dev
```

### 5. Stripe test billing
1. Create recurring monthly Pro ($29) and Premium ($49) prices for both Legal and Business, then add all four test-mode Price IDs to `.env.local`.
2. Register `/api/stripe/webhook` and enable:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Set the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

The app returns an account to Free when Stripe reports the subscription as inactive or deleted. If the workspace then exceeds the Free document allowance, conversations remain locked until the user chooses which documents to keep.

### 6. Alpha release checks
```bash
npm run check
```

Set `CRON_SECRET` in Vercel. `vercel.json` schedules permanent account deletion cleanup daily at 03:00 UTC.
Set a separate long random `PUBLIC_TOOL_SECRET` in Vercel. The public tool stores
marketing-consented emails separately and automatically removes expiring
document text sessions after 24 hours.

OpenAI embeddings remain the preferred semantic-search path. If OpenAI quota is unavailable, chat falls back to bounded raw selected-document context with Groq. Restoring OpenAI billing requires no code change; reprocess documents afterward to populate Qdrant.

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **AI:** LangChain.js, Groq (dev) / OpenAI GPT-4.1 Mini (prod)
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector DB:** Qdrant Cloud
- **Database + Auth:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe
- **Email:** Resend (post-MVP)
- **Hosting:** Vercel

## Two Categories
| Category | Target | Documents |
|---|---|---|
| **Helpex Legal** | Lawyers, paralegals, individuals | NDAs, case files, court docs, agreements |
| **Helpex Business** | SMB owners, freelancers, startups | Contracts, invoices, POs, service agreements |

## Next Phase
**Phase 1 — Auth & Dashboard Shell** (Day 3–5)
- Signup / Login pages with Google OAuth
- Email verification flow
- Dashboard layout with sidebar
- Empty states for all tabs

## Optional AI Research And Testing Logs

Set `TAVILY_API_KEY` to let document conversations supplement document evidence
with live web research for salary benchmarks, market rates, and current industry
comparisons. Tavily is called only for conversations where the user explicitly
enables External Research.

For Better Stack testing logs, create an HTTP Logs source and set:

```env
BETTERSTACK_SOURCE_TOKEN=
BETTERSTACK_INGESTING_HOST=
```

Logs include user ID/email, workspace category, document/conversation IDs,
processing stages, and errors. Raw document text and message content are not
sent to Better Stack.

## Generic Knowledge Foundation

Apply `supabase/migrations/017_generic_knowledge_foundation.sql` before
deploying the generic knowledge-source code. It creates workspace-isolated
knowledge sources, items, chunks, and reusable tag assignments while preserving
the existing Documents and Reports APIs.

Documents remain uploaded files. Finalized reports remain in Reports and are
indexed as separate `report` knowledge items; they are never copied into
Documents.

Existing document vectors remain backward compatible because retrieval still
understands `docId` and `docName`. For a completely clean generic index, delete
the existing Qdrant collection once, recreate it with the same vector size, and
reprocess or re-upload the documents you want indexed. This also removes stale
vectors created by the previous report-as-document workflow.
# Internal Admin Dashboard

Apply `supabase/migrations/018_admin_dashboard.sql`, then bootstrap the first
platform owner from the Supabase SQL editor:

```sql
INSERT INTO platform_admins(user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

The protected dashboard is available at `/admin`. Customer users are redirected
to `/dashboard`; taxonomy writes use admin-only server actions and archive
categories/tags instead of deleting records.
