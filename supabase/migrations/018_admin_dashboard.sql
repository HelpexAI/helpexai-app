-- Internal platform administration, operational events, and richer usage data.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_slug TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feature TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_micros BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE usage_logs SET feature = action WHERE feature IS NULL;

CREATE INDEX IF NOT EXISTS platform_admins_role_idx ON platform_admins(role);
CREATE INDEX IF NOT EXISTS system_events_created_idx ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_severity_created_idx ON system_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_logs_feature_created_idx ON usage_logs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_logs_account_created_idx ON usage_logs(account_id, created_at DESC);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON platform_admins, system_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON collections, tags FROM anon, authenticated;

-- Bootstrap the first administrator manually after applying this migration:
-- INSERT INTO platform_admins(user_id, role)
-- SELECT id, 'super_admin' FROM auth.users WHERE email = 'you@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

