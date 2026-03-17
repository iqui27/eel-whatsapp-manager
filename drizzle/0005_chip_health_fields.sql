-- Phase 14: Chip Health Monitoring Fields
-- Adds 7-state health monitoring fields to the chips table
-- Idempotent: uses ADD COLUMN IF NOT EXISTS

ALTER TABLE chips
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS messages_sent_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_sent_this_hour integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_limit integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS hourly_limit integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS last_health_check timestamptz,
  ADD COLUMN IF NOT EXISTS last_webhook_event timestamptz,
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_rate integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_segments text[];

-- Add a comment for documentation
COMMENT ON COLUMN chips.health_status IS '7-state health: healthy | degraded | cooldown | quarantined | banned | warming_up | disconnected';
COMMENT ON COLUMN chips.messages_sent_today IS 'Reset daily by cron';
COMMENT ON COLUMN chips.messages_sent_this_hour IS 'Reset hourly by cron';
COMMENT ON COLUMN chips.block_rate IS 'Percentage * 100 (e.g., 250 = 2.5%)';
