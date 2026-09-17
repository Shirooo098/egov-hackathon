ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS reviewer_account_id uuid REFERENCES accounts(id);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'awaiting_citizen_acceptance';
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS selected_by uuid REFERENCES accounts(id);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS selection_idempotency_key text;
ALTER TABLE pair_responses ADD COLUMN IF NOT EXISTS response_hash bytea;
CREATE UNIQUE INDEX IF NOT EXISTS pair_selection_idempotency_idx ON pair_proposals(selected_by,selection_idempotency_key) WHERE selection_idempotency_key IS NOT NULL;
