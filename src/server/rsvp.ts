import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { event, guest, guestEvent, rsvp, rsvpResponse } from "@/db/schema";
import { fieldErrors, rsvpBaseSchema, type FieldErrors } from "@/lib/validation";
import { rsvpField } from "@/lib/celebration-rules";

type Offered = { id: string; name: string };
type Limits = { maxPartySize: number; mealOptions: string[]; askDietary: boolean };

export type ParsedRsvp = {
  name: string;
  email: string;
  phone: string;
  partySize: number;
  mealChoice: string;
  dietary: string;
  message: string;
  answers: { eventId: string; attending: boolean }[];
};

/**
 * Validate a reply against the events this visitor was offered and their invitation's limits.
 * Answers for events not offered are ignored, so nobody can RSVP to an event they weren't invited to.
 */
export function parseRsvp(raw: Record<string, unknown>, offered: Offered[], limits: Limits) {
  const parsed = rsvpBaseSchema.safeParse(raw);
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);

  const answers: ParsedRsvp["answers"] = [];
  for (const e of offered) {
    const value = raw[rsvpField(e.id)];
    if (value === "yes" || value === "no") answers.push({ eventId: e.id, attending: value === "yes" });
    else errors[rsvpField(e.id)] = [offered.length > 1 ? `Please let us know about ${e.name}.` : "Please let us know if you can come."];
  }

  const attending = answers.some((a) => a.attending);
  if (parsed.success && attending) {
    if (parsed.data.partySize > limits.maxPartySize) {
      errors.partySize = [
        limits.maxPartySize === 1
          ? "Your invitation is for one person."
          : `Your invitation is for up to ${limits.maxPartySize} people.`,
      ];
    }
    if (parsed.data.mealChoice && !limits.mealOptions.includes(parsed.data.mealChoice)) {
      errors.mealChoice = ["Please choose one of the meal options."];
    }
  }

  if (!parsed.success || Object.keys(errors).length) return { ok: false as const, errors };
  const d = parsed.data;
  return {
    ok: true as const,
    data: {
      ...d,
      partySize: attending ? d.partySize : 0,
      mealChoice: attending ? d.mealChoice : "",
      dietary: attending && limits.askDietary ? d.dietary : "",
      answers,
    } satisfies ParsedRsvp,
  };
}

/**
 * Create or update a reply. Through an invitation link there is one reply per invitation; on the open
 * form there is one reply per email address. Repeat submissions replace earlier answers.
 */
export async function saveRsvp(celebrationId: string, guestId: string | null, r: ParsedRsvp) {
  return db.transaction(async (tx) => {
    const values = {
      celebrationId,
      guestId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      mealChoice: r.mealChoice,
      dietary: r.dietary,
      message: r.message,
    };
    const update = { name: r.name, email: r.email, phone: r.phone, mealChoice: r.mealChoice, dietary: r.dietary, message: r.message, updatedAt: new Date() };
    const [row] = guestId
      ? await tx
          .insert(rsvp)
          .values(values)
          .onConflictDoUpdate({ target: rsvp.guestId, targetWhere: sql`${rsvp.guestId} IS NOT NULL`, set: update })
          .returning({ id: rsvp.id, inserted: sql<boolean>`(xmax = 0)` })
      : await tx
          .insert(rsvp)
          .values(values)
          .onConflictDoUpdate({ target: [rsvp.celebrationId, rsvp.email], targetWhere: sql`${rsvp.guestId} IS NULL`, set: update })
          .returning({ id: rsvp.id, inserted: sql<boolean>`(xmax = 0)` });

    for (const a of r.answers) {
      const partySize = a.attending ? r.partySize : 0;
      await tx
        .insert(rsvpResponse)
        .values({ rsvpId: row.id, eventId: a.eventId, attending: a.attending, partySize })
        .onConflictDoUpdate({ target: [rsvpResponse.rsvpId, rsvpResponse.eventId], set: { attending: a.attending, partySize } });
    }
    // xmax = 0 means the row was freshly inserted rather than updated by the conflict clause.
    return { id: row.id, updated: !row.inserted };
  });
}

/** The invitation behind a personal link, with the events it covers (empty = all public events). */
export async function findInvitation(celebrationId: string, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [g] = await db
    .select()
    .from(guest)
    .where(and(eq(guest.celebrationId, celebrationId), eq(guest.inviteToken, token)))
    .limit(1);
  if (!g) return null;
  const events = await db.select({ eventId: guestEvent.eventId }).from(guestEvent).where(eq(guestEvent.guestId, g.id));
  const [existing] = await db.select({ id: rsvp.id }).from(rsvp).where(eq(rsvp.guestId, g.id)).limit(1);
  return { guest: g, eventIds: new Set(events.map((e) => e.eventId)), hasReplied: Boolean(existing) };
}

