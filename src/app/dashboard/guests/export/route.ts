import { appUrl } from "@/lib/env";
import { csvResponse, toCsv } from "@/lib/csv";
import { listEvents } from "@/server/events";
import { listGuests } from "@/server/guests";
import { listRsvps } from "@/server/rsvp";
import { loadDashboard } from "../../data";

/** The guest list with personal links and reply status, for printing or mail merge. */
export async function GET() {
  const { celebration: c } = await loadDashboard();
  const [guests, events, rsvps] = await Promise.all([listGuests(c.id), listEvents(c.id), listRsvps(c.id)]);
  const eventName = new Map(events.map((e) => [e.id, e.name]));
  const reply = new Map(rsvps.filter((r) => r.guestId).map((r) => [r.guestId!, r]));
  const rows = guests.map((g) => {
    const r = reply.get(g.id);
    return [
      g.name,
      g.phone,
      g.email,
      g.maxPartySize,
      g.eventIds.length ? g.eventIds.map((id) => eventName.get(id) ?? "").join("; ") : "All events",
      g.invitationSentAt ? "Yes" : "No",
      r ? (r.answers.some((a) => a.attending) ? "Coming" : "Can't come") : "No reply",
      appUrl(`/${c.slug}?invite=${g.inviteToken}`),
      g.notes,
    ];
  });
  return csvResponse(`${c.slug}-guests.csv`, toCsv([["Name", "Phone", "Email", "Party size", "Invited to", "Invitation sent", "Reply", "Personal link", "Notes"], ...rows]));
}
