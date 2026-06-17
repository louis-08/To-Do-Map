-- Reminders + Web Push migration.
-- Run this once in the Supabase SQL editor against the live database.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_at        TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS tasks_due_reminders_idx
  ON tasks (remind_at)
  WHERE remind_at IS NOT NULL AND reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
