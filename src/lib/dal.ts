import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, notFound, redirect, unauthorized } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { wedding, weddingMember } from "@/db/schema";
import { auth } from "@/lib/auth";

// Data Access Layer: the only place that turns a request into "who is this and what may they touch".
// Every page, route handler and server action that reads private data goes through these helpers.

export type CurrentUser = { id: string; name: string; email: string; role: string; emailVerified: boolean };
export type MemberRole = "owner" | "partner" | "planner";

/** The signed-in user, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; suspendedAt?: Date | null };
  if (u.suspendedAt) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? "user", emailVerified: u.emailVerified };
});

/** For pages: redirect to sign-in when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For server actions and route handlers: throw a 401 instead of redirecting. */
export async function requireUserForAction(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  return user;
}

/** The weddings a user belongs to, most recent first. */
export async function listMyWeddings(userId: string) {
  return db
    .select({ id: wedding.id, slug: wedding.slug, role: weddingMember.role, status: wedding.status,
      partnerOne: wedding.partnerOneDisplayName, partnerTwo: wedding.partnerTwoDisplayName })
    .from(weddingMember)
    .innerJoin(wedding, eq(wedding.id, weddingMember.weddingId))
    .where(eq(weddingMember.userId, userId))
    .orderBy(wedding.createdAt);
}

/** The user's role in a wedding, or null if they are not a member. */
export async function membershipRole(userId: string, weddingId: string): Promise<MemberRole | null> {
  const [row] = await db
    .select({ role: weddingMember.role })
    .from(weddingMember)
    .where(and(eq(weddingMember.userId, userId), eq(weddingMember.weddingId, weddingId)))
    .limit(1);
  return row?.role ?? null;
}

/**
 * Authorise access to one wedding. Non-members get a 404 (not 403), so wedding ids can't be probed.
 * `roles` restricts sensitive operations, e.g. only the owner may delete the wedding.
 */
export async function requireWeddingAccess(
  weddingId: string,
  { roles = ["owner", "partner", "planner"] as MemberRole[], forAction = false } = {},
) {
  const user = forAction ? await requireUserForAction() : await requireUser();
  const role = await membershipRole(user.id, weddingId);
  if (!role || !roles.includes(role)) notFound();
  return { user, role };
}

/** The wedding the dashboard is working on: the user's first wedding, or onboarding if they have none. */
export async function requireCurrentWedding() {
  const user = await requireUser();
  const [first] = await listMyWeddings(user.id);
  if (!first) redirect("/onboarding");
  const role = first.role;
  return { user, weddingId: first.id, role };
}
