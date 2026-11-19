import "server-only";
import { randomBytes } from "node:crypto";
import { and, count, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { planPayment, referral, referralPayout, user } from "@/db/schema";
import { MONTHLY_REWARD_CAP, MIN_PAYOUT_MINOR, normaliseReferralCode, REFERRAL_DISCOUNT_MINOR, REFERRAL_REWARD_MINOR, REWARD_HOLD_DAYS } from "@/lib/referrals";
import { audit } from "@/server/audit";

const DAY = 86_400_000;
// No 0, O, 1, I or L, so a code read out over the phone is not mistaken.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newCode() {
  const bytes = randomBytes(7);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** The host's invite code, made the first time it is asked for. */
export async function getOrCreateReferralCode(userId: string) {
  const [u] = await db.select({ code: user.referralCode }).from(user).where(eq(user.id, userId)).limit(1);
  if (!u) throw new Error("No such user.");
  if (u.code) return u.code;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const set = await db
      .update(user)
      .set({ referralCode: code })
      .where(and(eq(user.id, userId), isNull(user.referralCode)))
      .returning({ code: user.referralCode })
      .catch(() => []); // a clash with someone else's code: try another
    if (set[0]?.code) return set[0].code;
    const [again] = await db.select({ code: user.referralCode }).from(user).where(eq(user.id, userId)).limit(1);
    if (again?.code) return again.code;
  }
  throw new Error("Couldn't make a referral code.");
}

