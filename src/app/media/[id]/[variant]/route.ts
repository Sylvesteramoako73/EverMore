import { connection } from "next/server";
import { z } from "zod";
import { getCelebration } from "@/server/celebrations";
import { getMedia, verifyMediaSignature, type Variant } from "@/server/media";
import { storage } from "@/server/storage";
import { memberCheck } from "@/server/viewer";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves photos and videos.
 * - Approved, public items of published, non-private pages: cacheable by anyone.
 * - Everything else (private pages, drafts, guest uploads awaiting approval): a valid signed URL
 *   for approved items, or a signed-in member of the celebration.
 * Supports `?download=1` and byte ranges (for video seeking).
 */
export async function GET(request: Request, { params }: RouteContext<"/media/[id]/[variant]">) {
  await connection();
  const { id, variant } = await params;
  if (!z.uuid().safeParse(id).success || (variant !== "full" && variant !== "thumb")) return notFound();

  const item = await getMedia(id);
  if (!item) return notFound();
  const c = await getCelebration(item.celebrationId);
  if (!c) return notFound();

  const url = new URL(request.url);
  const approved = item.status === "approved";
  const publicCacheable = approved && item.isPublic && c.status === "published" && c.visibility !== "private";
  const signedOk = approved && verifyMediaSignature(id, variant as Variant, url.searchParams.get("e"), url.searchParams.get("s"));
  if (!publicCacheable && !signedOk && !(await memberCheck()(c.id))) return notFound();

  const isVideo = item.kind === "video";
  const key = isVideo || variant === "full" ? item.storageKey : item.storageKey.replace(/full\.webp$/, "thumb.webp");
  const body = await storage().get(key);
  if (!body) return notFound();

  const ext = key.split(".").pop();
  const headers: Record<string, string> = {
    "Content-Type": item.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": publicCacheable ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" : "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": url.searchParams.get("download") === "1" ? `attachment; filename="evermore-${c.slug}-${id.slice(0, 8)}.${ext}"` : "inline",
  };

  // Byte ranges let browsers seek within videos.
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const size = body.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(body.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(body), { headers: { ...headers, "Content-Length": String(body.length) } });
}
