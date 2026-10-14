import "server-only";
import type { EventValues } from "@/components/couple/event-forms";
import type { PhotoItem } from "@/components/couple/photo-manager";
import type { CelebrationEvent } from "./events";
import { mediaUrl, type Media } from "./media";

// Shape server rows into the plain props couple-facing client components expect.

export const eventValues = (e: CelebrationEvent): EventValues => ({
  id: e.id,
  name: e.name,
  startsLocal: e.startsLocal,
  endsLocal: e.endsLocal,
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
  venueImage: e.venueMediaId ? mediaUrl(e.venueMediaId, "thumb", { signed: true }) : null,
  rsvpRequired: e.rsvpRequired,
  inviteOnly: e.inviteOnly,
});

/** Thumbnails for the couple's own dashboard: always signed, so private photos display too. */
export const photoItem = (m: Media): PhotoItem => ({
  id: m.id,
  thumb: mediaUrl(m.id, "thumb", { signed: true }),
  collection: m.collection,
  caption: m.caption,
  altText: m.altText,
  isPublic: m.isPublic,
  placeholder: m.placeholder,
});
