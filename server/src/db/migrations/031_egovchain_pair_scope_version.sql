ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS consent_scope_version integer;
UPDATE pair_proposals SET consent_scope_version=version WHERE consent_scope_version IS NULL;
