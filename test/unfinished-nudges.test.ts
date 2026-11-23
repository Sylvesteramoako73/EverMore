import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { celebration, notification } from "@/db/schema";
import { emails } from "@/lib/email/templates";
import { deliverDue, notificationsFor, scheduleUnfinishedNudges } from "@/server/reminders";
import { makeCelebration } from "./helpers";

const HOUR = 3_600_000;
const T0 = new Date("2031-06-01T09:00:00Z");

async function draftLastTouched(at: Date, step = 2) {
  const { celebration: c, owner } = await makeCelebration();
  await db.update(celebration).set({ updatedAt: at, createdAt: at, onboardingStep: step }).where(eq(celebration.id, c.id));
  return { c, owner };
}
const unfinished = async (id: string) => (await notificationsFor([id])).filter((n) => n.kind === "unfinished");

describe("unfinished page nudges", () => {
  it("waits a day, then nudges once, and never twice for the same stage", async () => {
    const { c } = await draftLastTouched(T0);
    await scheduleUnfinishedNudges(new Date(T0.getTime() + 12 * HOUR));
    expect(await unfinished(c.id)).toHaveLength(0);

    await scheduleUnfinishedNudges(new Date(T0.getTime() + 25 * HOUR));
    await scheduleUnfinishedNudges(new Date(T0.getTime() + 26 * HOUR)); // too soon for stage 2, and no duplicate
    const rows = await unfinished(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({ stage: 1, step: 2 });
  });

  it("spaces out three emails and then stops for good", async () => {
    const { c } = await draftLastTouched(T0);
    let now = new Date(T0.getTime() + 25 * HOUR);
    await scheduleUnfinishedNudges(now);
    now = new Date(now.getTime() + 73 * HOUR); // 3 days later
    await scheduleUnfinishedNudges(now);
    now = new Date(now.getTime() + 145 * HOUR); // 6 days later
    await scheduleUnfinishedNudges(now);
    expect((await unfinished(c.id)).map((n) => (n.payload as { stage: number }).stage).sort()).toEqual([1, 2, 3]);
    await scheduleUnfinishedNudges(new Date(now.getTime() + 400 * HOUR));
    expect(await unfinished(c.id)).toHaveLength(3);
  });

  it("leaves published pages alone and drops a queued nudge once the page goes live", async () => {
    const live = await draftLastTouched(T0);
    await db.update(celebration).set({ status: "published" }).where(eq(celebration.id, live.c.id));
    const queuedThenLive = await draftLastTouched(T0);
    const now = new Date(T0.getTime() + 30 * HOUR);
    await scheduleUnfinishedNudges(now);
    expect(await unfinished(live.c.id)).toHaveLength(0);
    expect(await unfinished(queuedThenLive.c.id)).toHaveLength(1);

    await db.update(celebration).set({ status: "published" }).where(eq(celebration.id, queuedThenLive.c.id));
    await deliverDue(now, 500);
    const [row] = await db.select().from(notification).where(eq(notification.celebrationId, queuedThenLive.c.id));
    expect(row.status).toBe("skipped");
  });

  it("sends the email for a page still in draft", async () => {
    const { c } = await draftLastTouched(T0);
    const now = new Date(T0.getTime() + 30 * HOUR);
    await scheduleUnfinishedNudges(now);
    await deliverDue(now, 500);
    const [row] = await unfinished(c.id);
    expect(row.status).toBe("sent");
  });

  it("does not nudge pages abandoned for more than 45 days", async () => {
    const { c } = await draftLastTouched(new Date(T0.getTime() - 50 * 24 * HOUR));
    await scheduleUnfinishedNudges(T0);
    expect(await unfinished(c.id)).toHaveLength(0);
  });
});

describe("unfinished page email", () => {
  const base = { stage: 1 as const, name: "Ama Mensah", title: "Ama & Kofi", kind: "wedding", stepsDone: 2, nextStep: "The programme and venues", readyToPublish: false, aiTip: true };

  it("says where the host is and what is next, with no dashes or exclamation marks", () => {
    for (const stage of [1, 2, 3] as const) {
      const m = emails.unfinishedPage("a@b.c", { ...base, stage }, "https://x.test/onboarding");
      expect(m.text).toContain("Ama");
      expect(m.text).not.toMatch(/[!—–]| - /);
      expect(m.subject).not.toMatch(/[!—–]/);
    }
    expect(emails.unfinishedPage("a@b.c", base, "u").text).toContain("2 of 6 steps");
    expect(emails.unfinishedPage("a@b.c", base, "u").text).toContain("one sentence");
  });

  it("changes the message when only publishing is left, and when it is the last email", () => {
    const ready = emails.unfinishedPage("a@b.c", { ...base, stepsDone: 5, readyToPublish: true }, "u");
    expect(ready.text).toContain("only needs publishing");
    expect(ready.text).toContain("GHS 69");
    expect(ready.text).not.toContain("one sentence");
    expect(emails.unfinishedPage("a@b.c", { ...base, stage: 3 }, "u").text).toContain("last time");
  });
});
