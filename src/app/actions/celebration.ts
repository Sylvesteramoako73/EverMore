"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentCelebration, requireUserForAction, listMyCelebrations } from "@/lib/dal";
import { isValidTimeZone } from "@/lib/dates";
import { entitlements } from "@/lib/plans";
import { getTheme } from "@/lib/themes";
import {
  basicsSchema,
  coloursSchema,
  eventSchema,
  fieldErrors,
  formValues,
  guestFeaturesSchema,
  publishSettingsSchema,
  celebrationInfoSchema,
  rsvpContactsSchema,
  type FormState,
} from "@/lib/validation";
import { audit } from "@/server/audit";
import { createEvent, deleteEvent, LimitError, setPrimaryEvent, updateEvent } from "@/server/events";
import {
  addPhoto,
  deleteMedia,
  setMediaStatus,
  moveMedia,
  setHeroMedia,
  updateMedia,
  UploadError,
  type Collection,
} from "@/server/media";
import {
  advanceOnboarding,
  changeSlug,
  createCelebration,
  getCelebration,
  publishCelebration,
  setCelebrationStatus,
  updateCelebration,
} from "@/server/celebrations";

const uuid = z.uuid();

/** The signed-in user's celebration for a mutation. Non-members never reach here (401 / redirect). */
async function currentCelebration() {
  await requireUserForAction();
  const { user, celebrationId, role } = await requireCurrentCelebration();
  const celebration = await getCelebration(celebrationId);
  if (!celebration) redirect("/onboarding");
  return { user, celebration, role };
}

// ───────────────────────────── Basics & details

/** Step 1 of onboarding: creates the draft celebration the first time, updates it afterwards. */
export async function saveBasics(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUserForAction();
  const parsed = basicsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };

  const [existing] = await listMyCelebrations(user.id);
  if (existing) {
    await updateCelebration(existing.id, parsed.data);
  } else {
    const tz = String(formData.get("browserTimezone") ?? "");
    await createCelebration(user.id, parsed.data, isValidTimeZone(tz) ? tz : "UTC");
  }
  refresh();
  return { ok: true, message: "Saved." };
}

export async function saveCelebrationInfo(_prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await currentCelebration();
  const parsed = celebrationInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  const { details, ...rest } = parsed.data;
  // Birthdays, namings and memorials count their yearly date from the person's dates.
  const keyDate =
    celebration.kind === "funeral" ? (details.dateOfPassing ?? null)
    : celebration.kind === "birthday" || celebration.kind === "naming" ? (details.dateOfBirth ?? null)
    : rest.keyDate;
  // Keep details from other occasions (e.g. after switching type) unless this form set them.
  await updateCelebration(celebration.id, { ...rest, keyDate, details: { ...celebration.details, ...stripEmpty(details) } });
  refresh();
  return { ok: true, message: "Saved." };
}

function stripEmpty<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0))) as Partial<T>;
}

/** Colours of the day, posted as parallel colourName/colourHex/colourNote fields. */
export async function saveColours(_prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await currentCelebration();
  const names = formData.getAll("colourName").map(String);
  const hexes = formData.getAll("colourHex").map(String);
  const notes = formData.getAll("colourNote").map(String);
  const parsed = coloursSchema.safeParse(
    names.map((name, i) => ({ name: name.trim(), hex: (hexes[i] ?? "").trim(), note: (notes[i] ?? "").trim() })).filter((c) => c.name),
  );
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please check your colours." };
  await updateCelebration(celebration.id, { colours: parsed.data });
  refresh();
  return { ok: true, message: parsed.data.length ? "Colours saved." : "Colours cleared." };
}

/** People guests can call to RSVP. */
export async function saveRsvpContacts(_prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await currentCelebration();
  const names = formData.getAll("contactName").map(String);
  const phones = formData.getAll("contactPhone").map(String);
  const parsed = rsvpContactsSchema.safeParse(
    names.map((name, i) => ({ name: name.trim(), phone: (phones[i] ?? "").trim() })).filter((c) => c.name || c.phone),
  );
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please check the contacts." };
  await updateCelebration(celebration.id, { rsvpContacts: parsed.data });
  refresh();
  return { ok: true, message: "Contacts saved." };
}

export async function saveGuestFeatures(_prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await currentCelebration();
  const labels = formData.getAll("giftLabel").map(String);
  const urls = formData.getAll("giftUrl").map(String);
  const parsed = guestFeaturesSchema.safeParse({
    ...Object.fromEntries(formData),
    giftLinks: labels
      .map((label, i) => ({ label: label.trim(), url: (urls[i] ?? "").trim() }))
      .filter((l) => l.label || l.url),
    hiddenSections: formData.getAll("hiddenSections").map(String),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData), message: "Please check the highlighted fields." };
  await updateCelebration(celebration.id, parsed.data);
  refresh();
  return { ok: true, message: "Saved. Your page is up to date." };
}

/** Record progress through the onboarding wizard and move on. */
export async function goToStep(step: number) {
  const { celebration } = await currentCelebration();
  await advanceOnboarding(celebration.id, step);
  redirect(`/onboarding?step=${step}`);
}

// ───────────────────────────── Events

