ALTER TABLE "fund" ADD COLUMN "paystack_subaccount_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "fund" ADD COLUMN "paystack_subaccount_for" text DEFAULT '' NOT NULL;