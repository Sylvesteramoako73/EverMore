import "server-only";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { event, celebration } from "@/db/schema";
import { zonedLocalToUtc } from "@/lib/dates";
import { entitlements } from "@/lib/plans";
import type { EventInput } from "@/lib/validation";
import { geocodeAddress } from "./geocode";

export type CelebrationEvent = typeof event.$inferSelect;

/** A celebration's events in chronological order. */
export function listEvents(celebrationId: string): Promise<CelebrationEvent[]> {
  return db.select().from(event).where(eq(event.celebrationId, celebrationId)).orderBy(asc(event.startsAt), asc(event.sortOrder));
}

export async function getEvent(celebrationId: string, eventId: string): Promise<CelebrationEvent | null> {
  const [row] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), eq(event.celebrationId, celebrationId)))
    .limit(1);
  return row ?? null;
}

/** Hand-entered coordinates win; otherwise geocode when the address is new or changed. */
async function resolveCoords(input: EventInput, previous?: CelebrationEvent) {
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
    icon: input.icon,
    rsvpRequired: input.rsvpRequired,
    inviteOnly: input.inviteOnly,
    // undefined = leave the venue photo as it is; null = remove it.
    ...(input.venueMediaId !== undefined ? { venueMediaId: input.venueMediaId } : {}),
  };
}

export class LimitError extends Error {}

/** Add an event. The first event becomes the primary one. Enforces the plan's event limit. */
export async function createEvent(celebrationId: string, plan: string, input: EventInput) {
  const [{ n }] = await db.select({ n: count() }).from(event).where(eq(event.celebrationId, celebrationId));
  const max = entitlements(plan).maxEvents;
  if (n >= max) throw new LimitError(`Your plan includes up to ${max} events.`);
  const coords = await resolveCoords(input);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(event).values({ celebrationId, ...columns(input, coords) }).returning({ id: event.id });
    await tx
      .update(celebration)
      .set({ primaryEventId: row.id })
      .where(and(eq(celebration.id, celebrationId), isNull(celebration.primaryEventId)));
    return row.id;
  });
}

/** Update an event of `celebrationId`. Returns false when it doesn't belong to that celebration. */
export async function updateEvent(celebrationId: string, eventId: string, input: EventInput) {
  const previous = await getEvent(celebrationId, eventId);
  if (!previous) return false;
  const coords = await resolveCoords(input, previous);
  await db
    .update(event)
    .set(columns(input, coords))
    .where(and(eq(event.id, eventId), eq(event.celebrationId, celebrationId)));
  return true;
}

/** Delete an event; if it was primary, the earliest remaining event takes over. */
export async function deleteEvent(celebrationId: string, eventId: string) {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(event)
      .where(and(eq(event.id, eventId), eq(event.celebrationId, celebrationId)))
      .returning({ id: event.id });
    if (!removed.length) return false;
    const [next] = await tx
      .select({ id: event.id })
      .from(event)
      .where(eq(event.celebrationId, celebrationId))
      .orderBy(asc(event.startsAt))
      .limit(1);
    await tx
      .update(celebration)
      .set({ primaryEventId: next?.id ?? null })
      .where(and(eq(celebration.id, celebrationId), isNull(celebration.primaryEventId)));
    return true;
  });
}

export async function setPrimaryEvent(celebrationId: string, eventId: string) {
  if (!(await getEvent(celebrationId, eventId))) return false;
  await db.update(celebration).set({ primaryEventId: eventId }).where(eq(celebration.id, celebrationId));
  return true;
}
