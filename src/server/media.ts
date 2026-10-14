import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { celebration, media, mediaCollection } from "@/db/schema";
import { env } from "@/lib/env";
import { entitlements } from "@/lib/plans";
import { LimitError } from "./events";
import { mediaKeys, storage } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 60_000_000;
// HEIC needs a codec sharp does not ship; browsers on iPhone convert to JPEG on upload.
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type Collection = (typeof mediaCollection.enumValues)[number];
export type Media = typeof media.$inferSelect;

export class UploadError extends Error {}

/**
 * Validate and normalise an uploaded photo: it must decode as an image, is auto-rotated, stripped of
 * metadata (including GPS location) and re-encoded to WebP at two sizes plus a tiny blurred placeholder.
 */
export async function processImage(file: File) {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Photos must be 15 MB or smaller.");
  if (file.type && !ACCEPTED.has(file.type)) throw new UploadError("Please upload a JPEG, PNG, WebP or AVIF photo.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new UploadError("We couldn't read that file as a photo.");
  }
  if (!meta.width || !meta.height) throw new UploadError("We couldn't read that file as a photo.");

  const base = () => sharp(input, { limitInputPixels: MAX_PIXELS }).rotate(); // rotate() applies EXIF orientation
  const [full, thumb, tiny] = await Promise.all([
    base().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
    base().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer(),
    base().resize({ width: 16, height: 16, fit: "inside" }).blur(1).webp({ quality: 40 }).toBuffer(),
  ]);
  return {
    full: full.data,
    thumb,
    width: full.info.width,
    height: full.info.height,
    placeholder: `data:image/webp;base64,${tiny.toString("base64")}`,
  };
}

export async function addPhoto(
  celebrationId: string,
  plan: string,
  file: File,
  { collection, isPublic = true, uploadedBy }: { collection: Collection; isPublic?: boolean; uploadedBy: string },
) {
  const [{ n }] = await db.select({ n: count() }).from(media).where(eq(media.celebrationId, celebrationId));
  const limit = entitlements(plan).maxPhotos;
  if (n >= limit) throw new LimitError(`Your plan includes up to ${limit} photos.`);

  const image = await processImage(file);
  const id = crypto.randomUUID();
  const keys = mediaKeys(celebrationId, id);
  await Promise.all([
    storage().put(keys.full, image.full, "image/webp"),
    storage().put(keys.thumb, image.thumb, "image/webp"),
  ]);
  const [{ next }] = await db
    .select({ next: max(media.sortOrder) })
    .from(media)
    .where(and(eq(media.celebrationId, celebrationId), eq(media.collection, collection)));
  try {
    await db.insert(media).values({
      id,
      celebrationId,
      collection,
      storageKey: keys.full,
      mimeType: "image/webp",
      bytes: image.full.length,
      width: image.width,
      height: image.height,
      placeholder: image.placeholder,
      isPublic,
      sortOrder: (next ?? -1) + 1,
      uploadedBy,
    });
  } catch (err) {
    await storage().deletePrefix(keys.prefix);
    throw err;
  }
  return id;
}

/** The hosts' own photos (guest uploads are listed separately with `listShared`). */
export function listMedia(celebrationId: string, collections?: Collection[]) {
  return db
    .select()
    .from(media)
    .where(
      and(
        eq(media.celebrationId, celebrationId),
        eq(media.source, "host"),
        collections ? inArray(media.collection, collections) : undefined,
      ),
    )
    .orderBy(asc(media.collection), asc(media.sortOrder), asc(media.createdAt));
}

export async function getMedia(mediaId: string) {
  const [row] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  return row ?? null;
}

export async function updateMedia(
  celebrationId: string,
  mediaId: string,
  patch: Partial<Pick<Media, "caption" | "altText" | "isPublic" | "collection">>,
) {
  const rows = await db
    .update(media)
    .set(patch)
    .where(and(eq(media.id, mediaId), eq(media.celebrationId, celebrationId)))
    .returning({ id: media.id });
  return rows.length > 0;
}

export async function deleteMedia(celebrationId: string, mediaId: string) {
  const rows = await db
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.celebrationId, celebrationId)))
    .returning({ id: media.id });
  if (!rows.length) return false;
  await storage().deletePrefix(mediaKeys(celebrationId, mediaId).prefix);
  return true;
}

/** Move a photo one place earlier or later within its collection. */
export async function moveMedia(celebrationId: string, mediaId: string, direction: -1 | 1) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(media).where(and(eq(media.id, mediaId), eq(media.celebrationId, celebrationId)));
    if (!item) return false;
    const siblings = await tx
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.celebrationId, celebrationId), eq(media.collection, item.collection)))
      .orderBy(asc(media.sortOrder), asc(media.createdAt));
    const index = siblings.findIndex((s) => s.id === mediaId);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return false;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    for (const [i, s] of siblings.entries()) await tx.update(media).set({ sortOrder: i }).where(eq(media.id, s.id));
    return true;
  });
}

