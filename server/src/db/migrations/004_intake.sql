-- Intake belongs to a service episode, not to the account. One citizen may
-- therefore hold independent donor and recipient cases at the same time.
CREATE TABLE recipient_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL UNIQUE REFERENCES episodes(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('blood', 'organ')),
  declared_blood_group text NOT NULL CHECK (declared_blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  requested_organ text,
  urgency text NOT NULL CHECK (urgency IN ('routine', 'urgent', 'critical')),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'paused', 'withdrawn')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((request_type = 'organ' AND requested_organ IN ('kidney', 'liver', 'heart', 'lung', 'pancreas')) OR
         (request_type = 'blood' AND requested_organ IS NULL))
);

CREATE TABLE donor_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL UNIQUE REFERENCES episodes(id) ON DELETE CASCADE,
  declared_blood_group text NOT NULL CHECK (declared_blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  pledged_organs text[] NOT NULL DEFAULT '{}',
  blood_donor boolean NOT NULL DEFAULT false,
  availability text NOT NULL CHECK (availability IN ('available', 'unavailable')),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'paused', 'withdrawn')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pledged_organs <@ ARRAY['kidney', 'liver', 'heart', 'lung', 'pancreas']::text[])
);


