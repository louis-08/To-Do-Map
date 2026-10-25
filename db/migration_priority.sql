-- Task priority migration: replaces the colour picker with a priority.
-- Run once in the Supabase SQL editor BEFORE deploying the backend that
-- reads/writes `priority`. Idempotent: safe to run more than once.
--
-- Values: 'none' (default), 'medium' (yellow), 'high' (red).
-- Existing colours are converted ONCE, when the column is created:
--   red   -> high
--   amber -> medium (the old yellow)
--   any other colour / no colour -> none
-- The `color` column itself is kept untouched (no data loss, old clients
-- such as the MCP server may still send it); the UI no longer shows it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'
      CONSTRAINT tasks_priority_check CHECK (priority IN ('none', 'medium', 'high'));
    UPDATE tasks SET priority = 'high'   WHERE color = 'red';
    UPDATE tasks SET priority = 'medium' WHERE color = 'amber';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deleted_tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE deleted_tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'
      CONSTRAINT deleted_tasks_priority_check CHECK (priority IN ('none', 'medium', 'high'));
    UPDATE deleted_tasks SET priority = 'high'   WHERE color = 'red';
    UPDATE deleted_tasks SET priority = 'medium' WHERE color = 'amber';
  END IF;
END $$;
