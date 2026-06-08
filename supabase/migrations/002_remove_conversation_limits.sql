-- Conversations are unlimited on every plan.
ALTER TABLE plans DROP COLUMN IF EXISTS max_conversations;

