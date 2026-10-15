import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { fund, gift } from "@/db/schema";
import { env, paymentsEnabled } from "@/lib/env";

export type Fund = typeof fund.$inferSelect;
export type Gift = typeof gift.$inferSelect;
export type FundInput = {
  title: string;
  description: string;
  goalMinor: number | null;
  showProgress: boolean;
  momoNumber: string;
  momoName: string;
  momoNetwork: string;
};

// ───────────────────────────── Funds

export function listFunds(celebrationId: string) {
  return db.select().from(fund).where(eq(fund.celebrationId, celebrationId)).orderBy(asc(fund.position), asc(fund.createdAt));
}

export async function createFund(celebrationId: string, input: FundInput) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(fund).where(eq(fund.celebrationId, celebrationId));
  if (n >= 5) throw new Error("You can have up to 5 funds.");
  const [row] = await db.insert(fund).values({ celebrationId, ...input, position: n }).returning({ id: fund.id });
  return row.id;
}

export async function updateFund(celebrationId: string, fundId: string, input: FundInput) {
  const rows = await db.update(fund).set(input).where(and(eq(fund.id, fundId), eq(fund.celebrationId, celebrationId))).returning({ id: fund.id });
  return rows.length > 0;
}

/** Deleting a fund keeps its gifts (they just lose the fund label). */
export async function deleteFund(celebrationId: string, fundId: string) {
  await db.delete(fund).where(and(eq(fund.id, fundId), eq(fund.celebrationId, celebrationId)));
}

/** Confirmed totals per fund (null key = gifts without a fund). */
export async function fundTotals(celebrationId: string) {
  const rows = await db
    .select({
      fundId: gift.fundId,
      raised: sql<number>`coalesce(sum(${gift.amountMinor}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(gift)
    .where(and(eq(gift.celebrationId, celebrationId), eq(gift.status, "confirmed")))
    .groupBy(gift.fundId);
  return new Map(rows.map((r) => [r.fundId, { raised: r.raised, count: r.count }]));
}

// ───────────────────────────── Gifts

export function listGifts(celebrationId: string) {
  return db.select().from(gift).where(eq(gift.celebrationId, celebrationId)).orderBy(desc(gift.createdAt)).limit(1000);
}

/** Recent confirmed givers for the public page (names only, anonymous ones hidden). */
export async function recentSupporters(celebrationId: string, limit = 12) {
  const rows = await db
    .select({ name: gift.name, anonymous: gift.anonymous, fundId: gift.fundId, message: gift.message })
    .from(gift)
    .where(and(eq(gift.celebrationId, celebrationId), eq(gift.status, "confirmed")))
    .orderBy(desc(gift.confirmedAt))
    .limit(limit);
  return rows.map((r) => ({ name: r.anonymous ? "Someone special" : r.name, fundId: r.fundId, message: r.anonymous ? "" : r.message }));
}

const newReference = () => `evm_${randomBytes(12).toString("hex")}`;

export type GiftInput = {
  fundId: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  anonymous: boolean;
  amountMinor: number;
};

/** A guest says they've sent MoMo directly. It waits for the host to confirm they received it. */
export async function recordDirectGift(celebrationId: string, input: GiftInput) {
  const [row] = await db
    .insert(gift)
    .values({ celebrationId, ...input, method: "momo_direct", status: "pending", reference: newReference() })
    .returning({ id: gift.id });
  return row.id;
}

export async function setGiftStatus(celebrationId: string, giftId: string, status: "confirmed" | "failed" | "pending") {
  await db
    .update(gift)
    .set({ status, confirmedAt: status === "confirmed" ? new Date() : null })
    .where(and(eq(gift.id, giftId), eq(gift.celebrationId, celebrationId), eq(gift.method, "momo_direct")));
}

export async function deleteGift(celebrationId: string, giftId: string) {
  await db.delete(gift).where(and(eq(gift.id, giftId), eq(gift.celebrationId, celebrationId), eq(gift.method, "momo_direct")));
}

// ───────────────────────────── Paystack (Mobile Money & card)

const PAYSTACK = "https://api.paystack.co";

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !body.status || !body.data) throw new Error(body.message ?? `Paystack error ${res.status}`);
  return body.data;
}

/**
 * Start an online gift: record it as pending, then ask Paystack for a checkout page where the guest
 * pays by MoMo or card. Returns the URL to send them to.
 */
export async function startOnlineGift(celebrationId: string, input: GiftInput & { email: string }, callbackUrl: string) {
  if (!paymentsEnabled()) throw new Error("Online payments aren't set up.");
  const reference = newReference();
  await db.insert(gift).values({ celebrationId, ...input, method: "paystack", status: "pending", reference });
  const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: "GHS",
      reference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: { celebrationId, fundId: input.fundId, giver: input.name },
    }),
  });
  return data.authorization_url;
}

type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; channel: string; authorization?: { bank?: string } };

/** Mark a gift paid if Paystack agrees: right reference, success, and the amount and currency we asked for. */
async function applyTransaction(t: PaystackTransaction) {
  const [g] = await db.select().from(gift).where(eq(gift.reference, t.reference)).limit(1);
  if (!g || g.method !== "paystack") return null;
  if (g.status === "confirmed") return g;
  const paid = t.status === "success" && t.amount === g.amountMinor && t.currency === g.currency;
  const [updated] = await db
    .update(gift)
    .set({
      status: paid ? "confirmed" : t.status === "failed" || t.status === "abandoned" ? "failed" : "pending",
      confirmedAt: paid ? new Date() : null,
      channel: [t.channel, t.authorization?.bank].filter(Boolean).join(" · "),
    })
    .where(eq(gift.id, g.id))
    .returning();
  return updated;
}

/** Called when the guest returns from checkout. Never trusts the query string: asks Paystack. */
export async function verifyOnlineGift(reference: string) {
  if (!paymentsEnabled() || !/^evm_[a-f0-9]{24}$/.test(reference)) return null;
  try {
    return await applyTransaction(await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`));
  } catch {
    return null;
  }
}

/** Webhook: verify Paystack's HMAC-SHA512 signature over the raw body before believing anything. */
export async function handlePaystackWebhook(rawBody: string, signature: string | null) {
  if (!env.PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const event = JSON.parse(rawBody) as { event: string; data: PaystackTransaction };
  if (event.event === "charge.success") await applyTransaction(event.data);
  return true;
}

// ───────────────────────────── Money helpers

/** "150", "150.5", "1,200.00" → minor units (pesewas). Null if not a sensible amount. */
export function parseAmount(value: string) {
  const clean = value.replace(/[,\s]/g, "").replace(/^(GH₵|GHS|₵)/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const minor = Math.round(Number(clean) * 100);
  return minor >= 100 && minor <= 100_000_00 ? minor : null;
}
