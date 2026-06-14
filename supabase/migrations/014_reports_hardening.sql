-- Reports hardening: workspace isolation and atomic report/source creation.

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_collection_id_fkey;
ALTER TABLE reports
  ADD CONSTRAINT reports_collection_id_fkey
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL;

REVOKE INSERT, UPDATE, DELETE ON reports, report_sources, report_templates FROM anon, authenticated;
GRANT SELECT ON reports, report_sources, report_templates TO authenticated;

UPDATE reports
SET account_id = accounts.id
FROM accounts
WHERE reports.account_id IS NULL
  AND accounts.user_id = reports.user_id
  AND accounts.category_slug = reports.category_slug;

DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
CREATE POLICY "Users can view reports in their workspace" ON reports FOR SELECT
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = reports.account_id
      AND accounts.user_id = auth.uid()
      AND accounts.category_slug = reports.category_slug
  )
);

DROP POLICY IF EXISTS "Users can create their own reports" ON reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON reports;

DROP POLICY IF EXISTS "Users can view report sources for their reports" ON report_sources;
CREATE POLICY "Users can view workspace report sources" ON report_sources FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM reports
    JOIN documents ON documents.id = report_sources.document_id
    WHERE reports.id = report_sources.report_id
      AND reports.user_id = auth.uid()
      AND documents.user_id = auth.uid()
      AND documents.category_slug = reports.category_slug
      AND EXISTS (
        SELECT 1 FROM accounts
        WHERE accounts.id = reports.account_id
          AND accounts.user_id = auth.uid()
          AND accounts.category_slug = reports.category_slug
      )
  )
);

DROP POLICY IF EXISTS "Users can insert report sources for their reports" ON report_sources;
DROP POLICY IF EXISTS "Users can delete report sources for their reports" ON report_sources;

CREATE OR REPLACE FUNCTION create_report_with_sources(p_report JSONB, p_source_document_ids UUID[])
RETURNS reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report reports%ROWTYPE;
  v_user_id UUID := (p_report->>'user_id')::UUID;
  v_account_id UUID := (p_report->>'account_id')::UUID;
  v_category_slug TEXT := p_report->>'category_slug';
  v_valid_source_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = v_account_id AND user_id = v_user_id AND category_slug = v_category_slug
  ) THEN
    RAISE EXCEPTION 'Invalid report workspace.';
  END IF;

  IF NULLIF(p_report->>'collection_id', '') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM collections
    WHERE id = (p_report->>'collection_id')::UUID
      AND category_slug = v_category_slug
  ) THEN
    RAISE EXCEPTION 'Invalid report collection.';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_valid_source_count
  FROM documents
  WHERE id = ANY(p_source_document_ids)
    AND user_id = v_user_id
    AND category_slug = v_category_slug
    AND status = 'ready';

  IF v_valid_source_count <> cardinality(p_source_document_ids) THEN
    RAISE EXCEPTION 'One or more report sources are invalid.';
  END IF;

  INSERT INTO reports (
    user_id, account_id, category_slug, title, prompt, template_id, template_slug,
    template_snapshot, content, content_format, status, source_type, collection_id,
    generated_document_id, model, error_message, metadata, generated_at
  )
  VALUES (
    v_user_id, v_account_id, v_category_slug, p_report->>'title', p_report->>'prompt',
    NULLIF(p_report->>'template_id', '')::UUID, NULLIF(p_report->>'template_slug', ''),
    COALESCE(p_report->'template_snapshot', '{}'::JSONB), p_report->>'content',
    COALESCE(p_report->>'content_format', 'markdown'), COALESCE(p_report->>'status', 'completed'),
    COALESCE(p_report->>'source_type', 'documents'), NULLIF(p_report->>'collection_id', '')::UUID,
    NULLIF(p_report->>'generated_document_id', '')::UUID, NULLIF(p_report->>'model', ''),
    NULLIF(p_report->>'error_message', ''), COALESCE(p_report->'metadata', '{}'::JSONB),
    COALESCE((p_report->>'generated_at')::TIMESTAMPTZ, now())
  )
  RETURNING * INTO v_report;

  INSERT INTO report_sources(report_id, document_id)
  SELECT v_report.id, source_id FROM unnest(p_source_document_ids) AS source_id;

  RETURN v_report;
END; $$;

REVOKE ALL ON FUNCTION create_report_with_sources(JSONB, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_report_with_sources(JSONB, UUID[]) TO service_role;
