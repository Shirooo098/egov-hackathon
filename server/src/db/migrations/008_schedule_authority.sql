-- Server-authoritative simulated hospital scheduling.
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS response_source text;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS response_author_reference text;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS hospital_response_reference text;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS decision_idempotency_key text;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS decision_actor_account_id uuid REFERENCES accounts(id);
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS response_external_reference text;
UPDATE appointment_requests SET status = 'request_pending' WHERE status = 'pending';
ALTER TABLE appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_status_ck;
ALTER TABLE appointment_requests ADD CONSTRAINT appointment_requests_status_ck CHECK (status IN ('request_pending','hospital_confirmed','hospital_declined','cancelled'));
DROP INDEX IF EXISTS appointment_requests_decision_key_idx;
CREATE UNIQUE INDEX IF NOT EXISTS appointment_requests_decision_key_idx
  ON appointment_requests(decision_actor_account_id, decision_idempotency_key) WHERE decision_idempotency_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS appointment_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES appointment_requests(id),
  status text NOT NULL,
  source text NOT NULL,
  author_reference text NOT NULL,
  external_reference text,
  details jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, status)
);
