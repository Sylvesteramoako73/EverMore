import "server-only";
import { sql } from "drizzle-orm";
import type { CelebrationView, EventView, ImageView, SharedItem } from "@/components/site/types";
import { db } from "@/db";
import { pageViewDaily } from "@/db/schema";
import { answerableEvents, celebrationPhase, primaryEvent, rsvpDeadlinePassed, visibleEvents, yearlyDate } from "@/lib/celebration-rules";
import { plainDateInZone } from "@/lib/dates";
import { appUrl, paymentsEnabled } from "@/lib/env";
import { akanDayName, PARTY_TITLES } from "@/lib/akan";
import { getOccasion } from "@/lib/occasions";
import { getCelebration, resolveSlug, type Celebration } from "./celebrations";
import { fundTotals, listFunds, recentSupporters } from "./gifts";
import { listEvents } from "./events";
import { listGuestbook } from "./guestbook";
import { listMedia, listShared, mediaUrl, type Media } from "./media";
import { listMemories } from "./memories";
import { findInvitation } from "./rsvp";

export type PublicResult =
  | { kind: "ok"; view: CelebrationView; celebration: Celebration }
  | { kind: "redirect"; slug: string }
  | { kind: "private"; title: string }
  | { kind: "not-found" };

const SHARED_PAGE_SIZE = 12;

/**
 * Decide what a visitor may see of a celebration and build the page data.
 * - Drafts and archived pages: members only (shown as a preview).
 * - Published public/unlisted pages: anyone with the link.
 * - Published private pages: members, or guests holding a valid personal invitation token.
 */
