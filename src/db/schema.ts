import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─────────────────────────────────────────────── Auth (shape required by Better Auth)

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** "user" or "admin". Never settable from sign-up input (see auth config). */
  role: text("role").notNull().default("user"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ─────────────────────────────────────────────── Weddings

export const weddingStatus = pgEnum("wedding_status", ["draft", "published", "archived"]);
/** public: listed & indexable if allowed; unlisted: anyone with the link; private: only invited guests via token. */
export const weddingVisibility = pgEnum("wedding_visibility", ["public", "unlisted", "private"]);
export const memberRole = pgEnum("member_role", ["owner", "partner", "planner"]);

export const wedding = pgTable(
  "wedding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: weddingStatus("status").notNull().default("draft"),
    visibility: weddingVisibility("visibility").notNull().default("unlisted"),
    allowIndexing: boolean("allow_indexing").notNull().default(false),
    plan: text("plan").notNull().default("free"),

    // Couple
    partnerOneFullName: text("partner_one_full_name").notNull(),
    partnerOneDisplayName: text("partner_one_display_name").notNull(),
    partnerTwoFullName: text("partner_two_full_name").notNull(),
    partnerTwoDisplayName: text("partner_two_display_name").notNull(),
    monogram: text("monogram").notNull().default(""),
    story: text("story").notNull().default(""),
    guestMessage: text("guest_message").notNull().default(""),
    relationshipStartDate: date("relationship_start_date"),
    engagementDate: date("engagement_date"),

    // Wedding
    /** Date-only: the day the couple counts their marriage from (anniversaries, "married for…"). */
    weddingDate: date("wedding_date"),
    timezone: text("timezone").notNull().default("UTC"),
    weddingType: text("wedding_type").notNull().default(""),
    dressCode: text("dress_code").notNull().default(""),
    announcement: text("announcement").notNull().default(""),
    hashtag: text("hashtag").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),

    // Presentation
    themeId: text("theme_id").notNull().default("timeless-elegance"),
    heroMediaId: uuid("hero_media_id").references((): AnyPgColumn => media.id, { onDelete: "set null" }),
    primaryEventId: uuid("primary_event_id").references((): AnyPgColumn => event.id, { onDelete: "set null" }),

    // Guest features
    rsvpEnabled: boolean("rsvp_enabled").notNull().default(true),
    rsvpDeadline: date("rsvp_deadline"),
    /** Open RSVP: anyone with the link may reply. Otherwise only guests with an invitation link. */
    openRsvp: boolean("open_rsvp").notNull().default(true),
    defaultPartySize: integer("default_party_size").notNull().default(2),
    mealOptions: text("meal_options").array().notNull().default(sql`ARRAY[]::text[]`),
    askDietary: boolean("ask_dietary").notNull().default(true),
    guestbookEnabled: boolean("guestbook_enabled").notNull().default(true),
    guestbookModeration: boolean("guestbook_moderation").notNull().default(false),
    giftMessage: text("gift_message").notNull().default(""),
    giftLinks: jsonb("gift_links").$type<{ label: string; url: string }[]>().notNull().default([]),
    thankYouMessage: text("thank_you_message").notNull().default(""),
    /** Sections the couple hides on the public page, e.g. ["story", "gallery"]. */
    hiddenSections: text("hidden_sections").array().notNull().default(sql`ARRAY[]::text[]`),

    /** Furthest wizard step reached, for resuming onboarding. */
    onboardingStep: integer("onboarding_step").notNull().default(0),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("wedding_status_idx").on(t.status)],
);

export const weddingMember = pgTable(
  "wedding_member",
  {
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.weddingId, t.userId] }), index("wedding_member_user_idx").on(t.userId)],
);

/** Pending invitation for a partner/planner to join a wedding. Only a hash of the token is stored. */
export const memberInvite = pgTable(
  "member_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("partner"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("member_invite_wedding_idx").on(t.weddingId)],
);

