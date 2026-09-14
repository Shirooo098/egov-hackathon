-- 024_protected_profiles.sql: Protected Citizen profile storage and key rotation
CREATE TABLE IF NOT EXISTS citizen_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  encrypted_payload bytea NOT NULL,
  iv bytea NOT NULL,
  auth_tag bytea NOT NULL,
  key_id text NOT NULL,
  environment_mode text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS citizen_profiles_account_idx ON citizen_profiles(account_id);
CREATE INDEX IF NOT EXISTS citizen_profiles_key_idx ON citizen_profiles(key_id);
