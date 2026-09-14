ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);
ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS conflict_reference text;
ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS originating_event_id uuid REFERENCES hospital_source_events(id);
ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS outbox_id uuid REFERENCES appointment_outbox(id);
ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS follow_up_originating_event_idx ON follow_up_tasks(originating_event_id) WHERE originating_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS follow_up_outbox_idx ON follow_up_tasks(outbox_id) WHERE outbox_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS follow_up_tasks_scope_idx ON follow_up_tasks(status, created_at);

ALTER TABLE reconciliation_events ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE reconciliation_events ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES hospital_source_events(id);
ALTER TABLE reconciliation_events ADD COLUMN IF NOT EXISTS follow_up_task_id uuid REFERENCES follow_up_tasks(id);
CREATE INDEX IF NOT EXISTS reconciliation_events_source_event_idx ON reconciliation_events(source_event_id);
CREATE INDEX IF NOT EXISTS reconciliation_events_task_idx ON reconciliation_events(follow_up_task_id);

ALTER TABLE appointment_outbox DROP CONSTRAINT IF EXISTS appointment_outbox_status_check;
ALTER TABLE appointment_outbox ADD CONSTRAINT appointment_outbox_status_check CHECK (status IN ('pending','sending','sent','failed','dead_letter'));
