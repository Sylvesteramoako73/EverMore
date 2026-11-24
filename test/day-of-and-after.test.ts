import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { guestReminder, notification, rsvp, rsvpResponse } from "@/db/schema";
import { createGuest } from "@/server/guests";
import { updateCelebration } from "@/server/celebrations";
import { isDayAfter, sendPostEventEmails } from "@/server/guest-reminders";
import { deliverDue, scheduleDayOfBriefings } from "@/server/reminders";
import { makeCelebration } from "./helpers";

// The default test event is 12 June 2030, 14:00 in Accra.
const THE_DAY = new Date("2030-06-12T07:00:00Z");
const NEXT_MORNING = new Date("2030-06-13T07:00:00Z");
const guestInput = (name: string, email: string) => ({ name, email, phone: "", maxPartySize: 2, notes: "", tableName: "", eventIds: [] });

async function published() {
  const { celebration, eventId, owner } = await makeCelebration();
  await updateCelebration(celebration.id, { status: "published", thankYouMessage: "We are so grateful." } as never);
  return { celebration, eventId: eventId!, owner };
}

describe("host briefing on the day", () => {
  it("is queued once per host with the reply counts, and only on the day", async () => {
    const { celebration, eventId, owner } = await published();
    const a = await createGuest(celebration.id, "free", guestInput("Esi", "e@example.com"));
    await createGuest(celebration.id, "free", guestInput("Kojo", ""));
    const [r] = await db.insert(rsvp).values({ celebrationId: celebration.id, guestId: a, name: "Esi", email: "e@example.com" }).returning();
    await db.insert(rsvpResponse).values({ rsvpId: r.id, eventId, attending: true, partySize: 2 });

    await scheduleDayOfBriefings(new Date("2030-06-10T07:00:00Z"));
    expect(await db.select().from(notification).where(and(eq(notification.celebrationId, celebration.id), eq(notification.kind, "dayof")))).toHaveLength(0);

    await scheduleDayOfBriefings(THE_DAY);
    await scheduleDayOfBriefings(THE_DAY); // rerun does not duplicate
    const rows = await db.select().from(notification).where(and(eq(notification.celebrationId, celebration.id), eq(notification.kind, "dayof")));
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(owner.id);
    expect(rows[0].payload).toMatchObject({ invited: 2, coming: 2, declined: 0, waiting: 1 });
    await deliverDue(THE_DAY);
    expect((await db.select().from(notification).where(eq(notification.id, rows[0].id)))[0].status).toBe("sent");
  });
});

describe("thank you the morning after", () => {
  it("knows the day after in the event's time zone", () => {
    expect(isDayAfter("2030-06-12T14:00", "Africa/Accra", NEXT_MORNING)).toBe(true);
    expect(isDayAfter("2030-06-12T14:00", "Africa/Accra", THE_DAY)).toBe(false);
  });

  it("thanks guests once, skipping those who declined and those without email", async () => {
    const { celebration, eventId } = await published();
    const yes = await createGuest(celebration.id, "free", guestInput("Abena", "abena@example.com"));
    const no = await createGuest(celebration.id, "free", guestInput("Yaw", "yaw@example.com"));
    const none = await createGuest(celebration.id, "free", guestInput("Kojo", ""));
    const [r] = await db.insert(rsvp).values({ celebrationId: celebration.id, guestId: no, name: "Yaw", email: "yaw@example.com" }).returning();
    await db.insert(rsvpResponse).values({ rsvpId: r.id, eventId, attending: false, partySize: 0 });

    await sendPostEventEmails(THE_DAY);
    expect(await db.select().from(guestReminder).where(inArray(guestReminder.guestId, [yes, no, none]))).toHaveLength(0);

    await sendPostEventEmails(NEXT_MORNING);
    await sendPostEventEmails(NEXT_MORNING);
    const rows = await db.select().from(guestReminder).where(inArray(guestReminder.guestId, [yes, no, none]));
    expect(rows.map((x) => [x.guestId, x.daysBefore, x.status])).toEqual([[yes, -1, "sent"]]);
  });

  it("is off when the host switched reminders off", async () => {
    const { celebration } = await published();
    await updateCelebration(celebration.id, { guestRemindersEnabled: false } as never);
    const g = await createGuest(celebration.id, "free", guestInput("Quiet", "q@example.com"));
    await sendPostEventEmails(NEXT_MORNING);
    expect(await db.select().from(guestReminder).where(eq(guestReminder.guestId, g))).toHaveLength(0);
  });
});
