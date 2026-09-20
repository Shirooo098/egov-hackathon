CREATE TABLE IF NOT EXISTS citizen_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid REFERENCES accounts(id), hospital_id uuid REFERENCES hospitals(id),
  service_id uuid NOT NULL REFERENCES services(id), role text NOT NULL CHECK (role IN ('donor','recipient')),
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES citizen_cases(id), lifecycle text NOT NULL DEFAULT 'created',
  participation text NOT NULL DEFAULT 'active', version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hospital_linkages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES citizen_cases(id), episode_id uuid NOT NULL REFERENCES episodes(id),
  hospital_reference text NOT NULL, state text NOT NULL DEFAULT 'pending', verification_method text, verification_source text,
  verifier_account_id uuid REFERENCES accounts(id), verified_at timestamptz, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), episode_id uuid NOT NULL REFERENCES episodes(id), primary_staff_id uuid NOT NULL REFERENCES accounts(id),
  coverage_staff_id uuid REFERENCES accounts(id), service_id uuid NOT NULL REFERENCES services(id), version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clinical_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), episode_id uuid NOT NULL REFERENCES episodes(id), hospital_reference text NOT NULL,
  category text NOT NULL, approved_summary text, next_action text, source text NOT NULL, author_reference text NOT NULL,
  occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), episode_id uuid NOT NULL REFERENCES episodes(id), slot_reference text,
  preferred_dates jsonb, status text NOT NULL DEFAULT 'pending', actor_account_id uuid NOT NULL REFERENCES accounts(id),
  idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_account_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES appointment_requests(id), slot_reference text NOT NULL,
  hospital_booking_reference text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'confirmed', version integer NOT NULL DEFAULT 1,
  confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx ON bookings(slot_reference) WHERE status = 'confirmed';
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), episode_id uuid NOT NULL REFERENCES episodes(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id), sender_account_id uuid NOT NULL REFERENCES accounts(id),
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000), visibility text NOT NULL DEFAULT 'team', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_account_id uuid NOT NULL REFERENCES accounts(id), template text NOT NULL,
  safe_reference text, channel text NOT NULL DEFAULT 'in_app', delivery_status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), episode_id uuid REFERENCES episodes(id), cause text NOT NULL,
  assigned_team text NOT NULL DEFAULT 'coordination', status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hospital_source_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_namespace text NOT NULL, hospital_id uuid NOT NULL REFERENCES hospitals(id), source_event_id text NOT NULL,
  event_type text NOT NULL, target_reference text NOT NULL, source_version integer, payload_hash bytea NOT NULL, payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL, processing_result text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_namespace, hospital_id, source_event_id)
);
CREATE TABLE IF NOT EXISTS reconciliation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_reference text NOT NULL, conflicting_references jsonb NOT NULL,
  resolver_id uuid NOT NULL REFERENCES accounts(id), decision text NOT NULL, authoritative_evidence text, resolved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_account_id uuid REFERENCES accounts(id), action text NOT NULL, target_reference text NOT NULL,
  source text, request_reference text, idempotency_reference text, details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
