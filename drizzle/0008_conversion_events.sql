-- Migration: Conversion Events (Phase 17)
-- Adds conversion tracking fields and events table

-- Add conversion tracking fields to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_joined_group INTEGER DEFAULT 0;

-- Create conversion_events table
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES voters(id) ON DELETE SET NULL,
  voter_phone TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('reply', 'click', 'group_join', 'conversion')),
  group_jid TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversion_events_campaign ON conversion_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_voter ON conversion_events(voter_id);