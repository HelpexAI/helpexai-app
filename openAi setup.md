# HelpexAI — Platform Setup Guide
**Version:** 1.0  
**Date:** June 2026  
**Phase:** 0 — Before Writing Any Code

> Follow this guide in order. Every account, key, and configuration needed
> to run HelpexAI in development and production.

---

## Quick Reference — What's Needed When

```
Phase 1 (Now):
  ✅ Supabase      → DB + Auth + Storage
  ✅ Groq          → Free LLM for dev
  ✅ OpenAI        → Embeddings (create key now, add billing in Week 2)
  ✅ Qdrant        → Vector database

Phase 4 (Week 2):
  ⏳ Creem         → Payments + subscriptions
  ⏳ Resend        → Transactional email
  ⏳ Vercel        → Production deployment
```

---

## 1. Supabase Setup

**URL:** supabase.com  
**Cost:** Free  
**Used for:** PostgreSQL database, Auth, Storage

### 1.1 Create Project
```
1. Go to supabase.com → Sign up / Log in
2. Click "New project"
3. Name: helpexai
4. Database password: generate a strong one → SAVE IT SOMEWHERE SAFE
5. Region: pick closest to your target users
6. Click "Create new project" → wait ~2 minutes
```

### 1.2 Run Database Migration
```
1. Go to: SQL Editor (left sidebar, </> icon)
2. Click: New query
3. Open file: supabase/migrations/001_initial_schema.sql
4. Paste entire contents into SQL editor
5. Click: Run
6. Expected result: "Success. No rows returned"
```

This creates all tables with Row Level Security:
- `accounts`
- `documents`
- `conversations`
- `messages`
- `usage_logs`

### 1.3 Create Storage Bucket
```
1. Go to: Storage (left sidebar)
2. Click: New bucket
3. Name: documents
4. Public bucket: OFF (must be private)
5. Click: Save
```

Then run storage policies in SQL Editor:
```sql
-- Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 1.4 Enable Google OAuth

**Step A — Google Cloud Console** (console.cloud.google.com)
```
1. Create new project → name: HelpexAI
2. APIs & Services → OAuth consent screen
   → User type: External
   → App name: HelpexAI
   → Support email: your email
   → Save

3. APIs & Services → Credentials
   → Create Credentials → OAuth Client ID
   → Application type: Web application
   → Name: HelpexAI Web

4. Authorized redirect URIs → Add:
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   (find project ID in Supabase → Settings → General)

5. Click Create
6. Copy: Client ID and Client Secret
```

**Step B — Supabase Dashboard**
```
1. Go to: Authentication → Providers → Google
2. Toggle: Enable → ON
3. Client ID:     paste from Google Cloud
4. Client Secret: paste from Google Cloud
5. Click: Save
```

**Step C — Configure URLs**
```
1. Go to: Authentication → URL Configuration
2. Site URL: http://localhost:3000
3. Redirect URLs → Add both:
   http://localhost:3000/**
   https://helpexai.com/**
4. Click: Save
```

### 1.5 Get API Keys
```
Go to: Settings → API

Copy these three values into .env.local:

NEXT_PUBLIC_SUPABASE_URL
→ "Project URL" section
→ Example: https://abcdefgh.supabase.co
→ Already in your .env if you can see your project URL

NEXT_PUBLIC_SUPABASE_ANON_KEY
→ "Project API keys" section → anon / public
→ Long JWT token starting with eyJ...

SUPABASE_SERVICE_ROLE_KEY
→ Same section → service_role / secret
→ Click "Reveal" → Long JWT starting with eyJ...
→ ⚠️ Never expose this in frontend code
```

---

## 2. Qdrant Cloud Setup

**URL:** cloud.qdrant.io  
**Cost:** Free tier  
**Used for:** Vector embeddings storage (document chunks)

### 2.1 Create Account & Cluster
```
1. Go to cloud.qdrant.io → Sign up
2. Create cluster:
   → Name: helpexai-dev
   → Cloud provider: any (GCP us-east recommended)
   → Tier: Free
3. Wait ~3 minutes for cluster to provision
4. Copy: Cluster URL and API Key
```

### 2.2 Create Collection
```
Collection name: helpexai_dev
Search type:     Simple Single Embedding
Vector size:     1536
Distance:        Cosine
```

### 2.3 Configure Multitenancy (Tenant Field)
```
Field name: namespace
Type:       keyword
is_tenant:  true
is_principal: true
```

This creates the primary isolation between users. Every vector is tagged
with `{userId}_{categorySlug}` — users can never access each other's data.

### 2.4 Create Payload Indexes
```
Index 1 (already done as tenant):
  Field: namespace
  Type:  keyword (tenant)

