import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { media, memory, memoryMedia } from "@/db/schema";
import type { memorySchema } from "@/lib/validation";
import type { z } from "zod";

type MemoryInput = z.infer<typeof memorySchema>;
export type MemoryRow = typeof memory.$inferSelect & { media: (typeof media.$inferSelect)[] };

export async function createMemory(celebrationId: string, userId: string, input: MemoryInput, mediaIds: string[] = []) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(memory).values({ celebrationId, createdBy: userId, ...input }).returning({ id: memory.id });
    await attach(tx, celebrationId, row.id, mediaIds);
    return row.id;
  });
}

export async function updateMemory(celebrationId: string, memoryId: string, input: MemoryInput) {
  const rows = await db
    .update(memory)
    .set(input)
    .where(and(eq(memory.id, memoryId), eq(memory.celebrationId, celebrationId)))
    .returning({ id: memory.id });
  return rows.length > 0;
}

export async function deleteMemory(celebrationId: string, memoryId: string) {
  const rows = await db
    .delete(memory)
    .where(and(eq(memory.id, memoryId), eq(memory.celebrationId, celebrationId)))
    .returning({ id: memory.id });
  return rows.length > 0;
}

/** Link photos to a memory. Only this celebration's photos can be attached. */
async function attach(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], celebrationId: string, memoryId: string, mediaIds: string[]) {
  if (!mediaIds.length) return;
  const own = await tx
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.celebrationId, celebrationId), inArray(media.id, mediaIds)));
  const ownIds = new Set(own.map((m) => m.id));
  const values = mediaIds.filter((id) => ownIds.has(id)).map((mediaId, sortOrder) => ({ memoryId, mediaId, sortOrder }));
  if (values.length) await tx.insert(memoryMedia).values(values).onConflictDoNothing();
}

export async function addMemoryPhotos(celebrationId: string, memoryId: string, mediaIds: string[]) {
  const [m] = await db.select({ id: memory.id }).from(memory).where(and(eq(memory.id, memoryId), eq(memory.celebrationId, celebrationId)));
  if (!m) return false;
  await db.transaction((tx) => attach(tx, celebrationId, memoryId, mediaIds));
  return true;
}

/** Newest first for the dashboard; the public page sorts chronologically itself. */
export async function listMemories(celebrationId: string, { onlyPublic }: { onlyPublic: boolean }): Promise<MemoryRow[]> {
  const rows = await db
    .select()
    .from(memory)
    .where(and(eq(memory.celebrationId, celebrationId), onlyPublic ? eq(memory.isPublic, true) : undefined))
    .orderBy(desc(memory.happenedOn), desc(memory.createdAt));
  if (!rows.length) return [];
  const links = await db
    .select({ memoryId: memoryMedia.memoryId, m: media })
    .from(memoryMedia)
    .innerJoin(media, eq(media.id, memoryMedia.mediaId))
    .where(inArray(memoryMedia.memoryId, rows.map((r) => r.id)))
    .orderBy(asc(memoryMedia.sortOrder));
  return rows.map((r) => ({ ...r, media: links.filter((l) => l.memoryId === r.id).map((l) => l.m) }));
}
