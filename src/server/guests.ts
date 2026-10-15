import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, ilike, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { event, guest, guestEvent, rsvp } from "@/db/schema";
import { entitlements } from "@/lib/plans";
import type { GuestInput } from "@/lib/validation";
import { LimitError } from "./events";

/** 24 random bytes, URL-safe: the bearer secret in a guest's personal invitation link. */
export const newInviteToken = () => randomBytes(24).toString("base64url");

/** Keep only event ids that belong to this celebration. */
async function ownEventIds(celebrationId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: event.id })
    .from(event)
    .where(and(eq(event.celebrationId, celebrationId), inArray(event.id, ids)));
  return rows.map((r) => r.id);
}

export async function createGuest(celebrationId: string, plan: string, input: GuestInput) {
  const [{ n }] = await db.select({ n: count() }).from(guest).where(eq(guest.celebrationId, celebrationId));
  const max = entitlements(plan).maxGuests;
  if (n >= max) throw new LimitError(`Your plan includes up to ${max} invitations.`);
  const eventIds = await ownEventIds(celebrationId, input.eventIds);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(guest)
      .values({
        celebrationId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        maxPartySize: input.maxPartySize,
        notes: input.notes,
        tableName: input.tableName,
        inviteToken: newInviteToken(),
      })
      .returning({ id: guest.id });
    if (eventIds.length) await tx.insert(guestEvent).values(eventIds.map((eventId) => ({ guestId: row.id, eventId })));
    return row.id;
  });
}

export async function updateGuest(celebrationId: string, guestId: string, input: GuestInput) {
  const eventIds = await ownEventIds(celebrationId, input.eventIds);
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(guest)
      .set({ name: input.name, email: input.email, phone: input.phone, maxPartySize: input.maxPartySize, notes: input.notes, tableName: input.tableName })
      .where(and(eq(guest.id, guestId), eq(guest.celebrationId, celebrationId)))
      .returning({ id: guest.id });
    if (!updated.length) return false;
    await tx.delete(guestEvent).where(eq(guestEvent.guestId, guestId));
    if (eventIds.length) await tx.insert(guestEvent).values(eventIds.map((eventId) => ({ guestId, eventId })));
    return true;
  });
}

export async function deleteGuest(celebrationId: string, guestId: string) {
  const rows = await db.delete(guest).where(and(eq(guest.id, guestId), eq(guest.celebrationId, celebrationId))).returning({ id: guest.id });
  return rows.length > 0;
}

/** Invalidate a leaked link: the guest gets a new one and the old one stops working. */
export async function regenerateInviteToken(celebrationId: string, guestId: string) {
  const rows = await db
    .update(guest)
    .set({ inviteToken: newInviteToken() })
    .where(and(eq(guest.id, guestId), eq(guest.celebrationId, celebrationId)))
    .returning({ id: guest.id });
  return rows.length > 0;
}

/** The couple marks an invitation as sent. We never claim delivery or opening; only what they told us. */
export async function markInvitationSent(celebrationId: string, guestId: string, sent: boolean) {
  await db
    .update(guest)
    .set({ invitationSentAt: sent ? new Date() : null })
    .where(and(eq(guest.id, guestId), eq(guest.celebrationId, celebrationId)));
}

export type GuestRow = typeof guest.$inferSelect & { eventIds: string[]; rsvpId: string | null };

export async function listGuests(celebrationId: string): Promise<GuestRow[]> {
  const rows = await db
    .select({ g: guest, rsvpId: rsvp.id })
    .from(guest)
    .leftJoin(rsvp, eq(rsvp.guestId, guest.id))
    .where(eq(guest.celebrationId, celebrationId))
    .orderBy(asc(guest.name));
  const links = rows.length
    ? await db
        .select()
        .from(guestEvent)
        .where(inArray(guestEvent.guestId, rows.map((r) => r.g.id)))
    : [];
  return rows.map((r) => ({
    ...r.g,
    rsvpId: r.rsvpId,
    eventIds: links.filter((l) => l.guestId === r.g.id).map((l) => l.eventId),
  }));
}

