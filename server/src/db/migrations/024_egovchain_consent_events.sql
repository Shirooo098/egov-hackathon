ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'coordination';
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'case';
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS evidence text;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS commitment_salt text;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS commitment text;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS anchor_status text NOT NULL DEFAULT 'pending';
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS anchor_tx_hash text;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS anchor_block_hash text;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS anchor_block_number bigint;
ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS anchor_error_code text;
ALTER TABLE episode_consents DROP CONSTRAINT IF EXISTS episode_consents_episode_id_consent_version_key;
CREATE UNIQUE INDEX IF NOT EXISTS episode_consents_event_idem_idx ON episode_consents(actor_account_id, idempotency_key);

ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'coordination';
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'pair';
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS evidence text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS commitment_salt text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS commitment text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS anchor_status text NOT NULL DEFAULT 'pending';
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS anchor_tx_hash text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS anchor_block_hash text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS anchor_block_number bigint;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS anchor_error_code text;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS consent_scope_version integer;
UPDATE pair_proposals SET consent_scope_version=version WHERE consent_scope_version IS NULL;
ALTER TABLE pair_proposals ALTER COLUMN consent_scope_version SET DEFAULT 1;
ALTER TABLE pair_proposals ALTER COLUMN consent_scope_version SET NOT NULL;
ALTER TABLE pair_consents DROP CONSTRAINT IF EXISTS pair_consents_pair_id_episode_id_consent_version_key;
CREATE UNIQUE INDEX IF NOT EXISTS pair_consents_event_idem_idx ON pair_consents(actor_account_id, idempotency_key);

CREATE TABLE IF NOT EXISTS consent_anchor_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_consent_id uuid REFERENCES episode_consents(id) ON DELETE CASCADE,
  pair_consent_id uuid REFERENCES pair_consents(id) ON DELETE CASCADE,
  commitment text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  lease_owner text,
  signer_address text,
  nonce bigint,
  raw_transaction text,
  tx_hash text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(episode_consent_id, pair_consent_id)=1),
  UNIQUE(commitment)
);
CREATE INDEX IF NOT EXISTS consent_anchor_outbox_ready_idx ON consent_anchor_outbox(status, available_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS consent_anchor_outbox_signer_nonce_idx ON consent_anchor_outbox(signer_address, nonce) WHERE signer_address IS NOT NULL AND nonce IS NOT NULL;
