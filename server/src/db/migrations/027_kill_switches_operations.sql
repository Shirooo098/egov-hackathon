-- 027_kill_switches_operations.sql: Scoped workflow kill switches and operational health tracking

CREATE TABLE IF NOT EXISTS workflow_kill_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  hospital_id uuid REFERENCES hospitals(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resumed')),
  reason text NOT NULL,
  paused_by uuid NOT NULL REFERENCES accounts(id),
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_by uuid REFERENCES accounts(id),
  resumed_at timestamptz,
  resume_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_kill_switches_status_idx ON workflow_kill_switches(scope, hospital_id, status);
CREATE INDEX IF NOT EXISTS workflow_kill_switches_active_idx ON workflow_kill_switches(status);
