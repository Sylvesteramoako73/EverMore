import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { anniversaryPreference, celebration, celebrationMember, event, notification, user } from "@/db/schema";
import { primaryEvent, yearlyDate } from "@/lib/celebration-rules";
import { addDays, nextAnniversary, plainDateInZone } from "@/lib/dates";
import { aiDraftingEnabled, appUrl } from "@/lib/env";
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

// ───────────────────────────── Unfinished pages

/** Days to wait, after the host last touched the page or we last nudged, before the 1st, 2nd and 3rd email. */
const NUDGE_GAPS_DAYS = [1, 3, 6] as const;
/** Pages left alone longer than this are let go. */
const NUDGE_WINDOW_DAYS = 45;
const STEP_NAMES = ["What you are celebrating", "The details", "The programme and venues", "Photos", "Design and colours", "Review and publish"] as const;
const DAY = 86_400_000;

/**
 * Queue a nudge for each draft page its host has left alone: at most three, spaced out, and never for a
 * page that has been published. Idempotent through the dedupe key (one per page per stage).
 */
export async function scheduleUnfinishedNudges(now = new Date()) {
  const drafts = await db
    .select({
      id: celebration.id,
      title: celebration.title,
      kind: celebration.kind,
      step: celebration.onboardingStep,
      updatedAt: celebration.updatedAt,
      userId: celebrationMember.userId,
    })
    .from(celebration)
    .innerJoin(celebrationMember, and(eq(celebrationMember.celebrationId, celebration.id), eq(celebrationMember.role, "owner")))
    .where(and(eq(celebration.status, "draft"), gte(celebration.createdAt, new Date(now.getTime() - NUDGE_WINDOW_DAYS * DAY))));
  if (!drafts.length) return 0;

  const sentSoFar = await db
    .select({ celebrationId: notification.celebrationId, createdAt: notification.createdAt })
    .from(notification)
    .where(and(eq(notification.kind, "unfinished"), inArray(notification.celebrationId, drafts.map((d) => d.id))));

  let queued = 0;
  for (const d of drafts) {
    const mine = sentSoFar.filter((n) => n.celebrationId === d.id);
    const stage = mine.length; // 0, 1 or 2 already queued
    if (stage >= NUDGE_GAPS_DAYS.length) continue;
    const last = Math.max(d.updatedAt.getTime(), ...mine.map((n) => n.createdAt.getTime()));
    if (now.getTime() - last < NUDGE_GAPS_DAYS[stage] * DAY) continue;
    const inserted = await db
      .insert(notification)
      .values({
        dedupeKey: `unfinished:${d.id}:${stage + 1}`,
        kind: "unfinished",
        userId: d.userId,
        celebrationId: d.id,
        payload: { stage: stage + 1, title: d.title, pageKind: d.kind, step: d.step },
        scheduledFor: now,
      })
      .onConflictDoNothing()
      .returning({ id: notification.id });
    queued += inserted.length;
  }
  return queued;
}

function unfinishedEmail(n: typeof notification.$inferSelect, to: string, name: string) {
  const p = n.payload as { stage: 1 | 2 | 3; title: string; pageKind: string; step: number };
  // onboardingStep is the last step finished; step 6 (review and publish) is the one left.
  const stepsDone = Math.min(Math.max(p.step, 1), 5);
  return emails.unfinishedPage(
    to,
    {
      stage: p.stage,
      name,
      title: p.title,
      kind: p.pageKind,
      stepsDone,
      nextStep: STEP_NAMES[Math.min(stepsDone, 5)],
      readyToPublish: stepsDone >= 5,
      aiTip: aiDraftingEnabled(),
    },
    appUrl("/onboarding"),
  );
}

/** Send what's due. Retries failures up to three times. */
export async function deliverDue(now = new Date(), batch = 50) {
  const due = await db
    .select({ n: notification, email: user.email, name: user.name })
    .from(notification)
    .innerJoin(user, eq(user.id, notification.userId))
    .where(and(eq(notification.status, "pending"), lte(notification.scheduledFor, now)))
    .limit(batch);

  let sent = 0;
  for (const { n, email, name } of due) {
    // A page that was published since the nudge was queued no longer needs it.
    if (n.kind === "unfinished") {
      const [c] = n.celebrationId ? await db.select({ status: celebration.status }).from(celebration).where(eq(celebration.id, n.celebrationId)) : [];
      if (!c || c.status !== "draft") {
        await db.update(notification).set({ status: "skipped" }).where(eq(notification.id, n.id));
        continue;
      }
    }
    const p = n.payload as { title: string; name: string; years: number; daysBefore: number };
    const url = appUrl("/dashboard/memories");
    const msg =
      n.kind === "unfinished"
        ? unfinishedEmail(n, email, name)
        : n.kind === "memorial"
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
