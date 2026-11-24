import { describe, expect, it } from "vitest";
import { OCCASION_KINDS } from "@/lib/occasions";
import { renderMessage, type MessageLang, type MessageStyle, type MessageType } from "./message-templates";

const styles: MessageStyle[] = ["classic", "warm", "brief"];
const langs: MessageLang[] = ["en", "tw"];
const types: MessageType[] = ["invite", "reply", "event3", "eventToday"];

describe("message templates", () => {
  for (const kind of OCCASION_KINDS) for (const lang of langs) for (const style of styles) for (const type of types) {
    it(`${kind} ${lang} ${style} ${type}`, () => {
      const t = renderMessage(type, { kind, guest: "Auntie Esi", title: "Ama & Kofi", link: "https://x.test/i/abc", deadline: "30 May", event: "the ceremony", when: "Saturday 19 June, 11:00" }, style, lang);
      expect(t).toContain("Esi");
      expect(t).toContain("https://x.test/i/abc");
      expect(t).not.toMatch(/!|undefined|\{|\}|\s[-–—]\s|—|–/);
    });
  }
  it("differs across styles", () => {
    const v = { kind: "wedding" as const, guest: "Esi", title: "Ama & Kofi", link: "l" };
    expect(new Set(styles.map((s) => renderMessage("invite", v, s))).size).toBe(3);
  });
  it("does not repeat the occasion when the title names it", () => {
    expect(renderMessage("invite", { kind: "birthday", guest: "Esi", title: "Ama's 40th Birthday", link: "l" })).toContain("Ama's 40th Birthday");
  });
});
