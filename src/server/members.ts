import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { celebration, celebrationMember, memberInvite, user } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { emails } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { entitlements } from "@/lib/plans";
import { LimitError } from "./events";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const WEEK = 7 * 86_400_000;

export type InviteRole = "cohost" | "planner";

/** Invite someone by email. Only a hash of the token is stored; the link goes out by email. */
export async function inviteMember(celebrationId: string, invitedBy: { id: string; name: string }, email: string, role: InviteRole) {
  const [c] = await db.select({ title: celebration.title, plan: celebration.plan }).from(celebration).where(eq(celebration.id, celebrationId));
  if (!c) throw new Error("Celebration not found");
  const limits = entitlements(c.plan);
  if (role === "planner" && !limits.plannerMembers) throw new LimitError("Planner access is part of Premium.");

  const [[members], [pending]] = await Promise.all([
    db.select({ n: count() }).from(celebrationMember).where(eq(celebrationMember.celebrationId, celebrationId)),
    db.select({ n: count() }).from(memberInvite).where(and(eq(memberInvite.celebrationId, celebrationId), isNull(memberInvite.acceptedAt), gt(memberInvite.expiresAt, new Date()))),
  ]);
  if (members.n + pending.n >= limits.maxMembers) throw new LimitError(`Your plan allows up to ${limits.maxMembers} people to manage this page, including you.`);

  const [already] = await db
    .select({ id: user.id })
    .from(celebrationMember)
    .innerJoin(user, eq(user.id, celebrationMember.userId))
    .where(and(eq(celebrationMember.celebrationId, celebrationId), eq(user.email, email)))
    .limit(1);
  if (already) throw new LimitError("That person already helps manage this page.");

  const token = randomBytes(24).toString("base64url");
  await db.insert(memberInvite).values({ celebrationId, email, role, tokenHash: hash(token), invitedBy: invitedBy.id, expiresAt: new Date(Date.now() + WEEK) });
  const url = appUrl(`/join/${token}`);
  const sent = await sendEmail(emails.memberInvite(email, invitedBy.name, c.title, role, url));
  return { url, delivered: sent.delivered };
}

export function listInvites(celebrationId: string) {
  return db
    .select({ id: memberInvite.id, email: memberInvite.email, role: memberInvite.role, expiresAt: memberInvite.expiresAt })
    .from(memberInvite)
    .where(and(eq(memberInvite.celebrationId, celebrationId), isNull(memberInvite.acceptedAt), gt(memberInvite.expiresAt, new Date())));
}

export async function revokeInvite(celebrationId: string, inviteId: string) {
  await db.delete(memberInvite).where(and(eq(memberInvite.id, inviteId), eq(memberInvite.celebrationId, celebrationId), isNull(memberInvite.acceptedAt)));
}

/** Remove a co-host or planner. The owner can't be removed. */
export async function removeMember(celebrationId: string, userId: string) {
  const rows = await db
    .delete(celebrationMember)
    .where(and(eq(celebrationMember.celebrationId, celebrationId), eq(celebrationMember.userId, userId), eq(celebrationMember.role, "cohost")))
    .returning({ userId: celebrationMember.userId });
  if (rows.length) return true;
  const planners = await db
    .delete(celebrationMember)
    .where(and(eq(celebrationMember.celebrationId, celebrationId), eq(celebrationMember.userId, userId), eq(celebrationMember.role, "planner")))
    .returning({ userId: celebrationMember.userId });
  return planners.length > 0;
}

/** Look up an invitation from the link, without accepting it. */
export async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .select({ invite: memberInvite, title: celebration.title, inviter: user.name })
    .from(memberInvite)
    .innerJoin(celebration, eq(celebration.id, memberInvite.celebrationId))
    .leftJoin(user, eq(user.id, memberInvite.invitedBy))
    .where(eq(memberInvite.tokenHash, hash(token)))
    .limit(1);
  if (!row) return null;
  const expired = row.invite.expiresAt < new Date();
  return { ...row, expired, accepted: Boolean(row.invite.acceptedAt) };
}

/**
 * Accept an invitation as the signed-in user. The invite is single-use. We don't require the signed-in
 * email to match the invited one (people often have several addresses); the link itself is the secret.
 */
export async function acceptInvite(token: string, userId: string) {
  return db.transaction(async (tx) => {
    const [inv] = await tx
      .update(memberInvite)
      .set({ acceptedAt: new Date() })
      .where(and(eq(memberInvite.tokenHash, hash(token)), isNull(memberInvite.acceptedAt), gt(memberInvite.expiresAt, new Date())))
      .returning();
    if (!inv) return null;
    await tx.insert(celebrationMember).values({ celebrationId: inv.celebrationId, userId, role: inv.role }).onConflictDoNothing();
    return inv.celebrationId;
  });
}
