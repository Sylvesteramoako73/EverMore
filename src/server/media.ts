import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, count, eq, inArray, max } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { media, wedding } from "@/db/schema";
import { env } from "@/lib/env";
import { entitlements } from "@/lib/plans";
import { LimitError } from "./events";
import { mediaKeys, storage } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 60_000_000;
// HEIC needs a codec sharp does not ship; browsers on iPhone convert to JPEG on upload.
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type Collection = "portrait" | "engagement" | "gallery" | "wedding" | "memory";
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
  weddingId: string,
  plan: string,
  file: File,
  { collection, isPublic = true, uploadedBy }: { collection: Collection; isPublic?: boolean; uploadedBy: string },
) {
  const [{ n }] = await db.select({ n: count() }).from(media).where(eq(media.weddingId, weddingId));
  const limit = entitlements(plan).maxPhotos;
  if (n >= limit) throw new LimitError(`Your plan includes up to ${limit} photos.`);

  const image = await processImage(file);
  const id = crypto.randomUUID();
  const keys = mediaKeys(weddingId, id);
  await Promise.all([
    storage().put(keys.full, image.full, "image/webp"),
    storage().put(keys.thumb, image.thumb, "image/webp"),
  ]);
  const [{ next }] = await db
    .select({ next: max(media.sortOrder) })
    .from(media)
    .where(and(eq(media.weddingId, weddingId), eq(media.collection, collection)));
  try {
    await db.insert(media).values({
      id,
      weddingId,
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

export function listMedia(weddingId: string, collections?: Collection[]) {
  return db
    .select()
    .from(media)
    .where(and(eq(media.weddingId, weddingId), collections ? inArray(media.collection, collections) : undefined))
    .orderBy(asc(media.collection), asc(media.sortOrder), asc(media.createdAt));
}

export async function getMedia(mediaId: string) {
  const [row] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  return row ?? null;
}

export async function updateMedia(
  weddingId: string,
  mediaId: string,
  patch: Partial<Pick<Media, "caption" | "altText" | "isPublic" | "collection">>,
) {
  const rows = await db
    .update(media)
    .set(patch)
    .where(and(eq(media.id, mediaId), eq(media.weddingId, weddingId)))
    .returning({ id: media.id });
  return rows.length > 0;
}

export async function deleteMedia(weddingId: string, mediaId: string) {
  const rows = await db
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.weddingId, weddingId)))
    .returning({ id: media.id });
  if (!rows.length) return false;
  await storage().deletePrefix(mediaKeys(weddingId, mediaId).prefix);
  return true;
}

/** Move a photo one place earlier or later within its collection. */
export async function moveMedia(weddingId: string, mediaId: string, direction: -1 | 1) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(media).where(and(eq(media.id, mediaId), eq(media.weddingId, weddingId)));
    if (!item) return false;
    const siblings = await tx
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.weddingId, weddingId), eq(media.collection, item.collection)))
      .orderBy(asc(media.sortOrder), asc(media.createdAt));
    const index = siblings.findIndex((s) => s.id === mediaId);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return false;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    for (const [i, s] of siblings.entries()) await tx.update(media).set({ sortOrder: i }).where(eq(media.id, s.id));
    return true;
  });
}

export async function setHeroMedia(weddingId: string, mediaId: string | null) {
  if (mediaId) {
    const item = await getMedia(mediaId);
    if (!item || item.weddingId !== weddingId) return false;
  }
  await db.update(wedding).set({ heroMediaId: mediaId }).where(eq(wedding.id, weddingId));
  return true;
}

/** Remove every stored file of a wedding (used when deleting a wedding or an account). */
export async function deleteWeddingFiles(weddingId: string) {
  await storage().deletePrefix(weddingId);
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
