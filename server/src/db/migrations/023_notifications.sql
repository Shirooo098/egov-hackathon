-- 023_notifications.sql: Generic notifications and provider delivery
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE TABLE IF NOT EXISTS notification_preferences (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  sms_consent boolean NOT NULL DEFAULT false,
  phone_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  provider_reference text,
  error_code text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications(recipient_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_retry_idx ON notifications(delivery_status, next_retry_at) WHERE delivery_status IN ('pending', 'failed');
