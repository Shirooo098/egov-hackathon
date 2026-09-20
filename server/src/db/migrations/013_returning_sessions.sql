-- Returning eGov sessions and verification evidence. Existing sessions remain valid.
ALTER TABLE egov_exchange_transactions ALTER COLUMN invitation_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS egov_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  uniqid text NOT NULL,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  exchange_transaction_id uuid NOT NULL UNIQUE REFERENCES egov_exchange_transactions(id) ON DELETE RESTRICT,
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS egov_verification_history_account_idx ON egov_verification_history(account_id, verified_at DESC);
