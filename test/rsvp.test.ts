import { describe, expect, it } from "vitest";
import { rsvpField } from "@/lib/celebration-rules";
import { createEvent, deleteEvent, listEvents } from "@/server/events";
import { createGuest, listGuests, parseGuestCsv, regenerateInviteToken } from "@/server/guests";
import { eventTotals, findInvitation, listRsvps, parseRsvp, rsvpSummary, saveRsvp, type ParsedRsvp } from "@/server/rsvp";
import { eventInput, makeCelebration } from "./helpers";

const limits = { maxPartySize: 4, mealOptions: ["Jollof", "Vegetarian"], askDietary: true };

async function twoEvents() {
  const { celebration, owner } = await makeCelebration();
  await createEvent(celebration.id, "free", eventInput({ name: "Reception", startsLocal: "2030-06-12T19:00" }));
  const events = await listEvents(celebration.id);
  return { celebration, owner, church: events[0], reception: events[1], events };
}

function form(events: { id: string }[], answers: string[], extra: Record<string, string> = {}) {
  const raw: Record<string, string> = { name: "Esi Owusu", email: "Esi@Example.com", phone: "", partySize: "2", mealChoice: "", dietary: "", message: "" };
  events.forEach((e, i) => (raw[rsvpField(e.id)] = answers[i]));
  return { ...raw, ...extra };
}

function ok(result: ReturnType<typeof parseRsvp>): ParsedRsvp {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.data;
}

describe("RSVP validation", () => {
  it("requires an answer for every offered event and ignores others", async () => {
    const { church, reception, events } = await twoEvents();
    const missing = parseRsvp(form(events, ["yes", ""]), events, limits);
    expect(missing.ok).toBe(false);
    const onlyChurch = ok(parseRsvp(form(events, ["yes", "yes"]), [church], limits));
    expect(onlyChurch.answers.map((a) => a.eventId)).toEqual([church.id]);
    expect(reception.id).not.toBe(church.id);
  });

  it("enforces the invitation's party size instead of silently changing it", () => {
    const e = [{ id: "e1", name: "Celebration" }];
    expect(parseRsvp(form(e, ["yes"], { partySize: "5" }), e, limits).ok).toBe(false);
    expect(parseRsvp(form(e, ["yes"], { partySize: "2" }), e, { ...limits, maxPartySize: 1 }).ok).toBe(false);
    expect(ok(parseRsvp(form(e, ["yes"], { partySize: "4" }), e, limits)).partySize).toBe(4);
  });

  it("accepts only offered meal choices, and drops meal/dietary when declining", () => {
    const e = [{ id: "e1", name: "Celebration" }];
    expect(parseRsvp(form(e, ["yes"], { mealChoice: "Steak" }), e, limits).ok).toBe(false);
    const declined = ok(parseRsvp(form(e, ["no"], { mealChoice: "Jollof", dietary: "Nuts" }), e, limits));
    expect(declined).toMatchObject({ partySize: 0, mealChoice: "", dietary: "" });
  });
});

describe("minimal replies", () => {
  it("accepts the fields the guest form actually sends (no phone, meal or dietary fields)", () => {
    const e = [{ id: "e1", name: "Wedding" }];
    const raw = { name: "Esi", email: "esi@example.com", [rsvpField("e1")]: "no" };
    expect(ok(parseRsvp(raw, e, { maxPartySize: 2, mealOptions: [], askDietary: true })).answers).toEqual([{ eventId: "e1", attending: false }]);
  });
});

