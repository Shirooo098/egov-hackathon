ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_account_id uuid REFERENCES accounts(id);
