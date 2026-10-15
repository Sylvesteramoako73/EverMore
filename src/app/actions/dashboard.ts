"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CURRENT_CELEBRATION_COOKIE, listMyCelebrations, requireCelebrationAccess, requireCurrentCelebration, requireUserForAction } from "@/lib/dal";
import { anniversarySchema, fieldErrors, formValues, guestSchema, memorySchema, type FormState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { LimitError } from "@/server/events";
import { deleteGuestbookEntry, setGuestbookStatus } from "@/server/guestbook";
import {
  checkInGuest,
  createGuest,
  guestByToken,
  deleteGuest,
  importGuests,
  markInvitationSent,
  parseGuestCsv,
  regenerateInviteToken,
  updateGuest,
} from "@/server/guests";
import { setMediaStatus } from "@/server/media";
import { createMemory, deleteMemory, updateMemory } from "@/server/memories";
import { saveReminderPreference } from "@/server/reminders";
import { acceptInvite, inviteMember, removeMember, revokeInvite } from "@/server/members";
import { createFund, deleteFund, deleteGift, parseAmount, setGiftStatus, updateFund } from "@/server/gifts";
import { paymentsEnabled } from "@/lib/env";
import { MOMO_NETWORKS } from "@/lib/money";
import { deleteRsvp } from "@/server/rsvp";

const uuid = z.uuid();

/** The signed-in host's celebration for a dashboard mutation. */
async function current() {
  await requireUserForAction();
  const { user, celebrationId, role } = await requireCurrentCelebration();
  const celebration = await getCelebration(celebrationId);
  if (!celebration) redirect("/onboarding");
  return { user, celebration, role };
}

const ok = (id: string) => uuid.safeParse(id).success;

// ───────────────────────────── Guests

function guestInput(formData: FormData) {
  return guestSchema.safeParse({ ...Object.fromEntries(formData), eventIds: formData.getAll("eventIds").map(String) });
}

export async function saveGuest(guestId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration } = await current();
  const parsed = guestInput(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  try {
    if (guestId) {
      if (!ok(guestId) || !(await updateGuest(celebration.id, guestId, parsed.data))) return { message: "That guest no longer exists." };
    } else {
      const id = await createGuest(celebration.id, celebration.plan, parsed.data);
      await audit({ actorUserId: user.id, action: "guest.created", targetType: "guest", targetId: id, celebrationId: celebration.id });
    }
  } catch (err) {
    if (err instanceof LimitError) return { message: err.message, values: formValues(formData) };
    throw err;
  }
  refresh();
  return { ok: true, message: guestId ? "Guest updated." : `${parsed.data.name} added.` };
}

export async function removeGuest(guestId: string) {
  const { user, celebration } = await current();
  if (ok(guestId) && (await deleteGuest(celebration.id, guestId)))
    await audit({ actorUserId: user.id, action: "guest.deleted", targetType: "guest", targetId: guestId, celebrationId: celebration.id });
  refresh();
}

export async function setInvitationSent(guestId: string, sent: boolean) {
  const { celebration } = await current();
  if (ok(guestId)) await markInvitationSent(celebration.id, guestId, sent);
  refresh();
}

export async function newInviteLink(guestId: string) {
  const { user, celebration } = await current();
  if (ok(guestId) && (await regenerateInviteToken(celebration.id, guestId)))
    await audit({ actorUserId: user.id, action: "guest.link_regenerated", targetType: "guest", targetId: guestId, celebrationId: celebration.id });
  refresh();
}

export async function importGuestList(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration } = await current();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a CSV file to import." };
  if (file.size > 1024 * 1024) return { message: "That file is too large. Keep it under 1 MB." };
  const { rows, problems } = parseGuestCsv(await file.text());
  if (!rows.length) return { message: problems[0] ?? "No guests found in that file." };
  try {
    const n = await importGuests(celebration.id, celebration.plan, rows);
    await audit({ actorUserId: user.id, action: "guest.imported", targetType: "celebration", targetId: celebration.id, celebrationId: celebration.id, metadata: { count: n } });
    refresh();
    const extra = problems.length ? ` ${problems.length} line${problems.length === 1 ? "" : "s"} needed attention: ${problems.slice(0, 3).join(" ")}` : "";
    return { ok: true, message: `Imported ${n} guest${n === 1 ? "" : "s"}.${extra}` };
  } catch (err) {
    if (err instanceof LimitError) return { message: err.message };
    throw err;
  }
}

