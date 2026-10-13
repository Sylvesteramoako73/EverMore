"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentWedding, requireUserForAction, listMyWeddings } from "@/lib/dal";
import { isValidTimeZone } from "@/lib/dates";
import { entitlements } from "@/lib/plans";
import { getTheme } from "@/lib/themes";
import {
  coupleSchema,
  eventSchema,
  fieldErrors,
  formValues,
  guestFeaturesSchema,
  publishSettingsSchema,
  weddingInfoSchema,
  type FormState,
} from "@/lib/validation";
import { audit } from "@/server/audit";
import { createEvent, deleteEvent, LimitError, setPrimaryEvent, updateEvent } from "@/server/events";
import {
  addPhoto,
  deleteMedia,
  moveMedia,
  setHeroMedia,
  updateMedia,
  UploadError,
  type Collection,
} from "@/server/media";
import {
  advanceOnboarding,
  changeSlug,
  createWedding,
  getWedding,
  publishWedding,
  setWeddingStatus,
  updateWedding,
} from "@/server/weddings";

const uuid = z.uuid();

/** The signed-in user's wedding for a mutation. Non-members never reach here (401 / redirect). */
async function currentWedding() {
  await requireUserForAction();
  const { user, weddingId, role } = await requireCurrentWedding();
  const wedding = await getWedding(weddingId);
  if (!wedding) redirect("/onboarding");
  return { user, wedding, role };
}

// ───────────────────────────── Couple & wedding details

/** Step 1 of onboarding: creates the draft wedding the first time, updates it afterwards. */
export async function saveCouple(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUserForAction();
  const parsed = coupleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };

  const [existing] = await listMyWeddings(user.id);
  if (existing) {
    await updateWedding(existing.id, parsed.data);
  } else {
    const tz = String(formData.get("browserTimezone") ?? "");
    await createWedding(user.id, parsed.data, isValidTimeZone(tz) ? tz : "UTC");
  }
  refresh();
  return { ok: true, message: "Saved." };
}

export async function saveWeddingInfo(_prev: FormState, formData: FormData): Promise<FormState> {
  const { wedding } = await currentWedding();
  const parsed = weddingInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  await updateWedding(wedding.id, parsed.data);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function saveGuestFeatures(_prev: FormState, formData: FormData): Promise<FormState> {
  const { wedding } = await currentWedding();
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
  await updateWedding(wedding.id, parsed.data);
  refresh();
  return { ok: true, message: "Saved. Your page is up to date." };
}

/** Record progress through the onboarding wizard and move on. */
export async function goToStep(step: number) {
  const { wedding } = await currentWedding();
  await advanceOnboarding(wedding.id, step);
  redirect(`/onboarding?step=${step}`);
}

// ───────────────────────────── Events

export async function saveEvent(eventId: string | null, returnTo: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { wedding } = await currentWedding();
  if (eventId !== null && !uuid.safeParse(eventId).success) return { message: "That event no longer exists." };
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData), message: "Please check the highlighted fields." };
  try {
    if (eventId) {
      if (!(await updateEvent(wedding.id, eventId, parsed.data))) return { message: "That event no longer exists." };
    } else {
      await createEvent(wedding.id, wedding.plan, parsed.data);
    }
  } catch (err) {
    if (err instanceof LimitError) return { message: err.message, values: formValues(formData) };
    throw err;
  }
  redirect(returnTo.startsWith("/") ? returnTo : "/dashboard/events");
}

export async function removeEvent(eventId: string) {
  const { wedding } = await currentWedding();
  if (uuid.safeParse(eventId).success) await deleteEvent(wedding.id, eventId);
  refresh();
}

export async function makePrimaryEvent(eventId: string) {
  const { wedding } = await currentWedding();
  if (uuid.safeParse(eventId).success) await setPrimaryEvent(wedding.id, eventId);
  refresh();
}

// ───────────────────────────── Photos

const COLLECTIONS: Collection[] = ["portrait", "engagement", "gallery", "wedding", "memory"];

