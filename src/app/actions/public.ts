"use server";

import { refresh } from "next/cache";
import { listEvents } from "@/server/events";
import { addGuestbookEntry, reportGuestbookEntry } from "@/server/guestbook";
import { limitPublicAction } from "@/server/rate-limit";
import { findInvitation, parseRsvp, saveRsvp } from "@/server/rsvp";
import { findTables } from "@/server/guests";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { fieldErrors, formValues, guestbookSchema, type FormState } from "@/lib/validation";
import { answerableEvents } from "@/lib/celebration-rules";
import { appUrl, paymentsEnabled } from "@/lib/env";
import { listFunds, parseAmount, recordDirectGift, startOnlineGift } from "@/server/gifts";
import { z } from "zod";

const isBot = (formData: FormData) => String(formData.get("website") ?? "").length > 0;

/** Published celebration by slug; null for drafts, archived or unknown pages. */
async function publishedCelebration(slug: string) {
  const resolved = await resolveSlug(slug);
  if (!resolved) return null;
  const w = await getCelebration(resolved.celebrationId);
  return w?.status === "published" ? w : null;
}

export async function submitRsvp(slug: string, inviteToken: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const w = await publishedCelebration(slug);
  if (!w) return { message: "RSVPs aren't available on this page right now. If you're the couple, publish your page first." };

  const invitation = inviteToken ? await findInvitation(w.id, inviteToken) : null;
  if (inviteToken && !invitation) return { message: "This invitation link is no longer valid. Please ask the couple for a new one." };
  if (!invitation && (!w.openRsvp || w.visibility === "private")) {
    return { message: "RSVPs are by invitation. Please use the personal link from your invitation." };
  }

  // Recomputed here, never trusted from the form: which events this visitor may answer.
  const offered = answerableEvents(
    { rsvpEnabled: w.rsvpEnabled, rsvpDeadline: w.rsvpDeadline, timezone: w.timezone },
    await listEvents(w.id),
    { invitedEventIds: invitation?.eventIds.size ? invitation.eventIds : null },
  );
  if (!offered.length) return { message: "RSVPs are closed for this celebration." };
  if (isBot(formData)) return { ok: true, message: "Thank you!" };
  if (!(await limitPublicAction("rsvp", w.id, 10, 300, 60 * 60 * 1000))) {
    return { message: "We're receiving a lot of replies right now. Please try again in a few minutes." };
  }

  const parsed = parseRsvp(Object.fromEntries(formData), offered, {
    maxPartySize: invitation ? invitation.guest.maxPartySize : w.defaultPartySize,
    mealOptions: w.mealOptions,
    askDietary: w.askDietary,
  });
  if (!parsed.ok) return { errors: parsed.errors, values: formValues(formData), message: "Please check the highlighted answers." };

  const saved = await saveRsvp(w.id, invitation?.guest.id ?? null, parsed.data);
  refresh();
  const first = parsed.data.name.split(/\s+/)[0];
  const yes = parsed.data.answers.filter((a) => a.attending).length;
  const message =
    yes === 0
      ? `Thank you, ${first}. We'll miss you and appreciate you letting us know.`
      : yes < parsed.data.answers.length
        ? `Thank you, ${first}! We've noted which celebrations you'll join.`
        : `Wonderful, ${first}! We can't wait to celebrate with you.`;
  return { ok: true, message: saved.updated ? `${message} Your earlier reply has been updated.` : message };
}

export async function signGuestbook(slug: string, inviteToken: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const w = await publishedCelebration(slug);
  if (!w || !w.guestbookEnabled) return { message: "The guestbook isn't open on this page." };
  if (w.visibility === "private" && !(inviteToken && (await findInvitation(w.id, inviteToken)))) {
    return { message: "Please open the page from your personal invitation link to sign the guestbook." };
  }
  if (isBot(formData)) return { ok: true, message: "Thank you!" };
  if (!(await limitPublicAction("guestbook", w.id, 5, 120, 10 * 60 * 1000))) {
    return { message: "You've left several messages already. Please try again in a few minutes." };
  }
  const parsed = guestbookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };

  const entry = await addGuestbookEntry(w.id, parsed.data.name, parsed.data.message, w.guestbookModeration);
  refresh();
  return {
    ok: true,
    message: entry.status === "pending" ? "Thank you! Your message will appear once the couple has seen it." : "Thank you for your lovely words!",
  };
}

