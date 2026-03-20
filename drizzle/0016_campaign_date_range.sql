-- Phase 39-02: Add campaign date range fields
-- Nullable -- campaigns can still be one-shot without a date range

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
