-- Persist whether a conversation may use paid live web research.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS external_research_enabled BOOLEAN NOT NULL DEFAULT false;
