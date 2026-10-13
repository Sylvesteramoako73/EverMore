import "server-only";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { event, wedding } from "@/db/schema";
import { zonedLocalToUtc } from "@/lib/dates";
import { entitlements } from "@/lib/plans";
import type { EventInput } from "@/lib/validation";
import { geocodeAddress } from "./geocode";

export type WeddingEvent = typeof event.$inferSelect;

/** A wedding's events in chronological order. */
export function listEvents(weddingId: string): Promise<WeddingEvent[]> {
  return db.select().from(event).where(eq(event.weddingId, weddingId)).orderBy(asc(event.startsAt), asc(event.sortOrder));
}

export async function getEvent(weddingId: string, eventId: string): Promise<WeddingEvent | null> {
  const [row] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), eq(event.weddingId, weddingId)))
    .limit(1);
  return row ?? null;
}

/** Hand-entered coordinates win; otherwise geocode when the address is new or changed. */
async function resolveCoords(input: EventInput, previous?: WeddingEvent) {
  const coordsEdited = !previous || input.venueLat !== previous.venueLat || input.venueLng !== previous.venueLng;
  if (input.venueLat !== null && input.venueLng !== null && coordsEdited) return { lat: input.venueLat, lng: input.venueLng };
  const addressChanged = !previous || input.venueAddress !== previous.venueAddress;
  if (!input.venueAddress) return { lat: null, lng: null };
  if (addressChanged || input.venueLat === null) {
    const found = await geocodeAddress(input.venueAddress);
    return { lat: found?.lat ?? null, lng: found?.lng ?? null };
  }
  return { lat: input.venueLat, lng: input.venueLng };
}

function columns(input: EventInput, coords: { lat: number | null; lng: number | null }) {
  return {
    name: input.name,
    startsLocal: input.startsLocal,
    endsLocal: input.endsLocal,
    startsAt: zonedLocalToUtc(input.startsLocal, input.timezone),
    endsAt: input.endsLocal ? zonedLocalToUtc(input.endsLocal, input.timezone) : null,
    timezone: input.timezone,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    venueLat: coords.lat,
    venueLng: coords.lng,
    description: input.description,
    dressCode: input.dressCode,
    rsvpRequired: input.rsvpRequired,
    inviteOnly: input.inviteOnly,
  };
}

export class LimitError extends Error {}

/** Add an event. The first event becomes the primary one. Enforces the plan's event limit. */
export async function createEvent(weddingId: string, plan: string, input: EventInput) {
  const [{ n }] = await db.select({ n: count() }).from(event).where(eq(event.weddingId, weddingId));
  const max = entitlements(plan).maxEvents;
  if (n >= max) throw new LimitError(`Your plan includes up to ${max} events.`);
  const coords = await resolveCoords(input);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(event).values({ weddingId, ...columns(input, coords) }).returning({ id: event.id });
    await tx
      .update(wedding)
      .set({ primaryEventId: row.id })
      .where(and(eq(wedding.id, weddingId), isNull(wedding.primaryEventId)));
    return row.id;
  });
}

/** Update an event of `weddingId`. Returns false when it doesn't belong to that wedding. */
export async function updateEvent(weddingId: string, eventId: string, input: EventInput) {
  const previous = await getEvent(weddingId, eventId);
  if (!previous) return false;
  const coords = await resolveCoords(input, previous);
  await db
    .update(event)
    .set(columns(input, coords))
    .where(and(eq(event.id, eventId), eq(event.weddingId, weddingId)));
  return true;
}

/** Delete an event; if it was primary, the earliest remaining event takes over. */
export async function deleteEvent(weddingId: string, eventId: string) {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(event)
      .where(and(eq(event.id, eventId), eq(event.weddingId, weddingId)))
      .returning({ id: event.id });
    if (!removed.length) return false;
    const [next] = await tx
      .select({ id: event.id })
      .from(event)
      .where(eq(event.weddingId, weddingId))
      .orderBy(asc(event.startsAt))
      .limit(1);
    await tx
      .update(wedding)
      .set({ primaryEventId: next?.id ?? null })
      .where(and(eq(wedding.id, weddingId), isNull(wedding.primaryEventId)));
    return true;
  });
}

export async function setPrimaryEvent(weddingId: string, eventId: string) {
  if (!(await getEvent(weddingId, eventId))) return false;
  await db.update(wedding).set({ primaryEventId: eventId }).where(eq(wedding.id, weddingId));
  return true;
}
