-- Projects migration.
-- Run this once in the Supabase SQL editor against the live database
-- BEFORE deploying the backend that reads/writes `project_id`.
-- Idempotent: safe to run more than once.

-- Projects are soft-deleted (deleted_at). A deleted project disappears from
-- the project picker and the settings list, but tasks that already reference
-- it keep their project (label + lane). The row is only removed together with
-- the account.
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_idx ON projects (user_id);

-- NULL = "(kein Projekt)". ON DELETE SET NULL only matters for a hard delete
-- (account deletion); normal project deletion is soft and leaves this intact.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks (project_id) WHERE project_id IS NOT NULL;

-- Trash keeps the full task identity so a restore is lossless
-- (previously scope and the weekly-objective flag were lost on restore).
ALTER TABLE deleted_tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE deleted_tasks
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'day';
ALTER TABLE deleted_tasks
  ADD COLUMN IF NOT EXISTS is_weekly_objective BOOLEAN NOT NULL DEFAULT FALSE;
