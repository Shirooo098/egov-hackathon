CREATE TABLE IF NOT EXISTS egov_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  uniqid text NOT NULL UNIQUE CHECK (char_length(uniqid) BETWEEN 1 AND 200),
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS egov_exchange_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash bytea NOT NULL UNIQUE,
  invitation_id uuid NOT NULL REFERENCES invitations(id),
  uniqid text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS egov_exchange_active_idx ON egov_exchange_transactions(code_hash, expires_at);
