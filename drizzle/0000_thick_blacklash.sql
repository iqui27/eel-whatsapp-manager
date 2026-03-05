CREATE TABLE "campaigns" (
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
CREATE TABLE "chip_clusters" (
	"chip_id" uuid NOT NULL,
	"cluster_id" uuid NOT NULL,
	CONSTRAINT "chip_clusters_chip_id_cluster_id_pk" PRIMARY KEY("chip_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "chips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"instance_name" text,
	"group_id" text,
	"enabled" boolean DEFAULT true,
	"last_warmed" timestamp with time zone,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"warm_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"messages" text[] DEFAULT '{}',
	"max_messages_per_day" integer DEFAULT 10,
	"priority" integer DEFAULT 1,
	"window_start" time DEFAULT '08:00',
	"window_end" time DEFAULT '22:00',
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolution_api_url" text NOT NULL,
	"evolution_api_key" text NOT NULL,
	"auth_password" text NOT NULL,
	"warming_enabled" boolean DEFAULT true,
	"warming_interval_minutes" integer DEFAULT 60,
	"warming_message" text DEFAULT '',
	"instance_name" text NOT NULL,
	"last_cron_run" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_id" uuid,
	"action" text NOT NULL,
	"channel" text DEFAULT 'whatsapp',
	"ip_address" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_clusters" (
	"contact_id" uuid NOT NULL,
	"cluster_id" uuid NOT NULL,
	CONSTRAINT "contact_clusters_contact_id_cluster_id_pk" PRIMARY KEY("contact_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"last_contacted" timestamp with time zone,
	"contact_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
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
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chip_id" uuid,
	"chip_name" text NOT NULL,
	"phone" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "segment_voters" (
	"segment_id" uuid NOT NULL,
	"voter_id" uuid NOT NULL,
	CONSTRAINT "segment_voters_segment_id_voter_id_pk" PRIMARY KEY("segment_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"filters" text NOT NULL,
	"audience_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
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
CREATE TABLE "voters" (
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
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_clusters" ADD CONSTRAINT "chip_clusters_chip_id_chips_id_fk" FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_clusters" ADD CONSTRAINT "chip_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_clusters" ADD CONSTRAINT "contact_clusters_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_clusters" ADD CONSTRAINT "contact_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_chip_id_chips_id_fk" FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_voters" ADD CONSTRAINT "segment_voters_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_voters" ADD CONSTRAINT "segment_voters_voter_id_voters_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaigns_status" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_campaigns_segment" ON "campaigns" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "idx_consent_voter" ON "consent_logs" USING btree ("voter_id");--> statement-breakpoint
CREATE INDEX "idx_conv_messages_conv" ON "conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_voter" ON "conversations" USING btree ("voter_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_status" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conversations_priority" ON "conversations" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_logs_created_at" ON "logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_logs_chip_id" ON "logs" USING btree ("chip_id");--> statement-breakpoint
CREATE INDEX "idx_logs_status" ON "logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_voters_phone" ON "voters" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_voters_zone" ON "voters" USING btree ("zone");--> statement-breakpoint
CREATE INDEX "idx_voters_opt_in" ON "voters" USING btree ("opt_in_status");--> statement-breakpoint
CREATE INDEX "idx_voters_engagement" ON "voters" USING btree ("engagement_score");