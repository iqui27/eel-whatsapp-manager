-- Migration: AI Analysis (Phase 18)
-- Adds AI fields to voters and creates ai_analyses table

-- Add AI fields to voters
ALTER TABLE voters ADD COLUMN IF NOT EXISTS ai_tier TEXT CHECK (ai_tier IN ('hot', 'warm', 'cold', 'dead'));
ALTER TABLE voters ADD COLUMN IF NOT EXISTS ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative'));
ALTER TABLE voters ADD COLUMN IF NOT EXISTS ai_last_analyzed TIMESTAMPTZ;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS ai_analysis_summary TEXT;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS ai_recommended_action TEXT;

-- Create index on ai_tier for filtering
CREATE INDEX IF NOT EXISTS idx_voters_ai_tier ON voters(ai_tier);

-- Create ai_analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES voters(id) ON DELETE SET NULL,
  voter_phone TEXT,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('inbound', 'outbound')),
  message_text TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent TEXT,
  suggested_tags TEXT[],
  recommended_action TEXT,
  confidence INTEGER,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_analyses_voter ON ai_analyses(voter_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_conversation ON ai_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created ON ai_analyses(created_at);