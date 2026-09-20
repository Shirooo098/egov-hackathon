UPDATE pair_proposals SET consent_scope_version=COALESCE(consent_scope_version,version,1) WHERE consent_scope_version IS NULL;
ALTER TABLE pair_proposals ALTER COLUMN consent_scope_version SET DEFAULT 1;
ALTER TABLE pair_proposals ALTER COLUMN consent_scope_version SET NOT NULL;
