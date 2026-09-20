ALTER TABLE citizen_cases
  ADD COLUMN IF NOT EXISTS participation_intent text NOT NULL DEFAULT 'evaluation'
  CHECK (participation_intent IN ('evaluation', 'blood', 'organ'));

-- Prefer one active role-specific journey per citizen and service.
CREATE UNIQUE INDEX citizen_cases_active_account_service_role_idx
  ON citizen_cases (account_id, service_id, role)
  WHERE account_id IS NOT NULL AND status = 'active';
