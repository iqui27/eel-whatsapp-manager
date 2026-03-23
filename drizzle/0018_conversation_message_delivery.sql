-- Add delivery tracking columns to conversation_messages
ALTER TABLE "conversation_messages"
  ADD COLUMN IF NOT EXISTS "evolution_message_id" text,
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "read_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_conv_messages_evolution_id"
  ON "conversation_messages" ("evolution_message_id")
  WHERE "evolution_message_id" IS NOT NULL;
