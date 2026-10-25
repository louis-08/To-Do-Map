-- Task description migration: free text per task (max 10 000 characters).
-- Run once in the Supabase SQL editor BEFORE deploying the backend that
-- reads/writes `description`. Idempotent: safe to run more than once.
--
-- '' (empty string) means "no description"; the UI shows an icon on the task
-- card only when the description is non-empty.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
  CONSTRAINT tasks_description_len CHECK (char_length(description) <= 10000);

ALTER TABLE deleted_tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
  CONSTRAINT deleted_tasks_description_len CHECK (char_length(description) <= 10000);
