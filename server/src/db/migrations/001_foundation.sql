CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_identity text NOT NULL UNIQUE,
  display_name text,
  role text NOT NULL CHECK (role IN ('citizen', 'coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor')),
  service_scope text[] NOT NULL DEFAULT '{}',
  hospital_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, namespace text NOT NULL UNIQUE,
  synthetic boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid NOT NULL REFERENCES hospitals(id),
  code text NOT NULL CHECK (code IN ('blood', 'kidney')), name text NOT NULL, UNIQUE (hospital_id, code)
);
ALTER TABLE accounts ADD CONSTRAINT accounts_hospital_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purpose text NOT NULL CHECK (purpose IN ('admission', 'case_claim', 'pair')),
  token_hash bytea NOT NULL UNIQUE, intended_account_id uuid REFERENCES accounts(id), intended_contact text,
  target_reference text, role text, service_scope text[] NOT NULL DEFAULT '{}', expires_at timestamptz NOT NULL,
  consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (purpose <> 'admission' OR (role IS NOT NULL AND intended_account_id IS NULL))
);
CREATE INDEX invitations_active_token_idx ON invitations (token_hash) WHERE consumed_at IS NULL;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_active_idx ON sessions (token_hash, expires_at) WHERE revoked_at IS NULL;
