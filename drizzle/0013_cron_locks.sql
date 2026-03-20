-- Phase 34: Cron overlap protection
-- Creates cron_locks table for distributed lock management

CREATE TABLE IF NOT EXISTS cron_locks (
  name       TEXT PRIMARY KEY,
  locked_at  TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
