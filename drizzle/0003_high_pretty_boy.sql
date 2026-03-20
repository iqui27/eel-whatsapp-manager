CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "send_window_start" text DEFAULT '08:00';--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "send_window_end" text DEFAULT '20:00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "event_location" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "event_cep" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "event_date" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "project_name" text;--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN "subsecretaria" text;--> statement-breakpoint
CREATE INDEX "idx_system_logs_created_at" ON "system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_system_logs_level" ON "system_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_system_logs_category" ON "system_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_conversations_updated_at" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_status_updated" ON "conversations" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_users_invite_token" ON "users" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "idx_voters_created_at" ON "voters" USING btree ("created_at");