import "server-only";
import type { EventView, ImageView, WeddingView } from "@/components/wedding/types";
import { db } from "@/db";
import { pageViewDaily } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { plainDateInZone } from "@/lib/dates";
import { answerableEvents, marriageDate, primaryEvent, rsvpDeadlinePassed, visibleEvents, weddingPhase } from "@/lib/wedding-rules";
import { sql } from "drizzle-orm";
import { listEvents } from "./events";
import { listGuestbook } from "./guestbook";
import { listMedia, mediaUrl, type Media } from "./media";
import { listMemories } from "./memories";
import { findInvitation } from "./rsvp";
import { getWedding, resolveSlug, type Wedding } from "./weddings";

export type PublicResult =
  | { kind: "ok"; view: WeddingView; wedding: Wedding }
  | { kind: "redirect"; slug: string }
  | { kind: "private"; couple: string }
  | { kind: "not-found" };

/**
 * Decide what a visitor may see of a wedding and build the page data.
 * - Drafts and archived pages: members only (shown as a preview).
 * - Published public/unlisted pages: anyone with the link.
 * - Published private pages: members, or guests holding a valid personal invitation token.
 */
export async function loadPublicWedding(
  slug: string,
  { inviteToken, isMember, now = Date.now() }: { inviteToken: string | null; isMember: (weddingId: string) => Promise<boolean>; now?: number },
): Promise<PublicResult> {
  const resolved = await resolveSlug(slug);
  if (!resolved) return { kind: "not-found" };
  if (resolved.canonicalSlug !== slug) return { kind: "redirect", slug: resolved.canonicalSlug };
  const w = await getWedding(resolved.weddingId);
  if (!w) return { kind: "not-found" };

  const invitation = inviteToken ? await findInvitation(w.id, inviteToken) : null;
  const member = await isMember(w.id);
  if (w.status !== "published" && !member) return { kind: "not-found" };
  if (w.status === "published" && w.visibility === "private" && !member && !invitation) {
    return { kind: "private", couple: `${w.partnerOneDisplayName} & ${w.partnerTwoDisplayName}` };
  }

  const preview = w.status !== "published";
  // Photos of private or unpublished pages are served through signed, expiring URLs.
  const signed = preview || w.visibility === "private";
  const image = (m: Media): ImageView => ({
    id: m.id,
    src: mediaUrl(m.id, "full", { signed }),
    thumb: mediaUrl(m.id, "thumb", { signed }),
    alt: m.altText || m.caption || "",
    caption: m.caption,
    width: m.width,
    height: m.height,
    placeholder: m.placeholder,
  });

  const [allEvents, photos, entries, memories] = await Promise.all([
    listEvents(w.id),
    listMedia(w.id),
    w.guestbookEnabled ? listGuestbook(w.id, { onlyApproved: true }) : Promise.resolve([]),
    listMemories(w.id, { onlyPublic: true }),
  ]);

  const invitedIds = invitation && invitation.eventIds.size ? invitation.eventIds : null;
  const events = visibleEvents(allEvents, invitedIds);
  const primary = primaryEvent(events, w.primaryEventId);
  const phase = weddingPhase(primary, now);
  const settings = { rsvpEnabled: w.rsvpEnabled, rsvpDeadline: w.rsvpDeadline, timezone: w.timezone };
  const canUseOpenForm = w.openRsvp || Boolean(invitation);
  const offered = canUseOpenForm ? answerableEvents(settings, allEvents, { now, invitedEventIds: invitedIds }) : [];

  let closedReason: string | null = null;
  if (!offered.length) {
    if (!w.rsvpEnabled) closedReason = null;
    else if (!canUseOpenForm) closedReason = "RSVPs are by invitation. Please use the personal link from your invitation.";
    else if (rsvpDeadlinePassed(settings, now)) closedReason = "The RSVP deadline has passed. Please contact the couple directly.";
    else if (phase === "married") closedReason = null;
    else closedReason = "RSVPs are closed.";
  }

  const publicPhotos = photos.filter((p) => p.isPublic);
  const hero = photos.find((p) => p.id === w.heroMediaId && p.isPublic) ?? null;

  const eventView = (e: (typeof allEvents)[number]): EventView => ({
    id: e.id,
    name: e.name,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    timezone: e.timezone,
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    venueLat: e.venueLat,
    venueLng: e.venueLng,
    description: e.description,
    dressCode: e.dressCode,
  });

  const shareUrl = appUrl(`/w/${w.slug}`);
  const view: WeddingView = {
    id: w.id,
    slug: w.slug,
    themeId: w.themeId,
    partnerOne: w.partnerOneDisplayName,
    partnerTwo: w.partnerTwoDisplayName,
    monogram: w.monogram || `${w.partnerOneDisplayName[0] ?? ""}${w.partnerTwoDisplayName[0] ?? ""}`,
    guestMessage: w.guestMessage,
    story: w.story,
    announcement: w.announcement,
    hashtag: w.hashtag,
    dressCode: w.dressCode,
    contact: w.contactEmail || w.contactPhone ? { name: w.contactName, email: w.contactEmail, phone: w.contactPhone } : null,
    hero: hero ? image(hero) : null,
    portraits: publicPhotos.filter((p) => p.collection === "portrait").map(image),
    gallery: publicPhotos.filter((p) => ["gallery", "engagement", "wedding"].includes(p.collection)).map(image),
    events: events.map(eventView),
    primaryEventId: primary?.id ?? null,
    phase,
    marriageDate: marriageDate(w.weddingDate, primary),
    timezone: w.timezone,
    rsvp: {
      open: offered.length > 0,
      closedReason,
      deadline: w.rsvpDeadline,
      events: offered.map((e) => ({ id: e.id, name: e.name, startsAt: e.startsAt.toISOString(), timezone: e.timezone })),
      maxPartySize: invitation ? invitation.guest.maxPartySize : w.defaultPartySize,
      mealOptions: w.mealOptions,
      askDietary: w.askDietary,
      invitation: invitation
        ? { token: invitation.guest.inviteToken, guestName: invitation.guest.name, existing: invitation.hasReplied }
        : null,
    },
    guestbook: {
      enabled: w.guestbookEnabled,
      moderated: w.guestbookModeration,
      entries: entries.map((e) => ({ id: e.id, name: e.name, message: e.message, createdAt: e.createdAt.toISOString() })),
    },
    gifts: { message: w.giftMessage, links: w.giftLinks },
    thankYouMessage: w.thankYouMessage,
    memories: [...memories]
      .sort((a, b) => a.happenedOn.localeCompare(b.happenedOn))
      .map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        happenedOn: m.happenedOn,
        location: m.location,
        images: m.media.filter((x) => x.isPublic).map(image),
      })),
    hiddenSections: w.hiddenSections,
    shareUrl,
    links: { qr: `/w/${w.slug}/qr`, card: `/w/${w.slug}/card`, calendar: `/w/${w.slug}/calendar.ics` },
    mode: preview ? "preview" : "live",
  };
  return { kind: "ok", view, wedding: w };
}

/** Count a page view: one counter per wedding per day, with no visitor identifiers. */
export async function recordPageView(weddingId: string, timezone: string) {
  const day = plainDateInZone(new Date(), timezone);
  await db
    .insert(pageViewDaily)
    .values({ weddingId, day, views: 1 })
    .onConflictDoUpdate({ target: [pageViewDaily.weddingId, pageViewDaily.day], set: { views: sql`${pageViewDaily.views} + 1` } });
}
