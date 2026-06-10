-- Make HelpexAI products/categories fully database-driven.
-- Existing inactive products and their user data are preserved.

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_check;
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_category_slug_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_category_slug_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_slug_check;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_category_slug_check;
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_category_slug_check;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'briefcase',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_topic_response TEXT,
  ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS marketing JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE categories
SET
  short_name = COALESCE(short_name, regexp_replace(name, '^Helpex\s+', '')),
  off_topic_response = COALESCE(
    off_topic_response,
    'I am designed to help you analyse documents relevant to this workspace. Upload a document or ask a question about your selected files.'
  );

INSERT INTO categories (
  slug, name, short_name, description, system_prompt, disclaimer_text,
  hero_message, icon, sort_order, is_active
)
VALUES (
  'business',
  'Helpex Business',
  'Business',
  'AI intelligence for business documents, contracts, invoices, policies, proposals, and reports.',
  'Configured by migration 009_dynamic_products.sql',
  'AI analysis only. Always verify important business decisions with a qualified professional.',
  'Turn business documents into clear, actionable answers',
  'briefcase',
  1,
  true
)
ON CONFLICT (slug) DO NOTHING;

UPDATE categories
SET
  icon = 'briefcase',
  sort_order = 1,
  is_active = true,
  system_prompt = $prompt$
You are Helpex Business, an evidence-first business document analyst focused on contracts, invoices, procurement, operations, and financial controls.

Identify the relevant entities, document types, dates, currencies, periods, line items, terms, approvals, and dependencies. Separate document facts, calculations or inferences, and information not provided. Reconcile related documents whenever possible, quantify impact using the document's currency, flag exceptions and risks, and convert findings into practical next steps.

Treat supplied document context as authoritative for document facts. Never invent transactions, calculations, benchmarks, web sources, approvals, or business facts. Cite the strongest supporting document, line item, section, or page available. Clearly label uncertainty and recommend human verification before consequential legal, financial, payment, or vendor actions. Do not append a disclaimer because the application displays it separately.

Lead with the business answer or quantified finding, then show supporting evidence, calculation, risk or impact, and the recommended next action. Use concise Markdown.
$prompt$,
  off_topic_response = 'I am designed to help you analyse business documents, including contracts, invoices, service agreements, policies, reports, and purchase orders. Upload a document or ask a question related to your selected files.',
  disclaimer_text = 'AI analysis only. This does not constitute legal or financial advice. Always verify important business decisions with a qualified professional.',
  theme = '{
    "primary":"16 185 129",
    "primaryHover":"5 150 105",
    "primaryForeground":"255 255 255",
    "soft":"236 253 245",
    "softDark":"2 44 34",
    "softForeground":"5 150 105",
    "softForegroundDark":"52 211 153",
    "border":"167 243 208",
    "borderDark":"6 78 59"
  }'::jsonb,
  marketing = jsonb_build_object(
    'eyebrow', 'AI document intelligence for growing businesses',
    'headline', 'Turn business documents into clear, actionable answers',
    'description', 'Understand contracts, invoices, policies, proposals, and reports without losing hours to manual review.',
    'audience', 'small businesses, operators, founders, finance teams, and consultants'
  ),
  updated_at = now()
WHERE slug = 'business';

UPDATE categories SET is_active = false, updated_at = now() WHERE slug <> 'business';

INSERT INTO plans (name, slug, category_slug, price_monthly, stripe_price_id, max_documents, max_queries_day)
VALUES
  ('Free', 'free', 'business', 0, NULL, 3, 5),
  ('Pro', 'pro', 'business', 2900, NULL, 30, 30),
  ('Premium', 'premium', 'business', 4900, NULL, 100, 100)
ON CONFLICT (slug, category_slug) DO NOTHING;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_categories_active_sort
  ON categories(is_active, sort_order, name);

CREATE OR REPLACE FUNCTION seed_default_product_plans()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO plans (name, slug, category_slug, price_monthly, stripe_price_id, max_documents, max_queries_day)
  VALUES
    ('Free', 'free', NEW.slug, 0, NULL, 3, 5),
    ('Pro', 'pro', NEW.slug, 2900, NULL, 30, 30),
    ('Premium', 'premium', NEW.slug, 4900, NULL, 100, 100)
  ON CONFLICT (slug, category_slug) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_seed_default_plans ON categories;
CREATE TRIGGER categories_seed_default_plans
  AFTER INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION seed_default_product_plans();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

REVOKE INSERT, UPDATE, DELETE ON categories FROM anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
