-- Staff administration uses row locks and revokes sessions transactionally.
CREATE INDEX IF NOT EXISTS security_events_staff_target_idx ON security_events(target_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_assignments_primary_idx ON staff_assignments(primary_staff_id);
CREATE INDEX IF NOT EXISTS staff_assignments_coverage_idx ON staff_assignments(coverage_staff_id);
