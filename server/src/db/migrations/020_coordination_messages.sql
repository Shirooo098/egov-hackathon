ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pair_id uuid REFERENCES pair_proposals(id);
ALTER TABLE conversations ALTER COLUMN episode_id DROP NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS request_hash bytea;
CREATE UNIQUE INDEX IF NOT EXISTS messages_actor_idempotency_idx
  ON messages(sender_account_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_team_episode_idx
  ON conversations(episode_id) WHERE pair_id IS NULL;