export async function loadPublicCelebration(
  slug: string,
  {
    inviteToken,
    isMember,
    now = Date.now(),
    sharedLimit = SHARED_PAGE_SIZE,
  }: { inviteToken: string | null; isMember: (celebrationId: string) => Promise<boolean>; now?: number; sharedLimit?: number },
): Promise<PublicResult> {
  const resolved = await resolveSlug(slug);
  if (!resolved) return { kind: "not-found" };
  if (resolved.canonicalSlug !== slug) return { kind: "redirect", slug: resolved.canonicalSlug };
  const c = await getCelebration(resolved.celebrationId);
  if (!c) return { kind: "not-found" };

  const invitation = inviteToken ? await findInvitation(c.id, inviteToken) : null;
  const member = await isMember(c.id);
  if (c.status !== "published" && !member) return { kind: "not-found" };
  if (c.status === "published" && c.visibility === "private" && !member && !invitation) return { kind: "private", title: c.title };

  const occasion = getOccasion(c.kind);
  const preview = c.status !== "published";
  // Photos of private or unpublished pages are served through signed, expiring URLs.
  const signed = preview || c.visibility === "private";
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

  const [allEvents, photos, entries, memories, shared, funds, totals, supporters] = await Promise.all([
    listEvents(c.id),
    listMedia(c.id, ["portrait", "engagement", "gallery", "event", "venue"]),
    c.guestbookEnabled ? listGuestbook(c.id, { onlyApproved: true }) : Promise.resolve([]),
    listMemories(c.id, { onlyPublic: true }),
    c.guestUploadsEnabled ? listShared(c.id, { onlyApproved: true, limit: sharedLimit }) : Promise.resolve({ items: [], total: 0 }),
    listFunds(c.id),
    fundTotals(c.id),
    recentSupporters(c.id),
  ]);
  const byId = new Map(photos.map((p) => [p.id, p]));

  const invitedIds = invitation && invitation.eventIds.size ? invitation.eventIds : null;
  const events = visibleEvents(allEvents, invitedIds);
  const primary = primaryEvent(events, c.primaryEventId);
  const phase = celebrationPhase(primary, now);
  const settings = { rsvpEnabled: c.rsvpEnabled, rsvpDeadline: c.rsvpDeadline, timezone: c.timezone };
  const canUseOpenForm = (c.openRsvp && c.visibility !== "private") || Boolean(invitation);
  const offered = canUseOpenForm ? answerableEvents(settings, allEvents, { now, invitedEventIds: invitedIds }) : [];

  let closedReason: string | null = null;
  if (!offered.length && c.rsvpEnabled && phase !== "after") {
    if (!canUseOpenForm) closedReason = "Replies are by invitation. Please use the personal link from your invitation.";
    else if (rsvpDeadlinePassed(settings, now)) closedReason = "The reply deadline has passed. Please contact the hosts directly.";
    else if (events.some((e) => e.rsvpRequired)) closedReason = "Replies are closed.";
  }

  const publicPhotos = photos.filter((p) => p.isPublic && p.status === "approved");
  const heroMedia = c.heroMediaId ? byId.get(c.heroMediaId) : undefined;

  const eventView = (e: (typeof allEvents)[number]): EventView => {
    const venuePhoto = e.venueMediaId ? byId.get(e.venueMediaId) : undefined;
    return {
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
      icon: e.icon,
      venueImage: venuePhoto?.isPublic ? image(venuePhoto) : null,
    };
  };

  const sharedItem = (m: Media) => toSharedItem(m, signed);

  const d = c.details;
  const shareUrl = appUrl(`/${c.slug}`);
  const view: CelebrationView = {
    id: c.id,
    slug: c.slug,
    themeId: c.themeId,
    occasion: {
      kind: occasion.kind,
      label: occasion.label,
      countdown: occasion.countdown,
      after: occasion.after,
      copy: {
        hostLine: occasion.copy.hostLine,
        invitation: occasion.copy.invitation,
        today: occasion.copy.today,
        afterLead: occasion.copy.afterLead,
        storyTitle: occasion.copy.storyTitle,
        scheduleTitle: occasion.copy.scheduleTitle,
        guestbookTitle: occasion.copy.guestbookTitle,
        guestbookPrompt: occasion.copy.guestbookPrompt,
        thankYouTitle: occasion.copy.thankYouTitle,
        dateTitle: occasion.copy.dateTitle,
      },
    },
    title: c.title,
    names: c.honorees.map((h) => h.displayName),
    monogram: c.monogram || initials(c.title, c.honorees.map((h) => h.displayName)),
    guestMessage: c.guestMessage,
    story: c.story,
    announcement: c.announcement,
    hashtag: c.hashtag,
    dressCode: c.dressCode,
    facts: {
      nameMeaning: d.nameMeaning ?? "",
      parents: d.parents ?? "",
      meetingPoint: d.meetingPoint ?? "",
      packingList: d.packingList ?? [],
      costNote: d.costNote ?? "",
      institution: d.institution ?? "",
      turningAge: d.turningAge ?? null,
      lifeDates: { born: d.dateOfBirth ?? null, passed: d.dateOfPassing ?? null },
      party: d.party ?? [],
      partyTitle: PARTY_TITLES[c.kind]?.title ?? "Special People",
      dayName: c.kind === "naming" || c.kind === "birthday" ? akanDayName(d.dateOfBirth) : null,
    },
    contact: c.contactEmail || c.contactPhone ? { name: c.contactName, email: c.contactEmail, phone: c.contactPhone } : null,
    hero: heroMedia?.isPublic ? image(heroMedia) : null,
    portraits: publicPhotos.filter((p) => p.collection === "portrait" && p.id !== c.heroMediaId).map(image),
    gallery: publicPhotos.filter((p) => ["gallery", "engagement", "event"].includes(p.collection)).map(image),
    colours: c.colours,
    events: events.map(eventView),
    primaryEventId: primary?.id ?? null,
    phase,
    keyDate: yearlyDate(c.keyDate, primary),
    timezone: c.timezone,
    rsvp: {
      open: offered.length > 0,
      closedReason,
      deadline: c.rsvpDeadline,
      events: offered.map((e) => ({ id: e.id, name: e.name, startsAt: e.startsAt.toISOString(), timezone: e.timezone })),
      maxPartySize: invitation ? invitation.guest.maxPartySize : c.defaultPartySize,
      mealOptions: c.mealOptions,
      askDietary: c.askDietary,
      contacts: c.rsvpContacts,
      invitation: invitation
        ? { token: invitation.guest.inviteToken, guestName: invitation.guest.name, existing: invitation.hasReplied, tableName: invitation.guest.tableName }
        : null,
    },
    guestbook: {
      enabled: c.guestbookEnabled,
      moderated: c.guestbookModeration,
      entries: entries.map((e) => ({ id: e.id, name: e.name, message: e.message, createdAt: e.createdAt.toISOString() })),
    },
    shared: {
      enabled: c.guestUploadsEnabled && !preview,
      moderated: c.guestUploadsModeration,
      items: shared.items.map(sharedItem),
      total: shared.total,
    },
    gifts: {
      message: c.giftMessage,
      links: c.giftLinks,
      funds: funds.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        goal: f.goalMinor,
        raised: f.showProgress ? (totals.get(f.id)?.raised ?? 0) : null,
        count: totals.get(f.id)?.count ?? 0,
        currency: f.currency,
        momo: f.momoNumber ? { number: f.momoNumber, name: f.momoName, network: f.momoNetwork } : null,
      })),
      supporters: supporters.map(({ name, message }) => ({ name, message })),
      online: paymentsEnabled(),
    },
    thankYouMessage: c.thankYouMessage,
    tableFinder: c.tableFinderEnabled && !preview,
    usher:
      member && invitation
        ? {
            slug: c.slug,
            token: invitation.guest.inviteToken,
            name: invitation.guest.name,
            tableName: invitation.guest.tableName,
            maxPartySize: invitation.guest.maxPartySize,
            checkedInCount: invitation.guest.checkedInCount,
          }
        : null,
    livestreamUrl: c.livestreamUrl,
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
    hiddenSections: c.hiddenSections,
    shareUrl,
    links: {
      qr: `/${c.slug}/qr`,
      card: `/${c.slug}/card`,
      calendar: `/${c.slug}/calendar.ics`,
      upload: `/${c.slug}/uploads`,
      pass: invitation ? `/${c.slug}/pass?invite=${encodeURIComponent(invitation.guest.inviteToken)}` : null,
      live: `/${c.slug}/live`,
    },
    mode: preview ? "preview" : "live",
  };
  return { kind: "ok", view, celebration: c };
}

