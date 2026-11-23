import { inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { guestReminder, rsvp, rsvpResponse } from "@/db/schema";
import { createGuest } from "@/server/guests";
import { updateCelebration } from "@/server/celebrations";
import { directionsUrl, reminderDayFor, sendGuestReminders } from "@/server/guest-reminders";
import { makeCelebration } from "./helpers";

// The default test event is 12 June 2030, 14:00 in Accra.
const THREE_DAYS = new Date("2030-06-09T07:00:00Z");
const THE_DAY = new Date("2030-06-12T07:00:00Z");
const guestInput = (name: string, email: string) => ({ name, email, phone: "0244000000", maxPartySize: 2, notes: "", tableName: "", eventIds: [] });

async function setup(enabled = true) {
  const { celebration, eventId } = await makeCelebration();
  await updateCelebration(celebration.id, { status: "published", guestRemindersEnabled: enabled } as never);
  return { celebration, eventId: eventId! };
}
const rows = (guestIds: string[]) => db.select().from(guestReminder).where(inArray(guestReminder.guestId, guestIds));

describe("which day a reminder is due", () => {
  it("is 3 days before, on the day, and otherwise none", () => {
    expect(reminderDayFor("2030-06-12T14:00", "Africa/Accra", THREE_DAYS)).toBe(3);
    expect(reminderDayFor("2030-06-12T14:00", "Africa/Accra", THE_DAY)).toBe(0);
    expect(reminderDayFor("2030-06-12T14:00", "Africa/Accra", new Date("2030-06-10T07:00:00Z"))).toBeNull();
    expect(reminderDayFor("2030-06-12T14:00", "Africa/Accra", new Date("2030-06-13T07:00:00Z"))).toBeNull();
  });
  it("builds a directions link from coordinates or the venue", () => {
    expect(directionsUrl("Holy Trinity", "Takoradi")).toContain("destination=Holy%20Trinity%2C%20Takoradi");
    expect(directionsUrl("x", "y", 4.9, -1.7)).toContain("destination=4.9%2C-1.7");
  });
});

describe("automatic guest reminders", () => {
  it("emails guests 3 days before and on the day, once each", async () => {
    const { celebration } = await setup();
    const g = await createGuest(celebration.id, "free", guestInput("Esi Owusu", "esi@example.com"));
    await sendGuestReminders(THREE_DAYS);
    await sendGuestReminders(THREE_DAYS); // a rerun never doubles up
    expect((await rows([g])).map((r) => [r.daysBefore, r.status])).toEqual([[3, "sent"]]);
    await sendGuestReminders(THE_DAY);
    expect((await rows([g])).map((r) => r.daysBefore).sort()).toEqual([0, 3]);
  });

  it("skips guests with no email, guests who declined, and pages with reminders switched off", async () => {
    const { celebration, eventId } = await setup();
    const noEmail = await createGuest(celebration.id, "free", guestInput("Kojo Mensah", ""));
    const declined = await createGuest(celebration.id, "free", guestInput("Yaw Boateng", "yaw@example.com"));
    const coming = await createGuest(celebration.id, "free", guestInput("Abena Asare", "abena@example.com"));
    const [r] = await db.insert(rsvp).values({ celebrationId: celebration.id, guestId: declined, name: "Yaw", email: "yaw@example.com" }).returning();
    await db.insert(rsvpResponse).values({ rsvpId: r.id, eventId, attending: false, partySize: 0 });
    await sendGuestReminders(THREE_DAYS);
    expect((await rows([noEmail, declined, coming])).map((x) => x.guestId)).toEqual([coming]);

    const off = await setup(false);
    const quiet = await createGuest(off.celebration.id, "free", guestInput("Esi Quiet", "quiet@example.com"));
    await sendGuestReminders(THREE_DAYS);
    expect(await rows([quiet])).toHaveLength(0);
  });

  it("leaves out draft pages and events that already started", async () => {
    const draft = await makeCelebration();
    const g = await createGuest(draft.celebration.id, "free", guestInput("Draft Guest", "d@example.com"));
    await sendGuestReminders(THREE_DAYS);
    expect(await rows([g])).toHaveLength(0);

    const { celebration } = await setup();
    const late = await createGuest(celebration.id, "free", guestInput("Late Guest", "late@example.com"));
    await sendGuestReminders(new Date("2030-06-12T16:00:00Z"));
    expect(await rows([late])).toHaveLength(0);
  });
});
