-- Usage semantics:
-- - Storage is current stored document bytes, so deleting a document frees space.
-- - Queries count successful daily answers; failed reservations are released by the API.
-- - Reports count successful monthly generations; deleting a report does not refund usage.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_reports_month INTEGER;

UPDATE plans SET
  max_storage_bytes = CASE slug
    WHEN 'premium' THEN 2147483648
    WHEN 'pro' THEN 524288000
    ELSE 31457280
  END,
  max_queries_day = CASE slug
    WHEN 'premium' THEN -1
    WHEN 'pro' THEN 500
    ELSE 100
  END,
  max_reports_month = CASE slug
    WHEN 'premium' THEN 100
    WHEN 'pro' THEN 30
    ELSE 5
  END;

ALTER TABLE plans ALTER COLUMN max_storage_bytes SET NOT NULL;
ALTER TABLE plans ALTER COLUMN max_reports_month SET NOT NULL;
ALTER TABLE plans ALTER COLUMN max_storage_bytes SET DEFAULT 31457280;
ALTER TABLE plans ALTER COLUMN max_reports_month SET DEFAULT 5;

ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_action_check;
ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_action_check
  CHECK (action IN ('document_upload', 'query', 'document_delete', 'report_generate'));

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
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  IF COALESCE(v_limit, 100) >= 0 AND v_used >= COALESCE(v_limit, 100) THEN
    RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 100); RETURN;
  END IF;
  INSERT INTO usage_logs(user_id, category_slug, action, tokens_used, request_id)
  VALUES (p_user_id, p_category_slug, 'query', 0, p_request_id);
  RETURN QUERY SELECT true, v_used + 1, COALESCE(v_limit, -1);
END; $$;

DROP FUNCTION IF EXISTS reserve_document_uploads(UUID, TEXT, JSONB);
CREATE OR REPLACE FUNCTION reserve_document_uploads(p_user_id UUID, p_category_slug TEXT, p_documents JSONB)
RETURNS TABLE(allowed BOOLEAN, used BIGINT, quota_limit BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_limit BIGINT; v_used BIGINT; v_requested BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_category_slug || ':storage', 0));
  SELECT plan INTO v_plan FROM accounts WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT max_storage_bytes INTO v_limit FROM plans WHERE slug = COALESCE(v_plan, 'free') AND category_slug = p_category_slug;
  SELECT COALESCE(SUM(file_size), 0)::BIGINT INTO v_used FROM documents
    WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT COALESCE(SUM((item->>'file_size')::BIGINT), 0)::BIGINT INTO v_requested
    FROM jsonb_array_elements(p_documents) AS item;
  IF v_used + v_requested > COALESCE(v_limit, 31457280) THEN
    RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 31457280); RETURN;
  END IF;
  INSERT INTO documents(id, user_id, category_slug, collection_id, name, file_path, file_size, file_type, status)
  SELECT (item->>'id')::UUID, p_user_id, p_category_slug, (item->>'collection_id')::UUID,
    item->>'name', item->>'file_path', (item->>'file_size')::INTEGER, item->>'file_type', 'uploading'
  FROM jsonb_array_elements(p_documents) AS item;
  RETURN QUERY SELECT true, v_used + v_requested, COALESCE(v_limit, 31457280);
END; $$;

CREATE OR REPLACE FUNCTION reserve_monthly_report(p_user_id UUID, p_category_slug TEXT, p_request_id UUID)
RETURNS TABLE(allowed BOOLEAN, used INTEGER, quota_limit INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_limit INTEGER; v_used INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_category_slug || ':report', 0));
  SELECT plan INTO v_plan FROM accounts WHERE user_id = p_user_id AND category_slug = p_category_slug;
  SELECT max_reports_month INTO v_limit FROM plans WHERE slug = COALESCE(v_plan, 'free') AND category_slug = p_category_slug;
  SELECT COUNT(*)::INTEGER INTO v_used FROM usage_logs
    WHERE user_id = p_user_id AND category_slug = p_category_slug AND action = 'report_generate'
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');
  IF v_used >= COALESCE(v_limit, 5) THEN
    RETURN QUERY SELECT false, v_used, COALESCE(v_limit, 5); RETURN;
  END IF;
  INSERT INTO usage_logs(user_id, category_slug, action, tokens_used, request_id)
  VALUES (p_user_id, p_category_slug, 'report_generate', 0, p_request_id);
  RETURN QUERY SELECT true, v_used + 1, COALESCE(v_limit, 5);
END; $$;

REVOKE ALL ON FUNCTION reserve_daily_query(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reserve_monthly_report(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_daily_query(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_document_uploads(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_monthly_report(UUID, TEXT, UUID) TO service_role;
