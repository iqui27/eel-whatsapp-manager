CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"group_jid" text NOT NULL,
	"sender_jid" text,
	"sender_name" text,
	"text" text NOT NULL,
	"from_me" boolean DEFAULT false NOT NULL,
	"evolution_message_id" text,
	"ai_sentiment" text,
	"ai_intent" text,
	"ai_suggested_tags" text[],
	"ai_alert" text,
	"ai_summary" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
CREATE INDEX "idx_group_messages_group" ON "group_messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_group_messages_created" ON "group_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_group_messages_sender" ON "group_messages" USING btree ("sender_jid");