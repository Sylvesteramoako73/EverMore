"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUserForAction } from "@/lib/dal";
import { MOMO_NETWORKS } from "@/lib/money";
import { audit } from "@/server/audit";
import { isMomoNumber, markPayoutPaid, requestPayout, savePayoutAccount } from "@/server/referrals";

export type ReferralState = { ok?: boolean; error?: string } | undefined;

/** Where the host wants their reward sent. */
export async function savePayoutAccountAction(_prev: ReferralState, formData: FormData): Promise<ReferralState> {
  const user = await requireUserForAction();
  const number = String(formData.get("momoNumber") ?? "");
  const network = String(formData.get("momoNetwork") ?? "");
  if (!isMomoNumber(number)) return { error: "Enter a Ghana Mobile Money number, like 024 123 4567." };
  if (!(MOMO_NETWORKS as readonly string[]).includes(network)) return { error: "Choose your Mobile Money network." };
  await savePayoutAccount(user.id, number, network);
  refresh();
  return { ok: true };
}

/** Cash out everything that is available. */
export async function requestPayoutAction(): Promise<ReferralState> {
  const user = await requireUserForAction();
  const result = await requestPayout(user.id);
  if (!result.ok) return { error: result.reason };
  await audit({ actorUserId: user.id, action: "referral.payout_requested", targetType: "referral_payout", targetId: result.payout.id, metadata: { amountMinor: result.payout.amountMinor } });
  refresh();
  return { ok: true };
}

/** Admin: the money has been sent by Mobile Money. */
export async function markPayoutPaidAction(formData: FormData) {
  const admin = await requireAdmin();
  await markPayoutPaid(admin.id, String(formData.get("id") ?? ""));
  redirect("/admin/payouts");
}
