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
```

### 2. Supabase Setup
1. Go to supabase.com → new project
2. SQL Editor → paste + run `supabase/migrations/001_initial_schema.sql`
3. Storage → create bucket named `documents` (private)
4. Authentication → enable Google OAuth
5. Copy URL + keys to `.env.local`

### 3. Qdrant Setup
Follow instructions in `supabase/qdrant_setup.md`

### 4. Run development server
```bash
npm run dev
```

### 5. Stripe test billing
1. Use Stripe test-mode API keys and recurring monthly Price IDs in `.env.local`.
2. Register `/api/stripe/webhook` and enable:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Set the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

The app returns an account to Free when Stripe reports the subscription as inactive or deleted. If the workspace then exceeds the Free document allowance, conversations remain locked until the user chooses which documents to keep.

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
