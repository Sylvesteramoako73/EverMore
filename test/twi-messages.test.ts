import { describe, expect, it } from "vitest";
import { parseLang, whatsappEventReminder, whatsappInvite, whatsappReminder } from "@/app/dashboard/data";

const text = (href: string) => decodeURIComponent(href.split("?text=")[1]);
const base = { phone: "0244000000", name: "Esi", title: "Ama and Kofi's wedding", kind: "wedding" as const, link: "https://x.test/i/1" };

describe("message language", () => {
  it("defaults to English and only accepts tw as Twi", () => {
    expect(parseLang(undefined)).toBe("en");
    expect(parseLang("fr")).toBe("en");
    expect(parseLang("tw")).toBe("tw");
  });
  it("writes the invitation, reminder and event reminder in Twi, keeping names, links and deadline", () => {
    const invite = text(whatsappInvite({ ...base, remembrance: false, lang: "tw" }));
    expect(invite).toContain("yɛfrɛ wo");
    expect(invite).toContain(base.link);
    const reminder = text(whatsappReminder({ ...base, deadline: "30 November", lang: "tw" }));
    expect(reminder).toContain("30 November");
    expect(reminder).toContain("Esi");
    const today = text(whatsappEventReminder({ ...base, eventName: "Reception", when: "Saturday, 2pm", days: 0, remembrance: false, lang: "tw" }));
    expect(today).toContain("ɛnnɛ");
    expect(today).toContain("Saturday, 2pm");
    const gentle = text(whatsappInvite({ ...base, remembrance: true, lang: "tw" }));
    expect(gentle).toContain("Nua Esi");
    expect(gentle).not.toContain("!");
  });
  it("keeps English unchanged", () => {
    expect(text(whatsappInvite({ ...base, remembrance: false }))).toContain("we invite you to");
  });
});
