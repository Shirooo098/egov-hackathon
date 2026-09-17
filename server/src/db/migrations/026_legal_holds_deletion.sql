-- 026_legal_holds_deletion.sql: Configurable retention policies, legal holds, two-person deletion workflow, and deletion receipts

CREATE TABLE IF NOT EXISTS retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_class text NOT NULL UNIQUE,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  legal_basis text NOT NULL,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  target_type text NOT NULL CHECK (target_type IN ('account', 'case', 'episode', 'record_class', 'global')),
  target_id text,
  record_class text,
  reason text NOT NULL,
  placed_by uuid NOT NULL REFERENCES accounts(id),
  placed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  released_by uuid REFERENCES accounts(id),
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_class text NOT NULL REFERENCES retention_policies(record_class),
  target_type text NOT NULL CHECK (target_type IN ('account', 'case', 'episode', 'citizen_profile', 'notification')),
  target_id text NOT NULL,
  reason text NOT NULL,
  retention_policy_id uuid REFERENCES retention_policies(id),
  proposer_account_id uuid NOT NULL REFERENCES accounts(id),
  proposed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'blocked_hold')),
  approver_account_id uuid REFERENCES accounts(id),
  reviewed_at timestamptz,
  review_decision_notes text,
  receipt_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deletion_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_request_id uuid NOT NULL REFERENCES deletion_requests(id),
  record_class text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  proposer_account_id uuid NOT NULL REFERENCES accounts(id),
  approver_account_id uuid NOT NULL REFERENCES accounts(id),
  reason text NOT NULL,
  legal_basis text NOT NULL,
  manifest jsonb NOT NULL,
  verification_hash text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_holds_target_idx ON legal_holds(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS legal_holds_status_idx ON legal_holds(status);
CREATE INDEX IF NOT EXISTS deletion_requests_status_idx ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS deletion_receipts_target_idx ON deletion_receipts(target_type, target_id);

-- Seed initial partner & counsel approved retention policies by record class (no universal 30-day default)
INSERT INTO retention_policies (record_class, retention_days, legal_basis, approved_by)
VALUES
  ('medical_coordination', 3650, 'DOH AO No. 2020-0037 Health Records Retention Guidelines', 'Hospital Legal Counsel & DPO'),
  ('audit_events', 1825, 'NPC Circular 16-01 / DPA 2012 Security of Personal Data in Government Agencies', 'Hospital Legal Counsel & DPO'),
  ('citizen_profile', 1825, 'Data Privacy Act of 2012 Section 11 General Data Privacy Principles', 'Hospital Data Protection Officer'),
  ('notifications', 180, 'Telecommunications & Messaging Service Log Minimum Retention Standards', 'Hospital Information Security Officer'),
  ('privacy_requests', 1825, 'NPC Advisory Opinion / Accountability and Compliance Recordkeeping', 'Hospital Data Protection Officer')
ON CONFLICT (record_class) DO NOTHING;
