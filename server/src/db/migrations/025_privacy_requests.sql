-- 025_privacy_requests.sql: Privacy requests, correction history, and exports
CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access', 'correction', 'restriction', 'objection', 'export')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'fulfilled', 'rejected')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  rejection_reason text,
  fulfilled_at timestamptz,
  fulfilled_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS privacy_correction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES privacy_requests(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_record_type text NOT NULL,
  target_record_id uuid,
  field_name text NOT NULL,
  previous_value text,
  new_value text,
  version integer NOT NULL,
  applied_by uuid NOT NULL REFERENCES accounts(id),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS privacy_requests_account_idx ON privacy_requests(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS privacy_corrections_account_idx ON privacy_correction_history(account_id, applied_at DESC);
