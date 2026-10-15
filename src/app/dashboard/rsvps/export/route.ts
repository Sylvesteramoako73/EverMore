import { csvResponse, toCsv } from "@/lib/csv";
import { listEvents } from "@/server/events";
import { listRsvps } from "@/server/rsvp";
import { loadDashboard } from "../../data";

/** Every reply, one row each, with a yes/no and head count column per event. */
export async function GET() {
  const { celebration: c } = await loadDashboard();
  const [rsvps, events] = await Promise.all([listRsvps(c.id), listEvents(c.id)]);
  const header = ["Name", "Email", "Phone", ...events.flatMap((e) => [e.name, `${e.name}: people`]), "Meal", "Dietary needs", "Message", "Replied"];
  const rows = rsvps.map((r) => [
    r.name,
    r.email,
    r.phone,
    ...events.flatMap((e) => {
      const a = r.answers.find((x) => x.eventId === e.id);
      return a ? [a.attending ? "Yes" : "No", a.attending ? a.partySize : 0] : ["", ""];
    }),
    r.mealChoice,
    r.dietary,
    r.message,
    new Date(r.updatedAt).toISOString().slice(0, 16).replace("T", " "),
  ]);
  return csvResponse(`${c.slug}-rsvps.csv`, toCsv([header, ...rows]));
}