// ───────────────────────────── Dashboard queries

export type RsvpRow = {
  id: string;
  guestId: string | null;
  name: string;
  email: string;
  phone: string;
  mealChoice: string;
  dietary: string;
  message: string;
  updatedAt: Date;
  answers: { eventId: string; attending: boolean; partySize: number }[];
};

export async function listRsvps(celebrationId: string): Promise<RsvpRow[]> {
  const rows = await db
    .select({
      id: rsvp.id,
      guestId: rsvp.guestId,
      name: rsvp.name,
      email: rsvp.email,
      phone: rsvp.phone,
      mealChoice: rsvp.mealChoice,
      dietary: rsvp.dietary,
      message: rsvp.message,
      updatedAt: rsvp.updatedAt,
      // Subqueries use explicit table-qualified names: Drizzle leaves columns unqualified inside sql``.
      answers: sql<RsvpRow["answers"]>`coalesce((
        SELECT json_agg(json_build_object('eventId', rr.event_id, 'attending', rr.attending, 'partySize', rr.party_size))
        FROM rsvp_response rr WHERE rr.rsvp_id = "rsvp"."id"), '[]'::json)`,
    })
    .from(rsvp)
    .where(eq(rsvp.celebrationId, celebrationId))
    .orderBy(desc(rsvp.updatedAt));
  return rows;
}

export type EventTotals = { eventId: string; name: string; startsAt: Date; yes: number; no: number; guests: number };

/** Per event: replies saying yes/no and expected guests (sum of party sizes). */
export async function eventTotals(celebrationId: string): Promise<EventTotals[]> {
  const rows = await db
    .select({
      eventId: event.id,
      name: event.name,
      startsAt: event.startsAt,
      yes: sql<number>`count(${rsvpResponse.rsvpId}) FILTER (WHERE ${rsvpResponse.attending})`.mapWith(Number),
      no: sql<number>`count(${rsvpResponse.rsvpId}) FILTER (WHERE NOT ${rsvpResponse.attending})`.mapWith(Number),
      guests: sql<number>`coalesce(sum(${rsvpResponse.partySize}) FILTER (WHERE ${rsvpResponse.attending}), 0)`.mapWith(Number),
    })
    .from(event)
    .leftJoin(rsvpResponse, eq(rsvpResponse.eventId, event.id))
    .where(eq(event.celebrationId, celebrationId))
    .groupBy(event.id)
    .orderBy(event.startsAt);
  return rows;
}

/** Headline numbers: replies, households attending something, and the largest expected headcount. */
export async function rsvpSummary(celebrationId: string) {
  const [row] = await db
    .select({
      replies: sql<number>`count(*)`.mapWith(Number),
      attending: sql<number>`count(*) FILTER (WHERE EXISTS (SELECT 1 FROM rsvp_response rr WHERE rr.rsvp_id = "rsvp"."id" AND rr.attending))`.mapWith(Number),
      people: sql<number>`coalesce(sum((SELECT max(rr.party_size) FROM rsvp_response rr WHERE rr.rsvp_id = "rsvp"."id" AND rr.attending)), 0)`.mapWith(Number),
    })
    .from(rsvp)
    .where(eq(rsvp.celebrationId, celebrationId));
  const [invites] = await db
    .select({
      invited: sql<number>`count(*)`.mapWith(Number),
      pending: sql<number>`count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM rsvp r WHERE r.guest_id = "guest"."id"))`.mapWith(Number),
    })
    .from(guest)
    .where(eq(guest.celebrationId, celebrationId));
  return {
    replies: row?.replies ?? 0,
    attending: row?.attending ?? 0,
    declined: (row?.replies ?? 0) - (row?.attending ?? 0),
    people: row?.people ?? 0,
    invitations: invites?.invited ?? 0,
    pending: invites?.pending ?? 0,
  };
}

export async function deleteRsvp(celebrationId: string, rsvpId: string) {
  const rows = await db.delete(rsvp).where(and(eq(rsvp.id, rsvpId), eq(rsvp.celebrationId, celebrationId))).returning({ id: rsvp.id });
  return rows.length > 0;
}

