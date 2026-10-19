-- 001_init — the schema of ADR-005 §4.
--
-- Two kinds of table: STATE (who exists, who reports to whom) and EVENTS
-- (what happened). Everything a screen shows is derived from the second,
-- scoped by the first. Snapshots are deliberately absent: they are a cache,
-- and a cache is added when a measurement asks for it, not before.
--
-- Repeatable by construction: every object is created IF NOT EXISTS, so
-- re-running this file on a database that already has it changes nothing.

CREATE TABLE IF NOT EXISTS organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS areas (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  name             TEXT NOT NULL,
  -- the area manager is a user; the FK is added after users exists (below)
  area_manager_id  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id                 TEXT PRIMARY KEY,
  area_id            TEXT REFERENCES areas(id),
  name               TEXT NOT NULL,
  branch_manager_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles are DATA, not code paths: a role change must never require re-issuing
-- a token, which is why permissions live here and not in the JWT (ADR-005 §3).
CREATE TABLE IF NOT EXISTS roles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  -- the identity provider's subject; UNIQUE so one person cannot hold two rows
  external_id  TEXT UNIQUE,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  role_id      TEXT NOT NULL REFERENCES roles(id),
  -- 'active' | 'disabled' | 'archived'. Nothing is ever deleted: an archived
  -- trainee's history must still support a manager's past decision.
  status       TEXT NOT NULL DEFAULT 'active',
  branch_id    TEXT REFERENCES branches(id),
  trainer_id   TEXT REFERENCES users(id),
  manager_id   TEXT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_branch_idx  ON users(branch_id);
CREATE INDEX IF NOT EXISTS users_trainer_idx ON users(trainer_id);
CREATE INDEX IF NOT EXISTS users_manager_idx ON users(manager_id);

-- Enrolment makes "who is in the Academy, since when, on which curriculum
-- version" a fact rather than an inference from event timestamps.
CREATE TABLE IF NOT EXISTS enrolments (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  program_version  TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_end_at  TIMESTAMPTZ,
  state            TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS enrolments_user_idx ON enrolments(user_id);

-- The four append-only logs in one table, separated by `log`.
--
-- `seq` is assigned per log and is the sync cursor. `event_id` is the client's
-- idempotency key: a retry that already landed must be recognised, not appended
-- twice. `actor_id` is taken from the verified token at write time, never from
-- the request body. Both clocks are kept — `occurred_at` is when the person
-- acted, `recorded_at` is the server's word, and only the server's orders
-- history.
CREATE TABLE IF NOT EXISTS events (
  log          TEXT   NOT NULL CHECK (log IN ('progress','training','identity','audit')),
  seq          BIGINT NOT NULL,
  event_id     UUID   NOT NULL,
  actor_id     TEXT   NOT NULL,
  subject_id   TEXT,
  type         TEXT   NOT NULL,
  payload      JSONB  NOT NULL DEFAULT '{}'::jsonb,
  occurred_at  TIMESTAMPTZ NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (log, seq),
  -- idempotency: the same event id twice in the same log is ONE row
  CONSTRAINT events_event_id_unique UNIQUE (log, event_id)
);

CREATE INDEX IF NOT EXISTS events_subject_idx ON events(log, subject_id, seq);

-- One sequence per log, so `seq` is monotonic within a log and gaps signal a
-- problem. A sequence is used rather than MAX(seq)+1 because two concurrent
-- writers reading the same MAX is exactly how a duplicate seq happens.
CREATE SEQUENCE IF NOT EXISTS events_progress_seq;
CREATE SEQUENCE IF NOT EXISTS events_training_seq;
CREATE SEQUENCE IF NOT EXISTS events_identity_seq;
CREATE SEQUENCE IF NOT EXISTS events_audit_seq;

-- The audit trail behind decisions about people. Append-only at the grant
-- level too: the application role gets INSERT and SELECT and nothing else
-- (Phase 9 applies the grants; the shape is fixed here).
CREATE TABLE IF NOT EXISTS audit_events (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     TEXT NOT NULL,
  subject_id   TEXT,
  action       TEXT NOT NULL,
  detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_actor_idx   ON audit_events(actor_id, recorded_at);
CREATE INDEX IF NOT EXISTS audit_subject_idx ON audit_events(subject_id, recorded_at);
