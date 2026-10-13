import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contentReport, guestbookEntry } from "@/db/schema";

export async function addGuestbookEntry(weddingId: string, name: string, message: string, moderated: boolean) {
  const [row] = await db
    .insert(guestbookEntry)
    .values({ weddingId, name, message, status: moderated ? "pending" : "approved" })
    .returning({ id: guestbookEntry.id, status: guestbookEntry.status });
  return row;
}

export function listGuestbook(weddingId: string, { onlyApproved }: { onlyApproved: boolean }) {
  return db
    .select()
    .from(guestbookEntry)
    .where(and(eq(guestbookEntry.weddingId, weddingId), onlyApproved ? eq(guestbookEntry.status, "approved") : undefined))
    .orderBy(desc(guestbookEntry.createdAt))
    .limit(500);
}

export async function setGuestbookStatus(weddingId: string, entryId: string, status: "approved" | "hidden" | "pending") {
  const rows = await db
    .update(guestbookEntry)
    .set({ status })
    .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.weddingId, weddingId)))
    .returning({ id: guestbookEntry.id });
  return rows.length > 0;
}

export async function deleteGuestbookEntry(weddingId: string, entryId: string) {
  const rows = await db
    .delete(guestbookEntry)
    .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.weddingId, weddingId)))
    .returning({ id: guestbookEntry.id });
  return rows.length > 0;
}

/** A visitor reports a message. After 3 reports it is hidden until the couple reviews it. */
export async function reportGuestbookEntry(weddingId: string, entryId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(guestbookEntry)
      .set({
        reportCount: sql`${guestbookEntry.reportCount} + 1`,
        status: sql`CASE WHEN ${guestbookEntry.reportCount} + 1 >= 3 THEN 'hidden'::guestbook_status ELSE ${guestbookEntry.status} END`,
      })
      .where(and(eq(guestbookEntry.id, entryId), eq(guestbookEntry.weddingId, weddingId)))
      .returning({ id: guestbookEntry.id });
    if (!entry) return false;
    await tx.insert(contentReport).values({ weddingId, guestbookEntryId: entryId, reason: reason.slice(0, 200) });
    return true;
  });
}