export async function saveEvent(eventId: string | null, returnTo: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { celebration } = await currentCelebration();
  if (eventId !== null && !uuid.safeParse(eventId).success) return { message: "That event no longer exists." };
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData), message: "Please check the highlighted fields." };
  const input = { ...parsed.data };
  try {
    // Optional venue photo, uploaded with the form.
    const photo = formData.get("venuePhoto");
    if (photo instanceof File && photo.size > 0) {
      input.venueMediaId = await addPhoto(celebration.id, celebration.plan, photo, { collection: "venue", uploadedBy: (await requireUserForAction()).id });
    } else if (formData.get("removeVenuePhoto") === "on") {
      input.venueMediaId = null;
    }
    if (eventId) {
      if (!(await updateEvent(celebration.id, eventId, input))) return { message: "That event no longer exists." };
    } else {
      await createEvent(celebration.id, celebration.plan, input);
    }
  } catch (err) {
    if (err instanceof LimitError || err instanceof UploadError) return { message: err.message, values: formValues(formData) };
    throw err;
  }
  redirect(returnTo.startsWith("/") ? returnTo : "/dashboard/events");
}

export async function removeEvent(eventId: string) {
  const { celebration } = await currentCelebration();
  if (uuid.safeParse(eventId).success) await deleteEvent(celebration.id, eventId);
  refresh();
}

export async function makePrimaryEvent(eventId: string) {
  const { celebration } = await currentCelebration();
  if (uuid.safeParse(eventId).success) await setPrimaryEvent(celebration.id, eventId);
  refresh();
}

// ───────────────────────────── Photos

const COLLECTIONS: Collection[] = ["portrait", "engagement", "gallery", "event", "memory", "venue"];

export async function uploadPhoto(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user, celebration } = await currentCelebration();
  const file = formData.get("file");
  const collection = String(formData.get("collection") ?? "gallery") as Collection;
  if (!(file instanceof File)) return { ok: false, error: "No file received." };
  if (!COLLECTIONS.includes(collection)) return { ok: false, error: "Unknown photo section." };
  try {
    const id = await addPhoto(celebration.id, celebration.plan, file, { collection, uploadedBy: user.id });
    if (formData.get("makeHero") === "1" || !celebration.heroMediaId) await setHeroMedia(celebration.id, id);
    refresh();
    return { ok: true, id };
  } catch (err) {
    if (err instanceof UploadError || err instanceof LimitError) return { ok: false, error: err.message };
    console.error("[upload]", err);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}

export async function removePhoto(mediaId: string) {
  const { celebration } = await currentCelebration();
  if (!uuid.safeParse(mediaId).success) return;
  await deleteMedia(celebration.id, mediaId);
  if (celebration.heroMediaId === mediaId) await setHeroMedia(celebration.id, null);
  refresh();
}

export async function choosePhotoAsHero(mediaId: string) {
  const { celebration } = await currentCelebration();
  if (uuid.safeParse(mediaId).success) await setHeroMedia(celebration.id, mediaId);
  refresh();
}

export async function reorderPhoto(mediaId: string, direction: -1 | 1) {
  const { celebration } = await currentCelebration();
  if (uuid.safeParse(mediaId).success && (direction === 1 || direction === -1)) await moveMedia(celebration.id, mediaId, direction);
  refresh();
}

export async function updatePhotoDetails(mediaId: string, formData: FormData) {
  const { celebration } = await currentCelebration();
  if (!uuid.safeParse(mediaId).success) return;
  const collection = String(formData.get("collection") ?? "");
  await updateMedia(celebration.id, mediaId, {
    caption: String(formData.get("caption") ?? "").trim().slice(0, 200),
    altText: String(formData.get("altText") ?? "").trim().slice(0, 200),
    isPublic: formData.get("isPublic") === "on",
    ...(COLLECTIONS.includes(collection as Collection) ? { collection: collection as Collection } : {}),
  });
  refresh();
}

// ───────────────────────────── Theme & publishing

export async function chooseTheme(themeId: string): Promise<{ ok: boolean; error?: string }> {
  const { celebration } = await currentCelebration();
  const theme = getTheme(themeId);
  if (theme.id !== themeId) return { ok: false, error: "Unknown theme." };
  if (theme.premium && !entitlements(celebration.plan).premiumThemes) return { ok: false, error: "This theme is part of Premium." };
  await updateCelebration(celebration.id, { themeId });
  refresh();
  return { ok: true };
}

export async function savePublishSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, celebration } = await currentCelebration();
  const parsed = publishSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  const d = parsed.data;
  if (d.slug !== celebration.slug) {
    const changed = await changeSlug(celebration.id, d.slug);
    if (!changed.ok) return { errors: { slug: [changed.error] }, values: formValues(formData) };
    await audit({ actorUserId: user.id, action: "celebration.slug_changed", targetType: "celebration", targetId: celebration.id, celebrationId: celebration.id, metadata: { from: changed.previous, to: d.slug } });
  }
  await updateCelebration(celebration.id, { visibility: d.visibility, allowIndexing: d.visibility === "public" && d.allowIndexing });
  refresh();
  return { ok: true, message: d.slug !== celebration.slug ? "Saved. Your old address will keep redirecting here." : "Saved." };
}

export async function publish(): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const { user, celebration } = await currentCelebration();
  const result = await publishCelebration(celebration.id);
  if (result.ok) await audit({ actorUserId: user.id, action: "celebration.published", targetType: "celebration", targetId: celebration.id, celebrationId: celebration.id });
  refresh();
  return result;
}

export async function unpublish() {
  const { user, celebration } = await currentCelebration();
  await setCelebrationStatus(celebration.id, "draft");
  await audit({ actorUserId: user.id, action: "celebration.unpublished", targetType: "celebration", targetId: celebration.id, celebrationId: celebration.id });
  refresh();
}

// ───────────────────────────── Guest uploads moderation

export async function moderateUpload(mediaId: string, status: "approved" | "hidden") {
  const { celebration } = await currentCelebration();
  if (uuid.safeParse(mediaId).success) await setMediaStatus(celebration.id, mediaId, status);
  refresh();
}
