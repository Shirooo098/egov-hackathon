ALTER TABLE invitations ADD COLUMN IF NOT EXISTS hospital_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_hospital_fk') THEN
    ALTER TABLE invitations ADD CONSTRAINT invitations_hospital_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id);
  END IF;
END $$;
