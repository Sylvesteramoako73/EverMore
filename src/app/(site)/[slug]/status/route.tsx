import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { primaryEvent } from "@/lib/celebration-rules";
import { formatLongDate, formatTime } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { getOccasion } from "@/lib/occasions";
import { getCelebration, resolveSlug } from "@/server/celebrations";
import { listEvents } from "@/server/events";
import { renderQr } from "@/server/qr";
import { memberCheck } from "@/server/viewer";

/**
 * A tall picture (1080 by 1920) for posting as a WhatsApp or Instagram status: the title, the date and
 * place, and a QR code. Built from the celebration's own details; the QR always points at the page.
 */
export async function GET(request: Request, { params }: RouteContext<"/[slug]/status">) {
  await connection();
  const { slug } = await params;
  const resolved = await resolveSlug(slug);
  const w = resolved && (await getCelebration(resolved.celebrationId));
  if (!w || (w.status !== "published" && !(await memberCheck()(w.id)))) return new Response("Not found", { status: 404 });

  const events = await listEvents(w.id);
  const main = primaryEvent(events, w.primaryEventId);
  const when = main ? `${formatLongDate(main.startsAt, main.timezone)}` : "";
  const time = main ? formatTime(main.startsAt, main.timezone) : "";
  const where = main?.venueName ?? "";
  const url = appUrl(`/${w.slug}`);
  const qr = await renderQr(url, { format: "png", color: "navy", size: 600 });
  const qrSrc = `data:image/png;base64,${Buffer.from(qr.body).toString("base64")}`;
  const label = getOccasion(w.kind).copy.dateTitle;

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: "#101C35", color: "#FAF7F0", padding: "120px 90px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 8, color: "#C69A4A", textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: w.title.length > 28 ? 96 : 120, lineHeight: 1.1, marginTop: 50, display: "flex", textAlign: "center" }}>{w.title}</div>
          {when ? <div style={{ fontSize: 48, marginTop: 70, display: "flex" }}>{when}</div> : null}
          {time ? <div style={{ fontSize: 40, marginTop: 14, color: "#C69A4A", display: "flex" }}>{time}</div> : null}
          {where ? <div style={{ fontSize: 44, marginTop: 40, display: "flex", textAlign: "center" }}>{where}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image, not a page */}
          <img src={qrSrc} width={460} height={460} alt="" style={{ background: "#FFFFFF", padding: 24, borderRadius: 28 }} />
          <div style={{ fontSize: 38, marginTop: 44, display: "flex" }}>Scan, or open the link</div>
          <div style={{ fontSize: 30, marginTop: 14, color: "#B9BFCC", display: "flex", textAlign: "center" }}>Programme, directions, RSVP and photos in one place</div>
          <div style={{ fontSize: 34, marginTop: 14, color: "#C69A4A", display: "flex" }}>{url.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  const download = new URL(request.url).searchParams.get("download") === "1";
  if (download) image.headers.set("Content-Disposition", `attachment; filename="${w.slug}-status.png"`);
  image.headers.set("Cache-Control", "public, max-age=600");
  return image;
}
