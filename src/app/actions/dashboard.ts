"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CURRENT_CELEBRATION_COOKIE, listMyCelebrations, requireCurrentCelebration, requireUserForAction } from "@/lib/dal";
import { fieldErrors, formValues, guestSchema, type FormState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { getCelebration } from "@/server/celebrations";
import { LimitError } from "@/server/events";
import { deleteGuestbookEntry, setGuestbookStatus } from "@/server/guestbook";
import {
  createGuest,
  deleteGuest,
  importGuests,
  markInvitationSent,
  parseGuestCsv,
  regenerateInviteToken,
  updateGuest,
} from "@/server/guests";
import { setMediaStatus } from "@/server/media";
import { acceptInvite, inviteMember, removeMember, revokeInvite } from "@/server/members";
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
