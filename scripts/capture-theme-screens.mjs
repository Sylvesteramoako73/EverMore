// Captures real screenshots of every theme's sample page for the marketing site
// (public/samples/screens/<theme>-phone.webp and -desktop.webp). Needs the app running.
//
// Usage: npm run dev   (in another terminal), then: node scripts/capture-theme-screens.mjs [baseUrl] [theme,theme...]

import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "public", "samples", "screens");
mkdirSync(OUT, { recursive: true });

const THEMES = [
  "earth-and-ivory", "timeless-elegance", "golden-hour", "confetti", "serene", "adventure",
  "little-blessings", "modern-minimalist", "romantic-garden", "luxury-editorial", "traditional-celebration",
  "contemporary-african-romance",
];

const browser = await chromium.launch();
const phone = await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });

// Hide the sample banner and dev indicator so the screenshot shows the page as guests see it.
const clean = async (page) =>
  page.addStyleTag({ content: '[role="status"].fixed, nextjs-portal { display: none !important; }' });

const only = process.argv[3]?.split(",");
for (const theme of only ?? THEMES) {
  for (const [kind, ctx] of [["phone", phone], ["desktop", desktop]]) {
    const page = await ctx.newPage();
    await page.goto(`${base}/samples/${theme}`, { waitUntil: "networkidle" });
    await clean(page);
    await page.waitForTimeout(400);
    const png = await page.screenshot({ fullPage: false });
    await sharp(png).resize({ width: kind === "phone" ? 520 : 1200 }).webp({ quality: 78 }).toFile(path.join(OUT, `${theme}-${kind}.webp`));
    await page.close();
    console.log("ok", theme, kind);
  }
}
await browser.close();
