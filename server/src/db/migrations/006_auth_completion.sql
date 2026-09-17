DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'invitations'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%purpose%' OR pg_get_constraintdef(oid) ILIKE '%intended_account_id%')
  LOOP
    EXECUTE format('ALTER TABLE invitations DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE invitations ADD CONSTRAINT invitations_purpose_ck CHECK (purpose IN ('admission', 'login', 'case_claim', 'pair'));
ALTER TABLE invitations ADD CONSTRAINT invitations_admission_ck CHECK (
  (purpose = 'admission' AND role IS NOT NULL AND intended_account_id IS NULL)
  OR (purpose = 'login' AND intended_account_id IS NOT NULL AND role IS NULL)
  OR purpose IN ('case_claim', 'pair')
);

CREATE TABLE IF NOT EXISTS admission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact text NOT NULL CHECK (char_length(contact) BETWEEN 3 AND 320),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'invited', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admission_requests DROP CONSTRAINT IF EXISTS admission_requests_contact_check;
ALTER TABLE admission_requests ADD CONSTRAINT admission_requests_contact_check CHECK (char_length(contact) BETWEEN 3 AND 320);
CREATE INDEX IF NOT EXISTS admission_requests_created_idx ON admission_requests (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS admission_requests_pending_contact_idx
  ON admission_requests (lower(contact)) WHERE status = 'pending';
