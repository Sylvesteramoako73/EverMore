import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { celebration, planPayment } from "@/db/schema";
import { paymentsEnabled } from "@/lib/env";
import { billingEnabled, PREMIUM_CURRENCY, PREMIUM_PRICE_MINOR } from "@/lib/plans";
import { paystack, type PaystackTransaction } from "@/server/paystack";

export type PlanPayment = typeof planPayment.$inferSelect;

/** Premium can be bought: plans are being enforced and there is a Paystack key to take the payment. */
export const upgradesAvailable = () => billingEnabled() && paymentsEnabled();

const REFERENCE = /^evu_[a-f0-9]{24}$/;
export const isUpgradeReference = (reference: string) => REFERENCE.test(reference);

/**
 * Start the one-time Premium payment for a celebration: record it as pending, then ask Paystack for a
 * checkout page where the host pays by MoMo or card. Returns the URL to send them to.
 */
export async function startUpgrade(celebrationId: string, payer: { id: string; email: string }, callbackUrl: string) {
  if (!upgradesAvailable()) throw new Error("Upgrades aren't available yet.");
  const [c] = await db.select({ plan: celebration.plan }).from(celebration).where(eq(celebration.id, celebrationId)).limit(1);
  if (!c) throw new Error("That page no longer exists.");
  if (c.plan === "premium") throw new Error("This page is already Premium.");
  const reference = `evu_${randomBytes(12).toString("hex")}`;
  await db.insert(planPayment).values({ celebrationId, userId: payer.id, amountMinor: PREMIUM_PRICE_MINOR, currency: PREMIUM_CURRENCY, reference });
  const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: payer.email,
      amount: PREMIUM_PRICE_MINOR,
      currency: PREMIUM_CURRENCY,
      reference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: { celebrationId, purpose: "premium_upgrade" },
    }),
  });
  return data.authorization_url;
}

/**
 * Make the celebration Premium if Paystack agrees: right reference, success, and the amount and
 * currency we asked for. Safe to call more than once for the same payment.
 */
export async function applyUpgradeTransaction(t: PaystackTransaction) {
  const [p] = await db.select().from(planPayment).where(eq(planPayment.reference, t.reference)).limit(1);
  if (!p) return null;
  if (p.status === "paid") return p;
  const paid = t.status === "success" && t.amount === p.amountMinor && t.currency === p.currency;
  if (paid) await db.update(celebration).set({ plan: "premium" }).where(eq(celebration.id, p.celebrationId));
  const [updated] = await db
    .update(planPayment)
    .set({
      status: paid ? "paid" : t.status === "failed" || t.status === "abandoned" ? "failed" : "pending",
      paidAt: paid ? new Date() : null,
      channel: [t.channel, t.authorization?.bank].filter(Boolean).join(" · "),
    })
    .where(eq(planPayment.id, p.id))
    .returning();
  return updated;
}

/** Called when the host returns from checkout. Never trusts the query string: asks Paystack. */
export async function verifyUpgrade(reference: string) {
  if (!paymentsEnabled() || !isUpgradeReference(reference)) return null;
  try {
    return await applyUpgradeTransaction(await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`));
  } catch {
    return null;
  }
}

/** The payment that made this celebration Premium, for the receipt line on the upgrade page. */
export async function paidUpgrade(celebrationId: string) {
  const [p] = await db
    .select()
    .from(planPayment)
    .where(and(eq(planPayment.celebrationId, celebrationId), eq(planPayment.status, "paid")))
    .orderBy(desc(planPayment.paidAt))
    .limit(1);
  return p ?? null;
}