// ───────────────────────────── RSVPs

export async function removeRsvp(rsvpId: string) {
  const { user, celebration } = await current();
  if (ok(rsvpId) && (await deleteRsvp(celebration.id, rsvpId)))
    await audit({ actorUserId: user.id, action: "rsvp.deleted", targetType: "rsvp", targetId: rsvpId, celebrationId: celebration.id });
  refresh();
}

// ───────────────────────────── Messages & shared photos

export async function moderateMessage(entryId: string, status: "approved" | "hidden") {
  const { celebration } = await current();
  if (ok(entryId) && (status === "approved" || status === "hidden")) await setGuestbookStatus(celebration.id, entryId, status);
  refresh();
}

export async function removeMessage(entryId: string) {
  const { celebration } = await current();
  if (ok(entryId)) await deleteGuestbookEntry(celebration.id, entryId);
  refresh();
}

export async function moderateShared(mediaId: string, status: "approved" | "hidden") {
  const { celebration } = await current();
  if (ok(mediaId) && (status === "approved" || status === "hidden")) await setMediaStatus(celebration.id, mediaId, status);
  refresh();
}

// ───────────────────────────── People who manage the page

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["cohost", "planner"]),
});

/** Owner only: invite a co-host or planner by email. */
export async function inviteHelper(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration, role } = await current();
  if (role !== "owner") return { message: "Only the page owner can invite people." };
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  try {
    const sent = await inviteMember(celebration.id, user, parsed.data.email, parsed.data.role);
    await audit({ actorUserId: user.id, action: "member.invited", targetType: "celebration", targetId: celebration.id, celebrationId: celebration.id, metadata: { role: parsed.data.role } });
    refresh();
    return {
      ok: true,
      message: sent.delivered
        ? `Invitation sent to ${parsed.data.email}.`
        : `Invitation created. Email isn't set up here, so share this link with them: ${sent.url}`,
    };
  } catch (err) {
    if (err instanceof LimitError) return { message: err.message, values: formValues(formData) };
    throw err;
  }
}

export async function cancelInvite(inviteId: string) {
  const { celebration, role } = await current();
  if (role === "owner" && ok(inviteId)) await revokeInvite(celebration.id, inviteId);
  refresh();
}

export async function removeHelper(userId: string) {
  const { user, celebration, role } = await current();
  if (role !== "owner" || userId === user.id) return;
  if (await removeMember(celebration.id, userId))
    await audit({ actorUserId: user.id, action: "member.removed", targetType: "user", targetId: userId, celebrationId: celebration.id });
  refresh();
}

