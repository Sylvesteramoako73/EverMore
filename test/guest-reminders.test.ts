import { describe, expect, it } from "vitest";
import { whatsappReminder } from "@/app/dashboard/data";
import { createGuest, listGuests, markGuestReminded } from "@/server/guests";
import { makeCelebration } from "./helpers";

describe("guest reminders", () => {
  it("counts each reminder and remembers when the last one was", async () => {
    const { celebration } = await makeCelebration();
    const { celebration: other } = await makeCelebration();
    const id = await createGuest(celebration.id, "free", { name: "Esi Owusu", email: "", phone: "0244000000", maxPartySize: 2, notes: "", tableName: "", eventIds: [] });
    const first = new Date("2030-01-05T10:00:00Z");
    expect(await markGuestReminded(celebration.id, id, first)).toBe(true);
    expect(await markGuestReminded(celebration.id, id, new Date("2030-01-09T10:00:00Z"))).toBe(true);
    const row = (await listGuests(celebration.id)).find((x) => x.id === id)!;
    expect(row.reminderCount).toBe(2);
    expect(row.remindedAt?.toISOString()).toBe("2030-01-09T10:00:00.000Z");
    // A host can never mark a guest that belongs to another page.
    expect(await markGuestReminded(other.id, id)).toBe(false);
  });

  it("mentions the deadline only when there is one, and stays gentle for remembrance", () => {
    const plain = decodeURIComponent(whatsappReminder({ phone: "0244000000", name: "Esi", title: "Our wedding", link: "https://x.test/i/1" }));
    expect(plain).not.toContain("by ");
    const dated = decodeURIComponent(whatsappReminder({ phone: "0244000000", name: "Esi", title: "Our wedding", link: "https://x.test/i/1", deadline: "10 March" }));
    expect(dated).toContain("by 10 March");
    const sad = decodeURIComponent(whatsappReminder({ phone: "0244000000", name: "Esi", title: "Life of Kofi", link: "https://x.test/i/1", remembrance: true }));
    expect(sad).toContain("Dear Esi");
    expect(sad).not.toContain("join us");
  });
});
