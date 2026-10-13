import { describe, expect, it } from "vitest";
import { membershipRole } from "@/lib/dal";
import { createEvent, deleteEvent, getEvent, listEvents, setPrimaryEvent, updateEvent } from "@/server/events";
import { changeSlug, getWedding, publishWedding, resolveSlug } from "@/server/weddings";
import { eventInput, makeUser, makeWedding } from "./helpers";

describe("wedding creation and slugs", () => {
  it("creates a draft with a readable slug and makes the creator the owner", async () => {
    const { owner, wedding } = await makeWedding({ partnerOne: "Ámà Mensah", partnerTwo: "Kofi Boateng" });
    expect(wedding.slug).toBe("ama-and-kofi");
    const stored = await getWedding(wedding.id);
    expect(stored).toMatchObject({ status: "draft", partnerOneDisplayName: "Ámà", partnerTwoDisplayName: "Kofi" });
    expect(await membershipRole(owner.id, wedding.id)).toBe("owner");
  });

  it("never reuses a slug, including old addresses kept as redirects", async () => {
    const first = await makeWedding({ partnerOne: "Esi", partnerTwo: "Yaw" });
    const second = await makeWedding({ partnerOne: "Esi", partnerTwo: "Yaw" });
    expect(first.wedding.slug).toBe("esi-and-yaw");
    expect(second.wedding.slug).not.toBe(first.wedding.slug);
    expect(second.wedding.slug.startsWith("esi-and-yaw-")).toBe(true);

    // The first couple moves; their old address stays reserved for them.
    expect(await changeSlug(first.wedding.id, "esi-and-yaw-forever")).toEqual({ ok: true, previous: "esi-and-yaw" });
    expect(await changeSlug(second.wedding.id, "esi-and-yaw")).toEqual({ ok: false, error: "That address is already taken." });
  });

  it("rejects reserved and malformed addresses", async () => {
    const { wedding } = await makeWedding();
    for (const bad of ["admin", "dashboard", "a", "Has Spaces", "-dash", "double--dash"]) {
      expect((await changeSlug(wedding.id, bad)).ok).toBe(false);
    }
  });

  it("keeps old addresses working and lets a couple reclaim their own old address", async () => {
    const { wedding } = await makeWedding({ partnerOne: "Abena", partnerTwo: "Kwesi" });
    await changeSlug(wedding.id, "abena-kwesi-2030");
    expect(await resolveSlug("abena-and-kwesi")).toEqual({ weddingId: wedding.id, canonicalSlug: "abena-kwesi-2030" });
    expect(await changeSlug(wedding.id, "abena-and-kwesi")).toMatchObject({ ok: true });
    expect(await resolveSlug("abena-kwesi-2030")).toEqual({ weddingId: wedding.id, canonicalSlug: "abena-and-kwesi" });
    expect(await resolveSlug("does-not-exist")).toBeNull();
  });
});

describe("publishing", () => {
  it("refuses to publish without an event, then publishes once one exists", async () => {
    const { wedding } = await makeWedding({ withEvent: false });
    const blocked = await publishWedding(wedding.id);
    expect(blocked.ok).toBe(false);
    await createEvent(wedding.id, "free", eventInput());
    expect(await publishWedding(wedding.id)).toEqual({ ok: true });
    const stored = await getWedding(wedding.id);
    expect(stored?.status).toBe("published");
    expect(stored?.publishedAt).toBeInstanceOf(Date);
  });
});

describe("events", () => {
  it("makes the first event primary and hands the role on when it is deleted", async () => {
    const { wedding, eventId } = await makeWedding();
    expect((await getWedding(wedding.id))?.primaryEventId).toBe(eventId);
    const earlier = await createEvent(wedding.id, "free", eventInput({ name: "Engagement", startsLocal: "2030-01-05T11:00" }));
    await deleteEvent(wedding.id, eventId!);
    expect((await getWedding(wedding.id))?.primaryEventId).toBe(earlier);
  });

  it("stores times in the event's own timezone", async () => {
    const { wedding } = await makeWedding({ withEvent: false });
    const id = await createEvent(wedding.id, "free", eventInput({ startsLocal: "2030-06-12T19:00", timezone: "Europe/London" }));
    expect((await getEvent(wedding.id, id))?.startsAt.toISOString()).toBe("2030-06-12T18:00:00.000Z");
  });

  it("does not let one couple read, change, delete or promote another couple's event", async () => {
    const a = await makeWedding();
    const b = await makeWedding();
    expect(await getEvent(a.wedding.id, b.eventId!)).toBeNull();
    expect(await updateEvent(a.wedding.id, b.eventId!, eventInput({ name: "Hijacked" }))).toBe(false);
    expect(await deleteEvent(a.wedding.id, b.eventId!)).toBe(false);
    expect(await setPrimaryEvent(a.wedding.id, b.eventId!)).toBe(false);
    expect((await listEvents(b.wedding.id))[0].name).toBe("Church ceremony");
  });

  it("is not a member of a wedding it did not create", async () => {
    const { wedding } = await makeWedding();
    const stranger = await makeUser();
    expect(await membershipRole(stranger.id, wedding.id)).toBeNull();
  });
});
