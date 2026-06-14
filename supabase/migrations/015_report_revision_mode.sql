-- Report revision mode: version history, draft/finalized states, and secure reads.

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('draft', 'generating', 'completed', 'finalized', 'failed'));

CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  instruction TEXT,
  selected_text TEXT,
  tone TEXT CHECK (tone IS NULL OR tone IN ('simple', 'professional', 'formal')),
  length TEXT CHECK (length IS NULL OR length IN ('short', 'standard', 'detailed')),
  diff JSONB,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id, version_number)
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS current_version_id UUID;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_current_version_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES report_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS report_versions_report_number_idx
  ON report_versions(report_id, version_number DESC);

INSERT INTO report_versions(
  report_id, version_number, title, content_markdown, change_summary, created_by, created_at
)
SELECT
  reports.id, 1, reports.title, COALESCE(reports.content, ''),
  'Initial generated report', reports.user_id, reports.created_at
FROM reports
WHERE NOT EXISTS (
  SELECT 1 FROM report_versions WHERE report_versions.report_id = reports.id
);

UPDATE reports
SET current_version_id = initial_version.id
FROM report_versions AS initial_version
WHERE reports.current_version_id IS NULL
  AND initial_version.report_id = reports.id
  AND initial_version.version_number = 1;

ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON report_versions FROM anon, authenticated;
GRANT SELECT ON report_versions TO authenticated;

DROP POLICY IF EXISTS "Users can view workspace report versions" ON report_versions;
CREATE POLICY "Users can view workspace report versions" ON report_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports
    JOIN accounts ON accounts.id = reports.account_id
    WHERE reports.id = report_versions.report_id
      AND reports.user_id = auth.uid()
      AND accounts.user_id = auth.uid()
      AND accounts.category_slug = reports.category_slug
  )
);

CREATE OR REPLACE FUNCTION create_report_with_sources(p_report JSONB, p_source_document_ids UUID[])
RETURNS reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report reports%ROWTYPE;
  v_version report_versions%ROWTYPE;
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
    WHERE id = (p_report->>'collection_id')::UUID AND category_slug = v_category_slug
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
    'markdown', 'draft', COALESCE(p_report->>'source_type', 'documents'),
    NULLIF(p_report->>'collection_id', '')::UUID,
    NULLIF(p_report->>'generated_document_id', '')::UUID, NULLIF(p_report->>'model', ''),
    NULLIF(p_report->>'error_message', ''), COALESCE(p_report->'metadata', '{}'::JSONB),
    COALESCE((p_report->>'generated_at')::TIMESTAMPTZ, now())
  )
  RETURNING * INTO v_report;

  INSERT INTO report_sources(report_id, document_id)
  SELECT v_report.id, source_id FROM unnest(p_source_document_ids) AS source_id;

  INSERT INTO report_versions(
    report_id, version_number, title, content_markdown, change_summary, created_by
  )
  VALUES (
    v_report.id, 1, v_report.title, COALESCE(v_report.content, ''),
    'Initial generated report', v_user_id
  )
  RETURNING * INTO v_version;

  UPDATE reports SET current_version_id = v_version.id WHERE id = v_report.id
  RETURNING * INTO v_report;

  RETURN v_report;
END; $$;

REVOKE ALL ON FUNCTION create_report_with_sources(JSONB, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_report_with_sources(JSONB, UUID[]) TO service_role;
