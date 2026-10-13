import { describe, expect, it } from "vitest";
import { rsvpField } from "@/lib/wedding-rules";
import { createEvent, deleteEvent, listEvents } from "@/server/events";
import { createGuest, listGuests, parseGuestCsv, regenerateInviteToken } from "@/server/guests";
import { eventTotals, findInvitation, listRsvps, parseRsvp, rsvpSummary, saveRsvp, type ParsedRsvp } from "@/server/rsvp";
import { eventInput, makeWedding } from "./helpers";

const limits = { maxPartySize: 4, mealOptions: ["Jollof", "Vegetarian"], askDietary: true };

async function twoEvents() {
  const { wedding, owner } = await makeWedding();
  await createEvent(wedding.id, "free", eventInput({ name: "Reception", startsLocal: "2030-06-12T19:00" }));
  const events = await listEvents(wedding.id);
  return { wedding, owner, church: events[0], reception: events[1], events };
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
    const e = [{ id: "e1", name: "Wedding" }];
    expect(parseRsvp(form(e, ["yes"], { partySize: "5" }), e, limits).ok).toBe(false);
    expect(parseRsvp(form(e, ["yes"], { partySize: "2" }), e, { ...limits, maxPartySize: 1 }).ok).toBe(false);
    expect(ok(parseRsvp(form(e, ["yes"], { partySize: "4" }), e, limits)).partySize).toBe(4);
  });

  it("accepts only offered meal choices, and drops meal/dietary when declining", () => {
    const e = [{ id: "e1", name: "Wedding" }];
    expect(parseRsvp(form(e, ["yes"], { mealChoice: "Steak" }), e, limits).ok).toBe(false);
    const declined = ok(parseRsvp(form(e, ["no"], { mealChoice: "Jollof", dietary: "Nuts" }), e, limits));
    expect(declined).toMatchObject({ partySize: 0, mealChoice: "", dietary: "" });
  });
});

describe("saving RSVPs", () => {
  it("updates instead of duplicating when the same email replies again (any case)", async () => {
    const { wedding, events } = await twoEvents();
    const first = await saveRsvp(wedding.id, null, ok(parseRsvp(form(events, ["yes", "yes"]), events, limits)));
    const second = await saveRsvp(wedding.id, null, ok(parseRsvp(form(events, ["no", "yes"], { email: "esi@example.COM" }), events, limits)));
    expect(first.updated).toBe(false);
    expect(second).toEqual({ id: first.id, updated: true });
    expect(await listRsvps(wedding.id)).toHaveLength(1);
    const totals = await eventTotals(wedding.id);
    expect(totals.map((t) => [t.name, t.yes, t.no, t.guests])).toEqual([
      ["Church ceremony", 0, 1, 0],
      ["Reception", 1, 0, 2],
    ]);
  });

  it("separates households from people and survives event deletion", async () => {
    const { wedding, events, reception } = await twoEvents();
    await saveRsvp(wedding.id, null, ok(parseRsvp(form(events, ["no", "yes"], { partySize: "3" }), events, limits)));
    await saveRsvp(wedding.id, null, ok(parseRsvp(form(events, ["yes", "yes"], { email: "kojo@example.com", partySize: "1" }), events, limits)));
    expect(await rsvpSummary(wedding.id)).toMatchObject({ replies: 2, attending: 2, declined: 0, people: 4 });
    await deleteEvent(wedding.id, reception.id);
    expect(await rsvpSummary(wedding.id)).toMatchObject({ replies: 2, attending: 1, declined: 1, people: 1 });
  });

  it("keeps one reply per invitation even if the guest changes their email", async () => {
    const { wedding, events } = await twoEvents();
    const guestId = await createGuest(wedding.id, "free", {
      name: "The Mensah Family", email: "", phone: "", maxPartySize: 4, notes: "", eventIds: [],
    });
    await saveRsvp(wedding.id, guestId, ok(parseRsvp(form(events, ["yes", "yes"]), events, limits)));
    await saveRsvp(wedding.id, guestId, ok(parseRsvp(form(events, ["yes", "no"], { email: "new@example.com" }), events, limits)));
    const rows = await listRsvps(wedding.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ guestId, email: "new@example.com" });
    expect(await rsvpSummary(wedding.id)).toMatchObject({ invitations: 1, pending: 0 });
  });

  it("keeps couples' RSVPs apart", async () => {
    const a = await twoEvents();
    const b = await twoEvents();
    await saveRsvp(a.wedding.id, null, ok(parseRsvp(form(a.events, ["yes", "yes"]), a.events, limits)));
    expect(await listRsvps(b.wedding.id)).toHaveLength(0);
  });
});

describe("invitations", () => {
  it("finds an invitation only within its own wedding, and only with the current token", async () => {
    const { wedding, church } = await twoEvents();
    const other = await makeWedding();
    const guestId = await createGuest(wedding.id, "free", {
      name: "Auntie Akos", email: "", phone: "", maxPartySize: 2, notes: "", eventIds: [church.id],
    });
    const [g] = await listGuests(wedding.id);
    expect(g.eventIds).toEqual([church.id]);

    const found = await findInvitation(wedding.id, g.inviteToken);
    expect(found?.guest.id).toBe(guestId);
    expect([...found!.eventIds]).toEqual([church.id]);
    expect(await findInvitation(other.wedding.id, g.inviteToken)).toBeNull();
    expect(await findInvitation(wedding.id, "short")).toBeNull();

    await regenerateInviteToken(wedding.id, guestId);
    expect(await findInvitation(wedding.id, g.inviteToken)).toBeNull();
  });

  it("ignores another wedding's event ids when creating a guest", async () => {
    const { wedding } = await twoEvents();
    const other = await makeWedding();
    await createGuest(wedding.id, "free", {
      name: "Sneaky", email: "", phone: "", maxPartySize: 1, notes: "", eventIds: [other.eventId!],
    });
    expect((await listGuests(wedding.id))[0].eventIds).toEqual([]);
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
