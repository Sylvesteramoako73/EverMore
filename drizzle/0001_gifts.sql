CREATE TYPE "public"."gift_method" AS ENUM('paystack', 'momo_direct');--> statement-breakpoint
CREATE TYPE "public"."gift_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TABLE "fund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"goal_minor" integer,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"show_progress" boolean DEFAULT true NOT NULL,
	"momo_number" text DEFAULT '' NOT NULL,
	"momo_name" text DEFAULT '' NOT NULL,
	"momo_network" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"fund_id" uuid,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"method" "gift_method" NOT NULL,
	"status" "gift_status" DEFAULT 'pending' NOT NULL,
	"reference" text NOT NULL,
	"channel" text DEFAULT '' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "fund" ADD CONSTRAINT "fund_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift" ADD CONSTRAINT "gift_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift" ADD CONSTRAINT "gift_fund_id_fund_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."fund"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_celebration_idx" ON "fund" USING btree ("celebration_id");--> statement-breakpoint
CREATE INDEX "gift_celebration_idx" ON "gift" USING btree ("celebration_id","status");--> statement-breakpoint
CREATE INDEX "gift_fund_idx" ON "gift" USING btree ("fund_id");