CREATE TABLE IF NOT EXISTS staff_credentials (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_normalized text NOT NULL UNIQUE,
  password_salt bytea NOT NULL,
  password_hash bytea NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_account_id uuid REFERENCES accounts(id),
  action text NOT NULL, target_account_id uuid REFERENCES accounts(id), details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pair_reviewer_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE, service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
  UNIQUE(account_id, hospital_id, service_id)
);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS reviewer_account_id uuid REFERENCES accounts(id);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'awaiting_citizen_acceptance';
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS selected_by uuid REFERENCES accounts(id);
ALTER TABLE pair_proposals ADD COLUMN IF NOT EXISTS selection_idempotency_key text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pair_id uuid REFERENCES pair_proposals(id);
ALTER TABLE conversations ALTER COLUMN episode_id DROP NOT NULL;
DROP INDEX IF EXISTS conversations_episode_idx;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idx ON conversations(pair_id) WHERE pair_id IS NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES accounts(id);
CREATE TABLE IF NOT EXISTS pair_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pair_id uuid NOT NULL REFERENCES pair_proposals(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id), response text NOT NULL, decline_reason text,
  idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pair_id, episode_id), UNIQUE(pair_id, episode_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS chat_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES messages(id),
  actor_account_id uuid NOT NULL REFERENCES accounts(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS schedule_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pair_id uuid NOT NULL REFERENCES pair_proposals(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Manila', location text NOT NULL, slot_reference text,
  source text NOT NULL, author_account_id uuid NOT NULL REFERENCES accounts(id), state text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), supersedes_id uuid REFERENCES schedule_proposals(id)
);
CREATE TABLE IF NOT EXISTS schedule_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES schedule_proposals(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id), response text NOT NULL, decline_reason text,
  idempotency_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, episode_id), UNIQUE(proposal_id, episode_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS pair_selection_idempotency_idx
  ON pair_proposals(selected_by, selection_idempotency_key)
  WHERE selection_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS schedule_proposals_one_active_pair_idx
  ON schedule_proposals(pair_id) WHERE state='active';

-- Cut over staff authentication: invitation redemption is citizen-only and
-- all pre-cutover staff sessions are invalid immediately.
UPDATE sessions s SET revoked_at=COALESCE(revoked_at,now())
FROM accounts a WHERE a.id=s.account_id AND a.role <> 'citizen' AND s.revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pair_proposals_one_active_episode
  ON pair_proposals (own_episode_id)
  WHERE state NOT IN ('declined','withdrawn');
CREATE UNIQUE INDEX IF NOT EXISTS pair_proposals_one_active_counterpart
  ON pair_proposals (counterpart_episode_id)
  WHERE state NOT IN ('declined','withdrawn');
ALTER TABLE pair_responses DROP CONSTRAINT IF EXISTS pair_responses_response_ck;
ALTER TABLE pair_responses ADD CONSTRAINT pair_responses_response_ck CHECK (response IN ('accept','decline'));
ALTER TABLE schedule_responses DROP CONSTRAINT IF EXISTS schedule_responses_response_ck;
ALTER TABLE schedule_responses ADD CONSTRAINT schedule_responses_response_ck CHECK (response IN ('confirm','decline'));
