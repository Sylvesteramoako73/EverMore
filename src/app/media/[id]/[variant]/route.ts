import { connection } from "next/server";
import { z } from "zod";
import { getMedia, verifyMediaSignature, type Variant } from "@/server/media";
import { storage } from "@/server/storage";
import { memberCheck } from "@/server/viewer";
import { getWedding } from "@/server/weddings";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves photos. Public photos of published, non-private pages are cacheable by anyone.
 * Everything else needs a valid signed URL or a signed-in member of the wedding.
 */
export async function GET(request: Request, { params }: RouteContext<"/media/[id]/[variant]">) {
  await connection();
  const { id, variant } = await params;
  if (!z.uuid().safeParse(id).success || (variant !== "full" && variant !== "thumb")) return notFound();

  const item = await getMedia(id);
  if (!item) return notFound();
  const w = await getWedding(item.weddingId);
  if (!w) return notFound();

  const url = new URL(request.url);
  const publicCacheable = item.isPublic && w.status === "published" && w.visibility !== "private";
  const signedOk = verifyMediaSignature(id, variant as Variant, url.searchParams.get("e"), url.searchParams.get("s"));
  const allowed = publicCacheable || signedOk || (await memberCheck()(w.id));
  if (!allowed) return notFound();

  const key = variant === "full" ? item.storageKey : item.storageKey.replace(/full\.webp$/, "thumb.webp");
  const body = await storage().get(key);
  if (!body) return notFound();

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": publicCacheable ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
