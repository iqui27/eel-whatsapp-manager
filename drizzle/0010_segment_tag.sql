-- Migration: Segment Tag (Phase 21-01)
-- Adds segment_tag field to segments table for segment-group mapping

-- Add segment_tag column (nullable for backwards compatibility)
ALTER TABLE segments ADD COLUMN IF NOT EXISTS segment_tag TEXT UNIQUE;

-- Create index for tag lookups
CREATE INDEX IF NOT EXISTS idx_segments_segment_tag ON segments(segment_tag);

-- Add comment for documentation
COMMENT ON COLUMN segments.segment_tag IS 'Unique tag identifier for segment-to-group mapping (lowercase, alphanumeric + underscore)';