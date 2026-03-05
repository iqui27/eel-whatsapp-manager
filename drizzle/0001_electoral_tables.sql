-- EEL Eleicao: Electoral tables migration
-- Adds 8 new tables for electoral campaign operations
-- Safe to run on top of the existing 0000 migration (chip warming tables)

CREATE TABLE IF NOT EXISTS "voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cpf" text,
	"phone" text NOT NULL,
	"zone" text,
	"section" text,
	"city" text,
	"neighborhood" text,
	"tags" text[] DEFAULT '{}',
	"engagement_score" integer DEFAULT 0,
	"opt_in_status" text DEFAULT 'pending',
	"opt_in_date" timestamp with time zone,
	"last_contacted" timestamp with time zone,
	"contact_count" integer DEFAULT 0,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"filters" text NOT NULL,
	"audience_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"template" text NOT NULL,
	"variables" text[] DEFAULT '{}',
	"status" text DEFAULT 'draft',
	"segment_id" uuid,
	"scheduled_at" timestamp with time zone,
	"window_start" time DEFAULT '08:00',
	"window_end" time DEFAULT '22:00',
	"ab_enabled" boolean DEFAULT false,
	"ab_variant_b" text,
	"ab_split_percent" integer DEFAULT 50,
	"total_sent" integer DEFAULT 0,
	"total_delivered" integer DEFAULT 0,
	"total_read" integer DEFAULT 0,
	"total_replied" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segment_voters" (
	"segment_id" uuid NOT NULL,
	"voter_id" uuid NOT NULL,
	CONSTRAINT "segment_voters_segment_id_voter_id_pk" PRIMARY KEY("segment_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid,
	"voter_name" text NOT NULL,
	"voter_phone" text NOT NULL,
	"status" text DEFAULT 'bot',
	"assigned_agent" text,
	"handoff_reason" text,
	"last_message_at" timestamp with time zone,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid,
	"action" text NOT NULL,
	"channel" text DEFAULT 'whatsapp',
	"ip_address" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'voluntario',
	"region_scope" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_segments_id_fk"
  FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "campaigns" VALIDATE CONSTRAINT "campaigns_segment_id_segments_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_voter_id_voters_id_fk"
  FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "consent_logs" VALIDATE CONSTRAINT "consent_logs_voter_id_voters_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversation_messages" VALIDATE CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_voter_id_voters_id_fk"
  FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE set null ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "conversations" VALIDATE CONSTRAINT "conversations_voter_id_voters_id_fk";
--> statement-breakpoint
ALTER TABLE "segment_voters" ADD CONSTRAINT "segment_voters_segment_id_segments_id_fk"
  FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "segment_voters" VALIDATE CONSTRAINT "segment_voters_segment_id_segments_id_fk";
--> statement-breakpoint
ALTER TABLE "segment_voters" ADD CONSTRAINT "segment_voters_voter_id_voters_id_fk"
  FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action
  NOT VALID;
--> statement-breakpoint
ALTER TABLE "segment_voters" VALIDATE CONSTRAINT "segment_voters_voter_id_voters_id_fk";
--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_campaigns_status" ON "campaigns" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_segment" ON "campaigns" USING btree ("segment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consent_voter" ON "consent_logs" USING btree ("voter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conv_messages_conv" ON "conversation_messages" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_voter" ON "conversations" USING btree ("voter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_status" ON "conversations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_priority" ON "conversations" USING btree ("priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voters_phone" ON "voters" USING btree ("phone");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voters_zone" ON "voters" USING btree ("zone");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voters_opt_in" ON "voters" USING btree ("opt_in_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voters_engagement" ON "voters" USING btree ("engagement_score");
