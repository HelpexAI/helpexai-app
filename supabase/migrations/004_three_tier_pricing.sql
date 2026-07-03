-- Add Free, Pro, and Premium pricing for both Legal and Business.

ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_slug_check;
ALTER TABLE plans ADD CONSTRAINT plans_slug_check CHECK (slug IN ('free', 'pro', 'premium'));

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_plan_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_plan_check CHECK (plan IN ('free', 'pro', 'premium'));

INSERT INTO plans (name, slug, category_slug, price_monthly, creem_product_id, max_documents, max_queries_day)
VALUES
  ('Free', 'free', 'legal', 0, NULL, 3, 5),
  ('Pro', 'pro', 'legal', 2900, NULL, 30, 30),
  ('Premium', 'premium', 'legal', 4900, NULL, 100, 100),
  ('Free', 'free', 'business', 0, NULL, 3, 5),
  ('Pro', 'pro', 'business', 2900, NULL, 30, 30),
  ('Premium', 'premium', 'business', 4900, NULL, 100, 100)
ON CONFLICT (slug, category_slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_documents = EXCLUDED.max_documents,
  max_queries_day = EXCLUDED.max_queries_day;
