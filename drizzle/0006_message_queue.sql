-- Phase 15: Message Queue Table
-- Creates the message_queue table for mass messaging lifecycle tracking
-- Idempotent: uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  chip_id uuid REFERENCES chips(id) ON DELETE SET NULL,
  voter_id uuid REFERENCES voters(id) ON DELETE SET NULL,
  voter_phone text NOT NULL,
  voter_name text,
  message text NOT NULL,
  resolved_message text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  evolution_message_id text,
  assigned_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  fail_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  segment_id uuid REFERENCES segments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_campaign ON message_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_chip ON message_queue(chip_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_created ON message_queue(created_at);

-- Comments for documentation
COMMENT ON TABLE message_queue IS 'Mass messaging queue with full lifecycle tracking';
COMMENT ON COLUMN message_queue.status IS 'Lifecycle: queued→assigned→sending→sent→delivered→read→failed→retry';
COMMENT ON COLUMN message_queue.resolved_message IS 'Template with variables substituted and variations applied';
COMMENT ON COLUMN message_queue.priority IS 'Higher = send first';
COMMENT ON COLUMN message_queue.segment_id IS 'For chip affinity matching';