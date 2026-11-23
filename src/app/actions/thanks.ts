"use server";

import { requireCurrentCelebration, requireUserForAction } from "@/lib/dal";
import { aiDraftingEnabled } from "@/lib/env";
import { DraftError } from "@/server/ai-details";
import { draftThanks } from "@/server/ai-thanks";
import { getCelebration } from "@/server/celebrations";
import { listFunds, listGifts } from "@/server/gifts";
import { rateLimit } from "@/server/rate-limit";

export type ThanksResult = { ok: true; thanks: Record<string, string> } | { ok: false; message: string };

const MAX_GIVERS = 40;

/** Drafts a thank you for each person whose gift was received. Nothing is saved or sent: the host reviews each one. */
export async function draftThankYous(): Promise<ThanksResult> {
  const user = await requireUserForAction();
  if (!aiDraftingEnabled()) return { ok: false, message: "This is not available yet." };
  if (!rateLimit(`ai-thanks:hour:${user.id}`, 4, 60 * 60_000) || !rateLimit(`ai-thanks:day:${user.id}`, 10, 24 * 60 * 60_000)) {
    return { ok: false, message: "You have used the assistant a few times already. Please try again later." };
  }
  const { celebrationId } = await requireCurrentCelebration();
  const [celebration, funds, gifts] = await Promise.all([getCelebration(celebrationId), listFunds(celebrationId), listGifts(celebrationId)]);
  if (!celebration) return { ok: false, message: "We could not find your page." };
  const fundName = new Map(funds.map((f) => [f.id, f.title]));
  const givers = gifts
    .filter((g) => g.status === "confirmed")
    .slice(0, MAX_GIVERS)
    .map((g) => ({ id: g.id, name: g.name, message: g.message, fund: fundName.get(g.fundId ?? "") ?? "" }));
  if (givers.length === 0) return { ok: false, message: "Once a gift is marked as received, you can write your thanks here." };
  try {
    const map = await draftThanks({
      kind: celebration.kind,
      title: celebration.title,
      names: celebration.honorees.map((h) => h.displayName || h.fullName),
      hostName: user.name ?? "",
      givers,
    });
    return { ok: true, thanks: Object.fromEntries(map) };
  } catch (e) {
    return { ok: false, message: e instanceof DraftError ? e.message : "Something went wrong. Please try again." };
  }
}
