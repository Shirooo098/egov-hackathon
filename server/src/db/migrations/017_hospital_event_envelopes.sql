ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS schema_version text;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS issued_at timestamptz;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS observed_at timestamptz;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS nonce text;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS envelope_hash bytea;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS signature_hash bytea;
ALTER TABLE hospital_source_events ADD COLUMN IF NOT EXISTS author_reference text;
CREATE UNIQUE INDEX IF NOT EXISTS hospital_source_events_nonce_idx ON hospital_source_events(source_namespace,hospital_id,nonce) WHERE schema_version='synthetic-hospital-event.v1' AND nonce IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hospital_source_events_sequence_idx ON hospital_source_events(source_namespace,hospital_id,source_version) WHERE schema_version='synthetic-hospital-event.v1' AND source_version IS NOT NULL;
ALTER TABLE hospital_source_events DROP CONSTRAINT IF EXISTS hospital_source_events_envelope_required_ck;
ALTER TABLE hospital_source_events ADD CONSTRAINT hospital_source_events_envelope_required_ck CHECK (
  processing_result <> 'recorded' OR (schema_version IS NOT NULL AND issued_at IS NOT NULL AND observed_at IS NOT NULL AND nonce IS NOT NULL AND envelope_hash IS NOT NULL AND signature_hash IS NOT NULL AND author_reference IS NOT NULL)
) NOT VALID;
