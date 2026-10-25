-- TodoMap Database Schema

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  date              DATE NOT NULL,
  text              TEXT NOT NULL,
  done              BOOLEAN DEFAULT FALSE,
  color             TEXT DEFAULT NULL,
  position          INTEGER NOT NULL,
  deadline          DATE DEFAULT NULL,
  remind_at         TIMESTAMPTZ DEFAULT NULL,
  reminder_sent_at  TIMESTAMPTZ DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON tasks (user_id, date);

-- Lets the reminder scheduler cheaply find due, unsent reminders.
CREATE INDEX ON tasks (remind_at) WHERE remind_at IS NOT NULL AND reminder_sent_at IS NULL;

-- Web Push subscriptions. One row per device/browser; a user may have many.
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON push_subscriptions (user_id);

CREATE TABLE weekly_objectives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  week_start   DATE NOT NULL,
  text         TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, week_start)
);

CREATE TABLE deleted_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  date        DATE NOT NULL,
  text        TEXT NOT NULL,
  color       TEXT DEFAULT NULL,
  deadline    DATE DEFAULT NULL,
  deleted_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rollover_log (
  user_id    TEXT PRIMARY KEY,
  last_run   DATE NOT NULL
);

CREATE TABLE settings (
  user_id        TEXT PRIMARY KEY,
  auto_rollover  BOOLEAN NOT NULL DEFAULT FALSE
);