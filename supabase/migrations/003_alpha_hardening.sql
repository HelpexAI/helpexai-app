-- Alpha hardening: secure writes, atomic quotas, and rate limiting.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Service role can insert usage" ON usage_logs;

REVOKE INSERT, UPDATE, DELETE ON accounts, documents, conversations, messages, usage_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON categories, plans FROM anon, authenticated;
GRANT SELECT ON categories, plans TO anon, authenticated;

ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS request_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_logs_request_id ON usage_logs(request_id) WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION reserve_daily_query(p_user_id UUID, p_category_slug TEXT, p_request_id UUID)
RETURNS TABLE(allowed BOOLEAN, used INTEGER, quota_limit INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_limit INTEGER; v_used INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_category_slug || ':query', 0));
  SELECT plan INTO v_plan FROM accounts WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT max_queries_day INTO v_limit FROM plans WHERE slug = COALESCE(v_plan, 'free') AND category_slug = p_category_slug;
  SELECT COUNT(*)::INTEGER INTO v_used FROM usage_logs
    WHERE user_id = p_user_id AND category_slug = p_category_slug AND action = 'query'
    AND created_at >= date_trunc('day', timezone('utc', now()));
  IF v_used >= COALESCE(v_limit, 5) THEN RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 5); RETURN; END IF;
  INSERT INTO usage_logs(user_id, category_slug, action, tokens_used, request_id)
    VALUES (p_user_id, p_category_slug, 'query', 0, p_request_id);
  RETURN QUERY SELECT true, v_used + 1, COALESCE(v_limit, 5);
END; $$;

CREATE OR REPLACE FUNCTION reserve_document_uploads(p_user_id UUID, p_category_slug TEXT, p_documents JSONB)
RETURNS TABLE(allowed BOOLEAN, used INTEGER, quota_limit INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_limit INTEGER; v_used INTEGER; v_requested INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_category_slug || ':documents', 0));
  SELECT plan INTO v_plan FROM accounts WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT max_documents INTO v_limit FROM plans WHERE slug = COALESCE(v_plan, 'free') AND category_slug = p_category_slug;
  SELECT COUNT(*)::INTEGER INTO v_used FROM documents WHERE user_id = p_user_id AND category_slug = p_category_slug;
  v_requested := jsonb_array_length(p_documents);
  IF v_used + v_requested > COALESCE(v_limit, 3) THEN RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 3); RETURN; END IF;
  INSERT INTO documents(id, user_id, category_slug, name, file_path, file_size, file_type, status)
  SELECT (item->>'id')::UUID, p_user_id, p_category_slug, item->>'name', item->>'file_path',
    (item->>'file_size')::INTEGER, item->>'file_type', 'uploading'
  FROM jsonb_array_elements(p_documents) AS item;
  RETURN QUERY SELECT true, v_used + v_requested, COALESCE(v_limit, 3);
END; $$;

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION consume_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, retry_after INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row rate_limits%ROWTYPE;
BEGIN
  INSERT INTO rate_limits(key, count) VALUES (p_key, 0) ON CONFLICT (key) DO NOTHING;
  SELECT * INTO v_row FROM rate_limits WHERE key = p_key FOR UPDATE;
  IF v_row.window_started_at + make_interval(secs => p_window_seconds) <= now() THEN
    UPDATE rate_limits SET count = 1, window_started_at = now(), updated_at = now() WHERE key = p_key;
    RETURN QUERY SELECT true, GREATEST(p_limit - 1, 0), p_window_seconds; RETURN;
  END IF;
  IF v_row.count >= p_limit THEN
    RETURN QUERY SELECT false, 0, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.window_started_at + make_interval(secs => p_window_seconds) - now())))::INTEGER); RETURN;
  END IF;
  UPDATE rate_limits SET count = count + 1, updated_at = now() WHERE key = p_key;
  RETURN QUERY SELECT true, GREATEST(p_limit - v_row.count - 1, 0), GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.window_started_at + make_interval(secs => p_window_seconds) - now())))::INTEGER);
END; $$;

REVOKE ALL ON FUNCTION reserve_daily_query(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_daily_query(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
