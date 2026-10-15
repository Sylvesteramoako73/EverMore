import "server-only";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { anniversaryPreference, celebration, event, notification, user } from "@/db/schema";
import { primaryEvent, yearlyDate } from "@/lib/celebration-rules";
import { addDays, nextAnniversary, plainDateInZone } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

/** Which yearly reminder an occasion gets. Others (trips, reunions…) don't send one. */
const KIND: Partial<Record<string, "anniversary" | "memorial" | "birthday">> = {
  wedding: "anniversary",
  anniversary: "anniversary",
  funeral: "memorial",
  birthday: "birthday",
  naming: "birthday",
};

/**
 * Queue today's reminders. Idempotent: each reminder has a dedupe key, so running this many times a day
 * (or after a missed run) never queues the same email twice.
 */
export async function scheduleReminders(now = new Date()) {
  const rows = await db
    .select({
      celebrationId: celebration.id,
      kind: celebration.kind,
      title: celebration.title,
      honorees: celebration.honorees,
      keyDate: celebration.keyDate,
      timezone: celebration.timezone,
      primaryEventId: celebration.primaryEventId,
      userId: anniversaryPreference.userId,
      days: anniversaryPreference.remindDaysBefore,
    })
    .from(anniversaryPreference)
    .innerJoin(celebration, eq(celebration.id, anniversaryPreference.celebrationId))
    .where(and(eq(anniversaryPreference.emailEnabled, true), eq(celebration.status, "published")));

  // Without a chosen date, the yearly date is the main event's day (as on the public page).
  const needEvents = [...new Set(rows.filter((r) => !r.keyDate && KIND[r.kind]).map((r) => r.celebrationId))];
  const events = needEvents.length
    ? await db.select().from(event).where(inArray(event.celebrationId, needEvents))
    : [];

  let queued = 0;
  for (const r of rows) {
    const kind = KIND[r.kind];
    const keyDate = yearlyDate(r.keyDate, primaryEvent(events.filter((e) => e.celebrationId === r.celebrationId), r.primaryEventId));
    if (!kind || !keyDate) continue;
    const today = plainDateInZone(now, r.timezone);
    for (const daysBefore of r.days) {
      // The anniversary this reminder would be for: the next one on or after (today + daysBefore).
      const target = nextAnniversary(keyDate, addDays(today, daysBefore));
      if (addDays(target.date, -daysBefore) !== today || target.years < 1) continue;
      const name = r.honorees[0]?.displayName || r.honorees[0]?.fullName || r.title;
      const inserted = await db
        .insert(notification)
        .values({
          dedupeKey: `${kind}:${r.celebrationId}:${r.userId}:${target.date}:${daysBefore}`,
          kind,
          userId: r.userId,
          celebrationId: r.celebrationId,
          payload: { title: r.title, name, years: target.years, daysBefore },
          scheduledFor: now,
        })
        .onConflictDoNothing()
        .returning({ id: notification.id });
      queued += inserted.length;
    }
  }
  return queued;
}

/** Send what's due. Retries failures up to three times. */
export async function deliverDue(now = new Date(), batch = 50) {
  const due = await db
    .select({ n: notification, email: user.email })
    .from(notification)
    .innerJoin(user, eq(user.id, notification.userId))
    .where(and(eq(notification.status, "pending"), lte(notification.scheduledFor, now)))
    .limit(batch);

  let sent = 0;
  for (const { n, email } of due) {
    const p = n.payload as { title: string; name: string; years: number; daysBefore: number };
    const url = appUrl("/dashboard/memories");
    const msg =
      n.kind === "memorial"
        ? emails.memorialReminder(email, p.name, p.years, p.daysBefore, url)
        : n.kind === "birthday"
          ? emails.birthdayReminder(email, p.name, p.years, p.daysBefore, url)
          : emails.anniversaryReminder(email, p.title, p.years, p.daysBefore, url);
    const result = await sendEmail(msg).catch((err: unknown) => ({ delivered: false as const, reason: String(err) }));
    // The development outbox counts as sent: the message was produced and saved.
    const ok = result.delivered || result.reason.startsWith("Development outbox");
    await db
      .update(notification)
      .set({
        status: ok ? "sent" : n.attempts + 1 >= 3 ? "failed" : "pending",
        attempts: sql`${notification.attempts} + 1`,
        sentAt: ok ? new Date() : null,
        lastError: ok ? null : result.delivered ? null : result.reason,
        providerMessageId: result.delivered ? result.id : null,
        scheduledFor: ok ? n.scheduledFor : new Date(now.getTime() + 30 * 60_000),
      })
      .where(eq(notification.id, n.id));
    if (ok) sent++;
  }
  return sent;
}

export async function getReminderPreference(celebrationId: string, userId: string) {
  const [row] = await db
    .select()
    .from(anniversaryPreference)
    .where(and(eq(anniversaryPreference.celebrationId, celebrationId), eq(anniversaryPreference.userId, userId)));
  return row ?? { emailEnabled: false, remindDaysBefore: [0], includeMemoryPrompt: true };
}

export async function saveReminderPreference(
  celebrationId: string,
  userId: string,
  input: { emailEnabled: boolean; remindDaysBefore: number[]; includeMemoryPrompt: boolean },
) {
  await db
    .insert(anniversaryPreference)
    .values({ celebrationId, userId, ...input })
    .onConflictDoUpdate({ target: [anniversaryPreference.celebrationId, anniversaryPreference.userId], set: input });
}

/** For tests and the admin page: recent notifications for some celebrations. */
export function notificationsFor(celebrationIds: string[]) {
  return celebrationIds.length ? db.select().from(notification).where(inArray(notification.celebrationId, celebrationIds)) : Promise.resolve([]);
}
