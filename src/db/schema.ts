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
import { OCCASION_KINDS, type ColourSwatch, type Honoree, type OccasionDetails, type RsvpContact } from "@/lib/occasions";

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

// ─────────────────────────────────────────────── Celebrations

export const celebrationStatus = pgEnum("celebration_status", ["draft", "published", "archived"]);
/** public: listed & indexable if allowed; unlisted: anyone with the link; private: only invited guests via token. */
export const celebrationVisibility = pgEnum("celebration_visibility", ["public", "unlisted", "private"]);
export const memberRole = pgEnum("member_role", ["owner", "cohost", "planner"]);
export const occasionKind = pgEnum("occasion_kind", OCCASION_KINDS);

export const celebration = pgTable(
  "celebration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: celebrationStatus("status").notNull().default("draft"),
    visibility: celebrationVisibility("visibility").notNull().default("unlisted"),
    allowIndexing: boolean("allow_indexing").notNull().default(false),
    plan: text("plan").notNull().default("free"),

    // What and who
    kind: occasionKind("kind").notNull().default("wedding"),
    /** The headline guests see, e.g. "Ama & Kofi", "Kwame at 50", "Akosombo Getaway". */
    title: text("title").notNull(),
    /** The people the page is about: partners, the birthday person, the loved one remembered, the baby. */
    honorees: jsonb("honorees").$type<Honoree[]>().notNull().default([]),
    /** Occasion-specific facts (dates of birth/passing, name meaning, meeting point, packing list). */
    details: jsonb("details").$type<OccasionDetails>().notNull().default({}),
    monogram: text("monogram").notNull().default(""),
    story: text("story").notNull().default(""),
    guestMessage: text("guest_message").notNull().default(""),

    // When
    /** Date-only: the day yearly reminders count from (wedding day, birthday, date of passing). */
    keyDate: date("key_date"),
    timezone: text("timezone").notNull().default("UTC"),
    subtype: text("subtype").notNull().default(""),
    dressCode: text("dress_code").notNull().default(""),
    announcement: text("announcement").notNull().default(""),
    hashtag: text("hashtag").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),

    // Presentation
    themeId: text("theme_id").notNull().default("earth-and-ivory"),
    /** "Colours of the day": named swatches guests can dress in. */
    colours: jsonb("colours").$type<ColourSwatch[]>().notNull().default([]),
    heroMediaId: uuid("hero_media_id").references((): AnyPgColumn => media.id, { onDelete: "set null" }),
    primaryEventId: uuid("primary_event_id").references((): AnyPgColumn => event.id, { onDelete: "set null" }),

    // Guest features
    rsvpEnabled: boolean("rsvp_enabled").notNull().default(true),
    /** People guests may call or message to RSVP, shown beside the form. */
    rsvpContacts: jsonb("rsvp_contacts").$type<RsvpContact[]>().notNull().default([]),
    rsvpDeadline: date("rsvp_deadline"),
    /** Open RSVP: anyone with the link may reply. Otherwise only guests with an invitation link. */
    openRsvp: boolean("open_rsvp").notNull().default(true),
    defaultPartySize: integer("default_party_size").notNull().default(2),
    mealOptions: text("meal_options").array().notNull().default(sql`ARRAY[]::text[]`),
    askDietary: boolean("ask_dietary").notNull().default(true),
    guestbookEnabled: boolean("guestbook_enabled").notNull().default(true),
    guestbookModeration: boolean("guestbook_moderation").notNull().default(false),
    /** Guests may upload photos/videos to a shared gallery ("Share the love"). */
    guestUploadsEnabled: boolean("guest_uploads_enabled").notNull().default(true),
    /** Guest uploads wait for host approval before appearing. On by default. */
    guestUploadsModeration: boolean("guest_uploads_moderation").notNull().default(true),
    giftMessage: text("gift_message").notNull().default(""),
    giftLinks: jsonb("gift_links").$type<{ label: string; url: string }[]>().notNull().default([]),
    thankYouMessage: text("thank_you_message").notNull().default(""),
    /** Anyone on the page can look up their table by name (otherwise only via personal links). */
    tableFinderEnabled: boolean("table_finder_enabled").notNull().default(false),
    /** YouTube, Facebook or other stream link for those who can't attend in person. */
    livestreamUrl: text("livestream_url").notNull().default(""),
    /** Sections the couple hides on the public page, e.g. ["story", "gallery"]. */
    hiddenSections: text("hidden_sections").array().notNull().default(sql`ARRAY[]::text[]`),

    /** Furthest wizard step reached, for resuming onboarding. */
    onboardingStep: integer("onboarding_step").notNull().default(0),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("celebration_status_idx").on(t.status)],
);

export const celebrationMember = pgTable(
  "celebration_member",
  {
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.celebrationId, t.userId] }), index("celebration_member_user_idx").on(t.userId)],
);

/** Pending invitation for a partner/planner to join a celebration. Only a hash of the token is stored. */
export const memberInvite = pgTable(
  "member_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("cohost"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("member_invite_celebration_idx").on(t.celebrationId)],
);

