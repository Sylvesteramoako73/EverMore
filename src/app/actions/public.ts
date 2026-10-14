"use server";

import { refresh } from "next/cache";
import { listEvents } from "@/server/events";
import { addGuestbookEntry, reportGuestbookEntry } from "@/server/guestbook";
import { limitPublicAction } from "@/server/rate-limit";
import { findInvitation, parseRsvp, saveRsvp } from "@/server/rsvp";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { fieldErrors, formValues, guestbookSchema, type FormState } from "@/lib/validation";
import { answerableEvents } from "@/lib/celebration-rules";
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
