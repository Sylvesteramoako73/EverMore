"use server";

import { requireCurrentCelebration, requireUserForAction } from "@/lib/dal";
import { aiDraftingEnabled } from "@/lib/env";
import { rateLimit } from "@/server/rate-limit";
import { DraftError, draftDetails, type Draft } from "@/server/ai-details";
import { askQuestions } from "@/server/ai-questions";
import { readFlyer } from "@/server/ai-flyer";
import { getCelebration } from "@/server/celebrations";

export type DraftResult = { ok: true; draft: Draft } | { ok: false; message: string };

/** Drafts the details step from one sentence. Nothing is saved: the host reviews and edits first. */
export async function draftFromSentence(sentence: string): Promise<DraftResult> {
  const user = await requireUserForAction();
  if (!aiDraftingEnabled()) return { ok: false, message: "This is not available yet." };
  const text = String(sentence ?? "").trim().slice(0, 2500);
  if (text.length < 15) return { ok: false, message: "Tell us a little more, for example the occasion, the date and where it is." };

  // Hosts build for free before paying, so keep the cost of each page bounded.
  if (!rateLimit(`ai-draft:hour:${user.id}`, 6, 60 * 60_000) || !rateLimit(`ai-draft:day:${user.id}`, 15, 24 * 60 * 60_000)) {
    return { ok: false, message: "You have used the assistant a few times already. Please fill in the rest yourself, or try again later." };
  }

  const { celebrationId } = await requireCurrentCelebration();
  const celebration = await getCelebration(celebrationId);
  if (!celebration) return { ok: false, message: "Please complete step 1 first." };

  try {
    const draft = await draftDetails({
      sentence: text,
      kind: celebration.kind,
      title: celebration.title,
      names: celebration.honorees.map((h) => h.displayName || h.fullName),
      today: new Date().toISOString().slice(0, 10),
    });
    return { ok: true, draft };
  } catch (e) {
    return { ok: false, message: e instanceof DraftError ? e.message : "Something went wrong. Please try again." };
  }
}

export type QuestionsResult = { ok: true; questions: string[] } | { ok: false; message: string };

/** Asks the host a few short questions about what is missing, so the draft has real facts to work from. */
export async function questionsForHost(sentence: string): Promise<QuestionsResult> {
  const user = await requireUserForAction();
  if (!aiDraftingEnabled()) return { ok: false, message: "This is not available yet." };
  if (!rateLimit(`ai-ask:hour:${user.id}`, 8, 60 * 60_000) || !rateLimit(`ai-ask:day:${user.id}`, 20, 24 * 60 * 60_000)) {
    return { ok: false, message: "You have used the assistant a few times already. Please try again later." };
  }
  const { celebrationId } = await requireCurrentCelebration();
  const celebration = await getCelebration(celebrationId);
  if (!celebration) return { ok: false, message: "Please complete step 1 first." };
  const questions = await askQuestions({
    sentence: String(sentence ?? "").trim().slice(0, 2500),
    kind: celebration.kind,
    title: celebration.title,
    names: celebration.honorees.map((h) => h.displayName || h.fullName),
    today: new Date().toISOString().slice(0, 10),
  });
  return { ok: true, questions };
}

export type FlyerResult = { ok: true; text: string } | { ok: false; message: string };

/** Reads the text from a photo of an invitation so the host can check it, then draft from it. Nothing is saved. */
export async function readFlyerPhoto(dataUrl: string): Promise<FlyerResult> {
  const user = await requireUserForAction();
  if (!aiDraftingEnabled()) return { ok: false, message: "This is not available yet." };
  if (!rateLimit(`ai-flyer:hour:${user.id}`, 5, 60 * 60_000) || !rateLimit(`ai-flyer:day:${user.id}`, 12, 24 * 60 * 60_000)) {
    return { ok: false, message: "You have read a few photos already. Please paste or type the details, or try again later." };
  }
  try {
    return { ok: true, text: await readFlyer(String(dataUrl ?? "")) };
  } catch (e) {
    return { ok: false, message: e instanceof DraftError ? e.message : "Something went wrong. Please try again." };
  }
}
