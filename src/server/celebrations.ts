import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { anniversaryPreference, event, slugRedirect, user, celebration, celebrationMember } from "@/db/schema";
import { slugProblem, titleSlugBase } from "@/lib/slug";
import type { BasicsInput } from "@/lib/validation";

export type Celebration = typeof celebration.$inferSelect;
export type CelebrationPatch = Partial<Omit<typeof celebration.$inferInsert, "id" | "slug" | "status" | "createdAt">>;

export async function getCelebration(id: string): Promise<Celebration | null> {
  const [row] = await db.select().from(celebration).where(eq(celebration.id, id)).limit(1);
  return row ?? null;
}

/** True if `slug` is used by another celebration, either as its address or as a redirect from an old address. */
export async function isSlugTaken(slug: string, exceptCelebrationId?: string) {
  const other = exceptCelebrationId ? ne(celebration.id, exceptCelebrationId) : undefined;
  const [current] = await db.select({ id: celebration.id }).from(celebration).where(and(eq(celebration.slug, slug), other)).limit(1);
  if (current) return true;
  const [redirect] = await db
    .select({ id: slugRedirect.celebrationId })
    .from(slugRedirect)
    .where(and(eq(slugRedirect.slug, slug), exceptCelebrationId ? ne(slugRedirect.celebrationId, exceptCelebrationId) : undefined))
    .limit(1);
  return Boolean(redirect);
}

/** A readable, unused slug like "ama-and-kofi", with a short suffix on collision. */
export async function uniqueSlug(title: string) {
  const base = titleSlugBase(title);
  if (!(await isSlugTaken(base))) return base;
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  for (const y of years) if (!(await isSlugTaken(`${base}-${y}`))) return `${base}-${y}`;
  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  return `${base}-${randomBytes(5).toString("hex")}`;
}

/** Create a draft celebration owned by `userId`, with default yearly reminders for the owner. */
export async function createCelebration(userId: string, basics: BasicsInput, timezone: string) {
  const slug = await uniqueSlug(basics.title);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(celebration)
      .values({
        slug,
        timezone,
        kind: basics.kind,
        title: basics.title,
        honorees: basics.honorees,
        monogram: basics.monogram,
        onboardingStep: 1,
      })
      .returning({ id: celebration.id, slug: celebration.slug });
    await tx.insert(celebrationMember).values({ celebrationId: row.id, userId, role: "owner" });
    await tx.insert(anniversaryPreference).values({ celebrationId: row.id, userId });
    return row;
  });
}

export async function updateCelebration(id: string, patch: CelebrationPatch) {
  await db.update(celebration).set(patch).where(eq(celebration.id, id));
}

/** Record wizard progress without ever moving backwards. */
export async function advanceOnboarding(id: string, step: number) {
  await db
    .update(celebration)
    .set({ onboardingStep: sql`GREATEST(${celebration.onboardingStep}, ${step})` })
    .where(eq(celebration.id, id));
}

/** What still blocks publishing, in plain language. Empty when ready. */
export async function publishProblems(id: string): Promise<string[]> {
  const w = await getCelebration(id);
  if (!w) return ["Celebration not found."];
  const [{ events }] = await db.select({ events: count() }).from(event).where(eq(event.celebrationId, id));
  const problems: string[] = [];
  if (!w.title.trim()) problems.push("Give your celebration a name.");
  if (events === 0) problems.push("Add at least one event with a date, so guests know when to come.");
  return problems;
}

export async function publishCelebration(id: string): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const problems = await publishProblems(id);
  if (problems.length) return { ok: false, problems };
  await db
    .update(celebration)
    .set({
      status: "published",
      publishedAt: sql`coalesce(${celebration.publishedAt}, now())`,
      onboardingCompletedAt: sql`coalesce(${celebration.onboardingCompletedAt}, now())`,
    })
    .where(eq(celebration.id, id));
  return { ok: true };
}

export async function setCelebrationStatus(id: string, status: "draft" | "archived") {
  await db.update(celebration).set({ status }).where(eq(celebration.id, id));
}

/**
 * Change a celebration's address. The old address keeps working as a redirect, so printed QR codes
 * and shared links don't break. Returns the previous slug.
 */
export async function changeSlug(id: string, newSlug: string): Promise<{ ok: true; previous: string } | { ok: false; error: string }> {
  const problem = slugProblem(newSlug);
  if (problem) return { ok: false, error: problem };
  const w = await getCelebration(id);
  if (!w) return { ok: false, error: "Celebration not found." };
  if (w.slug === newSlug) return { ok: true, previous: w.slug };
  if (await isSlugTaken(newSlug, id)) return { ok: false, error: "That address is already taken." };

  try {
    await db.transaction(async (tx) => {
      // Reclaiming one of our own old addresses: it stops being a redirect.
      await tx.delete(slugRedirect).where(and(eq(slugRedirect.slug, newSlug), eq(slugRedirect.celebrationId, id)));
      await tx.update(celebration).set({ slug: newSlug }).where(eq(celebration.id, id));
      await tx.insert(slugRedirect).values({ slug: w.slug, celebrationId: id }).onConflictDoNothing();
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "That address is already taken." };
    throw err;
  }
  return { ok: true, previous: w.slug };
}

/** Find a celebration by its address, following redirects from old addresses. */
export async function resolveSlug(slug: string): Promise<{ celebrationId: string; canonicalSlug: string } | null> {
  const [row] = await db
    .select({ id: celebration.id, slug: celebration.slug })
    .from(celebration)
    .leftJoin(slugRedirect, eq(slugRedirect.celebrationId, celebration.id))
    .where(or(eq(celebration.slug, slug), eq(slugRedirect.slug, slug)))
    .limit(1);
  return row ? { celebrationId: row.id, canonicalSlug: row.slug } : null;
}

export function listMembers(celebrationId: string) {
  return db
    .select({ userId: celebrationMember.userId, role: celebrationMember.role, name: user.name, email: user.email })
    .from(celebrationMember)
    .innerJoin(user, eq(user.id, celebrationMember.userId))
    .where(eq(celebrationMember.celebrationId, celebrationId))
    .orderBy(asc(celebrationMember.createdAt));
}

export function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