Index 2:
  Field: payload.docId
  Type:  keyword
  Used for: fast document deletion
```

### 2.5 Verify Setup
Expected collection status response:
```json
{
  "status": "green",
  "optimizer_status": "ok",
  "points_count": 0,
  "payload_schema": {
    "namespace": { "data_type": "keyword", "params": { "is_tenant": true } },
    "payload.docId": { "data_type": "keyword" }
  }
}
```

### 2.6 Get API Keys
```
QDRANT_URL=https://your-cluster-id.region.gcp.cloud.qdrant.io
QDRANT_API_KEY=your-api-key-from-qdrant-dashboard
QDRANT_COLLECTION_NAME=helpexai_dev
```

---

## 3. Groq Setup (Free LLM for Dev)

**URL:** console.groq.com  
**Cost:** Free  
**Used for:** LLM in development (replaces OpenAI GPT-4)

### 3.1 Create Account & API Key
```
1. Go to console.groq.com → Sign up
2. Go to: API Keys → Create API Key
3. Name: HelpexAI Dev
4. Copy key → starts with gsk_...
```

### 3.2 Add to .env.local
```bash
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
```

### 3.3 Model Used
```
Model: llama-3.1-70b-versatile
Free tier limits: 6,000 tokens/min, 500 req/day
→ More than enough for development
```

---

## 4. OpenAI Setup (Embeddings)

**URL:** platform.openai.com  
**Cost:** ~$0.00 during Phase 1, <$0.01 during development  
**Used for:** text-embedding-3-small (both dev and prod)

### 4.1 Create Account
```
1. Go to platform.openai.com → Sign up / Log in
```

### 4.2 Create API Key
```
1. Left sidebar → API Keys
2. Click: Create new secret key
3. Name: HelpexAI Dev
4. Copy immediately → starts with sk-proj-...
   (you cannot see it again after closing)
```

### 4.3 Add Billing (Week 2 — not needed for Phase 1)
```
Settings → Billing → Add payment method
Add $5 credit → enough for months of dev embedding

Set safety limit:
Settings → Limits → Monthly budget: $10
→ API stops if you hit $10/month
→ Prevents surprise bills
```

### 4.4 Cost Reality
```
Model: text-embedding-3-small
Price: $0.02 per 1 million tokens

Estimated dev usage:
→ 10 test documents, ~100 chunks, ~75,000 tokens
→ Cost: $0.0015 (less than half a cent)
```

### 4.5 Add to .env.local
```bash
OPENAI_API_KEY=sk-proj-your_key_here
```

---

## 5. Creem Setup (Phase 4 — Week 2)

**URL:** creem.io  
**Used for:** Subscription billing

### 5.1 Get API Keys
```
1. Creem dashboard → API Keys
2. API key → CREEM_API_KEY
3. Webhook signing secret → CREEM_WEBHOOK_SECRET
```

### 5.2 Create Products & Prices
```
Dashboard → Products → Add product

Product 1: Helpex Legal Pro
  → Price: $49/month recurring
  → Copy Product ID into plans.creem_product_id

Product 2: Helpex Business Pro
  → Price: $49/month recurring
  → Copy Product ID into plans.creem_product_id
```

### 5.3 Webhook Setup
```
Dashboard → Webhooks → Add endpoint

Endpoint URL: https://helpexai.com/api/billing/creem/webhook

Events to listen:
  → checkout.completed
  → subscription.active
  → subscription.scheduled_cancel
  → subscription.expired
  → subscription.canceled
  → subscription.unpaid
  → subscription.paused

Copy: Signing secret → CREEM_WEBHOOK_SECRET
```

### 5.4 Local Webhook Testing
```bash
# Use ngrok or another HTTPS tunnel
ngrok http 3000

# Forward Creem webhooks to the ngrok HTTPS URL:
# https://your-ngrok-domain.ngrok-free.app/api/billing/creem/webhook
```

---

## 6. Resend Setup (Post-MVP)

**URL:** resend.com  
**Cost:** Free (3,000 emails/month)  
**Used for:** Transactional emails (not needed in MVP)

```
1. resend.com → Sign up
2. API Keys → Create API Key
3. Copy → RESEND_API_KEY

