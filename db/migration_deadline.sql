-- Task deadlines migration.
-- Run this once in the Supabase SQL editor BEFORE deploying the backend that
-- reads/writes `deadline`. It is idempotent and safe to re-run.

ALTER TABLE tasks         ADD COLUMN IF NOT EXISTS deadline DATE DEFAULT NULL;

-- Soft-deleted tasks keep their deadline so a restore from trash is lossless.
ALTER TABLE deleted_tasks ADD COLUMN IF NOT EXISTS deadline DATE DEFAULT NULL;
