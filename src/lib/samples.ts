import type { CelebrationView, EventView, FundView, ImageView, OccasionView } from "@/components/site/types";
import { addDays, plainDateInZone, zonedLocalToUtc } from "./dates";
import { getOccasion, type ColourSwatch, type OccasionKind } from "./occasions";
import photos from "./sample-photos.json";
import { akanDayName, PARTY_TITLES } from "./akan";
import { getTheme, THEMES } from "./themes";

// Sample celebrations for the marketing site. Names, dates and places are fictional; photos are
// Unsplash stock (see scripts/fetch-sample-photos.mjs), credited on the policies page.

type Photo = { id: string; by: string; alt: string; src: string; thumb: string; width?: number; height?: number };
const PHOTOS = photos as Record<string, Photo>;

/** Which stock photos each occasion's sample uses. */
const PHOTO_SETS: Record<OccasionKind, { hero: string; portraits: string[]; gallery: string[]; venues: string[] }> = {
  wedding: {
    hero: "wed-white-tux",
    portraits: ["wed-bouquet", "wed-blue-suit"],
    gallery: ["wed-kente-couple", "wed-arch", "wed-kente-beads", "wed-lace", "wed-vows", "wed-kente-dancer", "wed-veil", "wed-kente-embrace", "wed-garden"],
    venues: ["venue-church", "venue-reception", "venue-pavilion", "venue-tables"],
  },
  anniversary: {
    hero: "wed-garden",
    portraits: ["wed-beach", "wed-hands"],
    gallery: ["wed-ring", "wed-wall-kiss", "wed-kiss", "flowers-table", "wed-tree", "wed-pose"],
    venues: ["venue-church", "venue-tables"],
  },
  birthday: {
    hero: "bday-cake-group",
    portraits: ["man-suit", "man-smile"],
    gallery: ["bday-friends", "bday-cake", "bday-women", "bday-candles", "bday-tables", "bday-kids", "bday-balloon"],
    venues: ["venue-church", "venue-reception"],
  },
  funeral: {
    hero: "mem-rose",
    portraits: ["mem-candles", "mem-candle"],
    gallery: ["mem-flowers", "mem-candle-flowers", "mem-church-candle", "mem-stained-glass", "mem-candles", "flowers-table"],
    venues: ["mem-stained-glass", "venue-pavilion", "venue-church", "venue-church"],
  },
  outing: {
    hero: "trip-sunset-group",
    portraits: ["trip-sand", "trip-field"],
    gallery: ["trip-boat-sunset", "trip-safari", "trip-truck", "trip-boat", "trip-road", "reunion-laugh"],
    venues: ["trip-road", "trip-boat", "trip-boat-sunset", "trip-truck"],
  },
  naming: {
    hero: "baby-fabric",
    portraits: ["baby-cap", "family-mother"],
    gallery: ["family-attire", "baby-bump", "reunion-table", "baby-cap", "flowers-table"],
    venues: ["venue-pavilion", "venue-tables"],
  },
  graduation: {
    hero: "grad-flowers",
    portraits: ["grad-cap", "grad-man"],
    gallery: ["grad-kente-walk", "grad-bubbles", "grad-kente", "grad-celebrate", "bday-friends"],
    venues: ["venue-reception"],
  },
  reunion: {
    hero: "reunion-friends",
    portraits: ["reunion-hug", "reunion-laugh"],
    gallery: ["reunion-outdoor", "reunion-table", "reunion-women", "reunion-group", "reunion-lunch", "party-dance"],
    venues: ["venue-church", "venue-reception"],
  },
  shower: {
    hero: "baby-bump",
    portraits: ["flowers-table", "baby-cap"],
    gallery: ["bday-tables", "family-mother", "bday-cake", "reunion-women"],
    venues: ["venue-tables"],
  },
  other: {
    hero: "family-games",
    portraits: ["bday-tables", "reunion-laugh"],
    gallery: ["reunion-friends", "flowers-table", "bday-friends", "bday-cake"],
    venues: ["venue-pavilion"],
  },
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
    facts: {
      party: [
        { name: "Efua Mensah", role: "Maid of honour" },
        { name: "Kwesi Boateng", role: "Best man" },
        { name: "Adwoa Asante", role: "Bridesmaid" },
        { name: "Yaw Darko", role: "Groomsman" },
        { name: "Uncle Fiifi", role: "MC" },
        { name: "Little Akosua", role: "Flower girl" },
      ],
    },
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
    facts: {
      lifeDates: { born: "1948-03-14", passed: "2026-08-02" },
      party: [
        { name: "Michael Owusu", role: "Son" },
        { name: "Abena Owusu-Mensah", role: "Daughter" },
        { name: "Kwesi Owusu", role: "Son" },
        { name: "Grandchildren & great-grandchildren", role: "" },
      ],
    },
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
    facts: {
      nameMeaning: "Nhyira means \"blessing\" in Twi.",
      parents: "Akosua & Kojo Mensah",
      dayName: akanDayName("2026-08-15"),
      party: [
        { name: "Nana Ama Mensah", role: "Grandmother" },
        { name: "Kojo Asante", role: "Godfather" },
        { name: "Efua Darko", role: "Godmother" },
      ],
    },
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

function image(name: string, caption = ""): ImageView {
  const p = PHOTOS[name];
  return { id: `sample-${name}`, src: p.src, thumb: p.thumb, alt: p.alt, caption, width: p.width ?? null, height: p.height ?? null, placeholder: null };
}

/** Wedding designs each get their own look: kente and beads for the traditional designs, gowns and tuxedos for the editorial one. */
const WEDDING_BY_THEME: Record<string, (typeof PHOTO_SETS)["wedding"]> = {
  "traditional-celebration": {
    hero: "wed-kente-couple",
    portraits: ["wed-crown", "wed-kente-wrap"],
    gallery: ["wed-kente-embrace", "wed-kente-beads", "wed-kente-dancer", "wed-coral-bride", "wed-ankara-couple", "wed-kente-pose", "wed-traditional", "wed-group"],
    venues: ["venue-pavilion", "venue-church", "venue-reception", "venue-tables"],
  },
  "contemporary-african-romance": {
    hero: "wed-kente-embrace",
    portraits: ["wed-coral-bride", "wed-kente-wrap"],
    gallery: ["wed-kente-pose", "wed-ankara-couple", "wed-kente-beads", "wed-crown", "wed-kente-dancer", "wed-white-tux", "wed-traditional"],
    venues: ["venue-pavilion", "venue-church", "venue-reception", "venue-tables"],
  },
  "luxury-editorial": {
    hero: "wed-arch",
    portraits: ["wed-bride-portrait", "wed-tux-detail"],
    gallery: ["wed-white-tux", "wed-lace", "wed-garden", "wed-wall-kiss", "wed-veil", "wed-vows", "wed-bouquet", "flowers-table"],
    venues: ["venue-church", "venue-reception", "venue-pavilion", "venue-tables"],
  },
};

/** Sample gift funds: amounts in pesewas. */
const SAMPLE_FUNDS: Partial<Record<OccasionKind, FundView>> = {
  wedding: { id: "f1", title: "Wedding gift", description: "Towards our first home together.", goal: null, raised: 1_250_000, count: 23, currency: "GHS", momo: { number: "024 000 0001", name: "Ama Mensah", network: "MTN MoMo" } },
  funeral: { id: "f1", title: "Funeral contributions", description: "Support for the family towards the funeral arrangements.", goal: 3_000_000, raised: 1_840_000, count: 41, currency: "GHS", momo: { number: "024 000 0002", name: "Michael Owusu", network: "MTN MoMo" } },
  outing: { id: "f1", title: "Trip fund", description: "GH₵ 450 per person covers transport, the boat cruise and lunch.", goal: 900_000, raised: 630_000, count: 14, currency: "GHS", momo: { number: "020 000 0003", name: "Akosua Darko", network: "Telecel Cash" } },
  birthday: { id: "f1", title: "Birthday gift", description: "Kwame is saving towards a trip home to the village.", goal: null, raised: 480_000, count: 12, currency: "GHS", momo: { number: "024 000 0004", name: "Kwame Asante", network: "MTN MoMo" } },
  naming: { id: "f1", title: "Blessings for Nhyira", description: "Gifts towards Nhyira's education fund.", goal: null, raised: 390_000, count: 18, currency: "GHS", momo: { number: "024 000 0005", name: "Yaa Mensah", network: "MTN MoMo" } },
};

/** A complete sample page for an occasion in a theme, `daysAhead` from today (negative = already happened). */
export function sampleCelebration(
  themeId: string,
  { occasion = "wedding", daysAhead = 96, now = Date.now() }: { occasion?: OccasionKind; daysAhead?: number; now?: number } = {},
): CelebrationView {
  const theme = getTheme(themeId);
  const spec = SPECS[occasion];
  const set = (occasion === "wedding" && WEDDING_BY_THEME[theme.id]) || PHOTO_SETS[occasion];
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
      venueImage: set.venues[i] ? image(set.venues[i]) : null,
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
    story: `${spec.story}\n\nThis is a sample page: names, places and dates are made up to show how ${theme.name} looks. Photos from Unsplash.`,
    announcement: "",
    hashtag: spec.names.length === 2 ? `${spec.names[0]}And${spec.names[1]}` : "",
    dressCode: "",
    facts: {
      nameMeaning: "", parents: "", meetingPoint: "", packingList: [], costNote: "", institution: "", turningAge: null,
      lifeDates: { born: null, passed: null },
      party: [],
      partyTitle: PARTY_TITLES[occasion]?.title ?? "Special People",
      dayName: null,
      ...spec.facts,
    },
    contact: null,
    hero: image(set.hero),
    portraits: set.portraits.map((n) => image(n)),
    gallery: set.gallery.map((n) => image(n)),
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
    shared: { enabled: true, moderated: true, items: [], total: 0, maxVideoBytes: 50 * 1024 * 1024 },
    gifts: {
      message: occasion === "funeral" ? "The family is grateful for your support at this time." : "Your presence is the greatest gift. If you'd like to bless us further, you can give below.",
      links: [],
      funds: [SAMPLE_FUNDS[occasion] ?? SAMPLE_FUNDS.wedding!],
      supporters: [
        { name: "Auntie Akos", message: "God bless you both." },
        { name: "Kojo & Efua", message: "" },
        { name: "Someone special", message: "" },
      ],
      online: true,
    },
    thankYouMessage: spec.thankYou,
    tableFinder: false,
    livestreamUrl: "",
    usher: null,
    memories: [],
    hiddenSections: [],
    shareUrl: `https://evermore.example/${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    links: { qr: `/samples/${theme.id}/qr`, card: null, calendar: null, upload: null, pass: null, live: null },
    mode: "sample",
  };
}

/** Each theme's showcase occasion on the marketing site, chosen for variety. */
const SHOWCASE: Record<string, OccasionKind> = {
  "earth-and-ivory": "wedding",
  "timeless-elegance": "anniversary",
  "golden-hour": "reunion",
  confetti: "birthday",
  serene: "funeral",
  adventure: "outing",
  "little-blessings": "naming",
  "modern-minimalist": "graduation",
  "romantic-garden": "shower",
  "luxury-editorial": "wedding",
  "traditional-celebration": "wedding",
  "contemporary-african-romance": "naming",
};

export const SAMPLE_THEMES = THEMES.map((t) => ({
  id: t.id,
  name: t.name,
  tagline: t.tagline,
  premium: t.premium,
  occasion: SHOWCASE[t.id] ?? t.suitedFor[0],
}));

export const PHOTO_CREDITS = Object.values(PHOTOS).map((p) => ({ by: p.by, id: p.id }));
