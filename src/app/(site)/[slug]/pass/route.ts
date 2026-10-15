import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { renderQr } from "@/server/qr";
import { findInvitation } from "@/server/rsvp";

/** A guest's entry pass: a QR code of their personal link, scanned by ushers at the door. */
export async function GET(request: Request, { params }: RouteContext<"/[slug]/pass">) {
  await connection();
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get("invite") ?? "";
  const resolved = await resolveSlug(slug);
  const w = resolved && (await getCelebration(resolved.celebrationId));
  const invitation = w && w.status === "published" ? await findInvitation(w.id, token) : null;
  if (!w || !invitation) return new Response("Not found", { status: 404 });
  const qr = await renderQr(appUrl(`/${w.slug}?invite=${encodeURIComponent(token)}`), { format: "svg", color: "navy", size: 600 });
  return new Response(qr.body, { headers: { "Content-Type": qr.type, "Cache-Control": "private, max-age=3600" } });
}
