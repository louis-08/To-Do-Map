-- TodoMap Database Schema

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  date        DATE NOT NULL,
  text        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  color       TEXT DEFAULT NULL,
  position    INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON tasks (user_id, date);

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
  deleted_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rollover_log (
  user_id    TEXT PRIMARY KEY,
  last_run   DATE NOT NULL
);