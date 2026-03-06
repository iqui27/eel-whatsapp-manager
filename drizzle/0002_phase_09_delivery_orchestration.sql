-- Phase 09 delivery orchestration durability
-- Persists campaign/conversation chip bindings and per-send delivery events

ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "chip_id" uuid;
--> statement-breakpoint
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "chip_id" uuid;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "campaign_delivery_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "chip_id" uuid,
  "voter_id" uuid,
  "voter_phone" text,
  "event_type" text NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_chip_id_chips_id_fk"
      FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE set null ON UPDATE no action
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "campaigns" VALIDATE CONSTRAINT "campaigns_chip_id_chips_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chip_id_chips_id_fk"
      FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE set null ON UPDATE no action
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "conversations" VALIDATE CONSTRAINT "conversations_chip_id_chips_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_campaign_id_campaigns_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" ADD CONSTRAINT "campaign_delivery_events_campaign_id_campaigns_id_fk"
      FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_campaign_id_campaigns_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" VALIDATE CONSTRAINT "campaign_delivery_events_campaign_id_campaigns_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" ADD CONSTRAINT "campaign_delivery_events_chip_id_chips_id_fk"
      FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE set null ON UPDATE no action
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_chip_id_chips_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" VALIDATE CONSTRAINT "campaign_delivery_events_chip_id_chips_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_voter_id_voters_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" ADD CONSTRAINT "campaign_delivery_events_voter_id_voters_id_fk"
      FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE set null ON UPDATE no action
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_delivery_events_voter_id_voters_id_fk'
  ) THEN
    ALTER TABLE "campaign_delivery_events" VALIDATE CONSTRAINT "campaign_delivery_events_voter_id_voters_id_fk";
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_campaigns_chip" ON "campaigns" USING btree ("chip_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_chip" ON "conversations" USING btree ("chip_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_delivery_events_campaign" ON "campaign_delivery_events" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_delivery_events_created_at" ON "campaign_delivery_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_delivery_events_event_type" ON "campaign_delivery_events" USING btree ("event_type");
