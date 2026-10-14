import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contentReport, guestbookEntry } from "@/db/schema";

export async function addGuestbookEntry(celebrationId: string, name: string, message: string, moderated: boolean) {
  const [row] = await db
    .insert(guestbookEntry)
    .values({ celebrationId, name, message, status: moderated ? "pending" : "approved" })
    .returning({ id: guestbookEntry.id, status: guestbookEntry.status });
  return row;
}

export function listGuestbook(celebrationId: string, { onlyApproved }: { onlyApproved: boolean }) {
  return db
    .select()
    .from(guestbookEntry)
    .where(and(eq(guestbookEntry.celebrationId, celebrationId), onlyApproved ? eq(guestbookEntry.status, "approved") : undefined))
    .orderBy(desc(guestbookEntry.createdAt))
    .limit(500);
}

export async function setGuestbookStatus(celebrationId: string, entryId: string, status: "approved" | "hidden" | "pending") {
  const rows = await db
    .update(guestbookEntry)
    .set({ status })
    .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.celebrationId, celebrationId)))
    .returning({ id: guestbookEntry.id });
  return rows.length > 0;
}

export async function deleteGuestbookEntry(celebrationId: string, entryId: string) {
  const rows = await db
    .delete(guestbookEntry)
    .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.celebrationId, celebrationId)))
    .returning({ id: guestbookEntry.id });
  return rows.length > 0;
}

/** A visitor reports a message. After 3 reports it is hidden until the couple reviews it. */
export async function reportGuestbookEntry(celebrationId: string, entryId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(guestbookEntry)
      .set({
        reportCount: sql`${guestbookEntry.reportCount} + 1`,
        status: sql`CASE WHEN ${guestbookEntry.reportCount} + 1 >= 3 THEN 'hidden'::guestbook_status ELSE ${guestbookEntry.status} END`,
      })
      .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.celebrationId, celebrationId)))
      .returning({ id: guestbookEntry.id });
    if (!entry) return false;
    await tx.insert(contentReport).values({ celebrationId, guestbookEntryId: entryId, reason: reason.slice(0, 200) });
    return true;
  });
}
