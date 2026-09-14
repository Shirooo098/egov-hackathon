CREATE TABLE IF NOT EXISTS pair_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pair_proposals(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id),
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  consent_version text NOT NULL DEFAULT 'v1.0',
  consent_hash text NOT NULL,
  action text NOT NULL DEFAULT 'grant',
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pair_id, episode_id, consent_version),
  UNIQUE(actor_account_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS episode_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  consent_version text NOT NULL DEFAULT 'v1.0',
  consent_hash text NOT NULL,
  action text NOT NULL DEFAULT 'grant',
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(episode_id, consent_version),
  UNIQUE(actor_account_id, idempotency_key)
);

ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS simulated_anchor_tx text;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS simulated_anchor_hash text;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS anchor_status text;

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS pause_reason text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS withdrawal_reason text;
