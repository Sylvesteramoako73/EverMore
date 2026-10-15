import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { updateCelebration } from "@/server/celebrations";
import { deliverDue, saveReminderPreference, scheduleReminders } from "@/server/reminders";
import { makeCelebration } from "./helpers";

// 10:00 in Accra (UTC+0) on 14 June 2031.
const NOW = new Date("2031-06-14T10:00:00Z");

async function published(kind: string, keyDate: string, days = [0]) {
  const { celebration, owner } = await makeCelebration({ kind, partnerOne: kind === "funeral" ? "Esther Owusu" : "Ama Mensah", title: kind === "outing" ? "Akosombo Getaway" : "" });
  await updateCelebration(celebration.id, { keyDate, status: "published" } as never);
  await saveReminderPreference(celebration.id, owner.id, { emailEnabled: true, remindDaysBefore: days, includeMemoryPrompt: true });
  return { celebration, owner };
}

const mine = (celebrationId: string) => db.select().from(notification).where(eq(notification.celebrationId, celebrationId));

describe("yearly reminders", () => {
  it("queues a wedding anniversary on the day, once, with the right number of years", async () => {
    const { celebration } = await published("wedding", "2026-06-14");
    expect(await scheduleReminders(NOW)).toBeGreaterThanOrEqual(1);
    await scheduleReminders(NOW); // running twice must not duplicate
    const rows = await mine(celebration.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("anniversary");
    expect(rows[0].payload).toMatchObject({ years: 5, daysBefore: 0 });
  });

  it("queues a remembrance reminder a week ahead, and nothing on other days", async () => {
    const { celebration } = await published("funeral", "2028-06-21", [7]);
    await scheduleReminders(NOW);
    const rows = await mine(celebration.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("memorial");
    expect(rows[0].payload).toMatchObject({ years: 3, daysBefore: 7 });

    const other = await published("funeral", "2028-07-30", [0, 7]);
    await scheduleReminders(NOW);
    expect(await mine(other.celebration.id)).toHaveLength(0);
  });

  it("skips the first year (the day itself hasn't come round yet) and occasions without reminders", async () => {
    const future = await published("wedding", "2031-06-14");
    const trip = await published("outing", "2026-06-14");
    await scheduleReminders(NOW);
    expect(await mine(future.celebration.id)).toHaveLength(0);
    expect(await mine(trip.celebration.id)).toHaveLength(0);
  });

  it("counts from the main event's day when no yearly date was chosen", async () => {
    // makeCelebration adds an event on 12 June 2030 in Accra.
    const { celebration, owner } = await makeCelebration({ kind: "wedding" });
    await updateCelebration(celebration.id, { status: "published" } as never);
    await saveReminderPreference(celebration.id, owner.id, { emailEnabled: true, remindDaysBefore: [0], includeMemoryPrompt: true });
    await scheduleReminders(new Date("2031-06-12T08:00:00Z"));
    const rows = await mine(celebration.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({ years: 1 });
  });

  it("delivers queued reminders and marks them sent", async () => {
    const { celebration } = await published("birthday", "1981-06-14");
    await scheduleReminders(NOW);
    await deliverDue(NOW, 500);
    const [row] = await mine(celebration.id);
    expect(row.status).toBe("sent");
    expect(row.payload).toMatchObject({ years: 50 });
  });
});
