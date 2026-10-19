import "server-only";
import { and, count, desc, eq, gte, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, celebration, celebrationMember, contentReport, gift, guestbookEntry, pageViewDaily, rsvp, session, user } from "@/db/schema";

// Platform-wide queries for the owner's admin area. Every caller must check requireAdmin() first.

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export async function platformStats() {
  const since30 = daysAgo(30).toISOString().slice(0, 10);
  const [[users], [users7], [users30], pages, [rsvps], [gifts], [views], [openReports], [suspended]] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(gte(user.createdAt, daysAgo(7))),
    db.select({ n: count() }).from(user).where(gte(user.createdAt, daysAgo(30))),
    db.select({ status: celebration.status, kind: celebration.kind, n: count() }).from(celebration).groupBy(celebration.status, celebration.kind),
    db.select({ n: count() }).from(rsvp),
    db
      .select({ n: count(), total: sql<number>`coalesce(sum(${gift.amountMinor}), 0)`.mapWith(Number) })
      .from(gift)
      .where(eq(gift.status, "confirmed")),
    db.select({ n: sql<number>`coalesce(sum(${pageViewDaily.views}), 0)`.mapWith(Number) }).from(pageViewDaily).where(gte(pageViewDaily.day, since30)),
    db.select({ n: count() }).from(contentReport).where(eq(contentReport.status, "open")),
    db.select({ n: count() }).from(user).where(isNotNull(user.suspendedAt)),
  ]);
  const byStatus = { draft: 0, published: 0, archived: 0 } as Record<string, number>;
  const byKind: Record<string, number> = {};
  for (const p of pages) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + p.n;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + p.n;
  }
  return {
    users: users.n,
    newUsers7: users7.n,
    newUsers30: users30.n,
    suspended: suspended.n,
    pages: byStatus,
    totalPages: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byKind,
    rsvps: rsvps.n,
    gifts: gifts.n,
    giftTotal: gifts.total,
    views30: views.n,
    openReports: openReports.n,
  };
}

export async function listUsers(query = "", limit = 100) {
  const q = query.trim();
  const where = q ? or(ilike(user.email, `%${escapeLike(q)}%`), ilike(user.name, `%${escapeLike(q)}%`)) : undefined;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      suspendedAt: user.suspendedAt,
      createdAt: user.createdAt,
      pages: sql<number>`(SELECT count(*) FROM celebration_member cm WHERE cm.user_id = "user"."id")`.mapWith(Number),
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

export async function listAllCelebrations(query = "", limit = 100) {
  const q = query.trim();
  const where = q ? or(ilike(celebration.title, `%${escapeLike(q)}%`), ilike(celebration.slug, `%${escapeLike(q)}%`)) : undefined;
  const rows = await db
    .select({
      id: celebration.id,
      title: celebration.title,
      slug: celebration.slug,
      kind: celebration.kind,
      status: celebration.status,
      visibility: celebration.visibility,
      themeId: celebration.themeId,
      createdAt: celebration.createdAt,
      ownerName: user.name,
      ownerEmail: user.email,
      rsvps: sql<number>`(SELECT count(*) FROM rsvp r WHERE r.celebration_id = "celebration"."id")`.mapWith(Number),
      views: sql<number>`(SELECT coalesce(sum(v.views), 0) FROM page_view_daily v WHERE v.celebration_id = "celebration"."id")`.mapWith(Number),
    })
    .from(celebration)
    .leftJoin(celebrationMember, and(eq(celebrationMember.celebrationId, celebration.id), eq(celebrationMember.role, "owner")))
    .leftJoin(user, eq(user.id, celebrationMember.userId))
    .where(where)
    .orderBy(desc(celebration.createdAt))
    .limit(limit);
  return rows;
}

export function listReports(status: "open" | "resolved" | "dismissed" = "open") {
  return db
    .select({
      id: contentReport.id,
      reason: contentReport.reason,
      createdAt: contentReport.createdAt,
      status: contentReport.status,
      entryId: guestbookEntry.id,
      entryName: guestbookEntry.name,
      entryMessage: guestbookEntry.message,
      entryStatus: guestbookEntry.status,
      celebrationTitle: celebration.title,
      slug: celebration.slug,
    })
    .from(contentReport)
    .innerJoin(celebration, eq(celebration.id, contentReport.celebrationId))
    .leftJoin(guestbookEntry, eq(guestbookEntry.id, contentReport.guestbookEntryId))
    .where(eq(contentReport.status, status))
    .orderBy(desc(contentReport.createdAt))
    .limit(200);
}

export function recentActivity(limit = 100) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      createdAt: auditLog.createdAt,
      actorName: user.name,
      actorEmail: user.email,
      celebrationTitle: celebration.title,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .leftJoin(celebration, eq(celebration.id, auditLog.celebrationId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/** Suspend (or restore) an account. Suspending also signs them out everywhere. Admins can't be suspended here. */
export async function setUserSuspended(userId: string, suspended: boolean) {
  const [row] = await db
    .update(user)
    .set({ suspendedAt: suspended ? new Date() : null })
    .where(and(eq(user.id, userId), eq(user.role, "user")))
    .returning({ id: user.id });
  if (row && suspended) await db.delete(session).where(eq(session.userId, userId));
  return Boolean(row);
}

/** Take a page down (archived: no longer public) or let the owner publish it again (back to draft). */
export async function setCelebrationTakenDown(celebrationId: string, takenDown: boolean) {
  const rows = await db
    .update(celebration)
    .set({ status: takenDown ? "archived" : "draft" })
    .where(and(eq(celebration.id, celebrationId), takenDown ? undefined : eq(celebration.status, "archived")))
    .returning({ id: celebration.id });
  return rows.length > 0;
}

/** Close a report, hiding the reported message if asked. */
export async function resolveReport(reportId: string, adminId: string, hideMessage: boolean) {
  return db.transaction(async (tx) => {
    const [r] = await tx
      .update(contentReport)
      .set({ status: hideMessage ? "resolved" : "dismissed", resolvedBy: adminId })
      .where(and(eq(contentReport.id, reportId), eq(contentReport.status, "open")))
      .returning({ entryId: contentReport.guestbookEntryId, celebrationId: contentReport.celebrationId });
    if (!r) return null;
    if (hideMessage && r.entryId) await tx.update(guestbookEntry).set({ status: "hidden" }).where(eq(guestbookEntry.id, r.entryId));
    // Other open reports about the same message are settled the same way.
    if (r.entryId)
      await tx
        .update(contentReport)
        .set({ status: hideMessage ? "resolved" : "dismissed", resolvedBy: adminId })
        .where(and(eq(contentReport.guestbookEntryId, r.entryId), eq(contentReport.status, "open")));
    return r;
  });
}

