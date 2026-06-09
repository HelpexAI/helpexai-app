-- ─────────────────────────────────────────────────────────────────────────────
-- HelpexAI — Complete Database Migration
-- Version: 2.1 (synced with HelpexAI-Master-v2.1.md)
-- Run this ONCE in Supabase SQL Editor on a fresh project
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Updated At Trigger ────────────────────────────────────────────────────────
-- Defined first so it can be reused by all tables that need it

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- REFERENCE / SEED TABLES
-- These are not user data — they hold app configuration
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Categories ────────────────────────────────────────────────────────────────
-- One row per HelpexAI category (legal, business, and future ones)
-- Adding a new category = insert one row here + new marketing page

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL CHECK (slug IN ('legal', 'business', 'hr', 'medical', 'finance')),
  name            TEXT NOT NULL,
  description     TEXT,
  system_prompt   TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  hero_message    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Plans ─────────────────────────────────────────────────────────────────────
-- Free, Pro, and Premium plan per category

CREATE TABLE plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL CHECK (slug IN ('free', 'pro', 'premium')),
  category_slug       TEXT NOT NULL CHECK (category_slug IN ('legal', 'business')),
  price_monthly       INTEGER NOT NULL DEFAULT 0,           -- in cents (2900 = $29)
  stripe_price_id     TEXT,                                 -- null for free plan
  max_documents       INTEGER NOT NULL,
  max_queries_day     INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(slug, category_slug)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER DATA TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Accounts ──────────────────────────────────────────────────────────────────
-- Extends Supabase Auth users with HelpexAI-specific data
-- One row per user per category (same email can have legal + business account)
-- UNIQUE(user_id, category_slug) enforces one account per category per user

CREATE TABLE accounts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug           TEXT NOT NULL CHECK (category_slug IN ('legal', 'business')),
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  subscription_status     TEXT CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing')),
  deletion_requested_at   TIMESTAMPTZ,                      -- set when user requests deletion
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_slug)
);

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Documents ─────────────────────────────────────────────────────────────────
-- Tracks every uploaded document and its processing state
-- Raw file stored in Supabase Storage at: documents/{user_id}/{category_slug}/{id}/{name}

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug   TEXT NOT NULL CHECK (category_slug IN ('legal', 'business')),
  name            TEXT NOT NULL,                            -- original filename
  file_path       TEXT NOT NULL,                            -- Supabase Storage path
  file_size       INTEGER NOT NULL,                         -- bytes
  file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  status          TEXT NOT NULL DEFAULT 'uploading'
                    CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  chunk_count     INTEGER,                                  -- populated after processing
  error_message   TEXT,                                     -- populated if status = failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Conversations ─────────────────────────────────────────────────────────────
-- Each conversation is scoped to a user + category + selected documents
-- selected_document_ids: array of document IDs included in this conversation
-- is_locked: set to true after first message — document selection cannot change

CREATE TABLE conversations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug           TEXT NOT NULL CHECK (category_slug IN ('legal', 'business')),
  title                   TEXT NOT NULL DEFAULT 'New Conversation',
  selected_document_ids   UUID[] NOT NULL DEFAULT '{}',     -- locked after first message
  external_research_enabled BOOLEAN NOT NULL DEFAULT false, -- opt-in live web research
  is_locked               BOOLEAN NOT NULL DEFAULT false,   -- true = selection locked
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Messages ──────────────────────────────────────────────────────────────────
-- Every user message and AI response in a conversation
-- sources: array of { docId, docName, chunkIndex, pageNumber, excerpt }
-- answer_type: how the AI generated this response

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  sources         JSONB NOT NULL DEFAULT '[]',              -- citation data
  answer_type     TEXT CHECK (answer_type IN ('document', 'general_knowledge', 'off_topic')),
  tokens_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No updated_at on messages — messages are immutable once created

-- ── Usage Logs ────────────────────────────────────────────────────────────────
-- Tracks every action for enforcing plan limits
-- Query daily question count: WHERE user_id = ? AND action = 'query' AND created_at >= today
-- Query total doc count: use documents table directly (not usage_logs)

CREATE TABLE usage_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug   TEXT NOT NULL CHECK (category_slug IN ('legal', 'business')),
  action          TEXT NOT NULL CHECK (action IN ('document_upload', 'query', 'document_delete')),
  tokens_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No updated_at on usage_logs — append-only log table

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_user_category ON accounts(user_id, category_slug);

-- documents
CREATE INDEX idx_documents_user_category ON documents(user_id, category_slug);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_user_category_status ON documents(user_id, category_slug, status);

