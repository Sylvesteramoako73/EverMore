import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { forbidden, notFound, redirect, unauthorized } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { celebration, celebrationMember, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";

// Data Access Layer: the only place that turns a request into "who is this and what may they touch".
// Every page, route handler and server action that reads private data goes through these helpers.

export type CurrentUser = { id: string; name: string; email: string; role: string; emailVerified: boolean };
export type MemberRole = "owner" | "cohost" | "planner";

/** The signed-in user, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Role and suspension are read fresh from the database, not from the session (which is cached in a
  // cookie for a few minutes), so making someone an admin or suspending them takes effect at once.
  const [fresh] = await db
    .select({ role: userTable.role, suspendedAt: userTable.suspendedAt })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (!fresh || fresh.suspendedAt) return null;
  const u = session.user;
  return { id: u.id, name: u.name, email: u.email, role: fresh.role, emailVerified: u.emailVerified };
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

/** For admin pages: signed-out visitors go to the admin sign-in; signed-in non-admins get a 403. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") forbidden();
  return user;
}

/** The celebrations a user belongs to, most recent first. */
export async function listMyCelebrations(userId: string) {
  return db
    .select({ id: celebration.id, slug: celebration.slug, role: celebrationMember.role, status: celebration.status,
      title: celebration.title, kind: celebration.kind })
    .from(celebrationMember)
    .innerJoin(celebration, eq(celebration.id, celebrationMember.celebrationId))
    .where(eq(celebrationMember.userId, userId))
    .orderBy(celebration.createdAt);
}

/** The user's role in a celebration, or null if they are not a member. */
export async function membershipRole(userId: string, celebrationId: string): Promise<MemberRole | null> {
  const [row] = await db
    .select({ role: celebrationMember.role })
    .from(celebrationMember)
    .where(and(eq(celebrationMember.userId, userId), eq(celebrationMember.celebrationId, celebrationId)))
    .limit(1);
  return row?.role ?? null;
}

/**
 * Authorise access to one celebration. Non-members get a 404 (not 403), so celebration ids can't be probed.
 * `roles` restricts sensitive operations, e.g. only the owner may delete the celebration.
 */
export async function requireCelebrationAccess(
  celebrationId: string,
  { roles = ["owner", "cohost", "planner"] as MemberRole[], forAction = false } = {},
) {
  const user = forAction ? await requireUserForAction() : await requireUser();
  const role = await membershipRole(user.id, celebrationId);
  if (!role || !roles.includes(role)) notFound();
  return { user, role };
}

/** Cookie remembering which celebration the dashboard is working on, for people who help with several. */
export const CURRENT_CELEBRATION_COOKIE = "evm_celebration";

/**
 * The celebration the dashboard is working on: the one picked in the switcher if the user still belongs
 * to it, otherwise their first. Sends people with none to onboarding.
 */
export async function requireCurrentCelebration() {
  const user = await requireUser();
  const current = await pickCurrentCelebration(user.id);
  if (!current) redirect("/onboarding");
  return { user, celebrationId: current.id, role: current.role };
}

/** The celebration picked in the switcher (if still a member), else the user's first; null if none. */
export async function pickCurrentCelebration(userId: string) {
  const mine = await listMyCelebrations(userId);
  const picked = (await cookies()).get(CURRENT_CELEBRATION_COOKIE)?.value;
  return mine.find((m) => m.id === picked) ?? mine[0] ?? null;
}