/** Old slugs keep working after a couple changes their address. */
export const slugRedirect = pgTable("slug_redirect", {
  slug: text("slug").primaryKey(),
  celebrationId: uuid("celebration_id")
    .notNull()
    .references(() => celebration.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── Events

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
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
    /** Programme icon key (see PROGRAMME_ICONS). */
    icon: text("icon").notNull().default(""),
    /** Optional photo of the venue, shown on the venue card. */
    venueMediaId: uuid("venue_media_id").references((): AnyPgColumn => media.id, { onDelete: "set null" }),
    rsvpRequired: boolean("rsvp_required").notNull().default(true),
    /** Hidden from the public page; only guests invited to it (guest_event) see it. */
    inviteOnly: boolean("invite_only").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("event_celebration_idx").on(t.celebrationId, t.startsAt)],
);

// ─────────────────────────────────────────────── Media

export const mediaKind = pgEnum("media_kind", ["photo", "video"]);
export const mediaCollection = pgEnum("media_collection", ["portrait", "engagement", "gallery", "event", "memory", "venue", "shared"]);
/** Who added a photo: the hosts, or a guest through the shared gallery. */
export const mediaSource = pgEnum("media_source", ["host", "guest"]);
export const mediaStatus = pgEnum("media_status", ["approved", "pending", "hidden"]);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
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
    source: mediaSource("source").notNull().default("host"),
    /** Guest uploads start "pending" when the host moderates them. */
    status: mediaStatus("status").notNull().default("approved"),
    /** Name a guest gave when uploading (guest uploads only). */
    guestName: text("guest_name").notNull().default(""),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("media_celebration_idx").on(t.celebrationId, t.collection, t.sortOrder),
    index("media_shared_idx").on(t.celebrationId, t.source, t.status, t.createdAt),
  ],
);

// ─────────────────────────────────────────────── Guests & RSVPs

/** An invitation: one household or party. Its token is the personal invitation link. */
export const guest = pgTable(
  "guest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    maxPartySize: integer("max_party_size").notNull().default(1),
    notes: text("notes").notNull().default(""),
    /** High-entropy bearer token used in the guest's personal link. */
    inviteToken: text("invite_token").notNull().unique(),
    /** Set when the couple marks the invitation as sent; never inferred. */
    invitationSentAt: timestamp("invitation_sent_at", { withTimezone: true }),
    /** Seating: shown to the guest on their personal page and in the table finder. */
    tableName: text("table_name").notNull().default(""),
    /** Door check-in on the day: when, and how many people from this invitation arrived. */
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInCount: integer("checked_in_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("guest_celebration_idx").on(t.celebrationId)],
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
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
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
    uniqueIndex("rsvp_open_email_uq").on(t.celebrationId, t.email).where(sql`${t.guestId} IS NULL`),
    index("rsvp_celebration_idx").on(t.celebrationId),
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
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    message: text("message").notNull(),
    status: guestbookStatus("status").notNull().default("approved"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("guestbook_celebration_idx").on(t.celebrationId, t.createdAt)],
);

// ─────────────────────────────────────────────── Memories

export const memory = pgTable(
  "memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    happenedOn: date("happened_on").notNull(),
    location: text("location").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("memory_celebration_idx").on(t.celebrationId, t.happenedOn)],
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

/** Per partner, per celebration. */
export const anniversaryPreference = pgTable(
  "anniversary_preference",
  {
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    /** Days before the anniversary to send a reminder; 0 = on the day. */
    remindDaysBefore: integer("remind_days_before").array().notNull().default(sql`ARRAY[0]::integer[]`),
    includeMemoryPrompt: boolean("include_memory_prompt").notNull().default(true),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.celebrationId, t.userId] })],
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
    celebrationId: uuid("celebration_id").references(() => celebration.id, { onDelete: "cascade" }),
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

// ─────────────────────────────────────────────── Gifts & contributions

/**
 * Something guests can give towards: a wedding gift, a trip fund, funeral contributions.
 * Money goes straight to the host (MoMo) or through Paystack; EverMore only records it.
 */
export const fund = pgTable(
  "fund",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Optional target in the smallest unit (pesewas for GHS). */
    goalMinor: integer("goal_minor"),
    currency: text("currency").notNull().default("GHS"),
    /** Show the amount raised and the progress bar on the public page. */
    showProgress: boolean("show_progress").notNull().default(true),
    /** Where guests send Mobile Money directly when online payment isn't set up (or as an alternative). */
    momoNumber: text("momo_number").notNull().default(""),
    momoName: text("momo_name").notNull().default(""),
    momoNetwork: text("momo_network").notNull().default(""),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("fund_celebration_idx").on(t.celebrationId)],
);

export const giftMethod = pgEnum("gift_method", ["paystack", "momo_direct"]);
export const giftStatus = pgEnum("gift_status", ["pending", "confirmed", "failed"]);

export const gift = pgTable(
  "gift",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    fundId: uuid("fund_id").references(() => fund.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    message: text("message").notNull().default(""),
    /** Hide the giver's name from other guests (the host always sees it). */
    anonymous: boolean("anonymous").notNull().default(false),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("GHS"),
    method: giftMethod("method").notNull(),
    /** Paystack: confirmed by verification/webhook. Direct MoMo: confirmed by the host. */
    status: giftStatus("status").notNull().default("pending"),
    /** Our payment reference (Paystack) – unique so webhooks are idempotent. */
    reference: text("reference").notNull().unique(),
    /** What the payment provider reported, e.g. "mobile_money" / "card", and the MoMo network. */
    channel: text("channel").notNull().default(""),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("gift_celebration_idx").on(t.celebrationId, t.status), index("gift_fund_idx").on(t.fundId)],
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
    celebrationId: uuid("celebration_id").references(() => celebration.id, { onDelete: "set null" }),
    reason: text("reason").notNull().default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_celebration_idx").on(t.celebrationId)],
);

export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    guestbookEntryId: uuid("guestbook_entry_id").references(() => guestbookEntry.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_report_status_idx").on(t.status)],
);

/** Privacy-friendly analytics: a counter per celebration per day, no visitor identifiers. */
export const pageViewDaily = pgTable(
  "page_view_daily",
  {
    celebrationId: uuid("celebration_id")
      .notNull()
      .references(() => celebration.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.celebrationId, t.day] })],
);
