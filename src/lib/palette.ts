/**
 * Turn a host's "colours of the day" into a page palette: accent, dark band, soft tint and lines.
 * Contrast is checked so text stays readable whatever colours are chosen.
 */

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: RGB) {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** HSL saturation, 0–1: how colourful (vs grey) a colour is. */
function saturation([r, g, b]: RGB) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

/** Darken or lighten towards black/white until the colour reaches `ratio` contrast against `against`. */
function ensureContrast(c: RGB, against: RGB, ratio: number): RGB {
  if (contrast(c, against) >= ratio) return c;
  const towards = luminance(against) > 0.4 ? BLACK : WHITE;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const next = mix(c, towards, t);
    if (contrast(next, against) >= ratio) return next;
  }
  return towards;
}

export type PagePalette = {
  accent: string;
  accentInk: string;
  accent2: string;
  band: string;
  bandInk: string;
  tint: string;
  line: string;
};

/**
 * The page palette from the chosen colours, on the design's background `bg`.
 * - accent: the most colourful swatch (or the mid-tone one, for all-neutral palettes like taupe/mocha/ivory),
 *   adjusted to stay readable as text on the background;
 * - band: the darkest swatch (or a deep shade of the accent) for the date and countdown bands;
 * - tint: a whisper of the lightest/accent colour over the background for alternate sections.
 * Returns null when there aren't any usable colours.
 */
export function paletteFromColours(colours: { hex: string }[], bg: string): PagePalette | null {
  const swatches = colours.map((c) => hexToRgb(c.hex)).filter((x): x is RGB => Boolean(x));
  const base = hexToRgb(bg);
  if (!swatches.length || !base) return null;
  const darkPage = luminance(base) < 0.2;

  const byLum = [...swatches].sort((a, b) => luminance(a) - luminance(b));
  const usable = swatches.filter((c) => luminance(c) > 0.02 && luminance(c) < 0.85);
  const vivid = [...(usable.length ? usable : swatches)].sort((a, b) => saturation(b) - saturation(a));
  const chosen = saturation(vivid[0]) > 0.18 ? vivid[0] : byLum[Math.floor(byLum.length / 2)];

  const accent = ensureContrast(chosen, base, 3);
  const accentInk = contrast(accent, WHITE) >= contrast(accent, BLACK) ? WHITE : BLACK;
  const second = vivid.find((c) => c !== chosen) ?? mix(chosen, darkPage ? BLACK : WHITE, 0.35);

  const darkest = byLum[0];
  const band = darkPage ? mix(darkest, BLACK, 0.4) : luminance(darkest) < 0.06 ? darkest : mix(chosen, BLACK, 0.72);
  const bandInk = contrast(band, WHITE) >= 4.5 ? WHITE : BLACK;

  const lightest = byLum[byLum.length - 1];
  const tint = darkPage ? mix(base, chosen, 0.08) : mix(base, luminance(lightest) > 0.6 ? lightest : chosen, luminance(lightest) > 0.6 ? 0.55 : 0.08);
  const line = mix(base, accent, darkPage ? 0.3 : 0.22);

  return {
    accent: rgbToHex(accent),
    accentInk: rgbToHex(accentInk),
    accent2: rgbToHex(second),
    band: rgbToHex(band),
    bandInk: rgbToHex(bandInk),
    tint: rgbToHex(tint),
    line: rgbToHex(line),
  };
}