export async function reportMessage(slug: string, entryId: string, reason: string): Promise<{ ok: boolean }> {
  const w = await publishedCelebration(slug);
  if (!w || !z.uuid().safeParse(entryId).success) return { ok: false };
  if (!(await limitPublicAction("report", w.id, 5, 100, 60 * 60 * 1000))) return { ok: false };
  const ok = await reportGuestbookEntry(w.id, entryId, reason || "Reported by a visitor");
  refresh();
  return { ok };
}

// ───────────────────────────── Gifts & contributions

// Fields the form may not send (no email box without online payment) default to empty.
const giftSchema = z.preprocess((v) => ({ email: "", phone: "", message: "", fundId: "", ...(v as object) }), z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(80),
  email: z.string().trim().toLowerCase().max(254).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address."),
  phone: z.string().trim().max(40),
  message: z.string().trim().max(500),
  amount: z.string(),
  fundId: z.string(),
  anonymous: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  method: z.enum(["online", "direct"]),
}));

export type GiftState = (NonNullable<FormState> & { redirectTo?: string }) | undefined;

/**
 * A guest gives towards a fund. Online: we create a pending gift and hand back Paystack's checkout URL.
 * Direct MoMo: we record what they say they sent, for the host to confirm.
 */
export async function giveGift(slug: string, inviteToken: string | null, _prev: GiftState, formData: FormData): Promise<GiftState> {
  const w = await publishedCelebration(slug);
  if (!w) return { message: "Gifts aren't available on this page right now." };
  if (w.visibility === "private" && !(inviteToken && (await findInvitation(w.id, inviteToken)))) {
    return { message: "Please open the page from your personal invitation link." };
  }
  if (isBot(formData)) return { ok: true, message: "Thank you!" };
  if (!(await limitPublicAction("gift", w.id, 8, 300, 60 * 60 * 1000))) return { message: "Please try again in a few minutes." };

  const parsed = giftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData), message: "Please check the details above." };
  const d = parsed.data;
  const amountMinor = parseAmount(d.amount);
  if (!amountMinor) return { errors: { amount: ["Enter an amount between GH₵ 1 and GH₵ 100,000."] }, values: formValues(formData) };
  const funds = await listFunds(w.id);
  const fund = funds.find((f) => f.id === d.fundId) ?? funds[0];
  if (!fund) return { message: "Gifts aren't set up on this page." };
  const input = { fundId: fund.id, name: d.name, email: d.email, phone: d.phone, message: d.message, anonymous: d.anonymous, amountMinor };

  if (d.method === "online") {
    if (!paymentsEnabled()) return { message: "Online payment isn't available. Please send by MoMo using the details shown." };
    if (!d.email) return { errors: { email: ["Paystack sends your receipt here."] }, values: formValues(formData) };
    try {
      const url = await startOnlineGift(w.id, { ...input, email: d.email }, appUrl(`/${w.slug}/gift`));
      return { ok: true, redirectTo: url };
    } catch {
      return { message: "We couldn't start the payment just now. Please try again, or send by MoMo directly." };
    }
  }

  if (!fund.momoNumber) return { message: "MoMo details haven't been added yet. Please contact the hosts." };
  await recordDirectGift(w.id, input);
  return { ok: true, message: `Thank you, ${d.name.split(/\s+/)[0]}! The hosts will confirm when they've received it.` };
}

// ───────────────────────────── Table finder

export async function findTable(slug: string, query: string): Promise<{ name: string; tableName: string }[]> {
  const w = await publishedCelebration(slug);
  if (!w || !w.tableFinderEnabled || w.visibility === "private") return [];
  if (!(await limitPublicAction("table", w.id, 30, 3000, 10 * 60 * 1000))) return [];
  return findTables(w.id, String(query).slice(0, 60));
}
