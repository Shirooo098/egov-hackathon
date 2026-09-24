CREATE TABLE IF NOT EXISTS egov_sso_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cookie_hash bytea NOT NULL UNIQUE,
  exchange_transaction_id uuid NOT NULL REFERENCES egov_exchange_transactions(id),
  uniqid text NOT NULL CHECK (char_length(uniqid) BETWEEN 1 AND 200),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 200),
  provider text NOT NULL CHECK (provider = 'egovph'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS egov_sso_pending_active_idx ON egov_sso_pending(cookie_hash, expires_at);
ALTER TABLE egov_identities ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'legacy_unverified';
ALTER TABLE egov_exchange_transactions ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'egovph';
