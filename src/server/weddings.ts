import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { anniversaryPreference, event, slugRedirect, user, wedding, weddingMember } from "@/db/schema";
import { coupleSlugBase, slugProblem } from "@/lib/slug";
import type { CoupleInput } from "@/lib/validation";

export type Wedding = typeof wedding.$inferSelect;
export type WeddingPatch = Partial<Omit<typeof wedding.$inferInsert, "id" | "slug" | "status" | "createdAt">>;

export async function getWedding(id: string): Promise<Wedding | null> {
  const [row] = await db.select().from(wedding).where(eq(wedding.id, id)).limit(1);
  return row ?? null;
}

/** True if `slug` is used by another wedding, either as its address or as a redirect from an old address. */
export async function isSlugTaken(slug: string, exceptWeddingId?: string) {
  const other = exceptWeddingId ? ne(wedding.id, exceptWeddingId) : undefined;
  const [current] = await db.select({ id: wedding.id }).from(wedding).where(and(eq(wedding.slug, slug), other)).limit(1);
  if (current) return true;
  const [redirect] = await db
    .select({ id: slugRedirect.weddingId })
    .from(slugRedirect)
    .where(and(eq(slugRedirect.slug, slug), exceptWeddingId ? ne(slugRedirect.weddingId, exceptWeddingId) : undefined))
    .limit(1);
  return Boolean(redirect);
}

/** A readable, unused slug like "ama-and-kofi", with a short suffix on collision. */
export async function uniqueSlug(partnerOne: string, partnerTwo: string) {
  const base = coupleSlugBase(partnerOne, partnerTwo);
  if (!(await isSlugTaken(base))) return base;
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  for (const y of years) if (!(await isSlugTaken(`${base}-${y}`))) return `${base}-${y}`;
  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  return `${base}-${randomBytes(5).toString("hex")}`;
}

/** Create a draft wedding owned by `userId`, with default anniversary reminders for the owner. */
export async function createWedding(userId: string, couple: CoupleInput, timezone: string) {
  const slug = await uniqueSlug(couple.partnerOneDisplayName, couple.partnerTwoDisplayName);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(wedding)
      .values({
        slug,
        timezone,
        partnerOneFullName: couple.partnerOneFullName,
        partnerOneDisplayName: couple.partnerOneDisplayName,
        partnerTwoFullName: couple.partnerTwoFullName,
        partnerTwoDisplayName: couple.partnerTwoDisplayName,
        monogram: couple.monogram,
        story: couple.story,
        guestMessage: couple.guestMessage,
        relationshipStartDate: couple.relationshipStartDate,
        engagementDate: couple.engagementDate,
        onboardingStep: 1,
      })
      .returning({ id: wedding.id, slug: wedding.slug });
    await tx.insert(weddingMember).values({ weddingId: row.id, userId, role: "owner" });
    await tx.insert(anniversaryPreference).values({ weddingId: row.id, userId });
    return row;
  });
}

export async function updateWedding(id: string, patch: WeddingPatch) {
  await db.update(wedding).set(patch).where(eq(wedding.id, id));
}

/** Record wizard progress without ever moving backwards. */
export async function advanceOnboarding(id: string, step: number) {
  await db
    .update(wedding)
    .set({ onboardingStep: sql`GREATEST(${wedding.onboardingStep}, ${step})` })
    .where(eq(wedding.id, id));
}

/** What still blocks publishing, in plain language. Empty when ready. */
export async function publishProblems(id: string): Promise<string[]> {
  const w = await getWedding(id);
  if (!w) return ["Wedding not found."];
  const [{ events }] = await db.select({ events: count() }).from(event).where(eq(event.weddingId, id));
  const problems: string[] = [];
  if (!w.partnerOneDisplayName || !w.partnerTwoDisplayName) problems.push("Add both partners' names.");
  if (events === 0) problems.push("Add at least one event with a date, so guests know when to come.");
  return problems;
}

export async function publishWedding(id: string): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const problems = await publishProblems(id);
  if (problems.length) return { ok: false, problems };
  await db
    .update(wedding)
    .set({
      status: "published",
      publishedAt: sql`coalesce(${wedding.publishedAt}, now())`,
      onboardingCompletedAt: sql`coalesce(${wedding.onboardingCompletedAt}, now())`,
    })
    .where(eq(wedding.id, id));
  return { ok: true };
}

export async function setWeddingStatus(id: string, status: "draft" | "archived") {
  await db.update(wedding).set({ status }).where(eq(wedding.id, id));
}

/**
 * Change a wedding's address. The old address keeps working as a redirect, so printed QR codes
 * and shared links don't break. Returns the previous slug.
 */
export async function changeSlug(id: string, newSlug: string): Promise<{ ok: true; previous: string } | { ok: false; error: string }> {
  const problem = slugProblem(newSlug);
  if (problem) return { ok: false, error: problem };
  const w = await getWedding(id);
  if (!w) return { ok: false, error: "Wedding not found." };
  if (w.slug === newSlug) return { ok: true, previous: w.slug };
  if (await isSlugTaken(newSlug, id)) return { ok: false, error: "That address is already taken." };

  try {
    await db.transaction(async (tx) => {
      // Reclaiming one of our own old addresses: it stops being a redirect.
      await tx.delete(slugRedirect).where(and(eq(slugRedirect.slug, newSlug), eq(slugRedirect.weddingId, id)));
      await tx.update(wedding).set({ slug: newSlug }).where(eq(wedding.id, id));
      await tx.insert(slugRedirect).values({ slug: w.slug, weddingId: id }).onConflictDoNothing();
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "That address is already taken." };
    throw err;
  }
  return { ok: true, previous: w.slug };
}

/** Find a wedding by its address, following redirects from old addresses. */
export async function resolveSlug(slug: string): Promise<{ weddingId: string; canonicalSlug: string } | null> {
  const [row] = await db
    .select({ id: wedding.id, slug: wedding.slug })
    .from(wedding)
    .leftJoin(slugRedirect, eq(slugRedirect.weddingId, wedding.id))
    .where(or(eq(wedding.slug, slug), eq(slugRedirect.slug, slug)))
    .limit(1);
  return row ? { weddingId: row.id, canonicalSlug: row.slug } : null;
}

export function listMembers(weddingId: string) {
  return db
    .select({ userId: weddingMember.userId, role: weddingMember.role, name: user.name, email: user.email })
    .from(weddingMember)
    .innerJoin(user, eq(user.id, weddingMember.userId))
    .where(eq(weddingMember.weddingId, weddingId))
    .orderBy(asc(weddingMember.createdAt));
}

export function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
