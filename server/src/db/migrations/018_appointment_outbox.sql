ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS request_hash bytea;

CREATE TABLE IF NOT EXISTS appointment_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id uuid NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('appointment.requested','booking.change_requested')),
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  lease_owner text,
  provider_response_reference text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_outbox_ready_idx ON appointment_outbox(status,available_at,created_at);

INSERT INTO appointment_outbox(appointment_request_id,event_type,payload,idempotency_key)
SELECT ar.id,'appointment.requested',jsonb_build_object(
  'requestId',ar.id,'episodeId',ar.episode_id,'hospitalId',cc.hospital_id,'serviceId',cc.service_id,
  'slotReference',ar.slot_reference,'preferredDates',ar.preferred_dates
),concat('appointment.requested:',ar.actor_account_id,':',ar.idempotency_key)
FROM appointment_requests ar
JOIN episodes e ON e.id=ar.episode_id
JOIN citizen_cases cc ON cc.id=e.case_id
WHERE ar.status='request_pending' AND cc.hospital_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS appointment_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL REFERENCES appointment_outbox(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  provider_response_reference text,
  error_code text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(outbox_id,attempt_number)
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES hospital_source_events(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_event_reference text;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_source_event_idx ON bookings(source_event_id) WHERE source_event_id IS NOT NULL;
