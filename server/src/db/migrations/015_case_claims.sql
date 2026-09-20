-- Purpose-bound hospital claims. Raw invitation values are never persisted.
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'active';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS intended_uniqid text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS issued_by_account_id uuid REFERENCES accounts(id);
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_state_ck;
ALTER TABLE invitations ADD CONSTRAINT invitations_state_ck CHECK (state IN ('active','suspended','consumed','expired','revoked'));
CREATE INDEX IF NOT EXISTS invitations_claim_scope_idx ON invitations(purpose, target_reference, state, expires_at);
UPDATE invitations SET state='revoked' WHERE purpose='case_claim' AND state='active' AND intended_account_id IS NULL AND NULLIF(BTRIM(intended_uniqid),'') IS NULL;
ALTER TABLE case_claims ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE case_claims ADD COLUMN IF NOT EXISTS outcome_hash bytea;
ALTER TABLE case_claims ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS case_claims_invitation_idx ON case_claims(invitation_id);
CREATE UNIQUE INDEX IF NOT EXISTS case_claims_claimant_case_idx ON case_claims(claimant_account_id, case_id);
CREATE TABLE IF NOT EXISTS hospital_linkage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), linkage_id uuid NOT NULL REFERENCES hospital_linkages(id) ON DELETE CASCADE,
  state text NOT NULL, hospital_reference text NOT NULL, evidence_reference text, method text,
  actor_account_id uuid REFERENCES accounts(id), reason text, version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hospital_linkage_history_linkage_idx ON hospital_linkage_history(linkage_id, version);