/** Old slugs keep working after a couple changes their address. */
export const slugRedirect = pgTable("slug_redirect", {
  slug: text("slug").primaryKey(),
  weddingId: uuid("wedding_id")
    .notNull()
    .references(() => wedding.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── Events

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Wall-clock "YYYY-MM-DDTHH:mm" as entered, interpreted in `timezone`. */
    startsLocal: text("starts_local").notNull(),
    endsLocal: text("ends_local"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timezone: text("timezone").notNull(),
    venueName: text("venue_name").notNull().default(""),
    venueAddress: text("venue_address").notNull().default(""),
    venueLat: doublePrecision("venue_lat"),
    venueLng: doublePrecision("venue_lng"),
    description: text("description").notNull().default(""),
    dressCode: text("dress_code").notNull().default(""),
    rsvpRequired: boolean("rsvp_required").notNull().default(true),
    /** Hidden from the public page; only guests invited to it (guest_event) see it. */
    inviteOnly: boolean("invite_only").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("event_wedding_idx").on(t.weddingId, t.startsAt)],
);

// ─────────────────────────────────────────────── Media

export const mediaKind = pgEnum("media_kind", ["photo", "video"]);
export const mediaCollection = pgEnum("media_collection", ["portrait", "engagement", "gallery", "wedding", "memory"]);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull().default("photo"),
    collection: mediaCollection("collection").notNull().default("gallery"),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    /** Tiny inline blurred preview (data URL) shown while the image loads. */
    placeholder: text("placeholder"),
    caption: text("caption").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_wedding_idx").on(t.weddingId, t.collection, t.sortOrder)],
);

// ─────────────────────────────────────────────── Guests & RSVPs

/** An invitation: one household or party. Its token is the personal invitation link. */
export const guest = pgTable(
  "guest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    maxPartySize: integer("max_party_size").notNull().default(1),
    notes: text("notes").notNull().default(""),
    /** High-entropy bearer token used in the guest's personal link. */
    inviteToken: text("invite_token").notNull().unique(),
    /** Set when the couple marks the invitation as sent; never inferred. */
    invitationSentAt: timestamp("invitation_sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("guest_wedding_idx").on(t.weddingId)],
);

/** Which events an invitation covers. A guest with no rows is invited to all non-invite-only events. */
export const guestEvent = pgTable(
  "guest_event",
  {
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guest.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.eventId] })],
);

export const rsvp = pgTable(
  "rsvp",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    /** Set when the reply came through a personal invitation link. */
    guestId: uuid("guest_id").references(() => guest.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    mealChoice: text("meal_choice").notNull().default(""),
    dietary: text("dietary").notNull().default(""),
    message: text("message").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    // One reply per invitation, and one open reply per email address.
    uniqueIndex("rsvp_guest_uq").on(t.guestId).where(sql`${t.guestId} IS NOT NULL`),
    uniqueIndex("rsvp_open_email_uq").on(t.weddingId, t.email).where(sql`${t.guestId} IS NULL`),
    index("rsvp_wedding_idx").on(t.weddingId),
  ],
);

export const rsvpResponse = pgTable(
  "rsvp_response",
  {
    rsvpId: uuid("rsvp_id")
      .notNull()
      .references(() => rsvp.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    attending: boolean("attending").notNull(),
    /** People attending this event, including the respondent. 0 when declining. */
    partySize: integer("party_size").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.rsvpId, t.eventId] }), index("rsvp_response_event_idx").on(t.eventId)],
);

// ─────────────────────────────────────────────── Guestbook

export const guestbookStatus = pgEnum("guestbook_status", ["pending", "approved", "hidden"]);

export const guestbookEntry = pgTable(
  "guestbook_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    message: text("message").notNull(),
    status: guestbookStatus("status").notNull().default("approved"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("guestbook_wedding_idx").on(t.weddingId, t.createdAt)],
);

// ─────────────────────────────────────────────── Memories

export const memory = pgTable(
  "memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    happenedOn: date("happened_on").notNull(),
    location: text("location").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("memory_wedding_idx").on(t.weddingId, t.happenedOn)],
);

export const memoryMedia = pgTable(
  "memory_media",
  {
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memory.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.memoryId, t.mediaId] })],
);

// ─────────────────────────────────────────────── Anniversaries & notifications

/** Per partner, per wedding. */
export const anniversaryPreference = pgTable(
  "anniversary_preference",
  {
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    /** Days before the anniversary to send a reminder; 0 = on the day. */
    remindDaysBefore: integer("remind_days_before").array().notNull().default(sql`ARRAY[0]::integer[]`),
    includeMemoryPrompt: boolean("include_memory_prompt").notNull().default(true),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.weddingId, t.userId] })],
);

export const notificationStatus = pgEnum("notification_status", ["pending", "sent", "failed", "skipped"]);

/** Outgoing notifications. `dedupeKey` makes scheduling idempotent: the same reminder is never queued twice. */
export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    kind: text("kind").notNull(),
    channel: text("channel").notNull().default("email"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    weddingId: uuid("wedding_id").references(() => wedding.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notification_due_idx").on(t.status, t.scheduledFor)],
);

// ─────────────────────────────────────────────── Operations

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    weddingId: uuid("wedding_id").references(() => wedding.id, { onDelete: "set null" }),
    reason: text("reason").notNull().default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_wedding_idx").on(t.weddingId)],
);

export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    guestbookEntryId: uuid("guestbook_entry_id").references(() => guestbookEntry.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_report_status_idx").on(t.status)],
);

/** Privacy-friendly analytics: a counter per wedding per day, no visitor identifiers. */
export const pageViewDaily = pgTable(
  "page_view_daily",
  {
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => wedding.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.weddingId, t.day] })],
);