/** Same inbox written two ways (dots, +tags) counts as the same person. */
export function sameInbox(a: string, b: string) {
  const norm = (e: string) => {
    const [local = "", domain = ""] = e.toLowerCase().trim().split("@");
    const base = (local.split("+")[0] ?? "").replace(domain === "gmail.com" || domain === "googlemail.com" ? /\./g : /$^/, "");
    return `${base}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
  };
  return norm(a) === norm(b);
}

/**
 * Remember who invited this person. Only the first invitation counts, never for yourself, and never
 * for someone who has already paid for a page. Returns true when the invitation was recorded.
 */
export async function attributeReferral(referredUserId: string, rawCode: string | null | undefined) {
  const code = normaliseReferralCode(rawCode);
  if (!code) return false;
  const [referrer] = await db.select({ id: user.id, email: user.email, suspendedAt: user.suspendedAt }).from(user).where(eq(user.referralCode, code)).limit(1);
  if (!referrer || referrer.suspendedAt || referrer.id === referredUserId) return false;
  const [me] = await db.select({ email: user.email }).from(user).where(eq(user.id, referredUserId)).limit(1);
  if (!me || sameInbox(me.email, referrer.email)) return false;
  const [paid] = await db.select({ id: planPayment.id }).from(planPayment).where(and(eq(planPayment.userId, referredUserId), eq(planPayment.status, "paid"))).limit(1);
  if (paid) return false;
  const rows = await db.insert(referral).values({ referrerId: referrer.id, referredUserId }).onConflictDoNothing().returning({ id: referral.id });
  return rows.length > 0;
}

/** The discount this person gets at checkout: their friend's invitation, until they have paid once. */
export async function referralDiscountFor(userId: string) {
  const [r] = await db.select({ id: referral.id }).from(referral).where(and(eq(referral.referredUserId, userId), eq(referral.status, "signed_up"))).limit(1);
  return r ? REFERRAL_DISCOUNT_MINOR : 0;
}

/**
 * Called when a page payment is confirmed. Starts the reward for whoever invited the payer. Safe to
 * call twice: only a "signed_up" invitation can be rewarded.
 */
export async function rewardReferral(payerId: string | null, paidAmountDiscount: number) {
  if (!payerId) return;
  const [r] = await db.select().from(referral).where(and(eq(referral.referredUserId, payerId), eq(referral.status, "signed_up"))).limit(1);
  if (!r) return;
  const [referrer, payer] = await Promise.all([
    db.select({ momo: user.momoNumber, suspendedAt: user.suspendedAt }).from(user).where(eq(user.id, r.referrerId)).limit(1),
    db.select({ momo: user.momoNumber }).from(user).where(eq(user.id, payerId)).limit(1),
  ]);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(referral)
    .where(and(eq(referral.referrerId, r.referrerId), inArray(referral.status, ["pending", "available", "requested", "paid_out"]), gte(referral.updatedAt, monthStart)));
  const sameMomo = Boolean(referrer[0]?.momo && payer[0]?.momo && referrer[0].momo === payer[0].momo);
  const void_ = Boolean(referrer[0]?.suspendedAt) || sameMomo || n >= MONTHLY_REWARD_CAP;
  await db
    .update(referral)
    .set(
      void_
        ? { status: "void", discountMinor: paidAmountDiscount }
        : { status: "pending", rewardMinor: REFERRAL_REWARD_MINOR, discountMinor: paidAmountDiscount, availableAt: new Date(Date.now() + REWARD_HOLD_DAYS * DAY) },
    )
    .where(and(eq(referral.id, r.id), eq(referral.status, "signed_up")));
}

/** Rewards whose hold has ended become available to pay out. */
async function releaseHeldRewards(userId: string) {
  await db
    .update(referral)
    .set({ status: "available" })
    .where(and(eq(referral.referrerId, userId), eq(referral.status, "pending"), lte(referral.availableAt, new Date())));
}

export async function referralSummary(userId: string) {
  await releaseHeldRewards(userId);
  const rows = await db
    .select({ status: referral.status, n: count(), total: sql<number>`coalesce(sum(${referral.rewardMinor}), 0)::int` })
    .from(referral)
    .where(eq(referral.referrerId, userId))
    .groupBy(referral.status);
  const by = (s: string) => rows.find((r) => r.status === s) ?? { n: 0, total: 0 };
  const paidFriends = rows.filter((r) => ["pending", "available", "requested", "paid_out"].includes(r.status)).reduce((a, r) => a + r.n, 0);
  const [me] = await db.select({ momoNumber: user.momoNumber, momoNetwork: user.momoNetwork }).from(user).where(eq(user.id, userId)).limit(1);
  return {
    signedUp: rows.reduce((a, r) => a + (r.status === "void" ? 0 : r.n), 0),
    paidFriends,
    pendingMinor: by("pending").total,
    availableMinor: by("available").total,
    requestedMinor: by("requested").total,
    paidOutMinor: by("paid_out").total,
    minPayoutMinor: MIN_PAYOUT_MINOR,
    momoNumber: me?.momoNumber ?? "",
    momoNetwork: me?.momoNetwork ?? "",
  };
}

const GH_MOMO = /^0\d{9}$/;
export const normaliseMomoNumber = (v: string) => v.replace(/[\s-]/g, "").replace(/^\+233/, "0").replace(/^233/, "0");
export const isMomoNumber = (v: string) => GH_MOMO.test(normaliseMomoNumber(v));

export async function savePayoutAccount(userId: string, number: string, network: string) {
  await db.update(user).set({ momoNumber: normaliseMomoNumber(number), momoNetwork: network }).where(eq(user.id, userId));
}

/** Ask to be paid everything that is available. Returns the payout, or why not. */
export async function requestPayout(userId: string) {
  await releaseHeldRewards(userId);
  return db.transaction(async (tx) => {
    const [me] = await tx.select({ momoNumber: user.momoNumber, momoNetwork: user.momoNetwork }).from(user).where(eq(user.id, userId)).limit(1);
    if (!me?.momoNumber || !me.momoNetwork) return { ok: false as const, reason: "Add your Mobile Money number first." };
    const rows = await tx.select({ id: referral.id, reward: referral.rewardMinor }).from(referral).where(and(eq(referral.referrerId, userId), eq(referral.status, "available")));
    const total = rows.reduce((a, r) => a + r.reward, 0);
    if (total < MIN_PAYOUT_MINOR) return { ok: false as const, reason: "You can cash out once you have earned the minimum." };
    const [payout] = await tx.insert(referralPayout).values({ userId, amountMinor: total, momoNumber: me.momoNumber, momoNetwork: me.momoNetwork }).returning();
    await tx
      .update(referral)
      .set({ status: "requested", payoutId: payout!.id })
      .where(and(inArray(referral.id, rows.map((r) => r.id)), eq(referral.status, "available")));
    return { ok: true as const, payout: payout! };
  });
}

export async function listPayouts(status: "requested" | "paid") {
  return db
    .select({ payout: referralPayout, name: user.name, email: user.email })
    .from(referralPayout)
    .innerJoin(user, eq(user.id, referralPayout.userId))
    .where(eq(referralPayout.status, status))
    .orderBy(referralPayout.createdAt)
    .limit(200);
}

/** The owner sent the money by Mobile Money; record it. */
export async function markPayoutPaid(adminId: string, payoutId: string) {
  const done = await db.transaction(async (tx) => {
    const [p] = await tx
      .update(referralPayout)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(referralPayout.id, payoutId), eq(referralPayout.status, "requested")))
      .returning();
    if (!p) return null;
    await tx.update(referral).set({ status: "paid_out" }).where(and(eq(referral.payoutId, p.id), eq(referral.status, "requested")));
    return p;
  });
  if (done) await audit({ actorUserId: adminId, action: "referral.payout_paid", targetType: "referral_payout", targetId: done.id, metadata: { amountMinor: done.amountMinor } });
  return done;
}
