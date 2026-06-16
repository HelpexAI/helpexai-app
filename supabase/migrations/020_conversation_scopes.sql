-- Conversation scopes: workplace-wide or selected documents/collections.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_scope TEXT NOT NULL DEFAULT 'documents'
  CHECK (conversation_scope IN ('documents', 'workplace'));

UPDATE conversations
SET conversation_scope = 'documents'
WHERE conversation_scope IS NULL;

