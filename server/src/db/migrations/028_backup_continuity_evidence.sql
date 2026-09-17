-- Migration 028: Backup and Restore Continuity Evidence
CREATE TABLE IF NOT EXISTS continuity_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid NOT NULL,
  rehearsal_type text NOT NULL CHECK (rehearsal_type IN ('restore_rehearsal', 'rollback_test', 'point_in_time_drill')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'safe_rollback')),
  target_environment text NOT NULL,
  schema_version text NOT NULL,
  tables_restored jsonb NOT NULL,
  records_restored integer NOT NULL,
  duration_ms integer NOT NULL,
  evidence_hash text NOT NULL,
  operator_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  safe_fallback_active boolean NOT NULL DEFAULT false,
  error_details text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_continuity_evidence_backup_id ON continuity_evidence(backup_id);
CREATE INDEX IF NOT EXISTS idx_continuity_evidence_status ON continuity_evidence(status);
CREATE INDEX IF NOT EXISTS idx_continuity_evidence_recorded_at ON continuity_evidence(recorded_at);
