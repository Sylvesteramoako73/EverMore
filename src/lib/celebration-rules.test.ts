import { describe, expect, it } from "vitest";
import { answerableEvents, yearlyDate, primaryEvent, visibleEvents, celebrationPhase } from "./celebration-rules";

const ev = (id: string, iso: string, extra: Partial<{ rsvpRequired: boolean; inviteOnly: boolean; timezone: string }> = {}) => ({
  id,
  startsAt: new Date(iso),
  endsAt: null,
  timezone: "Africa/Accra",
  rsvpRequired: true,
  inviteOnly: false,
  ...extra,
});

const trad = ev("trad", "2030-06-01T10:00:00Z");
const church = ev("church", "2030-06-12T14:00:00Z");
const party = ev("party", "2030-06-12T19:00:00Z", { rsvpRequired: false });
const vip = ev("vip", "2030-06-13T12:00:00Z", { inviteOnly: true });
const all = [church, party, vip, trad];
const settings = { rsvpEnabled: true, rsvpDeadline: null as string | null, timezone: "Africa/Accra" };

describe("primary event and phase", () => {
  it("uses the chosen event, falling back to the earliest", () => {
    expect(primaryEvent(all, "church")?.id).toBe("church");
    expect(primaryEvent(all, null)?.id).toBe("trad");
    expect(primaryEvent([], null)).toBeNull();
  });

  it("moves from upcoming to today to married in the venue's timezone", () => {
    expect(celebrationPhase(null)).toBe("planning");
    expect(celebrationPhase(church, Date.parse("2030-06-12T13:59:00Z"))).toBe("upcoming");
    expect(celebrationPhase(church, Date.parse("2030-06-12T23:59:00Z"))).toBe("today");
    expect(celebrationPhase(church, Date.parse("2030-06-13T00:00:00Z"))).toBe("after");
    // In Los Angeles it is still the celebration day at 06:00Z the next morning.
    const la = ev("la", "2030-06-12T21:00:00Z", { timezone: "America/Los_Angeles" });
    expect(celebrationPhase(la, Date.parse("2030-06-13T06:00:00Z"))).toBe("today");
  });

  it("counts the yearly date from the chosen date, else the primary event's local date", () => {
    expect(yearlyDate("2030-06-01", church)).toBe("2030-06-01");
    expect(yearlyDate(null, ev("tokyo", "2030-06-12T20:00:00Z", { timezone: "Asia/Tokyo" }))).toBe("2030-06-13");
    expect(yearlyDate(null, null)).toBeNull();
  });
});

describe("which events a guest may answer", () => {
  const now = Date.parse("2030-06-05T00:00:00Z");

  it("offers upcoming, RSVP-required, public events to anyone with the link", () => {
    expect(answerableEvents(settings, all, { now }).map((e) => e.id)).toEqual(["church"]);
  });

  it("restricts an invitation to exactly its events, including invite-only ones", () => {
    const invited = new Set(["vip"]);
    expect(answerableEvents(settings, all, { now, invitedEventIds: invited }).map((e) => e.id)).toEqual(["vip"]);
    expect(visibleEvents(all, invited).map((e) => e.id).sort()).toEqual(["church", "party", "trad", "vip"]);
    expect(visibleEvents(all).map((e) => e.id)).not.toContain("vip");
  });

  it("closes at the end of the deadline day in the celebration's timezone", () => {
    const withDeadline = { ...settings, rsvpDeadline: "2030-05-20", timezone: "America/New_York" };
    expect(answerableEvents(withDeadline, all, { now: Date.parse("2030-05-21T03:58:00Z") }).map((e) => e.id)).toEqual(["church", "trad"]);
    expect(answerableEvents(withDeadline, all, { now: Date.parse("2030-05-21T04:00:00Z") })).toHaveLength(0);
  });

  it("closes when RSVPs are off", () => {
    expect(answerableEvents({ ...settings, rsvpEnabled: false }, all, { now })).toHaveLength(0);
  });
});
