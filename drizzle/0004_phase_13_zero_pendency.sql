ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actor_name" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actor_email" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actor_role" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actor_region_scope" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actor_permissions" text[] DEFAULT '{}'::text[];
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "sessions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN IF NOT EXISTS "crm_notes" text;
--> statement-breakpoint
ALTER TABLE "voters" ADD COLUMN IF NOT EXISTS "crm_checklist" text[] DEFAULT '{}'::text[];
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" text[] DEFAULT '{}'::text[];
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "recipients" text[] DEFAULT '{}'::text[] NOT NULL,
  "frequency" text DEFAULT 'weekly' NOT NULL,
  "period_days" integer DEFAULT 7 NOT NULL,
  "format" text DEFAULT 'pdf' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "next_run_at" timestamp with time zone NOT NULL,
  "last_run_at" timestamp with time zone,
  "last_status" text DEFAULT 'idle' NOT NULL,
  "last_error" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_schedules_created_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "report_schedules"
      ADD CONSTRAINT "report_schedules_created_by_user_id_users_id_fk"
      FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_report_schedules_next_run" ON "report_schedules" USING btree ("next_run_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_dispatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid,
  "recipients" text[] DEFAULT '{}'::text[] NOT NULL,
  "format" text DEFAULT 'pdf' NOT NULL,
  "status" text NOT NULL,
  "error_message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_dispatches_schedule_id_report_schedules_id_fk'
  ) THEN
    ALTER TABLE "report_dispatches"
      ADD CONSTRAINT "report_dispatches_schedule_id_report_schedules_id_fk"
      FOREIGN KEY ("schedule_id") REFERENCES "public"."report_schedules"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_report_dispatches_schedule" ON "report_dispatches" USING btree ("schedule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_report_dispatches_created_at" ON "report_dispatches" USING btree ("created_at");
