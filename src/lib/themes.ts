import type { OccasionKind } from "./occasions";

// Celebration themes. Each is a full design: palette, type pairing, hero layout, heading style,
// photo treatment and ornament. One renderer (src/components/site) reads these for every page.

export type HeroLayout = "cinematic" | "framed" | "split" | "arch" | "editorial" | "bordered" | "pattern" | "collage" | "oval";
export type HeadingStyle = "centered-flourish" | "minimal-caps" | "script-centered" | "editorial-left" | "ornate" | "band" | "classic";
export type Ornament = "fine-lines" | "none" | "botanical" | "rule" | "filigree" | "geometric" | "confetti" | "dove";
export type FontKey =
  | "cormorant" | "bodoni" | "playfair" | "marcellus" | "fraunces" | "newsreader"
  | "dmSans" | "jost" | "manrope" | "instrumentSans";

/** How each section is laid out. Mixing these is what makes themes feel genuinely different. */
export type Layout = {
  story: "split" | "centered" | "magazine" | "overlap";
  schedule: "zigzag" | "list" | "cards" | "ticket" | "agenda";
  venues: "cards" | "split" | "minimal";
  gallery: "grid" | "masonry" | "polaroid" | "filmstrip" | "editorial";
  countdown: "band" | "big" | "circles";
  divider: "none" | "wave" | "zigzag" | "curve";
  texture: "none" | "paper" | "dots" | "topo" | "confetti" | "kente";
  card: "soft" | "outline" | "flat" | "offset";
  /** Put a few sections on the accent colour for a bolder, more graphic page. */
  pop: boolean;
};

/**
 * The page structure. Each design arranges the same content its own way: chapters, a stationery
 * suite, a split screen, a bento board, a booklet, an itinerary, a storybook, an index, a classic
 * scroll, a magazine, a royal programme, or colour bands.
 */
export type Frame =
  | "classic" | "chapters" | "suite" | "split" | "bento" | "booklet"
  | "itinerary" | "storybook" | "index" | "magazine" | "royal" | "bands";

export type Theme = {
  id: string;
  frame: Frame;
  name: string;
  tagline: string;
  premium: boolean;
  suitedFor: OccasionKind[];
  colors: {
    bg: string;
    /** Alternate section background. */
    tint: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentInk: string;
    line: string;
    /** Dark band behind the save-the-date and countdown. */
    band: string;
    bandInk: string;
    heroOverlay: string;
  };
  fonts: { display: FontKey; body: FontKey; displayWeight: number; displayItalicAmp: boolean };
  hero: HeroLayout;
  heading: HeadingStyle;
  ornament: Ornament;
  /** Photo treatment in galleries and cards. */
  photo: "rounded" | "square" | "polaroid";
  radius: string;
  layout: Layout;
  /** Second accent for playful themes (badges, confetti, highlights). */
  accent2: string;
};

const ALL: OccasionKind[] = ["wedding", "birthday", "funeral", "outing", "naming", "anniversary", "graduation", "reunion", "shower", "other"];
const JOYFUL: OccasionKind[] = ALL.filter((k) => k !== "funeral");

