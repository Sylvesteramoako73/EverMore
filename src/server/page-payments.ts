import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { celebration, planPayment } from "@/db/schema";
import { paymentsEnabled } from "@/lib/env";
import { billingEnabled, PAGE_PRICE_CURRENCY, PAGE_PRICE_MINOR, PAID_PLAN } from "@/lib/plans";
import { publishCelebration } from "@/server/celebrations";
import { paystack, type PaystackTransaction } from "@/server/paystack";

export type PlanPayment = typeof planPayment.$inferSelect;

/** Hosts can pay: charging is on and there is a Paystack key to take the payment. */
export const pagePaymentsAvailable = () => billingEnabled() && paymentsEnabled();

const REFERENCE = /^evu_[a-f0-9]{24}$/;
export const isPagePaymentReference = (reference: string) => REFERENCE.test(reference);

/**
 * Start the one-time payment that publishes a celebration: record it as pending, then ask Paystack
 * for a checkout page where the host pays by MoMo or card. Returns the URL to send them to.
 */
export async function startPagePayment(celebrationId: string, payer: { id: string; email: string }, callbackUrl: string) {
  if (!pagePaymentsAvailable()) throw new Error("Payments aren't available yet.");
  const [c] = await db.select({ plan: celebration.plan }).from(celebration).where(eq(celebration.id, celebrationId)).limit(1);
  if (!c) throw new Error("That page no longer exists.");
  if (c.plan === PAID_PLAN) throw new Error("This page is already paid for.");
  const reference = `evu_${randomBytes(12).toString("hex")}`;
  await db.insert(planPayment).values({ celebrationId, userId: payer.id, amountMinor: PAGE_PRICE_MINOR, currency: PAGE_PRICE_CURRENCY, reference });
  const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: payer.email,
      amount: PAGE_PRICE_MINOR,
      currency: PAGE_PRICE_CURRENCY,
      reference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: { celebrationId, purpose: "page_payment" },
    }),
  });
  return data.authorization_url;
}

/**
 * Mark the celebration paid if Paystack agrees: right reference, success, and the amount and currency
 * we asked for. The page then goes live if it is ready to (a page that was live before charging began
 * comes straight back). Safe to call more than once for the same payment.
 */
export async function applyPagePaymentTransaction(t: PaystackTransaction) {
  const [p] = await db.select().from(planPayment).where(eq(planPayment.reference, t.reference)).limit(1);
  if (!p) return null;
  if (p.status === "paid") return p;
  const paid = t.status === "success" && t.amount === p.amountMinor && t.currency === p.currency;
  if (paid) {
    await db.update(celebration).set({ plan: PAID_PLAN }).where(eq(celebration.id, p.celebrationId));
    // Not ready yet (no name or no event)? It stays a draft and the host publishes from the dashboard.
    await publishCelebration(p.celebrationId);
  }
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
export async function verifyPagePayment(reference: string) {
  if (!paymentsEnabled() || !isPagePaymentReference(reference)) return null;
  try {
    return await applyPagePaymentTransaction(await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`));
  } catch {
    return null;
  }
}

/** The payment that covered this celebration, for the receipt line on the payment page. */
export async function paidPagePayment(celebrationId: string) {
  const [p] = await db
    .select()
    .from(planPayment)
    .where(and(eq(planPayment.celebrationId, celebrationId), eq(planPayment.status, "paid")))
    .orderBy(desc(planPayment.paidAt))
    .limit(1);
  return p ?? null;
}
