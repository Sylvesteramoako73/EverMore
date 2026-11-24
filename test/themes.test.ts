import { describe, expect, it } from "vitest";
import { OCCASION_KINDS, OCCASIONS } from "@/lib/occasions";
import { THEMES, themesFor } from "@/lib/themes";

describe("themes", () => {
  it("has unique ids", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });
  it("gives every occasion at least six themes, including for funerals and openings", () => {
    for (const k of OCCASION_KINDS) expect(themesFor(k, OCCASIONS[k].recommendedThemes).length).toBeGreaterThanOrEqual(6);
  });
  it("recommends only themes that exist and suit the occasion", () => {
    for (const k of OCCASION_KINDS) for (const id of OCCASIONS[k].recommendedThemes) {
      const t = THEMES.find((x) => x.id === id);
      expect(t, `${k}: ${id}`).toBeTruthy();
      expect(t!.suitedFor, `${k}: ${id}`).toContain(k);
    }
  });
  it("keeps the joyful themes away from funerals", () => {
    for (const id of ["confetti", "golden-hour", "grand-opening", "midnight-gala", "retro-soiree", "kente-heritage", "rose-gold-noir", "ivory-rose"]) expect(THEMES.find((t) => t.id === id)!.suitedFor).not.toContain("funeral");
  });
});
