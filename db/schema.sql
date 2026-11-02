-- TodoMap Database Schema
-- Reflects the full current schema. Incremental changes for an existing
-- database live in the migration_*.sql files.

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,   -- soft delete: tasks keep the project
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON projects (user_id);

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  date              DATE NOT NULL,
  text              TEXT NOT NULL,
  done              BOOLEAN DEFAULT FALSE,
  color             TEXT DEFAULT NULL,
  position          INTEGER NOT NULL,
  is_weekly_objective BOOLEAN NOT NULL DEFAULT FALSE,
  scope             TEXT NOT NULL DEFAULT 'day',   -- day | month | quarter | year
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,  -- NULL = no project
  deadline          DATE DEFAULT NULL,
  priority          TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'medium', 'high')),
  description       TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  repeat_freq       TEXT DEFAULT NULL,              -- NULL = no repeat | day | week | month | year
  repeat_interval   INTEGER NOT NULL DEFAULT 1,     -- every N units
  repeat_anchor     DATE DEFAULT NULL,              -- schedule start; occurrences are computed from it
  repeat_until      DATE DEFAULT NULL,              -- last allowed occurrence (inclusive), NULL = forever
  repeat_from_id    UUID DEFAULT NULL,              -- occurrence this one was created from (no FK on purpose)
  -- color: legacy, no longer shown in the UI (replaced by priority)
  remind_at         TIMESTAMPTZ DEFAULT NULL,
  reminder_sent_at  TIMESTAMPTZ DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CHECK (repeat_interval BETWEEN 1 AND 999),
  CHECK (repeat_freq IS NULL OR repeat_freq IN ('day', 'week', 'month', 'year'))
);

CREATE INDEX ON tasks (user_id, date);
CREATE INDEX ON tasks (repeat_from_id) WHERE repeat_from_id IS NOT NULL;
CREATE INDEX ON tasks (project_id) WHERE project_id IS NOT NULL;

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
  scope       TEXT NOT NULL DEFAULT 'day',
  is_weekly_objective BOOLEAN NOT NULL DEFAULT FALSE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  deadline    DATE DEFAULT NULL,
  priority    TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'medium', 'high')),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  repeat_freq     TEXT DEFAULT NULL,
  repeat_interval INTEGER NOT NULL DEFAULT 1,
  repeat_anchor   DATE DEFAULT NULL,
  repeat_until    DATE DEFAULT NULL,
  repeat_from_id  UUID DEFAULT NULL,
  deleted_at  TIMESTAMPTZ DEFAULT now(),
  CHECK (repeat_interval BETWEEN 1 AND 999),
  CHECK (repeat_freq IS NULL OR repeat_freq IN ('day', 'week', 'month', 'year'))
);

CREATE TABLE rollover_log (
  user_id    TEXT PRIMARY KEY,
  last_run   DATE NOT NULL
);

CREATE TABLE settings (
  user_id        TEXT PRIMARY KEY,
  auto_rollover  BOOLEAN NOT NULL DEFAULT FALSE
);