ALTER TABLE "guest" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "reminder_count" integer DEFAULT 0 NOT NULL;