4. Add domain:
   Domains → Add Domain → helpexai.com
   Add DNS records shown to your domain provider

5. FROM_EMAIL=hello@helpexai.com
```

---

## 7. GitHub + Vercel Setup

### 7.1 GitHub
```
1. github.com → New repository
2. Name: helpexai
3. Private: YES
4. Don't initialize (project already exists locally)

Push existing project:
cd helpexai
git init
git add .
git commit -m "feat: Phase 0 scaffold"
git remote add origin https://github.com/yourusername/helpexai.git
git push -u origin main
```

### 7.2 Vercel
```
1. vercel.com → New Project
2. Import from GitHub → select helpexai repo
3. Framework: Next.js (auto-detected)
4. Root directory: ./
5. Click Deploy

Auto-deploy: every push to main → auto deploys ✅
```

### 7.3 Add Environment Variables to Vercel
```
Vercel Dashboard → Project → Settings → Environment Variables

Add all variables from .env.production
(Use production keys, not test keys)
```

---

## 8. Complete .env.local Template

```bash
# ─────────────────────────────────────────────
# HelpexAI — Development Environment Variables
# ─────────────────────────────────────────────
# NEVER commit this file to Git

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HelpexAI

# ── PHASE 1 — Fill these now ─────────────────

# Groq (free LLM for dev)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...

# OpenAI (embeddings — create key now, add billing in Week 2)
OPENAI_API_KEY=sk-proj-...

# Qdrant
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=helpexai_dev

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── PHASE 4 — Fill in Week 2 ─────────────────

# Creem
CREEM_API_KEY=creem_...
CREEM_WEBHOOK_SECRET=...
CREEM_TEST_MODE=true

# Resend (post-MVP)
RESEND_API_KEY=re_...
FROM_EMAIL=hello@helpexai.com
```

---

## 9. Setup Checklist

### Phase 1 (Do Now)
```
Supabase:
  □ Project created
  □ Migration SQL executed (001_initial_schema.sql)
  □ Storage bucket "documents" created (private)
  □ Storage policies added (3 SQL policies)
  □ Google OAuth enabled
  □ Redirect URLs configured
  □ API keys copied to .env.local

Qdrant:
  □ Cluster created (free tier)
  □ Collection "helpexai_dev" created
  □ Vector size: 1536, Distance: Cosine
  □ Namespace index (tenant) created
  □ payload.docId index created
  □ Status: green ✅
  □ API keys copied to .env.local

Groq:
  □ Account created
  □ API key created
  □ Added to .env.local

OpenAI:
  □ Account created
  □ API key created (sk-proj-...)
  □ Added to .env.local
  □ Billing: add in Week 2

GitHub:
  □ Repository created (private)
  □ Phase 0 code pushed

Vercel:
  □ Project connected to GitHub
  □ Auto-deploy working
```

### Phase 4 (Week 2)
```
Creem:
  □ Account created
  □ API key copied
  □ Products created
  □ Product IDs added to plans.creem_product_id
  □ Webhook endpoint configured
  □ Webhook secret copied

Resend:
  □ Account created
  □ Domain verified
  □ API key copied
```

---

## 10. Troubleshooting

### Supabase "Invalid API key"
```
→ Check you copied the full key (they're very long)
→ Anon key goes in NEXT_PUBLIC_SUPABASE_ANON_KEY
→ Service role goes in SUPABASE_SERVICE_ROLE_KEY (not the anon key)
```

### Google OAuth not working
```
→ Check redirect URI exactly matches:
  https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
→ Make sure OAuth consent screen is saved
→ Check Supabase Auth → URL Configuration has localhost:3000
```

### Qdrant "Unauthorized"
```
→ Check QDRANT_URL includes https://
→ API key is from the cluster dashboard, not account settings
→ Collection name matches QDRANT_COLLECTION_NAME exactly
```

### OpenAI "insufficient_quota"
```
→ Add billing credit at platform.openai.com → Settings → Billing
→ $5 is enough for all of development
```

### Groq rate limit
```
→ Free tier: 6,000 tokens/min, 500 req/day
→ In dev this is more than enough
→ If hit: wait 1 minute or switch to OpenAI LLM temporarily
```

---

*End of HelpexAI Setup Guide v1.0*  
*Next: Phase 1 — Auth, Signup, Login, Dashboard Shell*