// ───────────────────────────── CSV import

/** Parse one CSV line, honouring quotes. */
function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export type ImportRow = { name: string; email: string; phone: string; maxPartySize: number; tableName: string };

/**
 * Read a guest list CSV with a header row containing at least "name". Optional columns:
 * email, phone, party size / guests / max. Returns rows plus per-line problems.
 */
export function parseGuestCsv(text: string): { rows: ImportRow[]; problems: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], problems: ["The file is empty."] };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const nameCol = col("name");
  if (nameCol < 0) return { rows: [], problems: ['Add a header row with a "Name" column.'] };
  const emailCol = col("email");
  const phoneCol = col("phone", "mobile");
  const sizeCol = col("party", "size", "guests", "max", "seats");
  const tableCol = col("table");

  const rows: ImportRow[] = [];
  const problems: string[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitCsvLine(line);
    const name = cells[nameCol]?.slice(0, 120) ?? "";
    if (!name) return problems.push(`Line ${i + 2}: missing name, skipped.`);
    const email = emailCol >= 0 ? (cells[emailCol] ?? "").toLowerCase().slice(0, 254) : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(`Line ${i + 2}: "${email}" isn't a valid email; imported without it.`);
    const size = sizeCol >= 0 ? Number.parseInt(cells[sizeCol] ?? "", 10) : NaN;
    rows.push({
      name,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
      phone: phoneCol >= 0 ? (cells[phoneCol] ?? "").slice(0, 40) : "",
      maxPartySize: Number.isFinite(size) ? Math.min(Math.max(size, 1), 20) : 1,
      tableName: tableCol >= 0 ? (cells[tableCol] ?? "").slice(0, 60) : "",
    });
  });
  return { rows, problems };
}

export async function importGuests(celebrationId: string, plan: string, rows: ImportRow[]) {
  const [{ n }] = await db.select({ n: count() }).from(guest).where(eq(guest.celebrationId, celebrationId));
  const max = entitlements(plan).maxGuests;
  if (n + rows.length > max) throw new LimitError(`This would take you past your plan's ${max} invitations.`);
  if (!rows.length) return 0;
  await db.insert(guest).values(rows.map((r) => ({ celebrationId, ...r, notes: "", inviteToken: newInviteToken() })));
  return rows.length;
}

// ───────────────────────────── Check-in at the door

/** Check in (or update the head count of) an invitation. count 0 undoes the check-in. */
export async function checkInGuest(celebrationId: string, guestId: string, count: number) {
  const [row] = await db
    .update(guest)
    .set({ checkedInAt: count > 0 ? new Date() : null, checkedInCount: Math.max(0, Math.min(count, 50)) })
    .where(and(eq(guest.id, guestId), eq(guest.celebrationId, celebrationId)))
    .returning({ id: guest.id, name: guest.name, tableName: guest.tableName, maxPartySize: guest.maxPartySize, checkedInCount: guest.checkedInCount });
  return row ?? null;
}

/** Find the invitation behind a scanned entry pass (the personal link's token). */
export async function guestByToken(celebrationId: string, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .select({ id: guest.id, name: guest.name, tableName: guest.tableName, maxPartySize: guest.maxPartySize, checkedInCount: guest.checkedInCount, checkedInAt: guest.checkedInAt })
    .from(guest)
    .where(and(eq(guest.celebrationId, celebrationId), eq(guest.inviteToken, token)))
    .limit(1);
  return row ?? null;
}

/** Escape LIKE wildcards so a search for "50%" means the characters, not a pattern. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Table finder: invitations whose name contains the search (at least 3 letters), with a table set. */
export async function findTables(celebrationId: string, query: string) {
  const q = query.trim();
  if (q.length < 3) return [];
  return db
    .select({ name: guest.name, tableName: guest.tableName })
    .from(guest)
    .where(and(eq(guest.celebrationId, celebrationId), ne(guest.tableName, ""), ilike(guest.name, `%${escapeLike(q)}%`)))
    .orderBy(asc(guest.name))
    .limit(6);
}
