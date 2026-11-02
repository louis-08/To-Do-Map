-- Recurring tasks migration: a task can repeat like a calendar event.
-- Run once in the Supabase SQL editor BEFORE deploying the backend that uses
-- it: the API writes the repeat_* columns on every task create and delete.
-- Idempotent: safe to run more than once.
--
-- repeat_freq     NULL = does not repeat, else 'day' | 'week' | 'month' | 'year'
-- repeat_interval repeat every N units (1 = every day/week/month/year)
-- repeat_anchor   first date of the schedule; occurrences are computed from it
--                 (so month ends do not drift and rollover/drag do not shift it)
-- repeat_until    last date a new occurrence may land on (inclusive), NULL = never ends
-- repeat_from_id  (tasks, deleted_tasks) the occurrence this one was created from;
--                 guarantees that completing a task creates its successor only once.
--                 Deliberately no foreign key: it must survive trash/restore.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS repeat_freq     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_anchor   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_until    DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_from_id  UUID DEFAULT NULL;

ALTER TABLE deleted_tasks
  ADD COLUMN IF NOT EXISTS repeat_freq     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS repeat_anchor   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_until    DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_from_id  UUID DEFAULT NULL;

-- ADD CONSTRAINT has no IF NOT EXISTS; drop first to stay idempotent.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_repeat_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_repeat_check CHECK (
  repeat_interval BETWEEN 1 AND 999
  AND (repeat_freq IS NULL OR repeat_freq IN ('day', 'week', 'month', 'year'))
);

ALTER TABLE deleted_tasks DROP CONSTRAINT IF EXISTS deleted_tasks_repeat_check;
ALTER TABLE deleted_tasks ADD CONSTRAINT deleted_tasks_repeat_check CHECK (
  repeat_interval BETWEEN 1 AND 999
  AND (repeat_freq IS NULL OR repeat_freq IN ('day', 'week', 'month', 'year'))
);

-- Looks up "has this occurrence already got a successor?" on every completion.
CREATE INDEX IF NOT EXISTS tasks_repeat_from_id_idx
  ON tasks (repeat_from_id) WHERE repeat_from_id IS NOT NULL;
