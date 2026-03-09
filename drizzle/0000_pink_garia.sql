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
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "chip_clusters" ADD CONSTRAINT "chip_clusters_chip_id_chips_id_fk" FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_clusters" ADD CONSTRAINT "chip_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_clusters" ADD CONSTRAINT "contact_clusters_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_clusters" ADD CONSTRAINT "contact_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_chip_id_chips_id_fk" FOREIGN KEY ("chip_id") REFERENCES "public"."chips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_logs_created_at" ON "logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_logs_chip_id" ON "logs" USING btree ("chip_id");--> statement-breakpoint
CREATE INDEX "idx_logs_status" ON "logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");