export async function uploadPhoto(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user, wedding } = await currentWedding();
  const file = formData.get("file");
  const collection = String(formData.get("collection") ?? "gallery") as Collection;
  if (!(file instanceof File)) return { ok: false, error: "No file received." };
  if (!COLLECTIONS.includes(collection)) return { ok: false, error: "Unknown photo section." };
  try {
    const id = await addPhoto(wedding.id, wedding.plan, file, { collection, uploadedBy: user.id });
    if (formData.get("makeHero") === "1" || !wedding.heroMediaId) await setHeroMedia(wedding.id, id);
    refresh();
    return { ok: true, id };
  } catch (err) {
    if (err instanceof UploadError || err instanceof LimitError) return { ok: false, error: err.message };
    console.error("[upload]", err);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}

export async function removePhoto(mediaId: string) {
  const { wedding } = await currentWedding();
  if (!uuid.safeParse(mediaId).success) return;
  await deleteMedia(wedding.id, mediaId);
  if (wedding.heroMediaId === mediaId) await setHeroMedia(wedding.id, null);
  refresh();
}

export async function choosePhotoAsHero(mediaId: string) {
  const { wedding } = await currentWedding();
  if (uuid.safeParse(mediaId).success) await setHeroMedia(wedding.id, mediaId);
  refresh();
}

export async function reorderPhoto(mediaId: string, direction: -1 | 1) {
  const { wedding } = await currentWedding();
  if (uuid.safeParse(mediaId).success && (direction === 1 || direction === -1)) await moveMedia(wedding.id, mediaId, direction);
  refresh();
}

export async function updatePhotoDetails(mediaId: string, formData: FormData) {
  const { wedding } = await currentWedding();
  if (!uuid.safeParse(mediaId).success) return;
  const collection = String(formData.get("collection") ?? "");
  await updateMedia(wedding.id, mediaId, {
    caption: String(formData.get("caption") ?? "").trim().slice(0, 200),
    altText: String(formData.get("altText") ?? "").trim().slice(0, 200),
    isPublic: formData.get("isPublic") === "on",
    ...(COLLECTIONS.includes(collection as Collection) ? { collection: collection as Collection } : {}),
  });
  refresh();
}

// ───────────────────────────── Theme & publishing

export async function chooseTheme(themeId: string): Promise<{ ok: boolean; error?: string }> {
  const { wedding } = await currentWedding();
  const theme = getTheme(themeId);
  if (theme.id !== themeId) return { ok: false, error: "Unknown theme." };
  if (theme.premium && !entitlements(wedding.plan).premiumThemes) return { ok: false, error: "This theme is part of Premium." };
  await updateWedding(wedding.id, { themeId });
  refresh();
  return { ok: true };
}

export async function savePublishSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, wedding } = await currentWedding();
  const parsed = publishSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  const d = parsed.data;
  if (d.slug !== wedding.slug) {
    const changed = await changeSlug(wedding.id, d.slug);
    if (!changed.ok) return { errors: { slug: [changed.error] }, values: formValues(formData) };
    await audit({ actorUserId: user.id, action: "wedding.slug_changed", targetType: "wedding", targetId: wedding.id, weddingId: wedding.id, metadata: { from: changed.previous, to: d.slug } });
  }
  await updateWedding(wedding.id, { visibility: d.visibility, allowIndexing: d.visibility === "public" && d.allowIndexing });
  refresh();
  return { ok: true, message: d.slug !== wedding.slug ? "Saved. Your old address will keep redirecting here." : "Saved." };
}

export async function publish(): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const { user, wedding } = await currentWedding();
  const result = await publishWedding(wedding.id);
  if (result.ok) await audit({ actorUserId: user.id, action: "wedding.published", targetType: "wedding", targetId: wedding.id, weddingId: wedding.id });
  refresh();
  return result;
}

export async function unpublish() {
  const { user, wedding } = await currentWedding();
  await setWeddingStatus(wedding.id, "draft");
  await audit({ actorUserId: user.id, action: "wedding.unpublished", targetType: "wedding", targetId: wedding.id, weddingId: wedding.id });
  refresh();
}