/** Accept a co-host/planner invitation and open that celebration's dashboard. */
export async function acceptInvitation(token: string) {
  const user = await requireUserForAction();
  const celebrationId = await acceptInvite(token, user.id);
  if (!celebrationId) redirect(`/join/${encodeURIComponent(token)}`);
  await audit({ actorUserId: user.id, action: "member.joined", targetType: "celebration", targetId: celebrationId, celebrationId });
  (await cookies()).set(CURRENT_CELEBRATION_COOKIE, celebrationId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

/** Switch the dashboard to another celebration the user belongs to. */
export async function switchCelebration(celebrationId: string) {
  const user = await requireUserForAction();
  const mine = await listMyCelebrations(user.id);
  if (!mine.some((m) => m.id === celebrationId)) return;
  (await cookies()).set(CURRENT_CELEBRATION_COOKIE, celebrationId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

// ───────────────────────────── Gifts & contributions

const fundSchema = z.object({
  title: z.string().trim().min(1, "Give this fund a name.").max(80),
  description: z.string().trim().max(500),
  goal: z.string().trim(),
  showProgress: z.preprocess((v) => v === "on", z.boolean()),
  momoNumber: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^\+?[\d\s-]{9,20}$/.test(v), "Enter a phone number, e.g. 024 123 4567."),
  momoName: z.string().trim().max(80),
  momoNetwork: z.enum(["", ...MOMO_NETWORKS]),
});

export async function saveFund(fundId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await current();
  const parsed = fundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  const { goal, ...rest } = parsed.data;
  const goalMinor = goal ? parseAmount(goal) : null;
  if (goal && !goalMinor) return { errors: { goal: ["Enter a goal in cedis, e.g. 5000."] }, values: formValues(formData) };
  if (!rest.momoNumber && !paymentsEnabled()) return { errors: { momoNumber: ["Add the MoMo number guests should send to."] }, values: formValues(formData) };
  try {
    if (fundId) {
      if (!ok(fundId) || !(await updateFund(celebration.id, fundId, { ...rest, goalMinor }))) return { message: "That fund no longer exists." };
    } else await createFund(celebration.id, { ...rest, goalMinor });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Couldn't save the fund.", values: formValues(formData) };
  }
  refresh();
  return { ok: true, message: fundId ? "Fund updated." : "Fund added. Guests will see it in the Gifts section of your page." };
}

export async function removeFund(fundId: string) {
  const { celebration } = await current();
  if (ok(fundId)) await deleteFund(celebration.id, fundId);
  refresh();
}

/** Direct MoMo gifts only: the host confirms they received it (or not). */
export async function markGift(giftId: string, status: "confirmed" | "failed" | "pending") {
  const { user, celebration } = await current();
  if (!ok(giftId) || !["confirmed", "failed", "pending"].includes(status)) return;
  await setGiftStatus(celebration.id, giftId, status);
  await audit({ actorUserId: user.id, action: `gift.${status}`, targetType: "gift", targetId: giftId, celebrationId: celebration.id });
  refresh();
}

export async function removeGift(giftId: string) {
  const { celebration } = await current();
  if (ok(giftId)) await deleteGift(celebration.id, giftId);
  refresh();
}

// ───────────────────────────── Check-in at the door

export type CheckInResult = { ok: true; id: string; name: string; tableName: string; maxPartySize: number; checkedInCount: number } | { ok: false; error: string };

export async function checkIn(guestId: string, count: number): Promise<CheckInResult> {
  const { celebration } = await current();
  if (!ok(guestId) || !Number.isInteger(count)) return { ok: false, error: "Invalid guest." };
  const row = await checkInGuest(celebration.id, guestId, count);
  refresh();
  return row ? { ok: true, ...row } : { ok: false, error: "That guest isn't on this list." };
}

/** A scanned entry pass: the guest's personal link. Looks them up without checking in yet. */
export async function lookupPass(scanned: string): Promise<CheckInResult> {
  const { celebration } = await current();
  let token = scanned.trim();
  try {
    token = new URL(scanned).searchParams.get("invite") ?? token;
  } catch {}
  const g = await guestByToken(celebration.id, token);
  return g ? { ok: true, ...g } : { ok: false, error: "This pass isn't for this celebration, or the link was replaced." };
}

/** Check in from a guest's page (an usher scanned the pass with the phone camera app). */
export async function checkInFromPass(slug: string, token: string, count: number): Promise<CheckInResult> {
  const resolved = await resolveSlug(slug);
  if (!resolved || !Number.isInteger(count)) return { ok: false, error: "Page not found." };
  await requireCelebrationAccess(resolved.celebrationId, { forAction: true });
  const g = await guestByToken(resolved.celebrationId, token);
  if (!g) return { ok: false, error: "This pass isn't valid any more." };
  const row = await checkInGuest(resolved.celebrationId, g.id, count);
  refresh();
  return row ? { ok: true, ...row } : { ok: false, error: "Couldn't check in." };
}

// ───────────────────────────── Memories & reminders

export async function saveMemory(memoryId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration } = await current();
  const parsed = memorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  if (memoryId) {
    if (!ok(memoryId) || !(await updateMemory(celebration.id, memoryId, parsed.data))) return { message: "That memory no longer exists." };
  } else await createMemory(celebration.id, user.id, parsed.data);
  refresh();
  return { ok: true, message: memoryId ? "Memory updated." : "Memory added to your timeline." };
}

export async function removeMemory(memoryId: string) {
  const { celebration } = await current();
  if (ok(memoryId)) await deleteMemory(celebration.id, memoryId);
  refresh();
}

export async function saveReminders(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration } = await current();
  const parsed = anniversarySchema.safeParse({
    emailEnabled: formData.get("emailEnabled"),
    remindDaysBefore: formData.getAll("remindDaysBefore"),
    includeMemoryPrompt: formData.get("includeMemoryPrompt"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const days = parsed.data.remindDaysBefore.length ? parsed.data.remindDaysBefore : [0];
  await saveReminderPreference(celebration.id, user.id, { ...parsed.data, remindDaysBefore: days });
  refresh();
  return { ok: true, message: parsed.data.emailEnabled ? "Reminders saved." : "Reminders turned off." };
}
