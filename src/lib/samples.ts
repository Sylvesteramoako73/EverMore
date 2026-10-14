import type { CelebrationView, EventView, ImageView, OccasionView } from "@/components/site/types";
import { addDays, plainDateInZone, zonedLocalToUtc } from "./dates";
import { getOccasion, OCCASIONS, type ColourSwatch, type OccasionKind } from "./occasions";
import { getTheme, THEMES } from "./themes";

// Sample celebrations for the marketing site. Names, dates and places are fictional; images are
// abstract illustrations (inline SVG), clearly not photos of real people.

type Scene = "dusk" | "garden" | "city" | "hills" | "coast" | "weave" | "confetti" | "lake";

function art(scene: Scene, p: { a: string; b: string; c: string; d: string }, w = 1200, h = 1500): string {
  const shapes: Record<Scene, string> = {
    dusk: `<circle cx="${w * 0.84}" cy="${h * 0.14}" r="${w * 0.08}" fill="${p.c}" opacity=".85"/>
      <path d="M0 ${h * 0.62} Q ${w * 0.3} ${h * 0.5} ${w * 0.55} ${h * 0.6} T ${w} ${h * 0.56} V ${h} H 0Z" fill="${p.d}" opacity=".85"/>
      <path d="M0 ${h * 0.72} Q ${w * 0.4} ${h * 0.64} ${w} ${h * 0.74} V ${h} H 0Z" fill="${p.a}" opacity=".9"/>`,
    garden: `<path d="M${w * 0.2} ${h} V ${h * 0.45} a ${w * 0.3} ${w * 0.3} 0 0 1 ${w * 0.6} 0 V ${h}" fill="none" stroke="${p.d}" stroke-width="${w * 0.035}" opacity=".7"/>
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${w * (0.18 + (i % 7) * 0.11)}" cy="${h * (0.3 + Math.floor(i / 7) * 0.08 + (i % 3) * 0.02)}" r="${w * 0.035}" fill="${i % 2 ? p.c : p.b}" opacity=".85"/>`).join("")}
      <path d="M0 ${h * 0.8} Q ${w * 0.5} ${h * 0.74} ${w} ${h * 0.8} V ${h} H 0Z" fill="${p.d}" opacity=".5"/>`,
    city: `${Array.from({ length: 12 }, (_, i) => `<rect x="${(i * w) / 12}" y="${h * (0.45 + ((i * 37) % 23) / 100)}" width="${w / 12 - 6}" height="${h}" fill="${p.d}" opacity="${0.55 + (i % 3) * 0.15}"/>`).join("")}
      <circle cx="${w * 0.84}" cy="${h * 0.12}" r="${w * 0.06}" fill="${p.c}" opacity=".9"/>`,
    hills: `<path d="M0 ${h * 0.55} Q ${w * 0.25} ${h * 0.42} ${w * 0.5} ${h * 0.55} T ${w} ${h * 0.5} V ${h} H 0Z" fill="${p.c}" opacity=".7"/>
      <path d="M0 ${h * 0.68} Q ${w * 0.35} ${h * 0.58} ${w * 0.7} ${h * 0.7} T ${w} ${h * 0.66} V ${h} H 0Z" fill="${p.d}" opacity=".85"/>
      <circle cx="${w * 0.16}" cy="${h * 0.13}" r="${w * 0.06}" fill="${p.b}" opacity=".8"/>`,
    coast: `<rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${p.d}" opacity=".75"/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${h * (0.62 + i * 0.05)} Q ${w * 0.5} ${h * (0.6 + i * 0.05)} ${w} ${h * (0.62 + i * 0.05)}" stroke="${p.b}" stroke-width="3" fill="none" opacity=".35"/>`).join("")}
      <circle cx="${w * 0.5}" cy="${h * 0.6}" r="${w * 0.07}" fill="${p.c}" opacity=".85"/>`,
    lake: `<path d="M0 ${h * 0.5} L ${w * 0.3} ${h * 0.3} L ${w * 0.55} ${h * 0.48} L ${w * 0.8} ${h * 0.26} L ${w} ${h * 0.45} V ${h * 0.6} H 0Z" fill="${p.d}" opacity=".8"/>
      <rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${p.c}" opacity=".55"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M${w * 0.1} ${h * (0.66 + i * 0.06)} H ${w * 0.9}" stroke="${p.b}" stroke-width="3" opacity=".3"/>`).join("")}`,
    weave: `${Array.from({ length: 10 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<path d="M${c * (w / 8)} ${r * (h / 10) + h / 20} l${w / 16} ${-h / 20} ${w / 16} ${h / 20} ${-w / 16} ${h / 20}z" fill="${(r + c) % 3 === 0 ? p.c : (r + c) % 3 === 1 ? p.d : p.b}" opacity=".8"/>`).join("")).join("")}`,
    confetti: `${Array.from({ length: 40 }, (_, i) => `<rect x="${(i * 97) % w}" y="${(i * 173) % h}" width="${w * 0.04}" height="${w * 0.016}" rx="4" fill="${[p.c, p.d, p.b, "#2EC4B6", "#FFB627"][i % 5]}" transform="rotate(${(i * 37) % 180} ${(i * 97) % w} ${(i * 173) % h})" opacity=".9"/>`).join("")}`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>${shapes[scene]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

const PALETTES: Record<string, { a: string; b: string; c: string; d: string }> = {
  "earth-and-ivory": { a: "#3b2418", b: "#c9a98a", c: "#f6eee1", d: "#291811" },
  "timeless-elegance": { a: "#1d2b4a", b: "#c9a86a", c: "#f3e2b8", d: "#101c35" },
  "golden-hour": { a: "#e9a15a", b: "#fbe6c6", c: "#fff3d6", d: "#9a4b1c" },
  confetti: { a: "#fff1e0", b: "#ffd9b8", c: "#e4572e", d: "#1f1a3a" },
  serene: { a: "#c9d1cc", b: "#f2f3f0", c: "#ffffff", d: "#5e7263" },
  adventure: { a: "#9db5a3", b: "#f3e7cf", c: "#4f7a8a", d: "#1e3329" },
  "little-blessings": { a: "#cfdcea", b: "#fbf3ee", c: "#f4d6dc", d: "#8fa9c4" },
  "modern-minimalist": { a: "#d9d9d6", b: "#f6f6f4", c: "#151515", d: "#8a8a86" },
  "romantic-garden": { a: "#f5dcd6", b: "#fbf5f2", c: "#e7a9a1", d: "#8a9b7a" },
  "luxury-editorial": { a: "#0e0e0f", b: "#3a3125", c: "#d4b47c", d: "#18181a" },
  "traditional-celebration": { a: "#5a1f30", b: "#c9a35a", c: "#f1d79b", d: "#3a1420" },
  "contemporary-african-romance": { a: "#b4532a", b: "#f2c27b", c: "#2f5d46", d: "#2b2118" },
};

const SCENES: Record<OccasionKind, Scene[]> = {
  wedding: ["dusk", "garden", "coast", "hills"],
  anniversary: ["coast", "dusk", "garden", "hills"],
  birthday: ["confetti", "city", "dusk", "garden"],
  funeral: ["hills", "lake", "garden", "dusk"],
  outing: ["lake", "hills", "coast", "dusk"],
  naming: ["garden", "hills", "coast", "dusk"],
  graduation: ["city", "confetti", "hills", "dusk"],
  reunion: ["hills", "coast", "city", "garden"],
  shower: ["garden", "confetti", "coast", "hills"],
  other: ["dusk", "city", "garden", "hills"],
};

type SampleSpec = {
  title: string;
  names: string[];
  guestMessage: string;
  story: string;
  events: { name: string; offsetDays: number; start: string; end: string; venue: string; address: string; description: string; dressCode?: string; icon: string }[];
  colours: ColourSwatch[];
  facts?: Partial<CelebrationView["facts"]>;
  thankYou: string;
};

const SPECS: Record<OccasionKind, SampleSpec> = {
  wedding: {
    title: "Ama & Kofi", names: ["Ama", "Kofi"],
    guestMessage: "We can't wait to celebrate the beginning of our forever with the people we love most.",
    story: "We met on a rainy evening in Accra, sharing an umbrella neither of us remembered bringing. Coffee became dinner, dinner became years, and a friendship became a love story.",
    events: [
      { name: "Traditional Engagement", offsetDays: -1, start: "10:00", end: "14:00", venue: "The Family Home", address: "East Legon, Accra", description: "Join both families as we honour tradition.", dressCode: "Kente & traditional attire", icon: "heart" },
      { name: "Wedding Ceremony", offsetDays: 0, start: "11:00", end: "13:00", venue: "Holy Trinity Cathedral", address: "High Street, Accra", description: "Join us as we exchange vows and begin our forever together.", icon: "church" },
      { name: "Photo Session", offsetDays: 0, start: "13:00", end: "14:00", venue: "Cathedral Gardens", address: "High Street, Accra", description: "A moment to capture memories with family and friends.", icon: "camera" },
      { name: "Reception", offsetDays: 0, start: "14:30", end: "21:00", venue: "The Garden Pavilion", address: "Airport Residential, Accra", description: "Dinner, music and dancing till you drop.", icon: "dinner" },
    ],
    colours: [
      { name: "Taupe", hex: "#A09081", note: "Soft elegance with warm neutral undertones." },
      { name: "Mocha", hex: "#291811", note: "Rich earthy tones bringing warmth and depth." },
      { name: "Ivory", hex: "#F6EEE1", note: "A timeless soft cream." },
    ],
    thankYou: "Thank you for celebrating with us. Every hug, every dance and every kind word made our day unforgettable.",
  },
  anniversary: {
    title: "Efua & Yaw", names: ["Efua", "Yaw"],
    guestMessage: "Twenty-five years of choosing each other, and we'd love you there as we say it again.",
    story: "From a church choir in Cape Coast to a home full of children and laughter.",
    events: [
      { name: "Vow Renewal", offsetDays: 0, start: "15:00", end: "16:00", venue: "St. Mary's Chapel", address: "Cape Coast", description: "A short, joyful renewal of vows.", icon: "rings" },
      { name: "Anniversary Dinner", offsetDays: 0, start: "18:00", end: "22:00", venue: "Coconut Grove", address: "Elmina", description: "Dinner by the sea.", icon: "dinner" },
    ],
    colours: [{ name: "Silver", hex: "#B8BCC2", note: "For 25 years." }, { name: "Navy", hex: "#1D2B4A", note: "" }],
    thankYou: "Thank you for being part of our story, then and now.",
  },
  birthday: {
    title: "Kwame at 50", names: ["Kwame"],
    guestMessage: "Half a century of laughter. Come help me celebrate the next fifty!",
    story: "Engineer, storyteller, terrible dancer and the proudest dad in Kumasi. This year we're celebrating Kwame in style.",
    events: [
      { name: "Thanksgiving Service", offsetDays: 0, start: "09:00", end: "11:00", venue: "Wesley Methodist Church", address: "Adum, Kumasi", description: "A short service of thanks.", icon: "church" },
      { name: "Birthday Party", offsetDays: 0, start: "18:00", end: "23:30", venue: "Golden Tulip Rooftop", address: "Kumasi", description: "Food, music, speeches and a very big cake.", dressCode: "Black & gold", icon: "cake" },
    ],
    colours: [{ name: "Black", hex: "#111111", note: "" }, { name: "Gold", hex: "#C69A4A", note: "" }],
    facts: { turningAge: 50 },
    thankYou: "Thank you for the wishes, the dancing and the memories. Fifty never felt so good.",
  },
  funeral: {
    title: "Celebrating the Life of Madam Esther Owusu", names: ["Esther Owusu"],
    guestMessage: "A loving mother, grandmother and friend to all who knew her.",
    story: "Born in Koforidua, Esther taught at the local school for thirty-five years and filled every room with song. She leaves behind her children, grandchildren and a community she held together with kindness.",
    events: [
      { name: "Wake-keeping", offsetDays: -1, start: "19:00", end: "23:00", venue: "Family House", address: "Koforidua", description: "An evening of songs and remembrance.", icon: "candle" },
      { name: "Burial Service", offsetDays: 0, start: "08:00", end: "10:30", venue: "Presbyterian Church", address: "Koforidua", description: "Service followed by interment.", dressCode: "Black & red", icon: "dove" },
      { name: "Final Funeral Rites", offsetDays: 0, start: "11:00", end: "17:00", venue: "Family Grounds", address: "Koforidua", description: "Friends and family gather to celebrate her life.", dressCode: "Black & red", icon: "flower" },
      { name: "Thanksgiving Service", offsetDays: 1, start: "09:00", end: "11:00", venue: "Presbyterian Church", address: "Koforidua", description: "", dressCode: "White", icon: "church" },
    ],
    colours: [{ name: "Black", hex: "#111111", note: "Saturday" }, { name: "Red", hex: "#9B1C1C", note: "Saturday" }, { name: "White", hex: "#F5F5F2", note: "Sunday" }],
    facts: { lifeDates: { born: "1948-03-14", passed: "2026-08-02" } },
    thankYou: "The family is deeply grateful for your love, prayers and support.",
  },
  outing: {
    title: "Akosombo Getaway", names: [],
    guestMessage: "Two days, one lake, zero emails. Pack light and bring your best playlist.",
    story: "Our annual friends' retreat is heading to the lake: boat cruise, a short hike, a bonfire and plenty of rest.",
    events: [
      { name: "Meet-up & Departure", offsetDays: 0, start: "06:30", end: "07:00", venue: "Accra Mall car park", address: "Tetteh Quarshie, Accra", description: "The bus leaves at 7:00 sharp!", icon: "bus" },
      { name: "Boat Cruise", offsetDays: 0, start: "11:00", end: "13:00", venue: "Volta Lake jetty", address: "Akosombo", description: "", icon: "map" },
      { name: "Bonfire & Games", offsetDays: 0, start: "19:00", end: "23:00", venue: "Lakeside Lodge", address: "Akosombo", description: "", icon: "sun" },
      { name: "Departure Home", offsetDays: 1, start: "14:00", end: "17:00", venue: "Lakeside Lodge", address: "Akosombo", description: "", icon: "bus" },
    ],
    colours: [],
    facts: {
      meetingPoint: "Accra Mall car park, by the main entrance. Look for the bus with the EverMore sign.",
      packingList: ["Swimwear & towel", "Comfortable walking shoes", "Sunscreen & hat", "Power bank", "Something warm for the bonfire"],
      costNote: "GH₵ 850 per person covers transport, lodging and meals. Pay the organiser by Friday.",
    },
    thankYou: "Thanks for an amazing weekend. Same time next year?",
  },
  naming: {
    title: "Welcoming Baby Nhyira", names: ["Nhyira"],
    guestMessage: "Our hearts are full. Come and meet our little blessing.",
    story: "After a long wait, our little one arrived healthy and loud. We can't wait to introduce her to the family.",
    events: [
      { name: "Outdooring & Naming", offsetDays: 0, start: "06:00", end: "09:00", venue: "The Mensah Residence", address: "Tema Community 25", description: "A traditional dawn ceremony.", icon: "sun" },
      { name: "Reception", offsetDays: 0, start: "10:00", end: "14:00", venue: "The Mensah Residence", address: "Tema Community 25", description: "Breakfast and celebration with family and friends.", icon: "dinner" },
    ],
    colours: [{ name: "Soft blue", hex: "#AFC6DB", note: "" }, { name: "White", hex: "#FFFFFF", note: "" }],
    facts: { nameMeaning: "Nhyira means \"blessing\" in Twi.", parents: "Akosua & Kojo Mensah" },
    thankYou: "Thank you for the blessings, gifts and love you showered on Nhyira.",
  },
  graduation: {
    title: "Adjoa Graduates!", names: ["Adjoa"],
    guestMessage: "Four years, countless late nights, one very proud graduate.",
    story: "Adjoa is graduating with a degree in Medicine. Join us to celebrate!",
    events: [{ name: "Graduation Party", offsetDays: 0, start: "16:00", end: "21:00", venue: "The Courtyard", address: "Legon, Accra", description: "", icon: "star" }],
    colours: [],
    facts: { institution: "University of Ghana Medical School" },
    thankYou: "Thank you for celebrating this milestone with me.",
  },
  reunion: {
    title: "Class of 2006 Reunion", names: [],
    guestMessage: "Twenty years since we left. Let's catch up properly.",
    story: "Old friends, new stories. Bring photos from back in the day.",
    events: [
      { name: "Welcome & Registration", offsetDays: 0, start: "10:00", end: "11:00", venue: "School Assembly Hall", address: "Cape Coast", description: "", icon: "star" },
      { name: "Dinner & Dance", offsetDays: 0, start: "18:00", end: "23:00", venue: "Coconut Grove", address: "Cape Coast", description: "", icon: "music" },
    ],
    colours: [{ name: "School green", hex: "#1E6B3A", note: "" }, { name: "White", hex: "#FFFFFF", note: "" }],
    thankYou: "What a weekend. Until the next one!",
  },
  shower: {
    title: "A Shower for Abena", names: ["Abena"],
    guestMessage: "Join us to shower Abena with love before baby arrives.",
    story: "Games, cake and plenty of advice for the parents-to-be.",
    events: [{ name: "Baby Shower", offsetDays: 0, start: "13:00", end: "17:00", venue: "The Garden Room", address: "Cantonments, Accra", description: "", icon: "gift" }],
    colours: [{ name: "Blush", hex: "#F2D5D3", note: "" }, { name: "Sage", hex: "#AEBFA5", note: "" }],
    thankYou: "Thank you for showering us with love!",
  },
  other: {
    title: "Housewarming at the Asantes'", names: [],
    guestMessage: "New home, same friends. Come and see it!",
    story: "We finally have a place of our own and want to celebrate with you.",
    events: [{ name: "Housewarming", offsetDays: 0, start: "15:00", end: "21:00", venue: "The Asante home", address: "Spintex, Accra", description: "", icon: "heart" }],
    colours: [],
    thankYou: "Thanks for helping us make a house a home.",
  },
};

function occasionView(kind: OccasionKind): OccasionView {
  const o = getOccasion(kind);
  return { kind: o.kind, label: o.label, countdown: o.countdown, after: o.after, copy: { ...o.copy } };
}

function image(id: string, scene: Scene, palette: (typeof PALETTES)[string], caption = ""): ImageView {
  const src = art(scene, palette);
  return { id, src, thumb: src, alt: `Illustration: ${scene}`, caption, width: 1200, height: 1500, placeholder: null };
}

/** A complete sample page for an occasion in a theme, `daysAhead` from today (negative = already happened). */
export function sampleCelebration(
  themeId: string,
  { occasion = "wedding", daysAhead = 96, now = Date.now() }: { occasion?: OccasionKind; daysAhead?: number; now?: number } = {},
): CelebrationView {
  const theme = getTheme(themeId);
  const palette = PALETTES[theme.id];
  const spec = SPECS[occasion];
  const scenes = SCENES[occasion];
  const tz = "Africa/Accra";
  const day = addDays(plainDateInZone(new Date(now), tz), daysAhead);
  const at = (d: string, time: string) => zonedLocalToUtc(`${d}T${time}`, tz).toISOString();

  const events: EventView[] = spec.events.map((e, i) => {
    const d = addDays(day, e.offsetDays);
    const endDay = e.end < e.start ? addDays(d, 1) : d;
    return {
      id: `sample-${i}`, name: e.name, startsAt: at(d, e.start), endsAt: at(endDay, e.end), timezone: tz,
      venueName: e.venue, venueAddress: e.address, venueLat: null, venueLng: null, description: e.description,
      dressCode: e.dressCode ?? "", icon: e.icon,
      venueImage: i < 2 ? image(`sample-venue-${i}`, i === 0 ? "city" : "garden", palette) : null,
    };
  });
  const main = events.find((e) => plainDateInZone(new Date(e.startsAt), tz) === day) ?? events[0];

  return {
    id: `sample-${theme.id}-${occasion}`,
    slug: `samples/${theme.id}`,
    themeId: theme.id,
    occasion: occasionView(occasion),
    title: spec.title,
    names: spec.names,
    monogram: spec.names.length === 2 ? `${spec.names[0][0]}&${spec.names[1][0]}` : spec.title[0],
    guestMessage: spec.guestMessage,
    story: `${spec.story}\n\nThis is a sample page: names, places and dates are made up to show how ${theme.name} looks.`,
    announcement: "",
    hashtag: spec.names.length === 2 ? `${spec.names[0]}And${spec.names[1]}` : "",
    dressCode: "",
    facts: {
      nameMeaning: "", parents: "", meetingPoint: "", packingList: [], costNote: "", institution: "", turningAge: null,
      lifeDates: { born: null, passed: null },
      ...spec.facts,
    },
    contact: null,
    hero: image("sample-hero", scenes[0], palette),
    portraits: [image("sample-p1", scenes[1], palette), image("sample-p2", scenes[2], palette)],
    gallery: scenes.concat(scenes.slice().reverse()).map((s, i) => image(`sample-g${i}`, s, palette)),
    colours: spec.colours,
    events,
    primaryEventId: main.id,
    phase: daysAhead > 0 ? "upcoming" : "after",
    keyDate: occasion === "funeral" ? (spec.facts?.lifeDates?.passed ?? day) : day,
    timezone: tz,
    rsvp: {
      open: daysAhead > 1 && occasion !== "funeral",
      closedReason: null,
      deadline: occasion === "funeral" ? null : addDays(day, -14),
      events: occasion === "funeral" ? [] : events.slice(0, 2).map((e) => ({ id: e.id, name: e.name, startsAt: e.startsAt, timezone: e.timezone })),
      maxPartySize: 2,
      mealOptions: occasion === "wedding" ? ["Jollof & grilled chicken", "Vegetarian", "Fish"] : [],
      askDietary: true,
      contacts: [{ name: "Anastasia", phone: "+233 54 000 0001" }, { name: "Michael", phone: "+233 20 000 0002" }],
      invitation: null,
    },
    guestbook: {
      enabled: true,
      moderated: false,
      entries:
        occasion === "funeral"
          ? [{ id: "s1", name: "Mrs. Agyeman", message: "She taught me to read and to be kind. Rest well, Auntie Esther.", createdAt: new Date(now).toISOString() }]
          : [
              { id: "s1", name: "Auntie Akos", message: "Wishing you a lifetime of laughter and love. So proud of you!", createdAt: new Date(now).toISOString() },
              { id: "s2", name: "Kojo", message: "Save me a seat by the dance floor!", createdAt: new Date(now).toISOString() },
            ],
    },
    shared: { enabled: true, moderated: true, items: [], total: 0 },
    gifts: {
      message: occasion === "funeral" ? "Donations towards the funeral can be made to the family. Contact Michael for details." : "Your presence is the greatest gift.",
      links: [],
    },
    thankYouMessage: spec.thankYou,
    memories: [],
    hiddenSections: [],
    shareUrl: `https://evermore.example/${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    links: { qr: `/samples/${theme.id}/qr`, card: null, calendar: null, upload: null },
    mode: "sample",
  };
}

/** Which occasion to show for each theme on the marketing site. */
export const SAMPLE_THEMES = THEMES.map((t) => ({
  id: t.id,
  name: t.name,
  tagline: t.tagline,
  premium: t.premium,
  occasion: (Object.values(OCCASIONS).find((o) => o.recommendedThemes[0] === t.id)?.kind ?? t.suitedFor[0]) as OccasionKind,
}));
