import { describe, expect, it } from "vitest";
import { OCCASION_KINDS } from "@/lib/occasions";
import { shareMessage, whatsappLink } from "@/lib/share-message";

describe("shareMessage", () => {
  const base = { title: "Ama & Kofi", when: "Saturday 12 December 2027 at 10:00 GMT", where: "Holy Trinity", url: "https://app.evermoregh.online/ama-and-kofi" };

  it("has a message for every occasion with the title, the details and the link, and no dashes or exclamation marks", () => {
    for (const kind of OCCASION_KINDS) {
      const text = shareMessage({ kind, ...base });
      expect(text).toContain(base.title);
      expect(text).toContain(base.when);
      expect(text).toContain(base.where);
      expect(text.trim().endsWith(base.url)).toBe(true);
      expect(text).not.toMatch(/[!—–]| - /);
    }
  });

  it("leaves out the date and place lines when there is no event yet", () => {
    const text = shareMessage({ kind: "birthday", title: "Ama's Birthday", url: base.url });
    expect(text.split("\n")).not.toContain("null");
    expect(text).not.toContain("undefined");
    expect(text.split("\n").filter(Boolean)).toHaveLength(4);
  });

  it("is gentle for a celebration of life", () => {
    const text = shareMessage({ kind: "funeral", ...base });
    expect(text).toContain("order of service");
    expect(text).not.toMatch(/celebrate with us|let us know you are coming/);
  });

  it("builds a WhatsApp link that keeps line breaks and the address intact", () => {
    const link = whatsappLink(shareMessage({ kind: "wedding", ...base }));
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(link.slice("https://wa.me/?text=".length))).toContain(`\n${base.url}`);
  });
});
