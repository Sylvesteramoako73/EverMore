ALTER TABLE "celebration" ADD COLUMN "table_finder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "celebration" ADD COLUMN "livestream_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "table_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "checked_in_count" integer DEFAULT 0 NOT NULL;