-- conversations
CREATE INDEX idx_conversations_user_category ON conversations(user_id, category_slug);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- usage_logs
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_logs_user_category_action ON usage_logs(user_id, category_slug, action, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all user data tables
ALTER TABLE accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs     ENABLE ROW LEVEL SECURITY;

-- categories and plans are public reference data — no RLS needed

-- ── Accounts RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (user_id = auth.uid());

-- Note: accounts are never deleted directly — use deletion_requested_at flow

-- ── Documents RLS ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

-- ── Conversations RLS ─────────────────────────────────────────────────────────
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

-- ── Messages RLS ─────────────────────────────────────────────────────────────
-- Messages don't have user_id — access is via conversation ownership

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Messages are immutable — no UPDATE or DELETE policy
-- (conversations DELETE CASCADE handles cleanup)

-- ── Usage Logs RLS ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own usage"
  ON usage_logs FOR SELECT
  USING (user_id = auth.uid());

-- Usage logs are inserted only by server-side service-role routes.

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Seed Categories ───────────────────────────────────────────────────────────
-- system_prompt is stored in code (/lib/ai/prompts/) — placeholder here
-- Update system_prompt values after deploying if storing in DB
-- OR leave as placeholder and load from code (recommended approach)

INSERT INTO categories (slug, name, description, system_prompt, disclaimer_text, hero_message, is_active) VALUES
(
  'legal',
  'Helpex Legal',
  'AI intelligence for legal documents — case files, agreements, court documents, NDAs, and more.',
  'LOAD_FROM_CODE:/lib/ai/prompts/legal.ts',
  'This analysis is generated by AI for informational purposes only and does not constitute legal advice. Always consult a qualified attorney for legal matters.',
  'Get instant answers from your legal documents',
  true
),
(
  'business',
  'Helpex Business',
  'AI intelligence for business documents — contracts, invoices, P&L statements, vendor agreements, and more.',
  'LOAD_FROM_CODE:/lib/ai/prompts/business.ts',
  'This analysis is AI-generated for informational purposes only and does not constitute legal or financial advice. Always consult a qualified professional for important business decisions.',
  'Stop losing money to hidden contract errors',
  true
);

-- ── Seed Plans ────────────────────────────────────────────────────────────────
-- stripe_price_id: fill in after creating Stripe products
-- Create 4 Stripe products: Legal Free, Legal Pro, Business Free, Business Pro

INSERT INTO plans (name, slug, category_slug, price_monthly, stripe_price_id, max_documents, max_queries_day) VALUES
-- Helpex Legal plans
('Free',    'free',    'legal',    0,    NULL,           3,   5),
('Pro',     'pro',     'legal',    2900, 'price_XXXXXX', 30,  30),
('Premium', 'premium', 'legal',    4900, NULL,           100, 100),
-- Helpex Business plans
('Free',    'free',    'business', 0,    NULL,           3,   5),
('Pro',     'pro',     'business', 2900, 'price_YYYYYY', 30,  30),
('Premium', 'premium', 'business', 4900, NULL,           100, 100);

-- Prefer environment-based Stripe price IDs in application configuration.

-- ─────────────────────────────────────────────────────────────────────────────
-- SUPABASE STORAGE
-- ─────────────────────────────────────────────────────────────────────────────

-- Run these AFTER creating the 'documents' bucket in Supabase Storage dashboard:
-- Dashboard → Storage → New bucket → Name: "documents" → Private (not public)

-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage path convention: documents/{user_id}/{category_slug}/{document_id}/{filename}
-- This matches: documents/{userId}/{categorySlug}/{docId}/{filename} in master doc

-- CREATE POLICY "Users can upload own documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'documents'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can read own documents"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'documents'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete own documents"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'documents'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- Run these after migration to confirm everything is set up correctly
-- ─────────────────────────────────────────────────────────────────────────────

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check seed data:
-- SELECT slug, name, is_active FROM categories;
-- SELECT slug, category_slug, price_monthly, max_documents FROM plans;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES FOR DEVELOPER
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. users table: DO NOT create — managed by Supabase Auth (auth.users)
--    category_slug lives in accounts table, not auth.users

-- 2. system_prompt in categories table: two options
--    Option A (recommended): store 'LOAD_FROM_CODE' placeholder, load from
--                            /lib/ai/prompts/legal.ts in application code
--    Option B: update the row with full prompt text after seeding
--    Either way, application code in /lib/ai/pipeline/query.ts loads it

-- 3. Stripe price IDs: update plans rows after creating Stripe products
--    UPDATE plans SET stripe_price_id = 'price_live_xxx' WHERE slug = 'pro' AND category_slug = 'legal';
--    UPDATE plans SET stripe_price_id = 'price_live_yyy' WHERE slug = 'pro' AND category_slug = 'business';

-- 4. Qdrant: no SQL needed — collection created via /lib/utils/qdrant-setup.ts
--    Run separately during Phase 0 setup

-- 5. Account creation: when user signs up, insert row into accounts table
--    via Supabase Auth hook OR in the signup API route
--    Use service role key for this operation

-- 6. is_locked on conversations: set to true when first message is sent
--    UPDATE conversations SET is_locked = true WHERE id = ? AND is_locked = false

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- HelpexAI v2.1 — June 2026
-- ─────────────────────────────────────────────────────────────────────────────
