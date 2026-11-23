import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { celebration, event, guest, guestEvent, guestReminder, rsvp, rsvpResponse } from "@/db/schema";
import { addDays, formatLongDate, formatTime, plainDateInZone } from "@/lib/dates";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { getOccasion } from "@/lib/occasions";

export type ReminderDay = 0 | 3;

/** Which reminder an event is due today: 3 days before, on the day, or none. Judged by the event's own time zone. */
export function reminderDayFor(eventStartsLocal: string, timezone: string, now: Date): ReminderDay | null {
  const today = plainDateInZone(now, timezone);
  const day = eventStartsLocal.slice(0, 10);
  if (day === today) return 0;
  if (day === addDays(today, 3)) return 3;
  return null;
}

export function directionsUrl(venueName: string, venueAddress: string, lat?: number | null, lng?: number | null) {
  const q = lat != null && lng != null ? `${lat},${lng}` : [venueName, venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

/**
 * Emails guests 3 days before and on the day of each event. Idempotent: a guest_reminder row per
 * (guest, event, day) means a rerun, or a missed run, never sends the same reminder twice.
 * Guests who said they cannot come to that event, and guests without an email, are left out.
 */
export async function sendGuestReminders(now = new Date(), limit = 300) {
  const events = await db
    .select({ e: event, c: celebration })
    .from(event)
    .innerJoin(celebration, eq(celebration.id, event.celebrationId))
    .where(and(eq(celebration.status, "published"), eq(celebration.guestRemindersEnabled, true)));

  let sent = 0;
  for (const { e, c } of events) {
    const days = reminderDayFor(e.startsLocal, e.timezone, now);
    if (days === null) continue;
    // On the day, an event that has already started is too late to be useful.
    if (days === 0 && e.startsAt.getTime() < now.getTime() - 60 * 60_000) continue;

    const guests = await db.select().from(guest).where(and(eq(guest.celebrationId, c.id)));
    const withEmail = guests.filter((g) => g.email.trim());
    if (withEmail.length === 0) continue;
    const ids = withEmail.map((g) => g.id);
    const [links, replies] = await Promise.all([
      db.select().from(guestEvent).where(inArray(guestEvent.guestId, ids)),
      db
        .select({ guestId: rsvp.guestId, eventId: rsvpResponse.eventId, attending: rsvpResponse.attending })
        .from(rsvp)
        .innerJoin(rsvpResponse, eq(rsvpResponse.rsvpId, rsvp.id))
        .where(and(eq(rsvp.celebrationId, c.id), eq(rsvpResponse.eventId, e.id))),
    ]);
    const invited = new Set(links.filter((l) => l.eventId === e.id).map((l) => l.guestId));
    const hasAnyLink = new Set(links.map((l) => l.guestId));
    const declined = new Set(replies.filter((r) => r.guestId && !r.attending).map((r) => r.guestId!));

    for (const g of withEmail) {
      if (sent >= limit) return sent;
      // No guest_event rows means invited to every event that is not invite only.
      const isInvited = hasAnyLink.has(g.id) ? invited.has(g.id) : !e.inviteOnly;
      if (!isInvited || declined.has(g.id)) continue;

      const [row] = await db
        .insert(guestReminder)
        .values({ guestId: g.id, eventId: e.id, daysBefore: days })
        .onConflictDoNothing()
        .returning();
      const existing = row ?? (await db.select().from(guestReminder).where(and(eq(guestReminder.guestId, g.id), eq(guestReminder.eventId, e.id), eq(guestReminder.daysBefore, days))))[0];
      if (!existing || existing.status === "sent" || existing.status === "failed") continue;

      const msg = emails.guestEventReminder(
        g.email.trim(),
        {
          guestName: g.name,
          title: c.title,
          eventName: e.name,
          when: `${formatLongDate(e.startsAt, e.timezone)}, ${formatTime(e.startsAt, e.timezone)}`,
          venue: [e.venueName, e.venueAddress].filter(Boolean).join(", "),
          dressCode: e.dressCode || c.dressCode,
          daysBefore: days,
          remembrance: getOccasion(c.kind).after === "remembrance",
        },
        appUrl(`/${c.slug}?invite=${g.inviteToken}`),
        directionsUrl(e.venueName, e.venueAddress, e.venueLat, e.venueLng),
      );
      const result = await sendEmail(msg).catch((err: unknown) => ({ delivered: false as const, reason: String(err) }));
      const ok = result.delivered || result.reason.startsWith("Development outbox");
      await db
        .update(guestReminder)
        .set({
          status: ok ? "sent" : existing.attempts + 1 >= 3 ? "failed" : "pending",
          attempts: existing.attempts + 1,
          sentAt: ok ? new Date() : null,
          lastError: ok ? null : result.delivered ? null : result.reason,
        })
        .where(eq(guestReminder.id, existing.id));
      if (ok) sent++;
    }
  }
  return sent;
}
