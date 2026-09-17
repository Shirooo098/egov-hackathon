ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES clinical_reviews(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS hospital_linkages_case_episode_idx ON hospital_linkages(case_id, episode_id);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_episode_idx ON conversations(episode_id);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS invitation_hash bytea;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz;
ALTER TABLE citizen_cases ADD COLUMN IF NOT EXISTS participation_intent text NOT NULL DEFAULT 'evaluation';
ALTER TABLE citizen_cases ADD CONSTRAINT citizen_cases_intent_ck CHECK (participation_intent IN ('evaluation','blood','organ'));
