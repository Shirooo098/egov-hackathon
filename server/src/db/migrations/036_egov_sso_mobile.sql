ALTER TABLE egov_sso_pending ADD COLUMN IF NOT EXISTS mobile text
  CHECK (mobile IS NULL OR mobile ~ '^\+[1-9][0-9]{7,14}$');
