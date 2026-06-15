-- Generic knowledge foundation. Documents and finalized reports are the first
-- source types; future integrations can add Drive, Slack, CRM, email, or DB.

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'report', 'database', 'google_drive', 'slack', 'email', 'crm')),
  origin_ref TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, type, origin_ref)
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('document', 'report', 'database_record', 'drive_file', 'slack_thread', 'email_thread', 'crm_record')),
  origin_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'archived')),
  content_preview TEXT NOT NULL DEFAULT '',
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, origin_ref)
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS knowledge_item_tag_assignments (
  item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(item_id, tag_id)
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS knowledge_source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS knowledge_source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS knowledge_sources_workspace_type_idx ON knowledge_sources(account_id, type, status);
CREATE INDEX IF NOT EXISTS knowledge_items_workspace_type_idx ON knowledge_items(account_id, type, status);
CREATE INDEX IF NOT EXISTS knowledge_items_collection_idx ON knowledge_items(collection_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_workspace_item_idx ON knowledge_chunks(account_id, item_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS knowledge_item_tags_tag_idx ON knowledge_item_tag_assignments(tag_id);

DROP TRIGGER IF EXISTS knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER knowledge_sources_updated_at BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS knowledge_items_updated_at ON knowledge_items;
CREATE TRIGGER knowledge_items_updated_at BEFORE UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS knowledge_chunks_updated_at ON knowledge_chunks;
CREATE TRIGGER knowledge_chunks_updated_at BEFORE UPDATE ON knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Remove legacy report copies before backfilling uploaded documents. Reports
-- now remain separate knowledge items and never appear in Documents.
DELETE FROM documents
WHERE id IN (
  SELECT generated_document_id FROM reports WHERE generated_document_id IS NOT NULL
);

-- Backfill uploaded documents without changing their existing IDs or flows.
INSERT INTO knowledge_sources(account_id, user_id, category_slug, type, origin_ref, name, status, metadata, created_at, updated_at)
SELECT accounts.id, documents.user_id, documents.category_slug, 'document', documents.id::TEXT,
  documents.name,
  CASE documents.status WHEN 'ready' THEN 'ready' WHEN 'failed' THEN 'failed' WHEN 'processing' THEN 'processing' ELSE 'pending' END,
  jsonb_build_object('documentId', documents.id, 'fileType', documents.file_type, 'filePath', documents.file_path),
  documents.created_at, documents.updated_at
FROM documents
JOIN accounts ON accounts.user_id = documents.user_id AND accounts.category_slug = documents.category_slug
ON CONFLICT (account_id, type, origin_ref) DO NOTHING;

INSERT INTO knowledge_items(account_id, user_id, category_slug, source_id, type, origin_ref, title, status, collection_id, metadata, created_at, updated_at)
SELECT sources.account_id, documents.user_id, documents.category_slug, sources.id, 'document', documents.id::TEXT,
  documents.name, sources.status, documents.collection_id,
  jsonb_build_object('documentId', documents.id, 'fileType', documents.file_type),
  documents.created_at, documents.updated_at
FROM documents
JOIN knowledge_sources AS sources
  ON sources.user_id = documents.user_id AND sources.category_slug = documents.category_slug
  AND sources.type = 'document' AND sources.origin_ref = documents.id::TEXT
ON CONFLICT (source_id, origin_ref) DO NOTHING;

UPDATE documents SET
  knowledge_source_id = sources.id,
  knowledge_item_id = items.id
FROM knowledge_sources AS sources
JOIN knowledge_items AS items ON items.source_id = sources.id
WHERE sources.type = 'document' AND sources.origin_ref = documents.id::TEXT
  AND sources.user_id = documents.user_id AND sources.category_slug = documents.category_slug;

INSERT INTO knowledge_item_tag_assignments(item_id, tag_id)
SELECT documents.knowledge_item_id, assignments.tag_id
FROM documents
JOIN document_tag_assignments AS assignments ON assignments.document_id = documents.id
WHERE documents.knowledge_item_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Finalized reports become report knowledge items, never fake documents.
INSERT INTO knowledge_sources(account_id, user_id, category_slug, type, origin_ref, name, status, metadata, created_at, updated_at)
SELECT reports.account_id, reports.user_id, reports.category_slug, 'report', reports.id::TEXT,
  reports.title, 'ready', jsonb_build_object('reportId', reports.id, 'currentVersionId', reports.current_version_id),
  reports.created_at, reports.updated_at
FROM reports
WHERE reports.status = 'finalized' AND reports.account_id IS NOT NULL
ON CONFLICT (account_id, type, origin_ref) DO NOTHING;

INSERT INTO knowledge_items(account_id, user_id, category_slug, source_id, type, origin_ref, title, status, content_preview, collection_id, metadata, created_at, updated_at)
SELECT sources.account_id, reports.user_id, reports.category_slug, sources.id, 'report', reports.id::TEXT,
  reports.title, 'ready', left(COALESCE(reports.content, ''), 1000), reports.collection_id,
  jsonb_build_object('reportId', reports.id, 'currentVersionId', reports.current_version_id),
  reports.created_at, reports.updated_at
FROM reports
JOIN knowledge_sources AS sources
  ON sources.user_id = reports.user_id AND sources.category_slug = reports.category_slug
  AND sources.type = 'report' AND sources.origin_ref = reports.id::TEXT
WHERE reports.status = 'finalized'
ON CONFLICT (source_id, origin_ref) DO NOTHING;

UPDATE reports SET
  knowledge_source_id = sources.id,
  knowledge_item_id = items.id,
  generated_document_id = NULL
FROM knowledge_sources AS sources
JOIN knowledge_items AS items ON items.source_id = sources.id
WHERE sources.type = 'report' AND sources.origin_ref = reports.id::TEXT
  AND sources.user_id = reports.user_id AND sources.category_slug = reports.category_slug;

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_item_tag_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON knowledge_sources, knowledge_items, knowledge_chunks, knowledge_item_tag_assignments FROM anon, authenticated;
GRANT SELECT ON knowledge_sources, knowledge_items, knowledge_chunks, knowledge_item_tag_assignments TO authenticated;

DROP POLICY IF EXISTS "Users can view workspace knowledge sources" ON knowledge_sources;
CREATE POLICY "Users can view workspace knowledge sources" ON knowledge_sources FOR SELECT USING (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = knowledge_sources.account_id AND accounts.user_id = auth.uid()
      AND accounts.category_slug = knowledge_sources.category_slug
  )
);
DROP POLICY IF EXISTS "Users can view workspace knowledge items" ON knowledge_items;
CREATE POLICY "Users can view workspace knowledge items" ON knowledge_items FOR SELECT USING (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = knowledge_items.account_id AND accounts.user_id = auth.uid()
      AND accounts.category_slug = knowledge_items.category_slug
  )
);
DROP POLICY IF EXISTS "Users can view workspace knowledge chunks" ON knowledge_chunks;
CREATE POLICY "Users can view workspace knowledge chunks" ON knowledge_chunks FOR SELECT USING (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM accounts WHERE accounts.id = knowledge_chunks.account_id AND accounts.user_id = auth.uid()
      AND accounts.category_slug = knowledge_chunks.category_slug
  )
);
DROP POLICY IF EXISTS "Users can view workspace knowledge item tags" ON knowledge_item_tag_assignments;
CREATE POLICY "Users can view workspace knowledge item tags" ON knowledge_item_tag_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM knowledge_items WHERE knowledge_items.id = item_id AND knowledge_items.user_id = auth.uid())
);
