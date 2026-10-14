import { describe, expect, it } from "vitest";
import { membershipRole } from "@/lib/dal";
import { createEvent, deleteEvent, getEvent, listEvents, setPrimaryEvent, updateEvent } from "@/server/events";
import { changeSlug, getCelebration, publishCelebration, resolveSlug } from "@/server/celebrations";
import { eventInput, makeUser, makeCelebration } from "./helpers";

describe("celebration creation and slugs", () => {
  it("creates a draft with a readable slug and makes the creator the owner", async () => {
    const { owner, celebration } = await makeCelebration({ partnerOne: "Ámà Mensah", partnerTwo: "Kofi Boateng" });
    expect(celebration.slug).toBe("ama-and-kofi");
    const stored = await getCelebration(celebration.id);
    expect(stored).toMatchObject({ status: "draft", kind: "wedding", title: "Ámà & Kofi" });
    expect(stored?.honorees.map((h) => h.displayName)).toEqual(["Ámà", "Kofi"]);
    expect(await membershipRole(owner.id, celebration.id)).toBe("owner");
  });

  it("never reuses a slug, including old addresses kept as redirects", async () => {
    const first = await makeCelebration({ partnerOne: "Esi", partnerTwo: "Yaw" });
    const second = await makeCelebration({ partnerOne: "Esi", partnerTwo: "Yaw" });
    expect(first.celebration.slug).toBe("esi-and-yaw");
    expect(second.celebration.slug).not.toBe(first.celebration.slug);
    expect(second.celebration.slug.startsWith("esi-and-yaw-")).toBe(true);

    // The first couple moves; their old address stays reserved for them.
    expect(await changeSlug(first.celebration.id, "esi-and-yaw-forever")).toEqual({ ok: true, previous: "esi-and-yaw" });
    expect(await changeSlug(second.celebration.id, "esi-and-yaw")).toEqual({ ok: false, error: "That address is already taken." });
  });

  it("rejects reserved and malformed addresses", async () => {
    const { celebration } = await makeCelebration();
    for (const bad of ["admin", "dashboard", "a", "Has Spaces", "-dash", "double--dash"]) {
      expect((await changeSlug(celebration.id, bad)).ok).toBe(false);
    }
  });

  it("keeps old addresses working and lets a couple reclaim their own old address", async () => {
    const { celebration } = await makeCelebration({ partnerOne: "Abena", partnerTwo: "Kwesi" });
    await changeSlug(celebration.id, "abena-kwesi-2030");
    expect(await resolveSlug("abena-and-kwesi")).toEqual({ celebrationId: celebration.id, canonicalSlug: "abena-kwesi-2030" });
    expect(await changeSlug(celebration.id, "abena-and-kwesi")).toMatchObject({ ok: true });
    expect(await resolveSlug("abena-kwesi-2030")).toEqual({ celebrationId: celebration.id, canonicalSlug: "abena-and-kwesi" });
    expect(await resolveSlug("does-not-exist")).toBeNull();
  });
});

describe("publishing", () => {
  it("refuses to publish without an event, then publishes once one exists", async () => {
    const { celebration } = await makeCelebration({ withEvent: false });
    const blocked = await publishCelebration(celebration.id);
    expect(blocked.ok).toBe(false);
    await createEvent(celebration.id, "free", eventInput());
    expect(await publishCelebration(celebration.id)).toEqual({ ok: true });
    const stored = await getCelebration(celebration.id);
    expect(stored?.status).toBe("published");
    expect(stored?.publishedAt).toBeInstanceOf(Date);
  });
});

describe("events", () => {
  it("makes the first event primary and hands the role on when it is deleted", async () => {
    const { celebration, eventId } = await makeCelebration();
    expect((await getCelebration(celebration.id))?.primaryEventId).toBe(eventId);
    const earlier = await createEvent(celebration.id, "free", eventInput({ name: "Engagement", startsLocal: "2030-01-05T11:00" }));
    await deleteEvent(celebration.id, eventId!);
    expect((await getCelebration(celebration.id))?.primaryEventId).toBe(earlier);
  });

  it("stores times in the event's own timezone", async () => {
    const { celebration } = await makeCelebration({ withEvent: false });
    const id = await createEvent(celebration.id, "free", eventInput({ startsLocal: "2030-06-12T19:00", timezone: "Europe/London" }));
    expect((await getEvent(celebration.id, id))?.startsAt.toISOString()).toBe("2030-06-12T18:00:00.000Z");
  });

  it("does not let one couple read, change, delete or promote another couple's event", async () => {
    const a = await makeCelebration();
    const b = await makeCelebration();
    expect(await getEvent(a.celebration.id, b.eventId!)).toBeNull();
    expect(await updateEvent(a.celebration.id, b.eventId!, eventInput({ name: "Hijacked" }))).toBe(false);
    expect(await deleteEvent(a.celebration.id, b.eventId!)).toBe(false);
    expect(await setPrimaryEvent(a.celebration.id, b.eventId!)).toBe(false);
    expect((await listEvents(b.celebration.id))[0].name).toBe("Church ceremony");
  });

  it("is not a member of a celebration it did not create", async () => {
    const { celebration } = await makeCelebration();
    const stranger = await makeUser();
    expect(await membershipRole(stranger.id, celebration.id)).toBeNull();
  });
});
