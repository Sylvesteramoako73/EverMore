import type { ImageView, WeddingView } from "@/components/wedding/types";
import { addDays, plainDateInZone, zonedLocalToUtc } from "./dates";
import { getTheme, THEMES } from "./themes";

// Sample weddings for the marketing site. Names, dates and venues are fictional; images are abstract
// illustrations (inline SVG), clearly not photos of real people.

type Scene = "dusk" | "garden" | "city" | "hills" | "coast" | "weave";

function art(scene: Scene, palette: { a: string; b: string; c: string; d: string }, w = 1200, h = 1500): string {
  const shapes: Record<Scene, string> = {
    dusk: `<circle cx="${w * 0.84}" cy="${h * 0.14}" r="${w * 0.08}" fill="${palette.c}" opacity=".85"/>
      <path d="M0 ${h * 0.62} Q ${w * 0.3} ${h * 0.5} ${w * 0.55} ${h * 0.6} T ${w} ${h * 0.56} V ${h} H 0Z" fill="${palette.d}" opacity=".85"/>
      <path d="M0 ${h * 0.72} Q ${w * 0.4} ${h * 0.64} ${w} ${h * 0.74} V ${h} H 0Z" fill="${palette.a}" opacity=".9"/>`,
    garden: `<path d="M${w * 0.2} ${h} V ${h * 0.45} a ${w * 0.3} ${w * 0.3} 0 0 1 ${w * 0.6} 0 V ${h}" fill="none" stroke="${palette.d}" stroke-width="${w * 0.035}" opacity=".7"/>
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${w * (0.18 + (i % 7) * 0.11)}" cy="${h * (0.3 + Math.floor(i / 7) * 0.08 + (i % 3) * 0.02)}" r="${w * 0.035}" fill="${i % 2 ? palette.c : palette.b}" opacity=".85"/>`).join("")}
      <path d="M0 ${h * 0.8} Q ${w * 0.5} ${h * 0.74} ${w} ${h * 0.8} V ${h} H 0Z" fill="${palette.d}" opacity=".5"/>`,
    city: `${Array.from({ length: 12 }, (_, i) => `<rect x="${(i * w) / 12}" y="${h * (0.45 + ((i * 37) % 23) / 100)}" width="${w / 12 - 6}" height="${h}" fill="${palette.d}" opacity="${0.55 + (i % 3) * 0.15}"/>`).join("")}
      <circle cx="${w * 0.84}" cy="${h * 0.12}" r="${w * 0.06}" fill="${palette.c}" opacity=".9"/>`,
    hills: `<path d="M0 ${h * 0.55} Q ${w * 0.25} ${h * 0.42} ${w * 0.5} ${h * 0.55} T ${w} ${h * 0.5} V ${h} H 0Z" fill="${palette.c}" opacity=".7"/>
      <path d="M0 ${h * 0.68} Q ${w * 0.35} ${h * 0.58} ${w * 0.7} ${h * 0.7} T ${w} ${h * 0.66} V ${h} H 0Z" fill="${palette.d}" opacity=".85"/>
      <circle cx="${w * 0.16}" cy="${h * 0.13}" r="${w * 0.06}" fill="${palette.b}" opacity=".8"/>`,
    coast: `<rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${palette.d}" opacity=".75"/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${h * (0.62 + i * 0.05)} Q ${w * 0.5} ${h * (0.6 + i * 0.05)} ${w} ${h * (0.62 + i * 0.05)}" stroke="${palette.b}" stroke-width="3" fill="none" opacity=".35"/>`).join("")}
      <circle cx="${w * 0.5}" cy="${h * 0.6}" r="${w * 0.07}" fill="${palette.c}" opacity=".85"/>`,
    weave: `${Array.from({ length: 10 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<path d="M${c * (w / 8)} ${r * (h / 10) + h / 20} l${w / 16} ${-h / 20} ${w / 16} ${h / 20} ${-w / 16} ${h / 20}z" fill="${(r + c) % 3 === 0 ? palette.c : (r + c) % 3 === 1 ? palette.d : palette.b}" opacity=".8"/>`).join("")).join("")}`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.a}"/><stop offset="1" stop-color="${palette.b}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>${shapes[scene]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

const PALETTES: Record<string, { a: string; b: string; c: string; d: string }> = {
  "timeless-elegance": { a: "#1d2b4a", b: "#c9a86a", c: "#f3e2b8", d: "#101c35" },
  "modern-minimalist": { a: "#d9d9d6", b: "#f6f6f4", c: "#151515", d: "#8a8a86" },
  "romantic-garden": { a: "#f5dcd6", b: "#fbf5f2", c: "#e7a9a1", d: "#8a9b7a" },
  "luxury-editorial": { a: "#0e0e0f", b: "#3a3125", c: "#d4b47c", d: "#18181a" },
  "traditional-celebration": { a: "#5a1f30", b: "#c9a35a", c: "#f1d79b", d: "#3a1420" },
  "contemporary-african-romance": { a: "#b4532a", b: "#f2c27b", c: "#2f5d46", d: "#2b2118" },
};

const SCENES: Record<string, Scene[]> = {
  "timeless-elegance": ["dusk", "coast", "hills", "garden"],
  "modern-minimalist": ["city", "hills", "coast", "dusk"],
  "romantic-garden": ["garden", "hills", "dusk", "coast"],
  "luxury-editorial": ["city", "dusk", "coast", "hills"],
  "traditional-celebration": ["dusk", "garden", "hills", "weave"],
  "contemporary-african-romance": ["weave", "hills", "dusk", "garden"],
};

const COUPLES: Record<string, [string, string, string]> = {
  "timeless-elegance": ["Ama", "Kofi", "Accra"],
  "modern-minimalist": ["Zara", "Daniel", "Lisbon"],
  "romantic-garden": ["Esi", "Tomás", "Cape Town"],
  "luxury-editorial": ["Nadia", "Kwame", "London"],
  "traditional-celebration": ["Adwoa", "Yaw", "Kumasi"],
  "contemporary-african-romance": ["Afia", "Jide", "Lagos"],
};

function image(id: string, scene: Scene, palette: (typeof PALETTES)[string], caption = ""): ImageView {
  const src = art(scene, palette);
  return { id, src, thumb: src, alt: `Illustration: ${scene}`, caption, width: 1200, height: 1500, placeholder: null };
}

/** A complete sample wedding for a theme, `daysAhead` from today (negative = already married). */
export function sampleWedding(themeId: string, { daysAhead = 96, now = Date.now() } = {}): WeddingView {
  const theme = getTheme(themeId);
  const palette = PALETTES[theme.id];
  const scenes = SCENES[theme.id];
  const [one, two, city] = COUPLES[theme.id];
  const tz = "Africa/Accra";
  const day = addDays(plainDateInZone(new Date(now), tz), daysAhead);
  const at = (d: string, time: string) => zonedLocalToUtc(`${d}T${time}`, tz).toISOString();
  const evening = (d: string, time: string) => at(d, time);
  const dayBefore = addDays(day, -1);

  const events = [
    {
      id: "sample-trad", name: "Traditional Engagement", startsAt: at(dayBefore, "10:00"), endsAt: at(dayBefore, "14:00"), timezone: tz,
      venueName: "The Family Home", venueAddress: `East Legon, ${city}`, venueLat: null, venueLng: null,
      description: "Join both families as we honour tradition and begin our celebration together.", dressCode: "Traditional attire",
    },
    {
      id: "sample-ceremony", name: "Wedding Ceremony", startsAt: at(day, "14:00"), endsAt: at(day, "15:30"), timezone: tz,
      venueName: "Holy Trinity Cathedral", venueAddress: `High Street, ${city}`, venueLat: null, venueLng: null,
      description: "Please be seated by 1:45 pm.", dressCode: "Formal",
    },
    {
      id: "sample-reception", name: "Reception", startsAt: evening(day, "18:00"), endsAt: evening(addDays(day, 1), "00:00"), timezone: tz,
      venueName: "The Garden Pavilion", venueAddress: `Airport Residential, ${city}`, venueLat: null, venueLng: null,
      description: "Dinner, dancing and plenty of joy.", dressCode: "Black tie",
    },
  ];

  return {
    id: `sample-${theme.id}`,
    slug: `sample/${theme.id}`,
    themeId: theme.id,
    partnerOne: one,
    partnerTwo: two,
    monogram: `${one[0]}${two[0]}`,
    guestMessage: "We can't wait to celebrate the beginning of our forever with the people we love most.",
    story:
      `We met on a rainy evening in ${city}, sharing an umbrella neither of us remembered bringing. Coffee became dinner, dinner became years, and somewhere along the way a friendship became a love story.\n\nThis is a sample page: the story, names and places are made up to show how ${theme.name} looks.`,
    announcement: "",
    hashtag: `${one}And${two}`,
    dressCode: "",
    contact: null,
    hero: image("sample-hero", scenes[0], palette),
    portraits: [image("sample-p1", scenes[1], palette), image("sample-p2", scenes[2], palette)],
    gallery: scenes.concat(scenes.slice().reverse()).map((s, i) => image(`sample-g${i}`, s, palette, i === 0 ? "Where it all began" : "")),
    events,
    primaryEventId: "sample-ceremony",
    phase: daysAhead > 0 ? "upcoming" : "married",
    marriageDate: day,
    timezone: tz,
    rsvp: {
      open: daysAhead > 1,
      closedReason: null,
      deadline: addDays(day, -21),
      events: events.slice(1).map((e) => ({ id: e.id, name: e.name, startsAt: e.startsAt, timezone: e.timezone })),
      maxPartySize: 2,
      mealOptions: ["Jollof & grilled chicken", "Vegetarian", "Fish"],
      askDietary: true,
      invitation: null,
    },
    guestbook: {
      enabled: true,
      moderated: false,
      entries: [
        { id: "s1", name: "Auntie Akos", message: "Wishing you a lifetime of laughter and love. So proud of you both!", createdAt: new Date(now).toISOString() },
        { id: "s2", name: "Kojo", message: "Best couple. Save me a seat by the dance floor!", createdAt: new Date(now).toISOString() },
      ],
    },
    gifts: { message: "Your presence is the greatest gift. If you'd like to give something more, we've put together a few ideas.", links: [] },
    thankYouMessage: "Thank you for celebrating with us. Every hug, every dance and every kind word made our day unforgettable.",
    memories: [],
    hiddenSections: [],
    shareUrl: `https://evermore.example/w/${one.toLowerCase()}-and-${two.toLowerCase()}`,
    links: { qr: `/samples/${theme.id}/qr`, card: null, calendar: null },
    mode: "sample",
  };
}

export const SAMPLE_THEMES = THEMES.map((t) => ({ id: t.id, name: t.name, tagline: t.tagline, premium: t.premium, couple: COUPLES[t.id] }));
