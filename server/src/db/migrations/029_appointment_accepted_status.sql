-- Hospital appointment acknowledgement is an intermediate authoritative state.
ALTER TABLE appointment_requests DROP CONSTRAINT IF EXISTS appointment_requests_status_ck;
ALTER TABLE appointment_requests ADD CONSTRAINT appointment_requests_status_ck
  CHECK (status IN ('request_pending','hospital_accepted','hospital_confirmed','hospital_declined','cancelled'));
