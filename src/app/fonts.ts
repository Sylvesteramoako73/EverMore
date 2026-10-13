import { Bodoni_Moda, Cormorant_Garamond, DM_Sans, Fraunces, Jost, Manrope, Marcellus, Playfair_Display } from "next/font/google";

// Brand pair (preloaded everywhere): Fraunces for headings, Manrope for interface text.
export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["SOFT", "opsz"] });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

// Theme fonts. Not preloaded: the browser only downloads the ones a wedding's theme actually uses.
export const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap", preload: false });
export const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-bodoni", display: "swap", preload: false });
export const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap", preload: false });
export const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap", preload: false });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", preload: false });
export const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap", preload: false });

export const fontVariables = [fraunces, manrope, cormorant, bodoni, playfair, marcellus, dmSans, jost]
  .map((f) => f.variable)
  .join(" ");

/** CSS font-family for a theme font key. */
export const FONT_STACKS: Record<string, string> = {
  fraunces: "var(--font-fraunces), Georgia, serif",
  manrope: "var(--font-manrope), system-ui, sans-serif",
  cormorant: "var(--font-cormorant), Georgia, serif",
  bodoni: "var(--font-bodoni), 'Didot', Georgia, serif",
  playfair: "var(--font-playfair), Georgia, serif",
  marcellus: "var(--font-marcellus), Georgia, serif",
  dmSans: "var(--font-dm-sans), system-ui, sans-serif",
  jost: "var(--font-jost), system-ui, sans-serif",
};
