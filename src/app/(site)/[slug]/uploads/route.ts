import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { LimitError } from "@/server/events";
import { addGuestUpload, listShared, MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, UploadError } from "@/server/media";
import { toSharedItem } from "@/server/public-celebration";
import { limitPublicAction } from "@/server/rate-limit";
import { findInvitation } from "@/server/rsvp";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });

/** A published celebration that accepts guest uploads, and whether this visitor may use it. */
async function target(slug: string, inviteToken: string | null) {
  const resolved = await resolveSlug(slug);
  const c = resolved && (await getCelebration(resolved.celebrationId));
  if (!c || c.status !== "published" || !c.guestUploadsEnabled) return null;
  if (c.visibility === "private" && !(inviteToken && (await findInvitation(c.id, inviteToken)))) return null;
  return c;
}

/** More approved items for the shared gallery ("Load more"). */
export async function GET(request: Request, { params }: RouteContext<"/[slug]/uploads">) {
  await connection();
  const { slug } = await params;
  const url = new URL(request.url);
  const c = await target(slug, url.searchParams.get("invite"));
  if (!c) return json({ error: "Not found" }, 404);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const { items, total } = await listShared(c.id, { onlyApproved: true, limit: 12, offset });
  return json({ items: items.map((m) => toSharedItem(m, c.visibility === "private")), total });
}

/** A guest adds one photo or video. Called once per file by the upload dialog. */
export async function POST(request: Request, { params }: RouteContext<"/[slug]/uploads">) {
  await connection();
  // Same-origin only: a form on another site must not be able to post into someone's gallery.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(appUrl()).origin && origin !== new URL(request.url).origin) return json({ error: "Forbidden" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES + 1024 * 1024) {
    return json({ error: `That file is too large. Videos can be up to ${Math.round(MAX_VIDEO_BYTES / 1_000_000)} MB, photos up to 15 MB.` }, 413);
  }

  const { slug } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "We couldn't read that upload." }, 400);
  }
  const c = await target(slug, typeof form.get("invite") === "string" ? String(form.get("invite")) : null);
  if (!c) return json({ error: "Uploads aren't open on this page." }, 404);
  if (String(form.get("website") ?? "")) return json({ ok: true, status: "pending" }); // spam trap

  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const file = form.get("file");
  if (!name) return json({ error: "Please tell us your name." }, 400);
  if (form.get("consent") !== "on") return json({ error: "Please confirm you're happy to share this." }, 400);
  if (!(file instanceof File)) return json({ error: "No file received." }, 400);
  if (!file.type.startsWith("video/") && file.size > MAX_UPLOAD_BYTES) return json({ error: "Photos must be 15 MB or smaller." }, 413);

  if (!(await limitPublicAction("upload", c.id, 40, 600, 60 * 60 * 1000))) {
    return json({ error: "Lots of uploads right now. Please try again in a few minutes." }, 429);
  }

  try {
    const result = await addGuestUpload(c.id, c.plan, file, { guestName: name, moderated: c.guestUploadsModeration });
    return json({ ok: true, status: result.status });
  } catch (err) {
    if (err instanceof UploadError || err instanceof LimitError) return json({ error: err.message }, 400);
    console.error("[guest upload]", err);
    return json({ error: "Upload failed. Please try again." }, 500);
  }
}
