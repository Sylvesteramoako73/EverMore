CREATE TABLE "plan_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"user_id" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text NOT NULL,
	"channel" text DEFAULT '' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_payment_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "plan_payment" ADD CONSTRAINT "plan_payment_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_payment" ADD CONSTRAINT "plan_payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_payment_celebration_idx" ON "plan_payment" USING btree ("celebration_id","status");