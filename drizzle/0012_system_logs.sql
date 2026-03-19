-- Phase 31: System Logs table
-- Centralized observability for Gemini, webhook, campaign, and system events

CREATE TABLE IF NOT EXISTS "system_logs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "level"       text NOT NULL DEFAULT 'info'    CHECK (level IN ('debug','info','warn','error')),
  "category"    text NOT NULL DEFAULT 'system'  CHECK (category IN ('gemini','webhook','campaign','crm','grupos','auth','cron','system')),
  "message"     text NOT NULL,
  "details"     jsonb,
  "duration_ms" integer,
  "created_at"  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON "system_logs" ("created_at");
CREATE INDEX IF NOT EXISTS idx_system_logs_level      ON "system_logs" ("level");
CREATE INDEX IF NOT EXISTS idx_system_logs_category   ON "system_logs" ("category");
