ALTER TABLE episode_consents ADD COLUMN IF NOT EXISTS commitment_salt text;
ALTER TABLE pair_consents ADD COLUMN IF NOT EXISTS commitment_salt text;
