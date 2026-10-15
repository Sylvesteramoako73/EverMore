import { describe, expect, it } from "vitest";
import { contrast, hexToRgb, paletteFromColours } from "./palette";

const rgb = (h: string) => hexToRgb(h)!;
const IVORY = "#FAF7F0";

describe("page palette from the colours of the day", () => {
  it("uses the most colourful swatch as the accent and the darkest for the band", () => {
    const p = paletteFromColours([{ hex: "#FFFFFF" }, { hex: "#0B6E4F" }, { hex: "#1B1B1F" }], IVORY)!;
    expect(p.accent).toBe("#0B6E4F");
    expect(p.band).toBe("#1B1B1F");
    expect(p.bandInk).toBe("#FFFFFF");
  });

  it("handles all-neutral palettes (taupe, mocha, ivory) with a mid-tone accent", () => {
    const p = paletteFromColours([{ hex: "#A09081" }, { hex: "#291811" }, { hex: "#F6F0E4" }], IVORY)!;
    expect(contrast(rgb(p.accent), rgb(IVORY))).toBeGreaterThanOrEqual(3);
    expect(p.band).toBe("#291811");
  });

  it("keeps a too-light accent readable on a light page", () => {
    const p = paletteFromColours([{ hex: "#F7D6E0" }, { hex: "#FFE9A8" }], IVORY)!; // blush and pale yellow
    expect(contrast(rgb(p.accent), rgb(IVORY))).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(p.band), rgb(p.bandInk))).toBeGreaterThanOrEqual(4.5);
  });

  it("works on dark designs too", () => {
    const p = paletteFromColours([{ hex: "#1D4E89" }, { hex: "#C9A227" }], "#0E0E0F")!;
    expect(contrast(rgb(p.accent), rgb("#0E0E0F"))).toBeGreaterThanOrEqual(3);
  });

  it("returns null without usable colours", () => {
    expect(paletteFromColours([], IVORY)).toBeNull();
    expect(paletteFromColours([{ hex: "not a colour" }], IVORY)).toBeNull();
  });
});
