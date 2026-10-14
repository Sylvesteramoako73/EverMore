import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { renderQr } from "@/server/qr";
import { memberCheck } from "@/server/viewer";
import { getCelebration, resolveSlug } from "@/server/celebrations";

/**
 * QR code for a celebration page. It always encodes the canonical public URL (never a preview or
 * invitation link), so printed codes keep working.
 */
export async function GET(request: Request, { params }: RouteContext<"/[slug]/qr">) {
  await connection();
  const { slug } = await params;
  const resolved = await resolveSlug(slug);
  const w = resolved && (await getCelebration(resolved.celebrationId));
  if (!w || (w.status !== "published" && !(await memberCheck()(w.id)))) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  const qr = await renderQr(appUrl(`/${w.slug}`), {
    format,
    color: url.searchParams.get("color") ?? undefined,
    size: Number(url.searchParams.get("size") ?? 1024),
  });
  const download = url.searchParams.get("download") === "1";
  return new Response(qr.body, {
    headers: {
      "Content-Type": qr.type,
      "Cache-Control": "public, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="${w.slug}-qr.${format}"` } : {}),
    },
  });
}
