import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { gift, guestbookEntry, media, pageViewDaily } from "@/db/schema";
import { requireCurrentCelebration } from "@/lib/dal";
import { appUrl } from "@/lib/env";
import { getCelebration } from "@/server/celebrations";

/** The host's celebration for dashboard pages. Memoised per request so the layout and page share it. */
export const loadDashboard = cache(async () => {
  const { user, celebrationId, role } = await requireCurrentCelebration();
  const celebration = await getCelebration(celebrationId);
  if (!celebration) redirect("/onboarding");
  // Nothing set up beyond the first step yet: the wizard is the useful place to be.
  if (celebration.onboardingStep < 1) redirect("/onboarding");
  return { user, role, celebration, pageUrl: appUrl(`/${celebration.slug}`) };
});

/** Things waiting for the host: messages and guest photos to approve. */
export const waitingCounts = cache(async (celebrationId: string) => {
  const [[messages], [photos], [gifts]] = await Promise.all([
    db.select({ n: count() }).from(guestbookEntry).where(and(eq(guestbookEntry.celebrationId, celebrationId), eq(guestbookEntry.status, "pending"))),
    db.select({ n: count() }).from(media).where(and(eq(media.celebrationId, celebrationId), eq(media.source, "guest"), eq(media.status, "pending"))),
    db.select({ n: count() }).from(gift).where(and(eq(gift.celebrationId, celebrationId), eq(gift.method, "momo_direct"), eq(gift.status, "pending"))),
  ]);
  return { messages: messages.n, photos: photos.n, gifts: gifts.n };
});

/** Page views per day for the last `days` days (missing days are zero). */
export async function recentViews(celebrationId: string, days = 30) {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({ day: pageViewDaily.day, views: pageViewDaily.views })
    .from(pageViewDaily)
    .where(and(eq(pageViewDaily.celebrationId, celebrationId), gte(pageViewDaily.day, since)));
  const byDay = new Map(rows.map((r) => [String(r.day), r.views]));
  const out: { day: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day, views: byDay.get(day) ?? 0 });
  }
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(${pageViewDaily.views}), 0)`.mapWith(Number) })
    .from(pageViewDaily)
    .where(eq(pageViewDaily.celebrationId, celebrationId));
  return { days: out, total };
}

/** A WhatsApp share link for a personal invitation. Uses the guest's number when it looks international. */
export function whatsappInvite({ phone, name, title, link, remembrance }: { phone: string; name: string; title: string; link: string; remembrance: boolean }) {
  // The full name reads naturally for households too ("Hello Auntie Esi & family!").
  const text = remembrance
    ? `Dear ${name}, here are the details for ${title}. Your personal link: ${link}`
    : `Hello ${name}! You're invited to ${title}. Here are all the details, and you can RSVP on your personal link: ${link}`;
  const digits = phone.replace(/[^\d+]/g, "");
  const to = digits.startsWith("+") ? digits.slice(1) : digits.startsWith("0") && digits.length === 10 ? `233${digits.slice(1)}` : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
