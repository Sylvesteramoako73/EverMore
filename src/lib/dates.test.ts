import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDuration,
  describeDuration,
  nextAnniversary,
  plainDateInZone,
  zonedLocalToUtc,
} from "./dates";

describe("timezones", () => {
  it("converts venue wall-clock time to UTC, including across DST", () => {
    expect(zonedLocalToUtc("2027-06-12T14:00", "Africa/Accra").toISOString()).toBe("2027-06-12T14:00:00.000Z");
    expect(zonedLocalToUtc("2027-06-12T14:00", "Europe/London").toISOString()).toBe("2027-06-12T13:00:00.000Z");
    expect(zonedLocalToUtc("2027-01-12T14:00", "Europe/London").toISOString()).toBe("2027-01-12T14:00:00.000Z");
  });

  it("finds the calendar date in a timezone", () => {
    const instant = new Date("2027-06-12T23:30:00Z");
    expect(plainDateInZone(instant, "Africa/Accra")).toBe("2027-06-12");
    expect(plainDateInZone(instant, "Asia/Tokyo")).toBe("2027-06-13");
  });
});

describe("marriage duration", () => {
  it("counts years, months and days by calendar", () => {
    expect(calendarDuration("2025-06-12", "2026-10-24")).toMatchObject({ years: 1, months: 4, days: 12 });
    expect(describeDuration(calendarDuration("2025-06-12", "2026-10-24"))).toBe("1 year, 4 months and 12 days");
  });

  it("handles month-end celebrations", () => {
    // The 31st falls back to the last day of shorter months, so Jan 31 -> Feb 28 is one month.
    expect(calendarDuration("2025-01-31", "2025-02-28")).toMatchObject({ years: 0, months: 1, days: 0 });
    expect(calendarDuration("2025-01-31", "2025-02-27")).toMatchObject({ years: 0, months: 0, days: 27 });
    expect(calendarDuration("2025-01-31", "2025-03-01")).toMatchObject({ years: 0, months: 1, days: 1 });
    expect(calendarDuration("2025-01-31", "2025-03-31")).toMatchObject({ years: 0, months: 2, days: 0 });
  });

  it("handles leap days", () => {
    expect(calendarDuration("2024-02-29", "2025-02-28")).toMatchObject({ years: 1, months: 0, days: 0 });
    expect(calendarDuration("2024-02-29", "2028-02-29")).toMatchObject({ years: 4, months: 0, days: 0 });
    expect(calendarDuration("2024-02-01", "2024-03-01").totalDays).toBe(29);
  });

  it("is zero on the celebration day and before it", () => {
    expect(describeDuration(calendarDuration("2026-06-12", "2026-06-12"))).toBe("0 days");
    expect(calendarDuration("2026-06-12", "2026-06-01")).toMatchObject({ years: 0, months: 0, days: 0 });
  });
});

describe("anniversaries", () => {
  it("finds the next anniversary, including today", () => {
    expect(nextAnniversary("2025-06-12", "2026-01-01")).toEqual({ date: "2026-06-12", years: 1 });
    expect(nextAnniversary("2025-06-12", "2026-06-12")).toEqual({ date: "2026-06-12", years: 1 });
    expect(nextAnniversary("2025-06-12", "2026-06-13")).toEqual({ date: "2027-06-12", years: 2 });
  });

  it("never returns the celebration day itself as an anniversary", () => {
    expect(nextAnniversary("2026-06-12", "2026-06-01")).toEqual({ date: "2027-06-12", years: 1 });
  });

  it("celebrates 29 February celebrations on 28 February in common years", () => {
    expect(nextAnniversary("2024-02-29", "2025-01-10")).toEqual({ date: "2025-02-28", years: 1 });
    expect(nextAnniversary("2024-02-29", "2028-02-01")).toEqual({ date: "2028-02-29", years: 4 });
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
