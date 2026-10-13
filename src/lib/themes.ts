// Wedding themes. Each is a full design: palette, type pairing, hero layout, heading style and ornament.
// One renderer (src/components/wedding) reads these settings for every couple; no per-couple code.

export type HeroLayout = "framed" | "split" | "arch" | "editorial" | "bordered" | "pattern";
export type HeadingStyle = "centered-flourish" | "minimal-caps" | "script-centered" | "editorial-left" | "ornate" | "band";
export type Ornament = "fine-lines" | "none" | "botanical" | "rule" | "filigree" | "geometric";
export type FontKey = "cormorant" | "bodoni" | "playfair" | "marcellus" | "fraunces" | "dmSans" | "jost" | "manrope";

export type Theme = {
  id: string;
  name: string;
  tagline: string;
  premium: boolean;
  colors: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentInk: string;
    line: string;
    heroOverlay: string;
  };
  fonts: { display: FontKey; body: FontKey; displayWeight: number; displayItalicAmp: boolean };
  hero: HeroLayout;
  heading: HeadingStyle;
  ornament: Ornament;
  radius: string;
  schedule: "timeline" | "cards";
};

export const THEMES: Theme[] = [
  {
    id: "timeless-elegance",
    name: "Timeless Elegance",
    tagline: "Ivory, navy and champagne gold with classic serif type.",
    premium: false,
    colors: {
      bg: "#FAF7F0", surface: "#FFFFFF", ink: "#101C35", muted: "#5E6272", accent: "#B88A3E", accentInk: "#FFFFFF",
      line: "#E6DFD0", heroOverlay: "linear-gradient(180deg, rgba(16,28,53,.35), rgba(16,28,53,.15) 45%, rgba(16,28,53,.6))",
    },
    fonts: { display: "cormorant", body: "jost", displayWeight: 400, displayItalicAmp: true },
    hero: "framed",
    heading: "centered-flourish",
    ornament: "fine-lines",
    radius: "4px",
    schedule: "timeline",
  },
  {
    id: "modern-minimalist",
    name: "Modern Minimalist",
    tagline: "Crisp white space, monochrome type and a split-screen hero.",
    premium: false,
    colors: {
      bg: "#FFFFFF", surface: "#F6F6F4", ink: "#151515", muted: "#6B6B6B", accent: "#151515", accentInk: "#FFFFFF",
      line: "#E4E4E1", heroOverlay: "none",
    },
    fonts: { display: "dmSans", body: "dmSans", displayWeight: 300, displayItalicAmp: false },
    hero: "split",
    heading: "minimal-caps",
    ornament: "none",
    radius: "0px",
    schedule: "cards",
  },
  {
    id: "romantic-garden",
    name: "Romantic Garden",
    tagline: "Blush and sage, flowing italics and botanical details.",
    premium: false,
    colors: {
      bg: "#FBF5F2", surface: "#FFFFFF", ink: "#3B2F2C", muted: "#7D6D67", accent: "#8A9B7A", accentInk: "#FFFFFF",
      line: "#EADCD5", heroOverlay: "none",
    },
    fonts: { display: "playfair", body: "manrope", displayWeight: 400, displayItalicAmp: true },
    hero: "arch",
    heading: "script-centered",
    ornament: "botanical",
    radius: "18px",
    schedule: "timeline",
  },
  {
    id: "luxury-editorial",
    name: "Luxury Editorial",
    tagline: "Magazine-style layouts, oversized Didone type, black and champagne.",
    premium: true,
    colors: {
      bg: "#0E0E0F", surface: "#18181A", ink: "#F3EEE4", muted: "#A39E94", accent: "#D4B47C", accentInk: "#0E0E0F",
      line: "#2C2B2A", heroOverlay: "linear-gradient(90deg, rgba(14,14,15,.85) 0%, rgba(14,14,15,.35) 55%, rgba(14,14,15,.1) 100%)",
    },
    fonts: { display: "bodoni", body: "manrope", displayWeight: 400, displayItalicAmp: true },
    hero: "editorial",
    heading: "editorial-left",
    ornament: "rule",
    radius: "0px",
    schedule: "cards",
  },
  {
    id: "traditional-celebration",
    name: "Traditional Celebration",
    tagline: "Rich burgundy and gold, framed borders and stately capitals.",
    premium: true,
    colors: {
      bg: "#FBF6EE", surface: "#FFFDF8", ink: "#3A1420", muted: "#7A5B60", accent: "#A8812F", accentInk: "#FFFFFF",
      line: "#E7D7BE", heroOverlay: "linear-gradient(180deg, rgba(58,20,32,.45), rgba(58,20,32,.25) 50%, rgba(58,20,32,.7))",
    },
    fonts: { display: "marcellus", body: "jost", displayWeight: 400, displayItalicAmp: false },
    hero: "bordered",
    heading: "ornate",
    ornament: "filigree",
    radius: "6px",
    schedule: "timeline",
  },
  {
    id: "contemporary-african-romance",
    name: "Contemporary African Romance",
    tagline: "Terracotta, ochre and forest green with woven geometric bands.",
    premium: true,
    colors: {
      bg: "#F7EFE4", surface: "#FFF9F1", ink: "#2B2118", muted: "#6E5A48", accent: "#B4532A", accentInk: "#FFFFFF",
      line: "#E5D3BD", heroOverlay: "none",
    },
    fonts: { display: "fraunces", body: "dmSans", displayWeight: 500, displayItalicAmp: true },
    hero: "pattern",
    heading: "band",
    ornament: "geometric",
    radius: "14px",
    schedule: "cards",
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
