ALTER TABLE staff_credentials ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext bytea;
ALTER TABLE staff_credentials ADD COLUMN IF NOT EXISTS mfa_secret_iv bytea;
ALTER TABLE staff_credentials ADD COLUMN IF NOT EXISTS mfa_secret_auth_tag bytea;
ALTER TABLE staff_credentials ADD COLUMN IF NOT EXISTS mfa_key_version integer;
ALTER TABLE staff_credentials ADD COLUMN IF NOT EXISTS last_totp_counter integer;
CREATE TABLE IF NOT EXISTS staff_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code_hash bytea NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id, code_hash)
);
CREATE INDEX IF NOT EXISTS staff_recovery_codes_account_idx ON staff_recovery_codes(account_id) WHERE used_at IS NULL;
