-- Completes the synthetic model after the shared platform foundation migration.
ALTER TABLE appointment_requests ALTER COLUMN status SET DEFAULT 'request_pending';

CREATE TABLE IF NOT EXISTS hospital_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid NOT NULL REFERENCES hospitals(id), service_id uuid NOT NULL REFERENCES services(id),
  slot_reference text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'published', capacity integer NOT NULL DEFAULT 1 CHECK (capacity = 1),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, slot_reference), CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS case_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invitation_id uuid NOT NULL REFERENCES invitations(id), case_id uuid NOT NULL REFERENCES citizen_cases(id),
  claimant_account_id uuid NOT NULL REFERENCES accounts(id), state text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS case_claims_one_verified_idx ON case_claims(case_id) WHERE state = 'verified';
CREATE TABLE IF NOT EXISTS pair_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), own_episode_id uuid NOT NULL REFERENCES episodes(id), counterpart_episode_id uuid REFERENCES episodes(id),
  status text NOT NULL DEFAULT 'proposed', own_confirmed_at timestamptz, counterpart_confirmed_at timestamptz,
  verified_by uuid REFERENCES accounts(id), verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deceased_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_episode_id uuid NOT NULL REFERENCES episodes(id), external_reference text NOT NULL UNIQUE,
  source_deadline timestamptz, status text NOT NULL DEFAULT 'received', acknowledgement_reference text, response_reference text, response_status text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE staff_assignments ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES clinical_reviews(id);
ALTER TABLE staff_assignments ALTER COLUMN episode_id DROP NOT NULL;
ALTER TABLE clinical_reviews ADD COLUMN IF NOT EXISTS pair_id uuid REFERENCES pair_proposals(id);
ALTER TABLE clinical_reviews ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES deceased_offers(id);
ALTER TABLE clinical_reviews ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE clinical_reviews DROP CONSTRAINT IF EXISTS clinical_reviews_one_target;
ALTER TABLE clinical_reviews ADD CONSTRAINT clinical_reviews_one_target CHECK (num_nonnulls(episode_id, pair_id, offer_id) = 1);
CREATE TABLE IF NOT EXISTS booking_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES appointment_requests(id), booking_id uuid NOT NULL REFERENCES bookings(id),
  intent text NOT NULL CHECK (intent IN ('cancel', 'reschedule')), preferences jsonb, status text NOT NULL DEFAULT 'change_pending',
  actor_account_id uuid NOT NULL REFERENCES accounts(id), idempotency_key text NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (actor_account_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid NOT NULL REFERENCES hospitals(id), service_id uuid NOT NULL REFERENCES services(id),
  public_text text NOT NULL, status text NOT NULL DEFAULT 'draft', approver_id uuid REFERENCES accounts(id), approval_reference text, approved_at timestamptz,
  source text, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blood_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), blood_request_id uuid NOT NULL REFERENCES blood_requests(id), donor_episode_id uuid NOT NULL REFERENCES episodes(id),
  appointment_request_id uuid NOT NULL REFERENCES appointment_requests(id), actor_account_id uuid NOT NULL REFERENCES accounts(id), idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (blood_request_id, donor_episode_id), UNIQUE (actor_account_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS coordination_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_reference text NOT NULL, category text NOT NULL, value jsonb NOT NULL,
  source text NOT NULL, author_reference text NOT NULL, occurred_at timestamptz NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