/** A guest upload as shown in the shared gallery. Private or unpublished pages get signed URLs. */
export function toSharedItem(m: Media, signed: boolean): SharedItem {
  const src = mediaUrl(m.id, "full", { signed });
  return {
    id: m.id,
    src,
    thumb: m.kind === "video" ? src : mediaUrl(m.id, "thumb", { signed }),
    alt: m.altText || (m.guestName ? `Shared by ${m.guestName}` : "Shared by a guest"),
    caption: m.caption,
    width: m.width,
    height: m.height,
    placeholder: m.placeholder,
    kind: m.kind,
    guestName: m.guestName,
    downloadUrl: `${src}${signed ? "&" : "?"}download=1`,
  };
}

/** "Ama & Kofi" -> "A&K"; "Kwame at 50" -> "K". */
function initials(title: string, names: string[]) {
  if (names.length >= 2) return `${names[0][0] ?? ""}&${names[1][0] ?? ""}`;
  return (names[0] ?? title).trim().charAt(0).toUpperCase();
}

/** Count a page view: one counter per celebration per day, with no visitor identifiers. */
export async function recordPageView(celebrationId: string, timezone: string) {
  const day = plainDateInZone(new Date(), timezone);
  await db
    .insert(pageViewDaily)
    .values({ celebrationId, day, views: 1 })
    .onConflictDoUpdate({ target: [pageViewDaily.celebrationId, pageViewDaily.day], set: { views: sql`${pageViewDaily.views} + 1` } });
}
