-- Migration: WhatsApp Groups Table (Phase 16)
-- Creates the whatsapp_groups table for tracking WhatsApp group lifecycle

CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_jid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  invite_url TEXT,
  invite_code TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  segment_tag TEXT,
  chip_id UUID REFERENCES chips(id) ON DELETE SET NULL,
  chip_instance_name TEXT,
  current_size INTEGER NOT NULL DEFAULT 0,
  max_size INTEGER NOT NULL DEFAULT 1024,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'full', 'archived')),
  admins TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_campaign ON whatsapp_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_chip ON whatsapp_groups(chip_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_status ON whatsapp_groups(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_jid ON whatsapp_groups(group_jid);