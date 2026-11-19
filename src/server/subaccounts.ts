import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fund } from "@/db/schema";
import { env, onlineGiftsEnabled } from "@/lib/env";
import { isMomoNumber, normaliseMomoNumber } from "@/server/referrals";
import { paystack } from "@/server/paystack";

/** Paystack's settlement codes for Ghana Mobile Money networks. */
const SETTLEMENT_BANK: Record<string, string> = { "MTN MoMo": "MTN", "Telecel Cash": "VOD", "AT Money": "ATL" };

/** The share EverMore keeps of each online gift, as a percentage (0 by default, never above 20). */
export function giftFeePercent() {
  const n = Number(env.GIFT_FEE_PERCENT ?? 0);
  return Number.isFinite(n) ? Math.min(20, Math.max(0, n)) : 0;
}

export type SubaccountResult = { ok: true; state: "ready" | "off" } | { ok: false; reason: string };

/**
 * Make sure online gifts for this fund are paid straight to the host. Paystack splits each payment to
 * a subaccount settled to the host's Mobile Money, so the money never rests in our balance. Safe to
 * call after every save: it only talks to Paystack when the Mobile Money details are new or changed.
 */
export async function ensureFundSubaccount(celebrationId: string, fundId: string): Promise<SubaccountResult> {
  if (!onlineGiftsEnabled()) return { ok: true, state: "off" };
  const [f] = await db.select().from(fund).where(and(eq(fund.id, fundId), eq(fund.celebrationId, celebrationId))).limit(1);
  if (!f) return { ok: false, reason: "that fund no longer exists." };
  if (!f.momoNumber) return { ok: true, state: "off" };
  const bank = SETTLEMENT_BANK[f.momoNetwork];
  if (!bank) return { ok: false, reason: "choose your Mobile Money network." };
  if (!isMomoNumber(f.momoNumber)) return { ok: false, reason: "check your Mobile Money number." };
  const number = normaliseMomoNumber(f.momoNumber);
  const signature = `${bank}|${number}`;
  if (f.paystackSubaccountCode && f.paystackSubaccountFor === signature) return { ok: true, state: "ready" };
  const details = { business_name: (f.momoName || f.title).slice(0, 80), settlement_bank: bank, account_number: number };
  try {
    const code = f.paystackSubaccountCode
      ? (await paystack<{ subaccount_code: string }>(`/subaccount/${encodeURIComponent(f.paystackSubaccountCode)}`, { method: "PUT", body: JSON.stringify(details) })).subaccount_code
      : (await paystack<{ subaccount_code: string }>("/subaccount", { method: "POST", body: JSON.stringify({ ...details, percentage_charge: giftFeePercent() }) })).subaccount_code;
    await db.update(fund).set({ paystackSubaccountCode: code, paystackSubaccountFor: signature }).where(eq(fund.id, f.id));
    return { ok: true, state: "ready" };
  } catch {
    // A failed update keeps the old code, so online gifts must not quietly go to the old number.
    await db.update(fund).set({ paystackSubaccountCode: "", paystackSubaccountFor: "" }).where(eq(fund.id, f.id));
    return { ok: false, reason: "Paystack did not accept those details, so check the number and network and save again." };
  }
}