export async function setHeroMedia(celebrationId: string, mediaId: string | null) {
  if (mediaId) {
    const item = await getMedia(mediaId);
    if (!item || item.celebrationId !== celebrationId) return false;
  }
  await db.update(celebration).set({ heroMediaId: mediaId }).where(eq(celebration.id, celebrationId));
  return true;
}

/** Remove every stored file of a celebration (used when deleting a celebration or an account). */
export async function deleteCelebrationFiles(celebrationId: string) {
  await storage().deletePrefix(celebrationId);
}

// ───────────────────────────── Signed URLs for private media

export type Variant = "full" | "thumb";

function signature(mediaId: string, variant: Variant, expires: number) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`media:${mediaId}:${variant}:${expires}`).digest("base64url");
}

/** URL for a photo. Private photos get a signature valid for `ttlSeconds`. */
export function mediaUrl(mediaId: string, variant: Variant, { signed = false, ttlSeconds = 60 * 60 * 6 } = {}) {
  const base = `/media/${mediaId}/${variant}`;
  if (!signed) return base;
  // Round expiry to the hour so URLs stay cacheable for a while.
  const expires = Math.ceil((Date.now() / 1000 + ttlSeconds) / 3600) * 3600;
  return `${base}?e=${expires}&s=${signature(mediaId, variant, expires)}`;
}

export function verifyMediaSignature(mediaId: string, variant: Variant, expires: string | null, sig: string | null) {
  if (!expires || !sig) return false;
  const e = Number(expires);
  if (!Number.isFinite(e) || e * 1000 < Date.now()) return false;
  const expected = Buffer.from(signature(mediaId, variant, e));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ───────────────────────────── Guest uploads ("Share the love")

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

/**
 * A guest adds a photo or video to the shared gallery. Photos are processed like host photos;
 * videos are stored as uploaded (size and type checked, no transcoding). Moderated pages hold
 * uploads as "pending" until a host approves them.
 */
export async function addGuestUpload(
  celebrationId: string,
  plan: string,
  file: File,
  { guestName, moderated }: { guestName: string; moderated: boolean },
) {
  const [{ n }] = await db.select({ n: count() }).from(media).where(eq(media.celebrationId, celebrationId));
  // Guests share the page's media allowance, with headroom so a busy day isn't cut short.
  const limit = entitlements(plan).maxPhotos * 3;
  if (n >= limit) throw new LimitError("This page has reached its upload limit. Please send your photos to the hosts directly.");

  const id = crypto.randomUUID();
  const keys = mediaKeys(celebrationId, id);
  const status = moderated ? "pending" : "approved";
  const ext = VIDEO_TYPES[file.type];

  if (ext) {
    if (file.size === 0) throw new UploadError("That file is empty.");
    if (file.size > MAX_VIDEO_BYTES) throw new UploadError("Videos must be 50 MB or smaller. Try a shorter clip.");
    const key = `${keys.prefix}/video.${ext}`;
    await storage().put(key, Buffer.from(await file.arrayBuffer()), file.type);
    await db.insert(media).values({
      id, celebrationId, kind: "video", collection: "shared", source: "guest", status, guestName,
      storageKey: key, mimeType: file.type, bytes: file.size,
    });
    return { id, status };
  }

  const image = await processImage(file);
  await Promise.all([storage().put(keys.full, image.full, "image/webp"), storage().put(keys.thumb, image.thumb, "image/webp")]);
  try {
    await db.insert(media).values({
      id, celebrationId, kind: "photo", collection: "shared", source: "guest", status, guestName,
      storageKey: keys.full, mimeType: "image/webp", bytes: image.full.length,
      width: image.width, height: image.height, placeholder: image.placeholder,
    });
  } catch (err) {
    await storage().deletePrefix(keys.prefix);
    throw err;
  }
  return { id, status };
}

/** The shared gallery, newest first. */
export async function listShared(
  celebrationId: string,
  { onlyApproved, limit = 12, offset = 0, status }: { onlyApproved: boolean; limit?: number; offset?: number; status?: "approved" | "pending" | "hidden" },
) {
  const where = and(
    eq(media.celebrationId, celebrationId),
    eq(media.source, "guest"),
    onlyApproved ? eq(media.status, "approved") : status ? eq(media.status, status) : undefined,
  );
  const [items, [{ total }]] = await Promise.all([
    db.select().from(media).where(where).orderBy(desc(media.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(media).where(where),
  ]);
  return { items, total };
}

export async function setMediaStatus(celebrationId: string, mediaId: string, status: "approved" | "hidden" | "pending") {
  const rows = await db
    .update(media)
    .set({ status })
    .where(and(eq(media.id, mediaId), eq(media.celebrationId, celebrationId)))
    .returning({ id: media.id });
  return rows.length > 0;
}
