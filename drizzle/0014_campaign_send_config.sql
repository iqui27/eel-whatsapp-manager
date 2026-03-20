ALTER TABLE "campaigns" ADD COLUMN "batch_size" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "min_delay_ms" integer DEFAULT 15000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "max_delay_ms" integer DEFAULT 60000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "send_rate" text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "typing_delay_min" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "typing_delay_max" integer DEFAULT 5000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "max_daily_per_chip" integer DEFAULT 200;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "max_hourly_per_chip" integer DEFAULT 25;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "pause_on_chip_degraded" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "selected_chip_ids" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "chip_strategy" text DEFAULT 'round_robin';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "rest_pause_every" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "rest_pause_duration_ms" integer DEFAULT 180000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "long_break_every" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "long_break_duration_ms" integer DEFAULT 900000;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "circuit_breaker_threshold" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "chips" ADD COLUMN "proxy_host" text;--> statement-breakpoint
ALTER TABLE "chips" ADD COLUMN "proxy_port" integer;--> statement-breakpoint
ALTER TABLE "chips" ADD COLUMN "proxy_protocol" text;--> statement-breakpoint
ALTER TABLE "chips" ADD COLUMN "proxy_username" text;--> statement-breakpoint
ALTER TABLE "chips" ADD COLUMN "proxy_password" text;