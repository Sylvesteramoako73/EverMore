import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { loadPublicWedding } from "@/server/public-wedding";
import { memberCheck } from "@/server/viewer";

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Calendar file with the events this visitor can see; `?event=<id>` for one event. */
export async function GET(request: Request, { params }: RouteContext<"/w/[slug]/calendar.ics">) {
  await connection();
  const { slug } = await params;
  const url = new URL(request.url);
  const result = await loadPublicWedding(slug, { inviteToken: url.searchParams.get("invite"), isMember: memberCheck() });
  if (result.kind !== "ok") return new Response("Not found", { status: 404 });

  const w = result.view;
  const only = url.searchParams.get("event");
  const events = w.events.filter((e) => !only || e.id === only);
  if (!events.length) return new Response("Not found", { status: 404 });

  const page = appUrl(`/w/${w.slug}`);
  const stamp = icsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EverMore//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.id}@evermore`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(e.startsAt)}`,
      `DTEND:${icsDate(e.endsAt ?? new Date(Date.parse(e.startsAt) + 4 * 3600_000).toISOString())}`,
      `SUMMARY:${escape(`${w.partnerOne} & ${w.partnerTwo}: ${e.name}`)}`,
      `LOCATION:${escape([e.venueName, e.venueAddress].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${escape([e.dressCode && `Dress code: ${e.dressCode}`, page].filter(Boolean).join("\n"))}`,
      `URL:${page}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${w.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
