-- Phase 43: Group sender cache for @lid → phone resolution
-- Stores real @s.whatsapp.net JIDs seen sending messages in groups.
-- Used to cross-reference group member lists where WhatsApp hides phones as @lid.

CREATE TABLE IF NOT EXISTS "group_sender_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_jid" text NOT NULL,
  "sender_jid" text NOT NULL,
  "normalized_phone" text NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_group_sender_cache_group" ON "group_sender_cache" ("group_jid");
CREATE INDEX IF NOT EXISTS "idx_group_sender_cache_phone" ON "group_sender_cache" ("normalized_phone");

-- Composite unique for upsert (ON CONFLICT DO UPDATE)
ALTER TABLE "group_sender_cache"
  ADD CONSTRAINT "group_sender_cache_group_sender_unique"
  UNIQUE ("group_jid", "sender_jid");