describe("saving RSVPs", () => {
  it("updates instead of duplicating when the same email replies again (any case)", async () => {
    const { celebration, events } = await twoEvents();
    const first = await saveRsvp(celebration.id, null, ok(parseRsvp(form(events, ["yes", "yes"]), events, limits)));
    const second = await saveRsvp(celebration.id, null, ok(parseRsvp(form(events, ["no", "yes"], { email: "esi@example.COM" }), events, limits)));
    expect(first.updated).toBe(false);
    expect(second).toEqual({ id: first.id, updated: true });
    expect(await listRsvps(celebration.id)).toHaveLength(1);
    const totals = await eventTotals(celebration.id);
    expect(totals.map((t) => [t.name, t.yes, t.no, t.guests])).toEqual([
      ["Church ceremony", 0, 1, 0],
      ["Reception", 1, 0, 2],
    ]);
  });

  it("separates households from people and survives event deletion", async () => {
    const { celebration, events, reception } = await twoEvents();
    await saveRsvp(celebration.id, null, ok(parseRsvp(form(events, ["no", "yes"], { partySize: "3" }), events, limits)));
    await saveRsvp(celebration.id, null, ok(parseRsvp(form(events, ["yes", "yes"], { email: "kojo@example.com", partySize: "1" }), events, limits)));
    expect(await rsvpSummary(celebration.id)).toMatchObject({ replies: 2, attending: 2, declined: 0, people: 4 });
    await deleteEvent(celebration.id, reception.id);
    expect(await rsvpSummary(celebration.id)).toMatchObject({ replies: 2, attending: 1, declined: 1, people: 1 });
  });

  it("keeps one reply per invitation even if the guest changes their email", async () => {
    const { celebration, events } = await twoEvents();
    const guestId = await createGuest(celebration.id, "free", {
      name: "The Mensah Family", email: "", phone: "", maxPartySize: 4, notes: "", tableName: "", eventIds: [],
    });
    await saveRsvp(celebration.id, guestId, ok(parseRsvp(form(events, ["yes", "yes"]), events, limits)));
    await saveRsvp(celebration.id, guestId, ok(parseRsvp(form(events, ["yes", "no"], { email: "new@example.com" }), events, limits)));
    const rows = await listRsvps(celebration.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ guestId, email: "new@example.com" });
    expect(await rsvpSummary(celebration.id)).toMatchObject({ invitations: 1, pending: 0 });
  });

  it("keeps couples' RSVPs apart", async () => {
    const a = await twoEvents();
    const b = await twoEvents();
    await saveRsvp(a.celebration.id, null, ok(parseRsvp(form(a.events, ["yes", "yes"]), a.events, limits)));
    expect(await listRsvps(b.celebration.id)).toHaveLength(0);
  });
});

describe("invitations", () => {
  it("finds an invitation only within its own celebration, and only with the current token", async () => {
    const { celebration, church } = await twoEvents();
    const other = await makeCelebration();
    const guestId = await createGuest(celebration.id, "free", {
      name: "Auntie Akos", email: "", phone: "", maxPartySize: 2, notes: "", tableName: "", eventIds: [church.id],
    });
    const [g] = await listGuests(celebration.id);
    expect(g.eventIds).toEqual([church.id]);

    const found = await findInvitation(celebration.id, g.inviteToken);
    expect(found?.guest.id).toBe(guestId);
    expect([...found!.eventIds]).toEqual([church.id]);
    expect(await findInvitation(other.celebration.id, g.inviteToken)).toBeNull();
    expect(await findInvitation(celebration.id, "short")).toBeNull();

    await regenerateInviteToken(celebration.id, guestId);
    expect(await findInvitation(celebration.id, g.inviteToken)).toBeNull();
  });

  it("ignores another celebration's event ids when creating a guest", async () => {
    const { celebration } = await twoEvents();
    const other = await makeCelebration();
    await createGuest(celebration.id, "free", {
      name: "Sneaky", email: "", phone: "", maxPartySize: 1, notes: "", tableName: "", eventIds: [other.eventId!],
    });
    expect((await listGuests(celebration.id))[0].eventIds).toEqual([]);
  });

  it("imports a CSV with quotes, flexible headers and per-line problems", () => {
    const csv = '﻿Name,Email,Party size\n"Mensah, Kofi & Ama",KOFI@example.com,2\nYaw,not-an-email,\n,missing@example.com,1\n';
    const { rows, problems } = parseGuestCsv(csv);
    expect(rows).toEqual([
      { name: "Mensah, Kofi & Ama", email: "kofi@example.com", phone: "", maxPartySize: 2 },
      { name: "Yaw", email: "", phone: "", maxPartySize: 1 },
    ]);
    expect(problems).toHaveLength(2);
  });
});
