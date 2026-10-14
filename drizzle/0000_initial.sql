CREATE TYPE "public"."celebration_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."celebration_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TYPE "public"."guestbook_status" AS ENUM('pending', 'approved', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."media_collection" AS ENUM('portrait', 'engagement', 'gallery', 'event', 'memory', 'venue', 'shared');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."media_source" AS ENUM('host', 'guest');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('approved', 'pending', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'cohost', 'planner');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."occasion_kind" AS ENUM('wedding', 'birthday', 'funeral', 'outing', 'naming', 'anniversary', 'graduation', 'reunion', 'shower', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anniversary_preference" (
	"celebration_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"remind_days_before" integer[] DEFAULT ARRAY[0]::integer[] NOT NULL,
	"include_memory_prompt" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anniversary_preference_celebration_id_user_id_pk" PRIMARY KEY("celebration_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"celebration_id" uuid,
	"reason" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "celebration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "celebration_status" DEFAULT 'draft' NOT NULL,
	"visibility" "celebration_visibility" DEFAULT 'unlisted' NOT NULL,
	"allow_indexing" boolean DEFAULT false NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"kind" "occasion_kind" DEFAULT 'wedding' NOT NULL,
	"title" text NOT NULL,
	"honorees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"monogram" text DEFAULT '' NOT NULL,
	"story" text DEFAULT '' NOT NULL,
	"guest_message" text DEFAULT '' NOT NULL,
	"key_date" date,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"subtype" text DEFAULT '' NOT NULL,
	"dress_code" text DEFAULT '' NOT NULL,
	"announcement" text DEFAULT '' NOT NULL,
	"hashtag" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"theme_id" text DEFAULT 'earth-and-ivory' NOT NULL,
	"colours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_media_id" uuid,
	"primary_event_id" uuid,
	"rsvp_enabled" boolean DEFAULT true NOT NULL,
	"rsvp_contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rsvp_deadline" date,
	"open_rsvp" boolean DEFAULT true NOT NULL,
	"default_party_size" integer DEFAULT 2 NOT NULL,
	"meal_options" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"ask_dietary" boolean DEFAULT true NOT NULL,
	"guestbook_enabled" boolean DEFAULT true NOT NULL,
	"guestbook_moderation" boolean DEFAULT false NOT NULL,
	"guest_uploads_enabled" boolean DEFAULT true NOT NULL,
	"guest_uploads_moderation" boolean DEFAULT true NOT NULL,
	"gift_message" text DEFAULT '' NOT NULL,
	"gift_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"thank_you_message" text DEFAULT '' NOT NULL,
	"hidden_sections" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "celebration_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "celebration_member" (
	"celebration_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "celebration_member_celebration_id_user_id_pk" PRIMARY KEY("celebration_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "content_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"guestbook_entry_id" uuid,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_local" text NOT NULL,
	"ends_local" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"venue_name" text DEFAULT '' NOT NULL,
	"venue_address" text DEFAULT '' NOT NULL,
	"venue_lat" double precision,
	"venue_lng" double precision,
	"description" text DEFAULT '' NOT NULL,
	"dress_code" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"venue_media_id" uuid,
	"rsvp_required" boolean DEFAULT true NOT NULL,
	"invite_only" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"max_party_size" integer DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"invite_token" text NOT NULL,
	"invitation_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "guest_event" (
	"guest_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "guest_event_guest_id_event_id_pk" PRIMARY KEY("guest_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "guestbook_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"status" "guestbook_status" DEFAULT 'approved' NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"kind" "media_kind" DEFAULT 'photo' NOT NULL,
	"collection" "media_collection" DEFAULT 'gallery' NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"placeholder" text,
	"caption" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source" "media_source" DEFAULT 'host' NOT NULL,
	"status" "media_status" DEFAULT 'approved' NOT NULL,
	"guest_name" text DEFAULT '' NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'cohost' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_invite_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"happened_on" date NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_media" (
	"memory_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "memory_media_memory_id_media_id_pk" PRIMARY KEY("memory_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"kind" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"user_id" text,
	"celebration_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "page_view_daily" (
	"celebration_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_view_daily_celebration_id_day_pk" PRIMARY KEY("celebration_id","day")
);
--> statement-breakpoint
CREATE TABLE "rsvp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"celebration_id" uuid NOT NULL,
	"guest_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"meal_choice" text DEFAULT '' NOT NULL,
	"dietary" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_response" (
	"rsvp_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"attending" boolean NOT NULL,
	"party_size" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rsvp_response_rsvp_id_event_id_pk" PRIMARY KEY("rsvp_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "slug_redirect" (
	"slug" text PRIMARY KEY NOT NULL,
	"celebration_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anniversary_preference" ADD CONSTRAINT "anniversary_preference_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anniversary_preference" ADD CONSTRAINT "anniversary_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebration" ADD CONSTRAINT "celebration_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebration" ADD CONSTRAINT "celebration_primary_event_id_event_id_fk" FOREIGN KEY ("primary_event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebration_member" ADD CONSTRAINT "celebration_member_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebration_member" ADD CONSTRAINT "celebration_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_guestbook_entry_id_guestbook_entry_id_fk" FOREIGN KEY ("guestbook_entry_id") REFERENCES "public"."guestbook_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_venue_media_id_media_id_fk" FOREIGN KEY ("venue_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_event" ADD CONSTRAINT "guest_event_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_event" ADD CONSTRAINT "guest_event_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guestbook_entry" ADD CONSTRAINT "guestbook_entry_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invite" ADD CONSTRAINT "member_invite_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invite" ADD CONSTRAINT "member_invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_memory_id_memory_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_view_daily" ADD CONSTRAINT "page_view_daily_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_response" ADD CONSTRAINT "rsvp_response_rsvp_id_rsvp_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_response" ADD CONSTRAINT "rsvp_response_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_redirect" ADD CONSTRAINT "slug_redirect_celebration_id_celebration_id_fk" FOREIGN KEY ("celebration_id") REFERENCES "public"."celebration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_celebration_idx" ON "audit_log" USING btree ("celebration_id");--> statement-breakpoint
CREATE INDEX "celebration_status_idx" ON "celebration" USING btree ("status");--> statement-breakpoint
CREATE INDEX "celebration_member_user_idx" ON "celebration_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_report_status_idx" ON "content_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_celebration_idx" ON "event" USING btree ("celebration_id","starts_at");--> statement-breakpoint
CREATE INDEX "guest_celebration_idx" ON "guest" USING btree ("celebration_id");--> statement-breakpoint
CREATE INDEX "guestbook_celebration_idx" ON "guestbook_entry" USING btree ("celebration_id","created_at");--> statement-breakpoint
CREATE INDEX "media_celebration_idx" ON "media" USING btree ("celebration_id","collection","sort_order");--> statement-breakpoint
CREATE INDEX "media_shared_idx" ON "media" USING btree ("celebration_id","source","status","created_at");--> statement-breakpoint
CREATE INDEX "member_invite_celebration_idx" ON "member_invite" USING btree ("celebration_id");--> statement-breakpoint
CREATE INDEX "memory_celebration_idx" ON "memory" USING btree ("celebration_id","happened_on");--> statement-breakpoint
CREATE INDEX "notification_due_idx" ON "notification" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_guest_uq" ON "rsvp" USING btree ("guest_id") WHERE "rsvp"."guest_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_open_email_uq" ON "rsvp" USING btree ("celebration_id","email") WHERE "rsvp"."guest_id" IS NULL;--> statement-breakpoint
CREATE INDEX "rsvp_celebration_idx" ON "rsvp" USING btree ("celebration_id");--> statement-breakpoint
CREATE INDEX "rsvp_response_event_idx" ON "rsvp_response" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");