export const THEMES: Theme[] = [
  {
    id: "earth-and-ivory",
    frame: "chapters",
    name: "Earth & Ivory",
    tagline: "Told in chapters: full-bleed photo breaks between each part of your story. Mocha and ivory.",
    premium: false,
    suitedFor: ALL,
    colors: {
      bg: "#FFFFFF", tint: "#F7F3EE", surface: "#FFFFFF", ink: "#2A1B13", muted: "#6B5B4E", accent: "#7A4A2E", accentInk: "#FFFFFF",
      line: "#E7DED3", band: "#291811", bandInk: "#F6EEE1",
      heroOverlay: "linear-gradient(90deg, rgba(20,12,8,.72) 0%, rgba(20,12,8,.35) 55%, rgba(20,12,8,.15) 100%)",
    },
    fonts: { display: "newsreader", body: "instrumentSans", displayWeight: 400, displayItalicAmp: false },
    hero: "cinematic",
    heading: "classic",
    ornament: "none",
    photo: "rounded",
    radius: "14px",
    layout: { story: "split", schedule: "zigzag", venues: "cards", gallery: "grid", countdown: "band", divider: "none", texture: "none", card: "soft", pop: false },
    accent2: "#C9A98A",
  },
  {
    id: "timeless-elegance",
    frame: "suite",
    name: "Timeless Elegance",
    tagline: "An invitation suite: every section a paper card on linen, sealed with your monogram.",
    premium: false,
    suitedFor: ["wedding", "anniversary", "funeral", "graduation", "other"],
    colors: {
      bg: "#FAF7F0", tint: "#F3EEE3", surface: "#FFFFFF", ink: "#101C35", muted: "#5E6272", accent: "#9A7432", accentInk: "#FFFFFF",
      line: "#E6DFD0", band: "#101C35", bandInk: "#FAF7F0",
      heroOverlay: "linear-gradient(180deg, rgba(16,28,53,.35), rgba(16,28,53,.15) 45%, rgba(16,28,53,.6))",
    },
    fonts: { display: "cormorant", body: "jost", displayWeight: 400, displayItalicAmp: true },
    hero: "framed",
    heading: "centered-flourish",
    ornament: "fine-lines",
    photo: "square",
    radius: "4px",
    layout: { story: "centered", schedule: "list", venues: "minimal", gallery: "masonry", countdown: "band", divider: "none", texture: "paper", card: "outline", pop: false },
    accent2: "#C69A4A",
  },
  {
    id: "golden-hour",
    frame: "split",
    name: "Golden Hour",
    tagline: "Split screen: a photo panel that changes as guests scroll. Amber and terracotta.",
    premium: false,
    suitedFor: JOYFUL,
    colors: {
      bg: "#FFFBF4", tint: "#FBEFDD", surface: "#FFFFFF", ink: "#3A2414", muted: "#7A604B", accent: "#B85C1E", accentInk: "#FFFFFF",
      line: "#F0DFC6", band: "#5A2E14", bandInk: "#FFF4E3", heroOverlay: "none",
    },
    fonts: { display: "playfair", body: "manrope", displayWeight: 500, displayItalicAmp: true },
    hero: "split",
    heading: "script-centered",
    ornament: "none",
    photo: "rounded",
    radius: "20px",
    layout: { story: "overlap", schedule: "cards", venues: "split", gallery: "filmstrip", countdown: "big", divider: "curve", texture: "none", card: "soft", pop: true },
    accent2: "#F2B544",
  },
  {
    id: "confetti",
    frame: "bento",
    name: "Confetti",
    tagline: "A bento board of tiles up front (date, venue, countdown, RSVP), then the fun. For parties.",
    premium: false,
    suitedFor: ["birthday", "graduation", "shower", "reunion", "other"],
    colors: {
      bg: "#FFF8EF", tint: "#FFEEDB", surface: "#FFFFFF", ink: "#1F1A3A", muted: "#5D5878", accent: "#E4572E", accentInk: "#FFFFFF",
      line: "#F3DFC8", band: "#1F1A3A", bandInk: "#FFF8EF", heroOverlay: "none",
    },
    fonts: { display: "fraunces", body: "dmSans", displayWeight: 700, displayItalicAmp: true },
    hero: "collage",
    heading: "band",
    ornament: "confetti",
    photo: "polaroid",
    radius: "24px",
    layout: { story: "overlap", schedule: "cards", venues: "cards", gallery: "polaroid", countdown: "circles", divider: "zigzag", texture: "confetti", card: "offset", pop: true },
    accent2: "#2EC4B6",
  },
  {
    id: "serene",
    frame: "booklet",
    name: "Serene",
    tagline: "A quiet booklet: one column, a contents page and numbered parts, like an order of service.",
    premium: false,
    suitedFor: ["funeral", "anniversary", "other"],
    colors: {
      bg: "#F7F7F5", tint: "#EEEFEB", surface: "#FFFFFF", ink: "#2F3A40", muted: "#66737A", accent: "#5E7263", accentInk: "#FFFFFF",
      line: "#DEE1DC", band: "#2F3A40", bandInk: "#F7F7F5", heroOverlay: "none",
    },
    fonts: { display: "cormorant", body: "jost", displayWeight: 400, displayItalicAmp: true },
    hero: "oval",
    heading: "centered-flourish",
    ornament: "dove",
    photo: "square",
    radius: "8px",
    layout: { story: "centered", schedule: "list", venues: "minimal", gallery: "grid", countdown: "band", divider: "none", texture: "none", card: "flat", pop: false },
    accent2: "#A9B8A9",
  },
  {
    id: "adventure",
    frame: "itinerary",
    name: "Adventure",
    tagline: "An itinerary: a route runs down the page and every section is a stop. For trips.",
    premium: false,
    suitedFor: ["outing", "reunion", "birthday", "other"],
    colors: {
      bg: "#F6F1E7", tint: "#ECE4D3", surface: "#FFFFFF", ink: "#1E3329", muted: "#566A5E", accent: "#C8641E", accentInk: "#FFFFFF",
      line: "#DDD3BF", band: "#1E3329", bandInk: "#F6F1E7",
      heroOverlay: "linear-gradient(0deg, rgba(14,26,20,.85) 0%, rgba(14,26,20,.25) 55%, rgba(14,26,20,.1) 100%)",
    },
    fonts: { display: "instrumentSans", body: "instrumentSans", displayWeight: 700, displayItalicAmp: false },
    hero: "editorial",
    heading: "minimal-caps",
    ornament: "none",
    photo: "rounded",
    radius: "12px",
    layout: { story: "split", schedule: "ticket", venues: "split", gallery: "filmstrip", countdown: "big", divider: "zigzag", texture: "topo", card: "offset", pop: true },
    accent2: "#E9B44C",
  },
  {
    id: "little-blessings",
    frame: "storybook",
    name: "Little Blessings",
    tagline: "A storybook: alternating pages with page numbers and arched portraits. For little ones.",
    premium: false,
    suitedFor: ["naming", "shower", "birthday"],
    colors: {
      bg: "#FBF8F4", tint: "#F2EEF6", surface: "#FFFFFF", ink: "#36364C", muted: "#6E6E86", accent: "#6F8FB0", accentInk: "#FFFFFF",
      line: "#E8E3EE", band: "#4A5875", bandInk: "#FBF8F4", heroOverlay: "none",
    },
    fonts: { display: "playfair", body: "manrope", displayWeight: 400, displayItalicAmp: true },
    hero: "arch",
    heading: "script-centered",
    ornament: "botanical",
    photo: "rounded",
    radius: "24px",
    layout: { story: "overlap", schedule: "cards", venues: "cards", gallery: "masonry", countdown: "circles", divider: "wave", texture: "dots", card: "soft", pop: false },
    accent2: "#E8B4BC",
  },
  {
    id: "modern-minimalist",
    frame: "index",
    name: "Modern Minimalist",
    tagline: "An index: a fixed sidebar with the essentials and numbered sections. Crisp and modern.",
    premium: false,
    suitedFor: ALL,
    colors: {
      bg: "#FFFFFF", tint: "#F6F6F4", surface: "#F6F6F4", ink: "#151515", muted: "#6B6B6B", accent: "#151515", accentInk: "#FFFFFF",
      line: "#E4E4E1", band: "#151515", bandInk: "#FFFFFF", heroOverlay: "none",
    },
    fonts: { display: "dmSans", body: "dmSans", displayWeight: 300, displayItalicAmp: false },
    hero: "split",
    heading: "minimal-caps",
    ornament: "none",
    photo: "square",
    radius: "0px",
    layout: { story: "magazine", schedule: "list", venues: "minimal", gallery: "editorial", countdown: "big", divider: "none", texture: "none", card: "flat", pop: false },
    accent2: "#151515",
  },
  {
    id: "romantic-garden",
    frame: "classic",
    name: "Romantic Garden",
    tagline: "The classic scroll, in blush and sage with flowing italics and botanical details.",
    premium: false,
    suitedFor: ["wedding", "anniversary", "shower", "naming", "birthday"],
    colors: {
      bg: "#FBF5F2", tint: "#F6ECE7", surface: "#FFFFFF", ink: "#3B2F2C", muted: "#7D6D67", accent: "#6F8462", accentInk: "#FFFFFF",
      line: "#EADCD5", band: "#3B2F2C", bandInk: "#FBF5F2", heroOverlay: "none",
    },
    fonts: { display: "playfair", body: "manrope", displayWeight: 400, displayItalicAmp: true },
    hero: "arch",
    heading: "script-centered",
    ornament: "botanical",
    photo: "rounded",
    radius: "18px",
    layout: { story: "centered", schedule: "zigzag", venues: "cards", gallery: "masonry", countdown: "circles", divider: "wave", texture: "none", card: "soft", pop: false },
    accent2: "#E7A9A1",
  },
  {
    id: "luxury-editorial",
    frame: "magazine",
    name: "Luxury Editorial",
    tagline: "A magazine: a cover, an “In this issue” contents page and numbered articles.",
    premium: true,
    suitedFor: JOYFUL,
    colors: {
      bg: "#0E0E0F", tint: "#151517", surface: "#18181A", ink: "#F3EEE4", muted: "#A39E94", accent: "#D4B47C", accentInk: "#0E0E0F",
      line: "#2C2B2A", band: "#000000", bandInk: "#F3EEE4",
      heroOverlay: "linear-gradient(90deg, rgba(14,14,15,.85) 0%, rgba(14,14,15,.35) 55%, rgba(14,14,15,.1) 100%)",
    },
    fonts: { display: "bodoni", body: "manrope", displayWeight: 400, displayItalicAmp: true },
    hero: "editorial",
    heading: "editorial-left",
    ornament: "rule",
    photo: "square",
    radius: "0px",
    layout: { story: "magazine", schedule: "agenda", venues: "split", gallery: "editorial", countdown: "big", divider: "none", texture: "none", card: "outline", pop: false },
    accent2: "#8E7A55",
  },
  {
    id: "traditional-celebration",
    frame: "royal",
    name: "Traditional Celebration",
    tagline: "A royal programme: the whole page inside one ornate gold frame. Burgundy and gold.",
    premium: true,
    suitedFor: ["wedding", "naming", "funeral", "anniversary", "other"],
    colors: {
      bg: "#FBF6EE", tint: "#F5EBDB", surface: "#FFFDF8", ink: "#3A1420", muted: "#7A5B60", accent: "#8C6A22", accentInk: "#FFFFFF",
      line: "#E7D7BE", band: "#3A1420", bandInk: "#F5E6C8",
      heroOverlay: "linear-gradient(180deg, rgba(58,20,32,.45), rgba(58,20,32,.25) 50%, rgba(58,20,32,.7))",
    },
    fonts: { display: "marcellus", body: "jost", displayWeight: 400, displayItalicAmp: false },
    hero: "bordered",
    heading: "ornate",
    ornament: "filigree",
    photo: "square",
    radius: "6px",
    layout: { story: "centered", schedule: "zigzag", venues: "cards", gallery: "grid", countdown: "band", divider: "none", texture: "paper", card: "outline", pop: false },
    accent2: "#C9A35A",
  },
  {
    id: "contemporary-african-romance",
    frame: "bands",
    name: "Contemporary African Romance",
    tagline: "Colour bands separated by kente strips, with headings in their own column.",
    premium: true,
    suitedFor: JOYFUL,
    colors: {
      bg: "#F7EFE4", tint: "#F0E3D2", surface: "#FFF9F1", ink: "#2B2118", muted: "#6E5A48", accent: "#A8481F", accentInk: "#FFFFFF",
      line: "#E5D3BD", band: "#2B2118", bandInk: "#F7EFE4", heroOverlay: "none",
    },
    fonts: { display: "fraunces", body: "dmSans", displayWeight: 500, displayItalicAmp: true },
    hero: "pattern",
    heading: "band",
    ornament: "geometric",
    photo: "rounded",
    radius: "14px",
    layout: { story: "overlap", schedule: "ticket", venues: "split", gallery: "editorial", countdown: "band", divider: "zigzag", texture: "kente", card: "offset", pop: true },
    accent2: "#D9A441",
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Themes for an occasion: recommended first, then the rest that suit it. */
export function themesFor(kind: OccasionKind, recommended: string[]): Theme[] {
  const suited = THEMES.filter((t) => t.suitedFor.includes(kind));
  return [...recommended.map((id) => suited.find((t) => t.id === id)).filter((t): t is Theme => Boolean(t)), ...suited.filter((t) => !recommended.includes(t.id))];
}

export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
