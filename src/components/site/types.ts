import type { Phase } from "@/lib/celebration-rules";
import type { ColourSwatch, OccasionKind, RsvpContact } from "@/lib/occasions";

// Everything a celebration page renders, already filtered for the viewer. Built on the server
// (src/server/public-celebration.ts) or from sample data; contains no private fields.

export type ImageView = {
  id: string;
  src: string;
  thumb: string;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  placeholder: string | null;
};

export type EventView = {
  id: string;
  name: string;
  startsAt: string; // ISO
  endsAt: string | null;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueLat: number | null;
  venueLng: number | null;
  description: string;
  dressCode: string;
  icon: string;
  venueImage: ImageView | null;
};

export type RsvpView = {
  open: boolean;
  closedReason: string | null;
  deadline: string | null;
  events: { id: string; name: string; startsAt: string; timezone: string }[];
  maxPartySize: number;
  mealOptions: string[];
  askDietary: boolean;
  contacts: RsvpContact[];
  /** Present when viewing through a personal invitation link. */
  invitation: { token: string; guestName: string; existing: boolean; tableName: string } | null;
};

export type MemoryView = { id: string; title: string; body: string; happenedOn: string; location: string; images: ImageView[] };

/** A gift or contribution fund. Amounts are in minor units (pesewas). `raised` is null when hidden. */
export type FundView = {
  id: string;
  title: string;
  description: string;
  goal: number | null;
  raised: number | null;
  count: number;
  currency: string;
  momo: { number: string; name: string; network: string } | null;
};

export type SharedItem = ImageView & { kind: "photo" | "video"; guestName: string; downloadUrl: string };

/** Occasion wording and behaviour, resolved on the server so client components stay small. */
export type OccasionView = {
  kind: OccasionKind;
  label: string;
  countdown: boolean;
  after: "married" | "remembrance" | "memories";
  copy: {
    hostLine: string;
    invitation: string;
    today: string;
    afterLead: string;
    storyTitle: string;
    scheduleTitle: string;
    guestbookTitle: string;
    guestbookPrompt: string;
    thankYouTitle: string;
    dateTitle: string;
  };
};

export type CelebrationView = {
  id: string;
  slug: string;
  themeId: string;
  occasion: OccasionView;
  /** The headline, e.g. "Ama & Kofi", "Kwame at 50". */
  title: string;
  /** Display names of the people the page is about (partners, birthday person, loved one, baby). */
  names: string[];
  monogram: string;
  guestMessage: string;
  story: string;
  announcement: string;
  hashtag: string;
  dressCode: string;
  facts: {
    nameMeaning: string;
    parents: string;
    meetingPoint: string;
    packingList: string[];
    costNote: string;
    institution: string;
    turningAge: number | null;
    /** Remembrance pages: "1948 – 2026" style life dates. */
    lifeDates: { born: string | null; passed: string | null };
    /** People with special roles, and the section title for them ("The Bridal Party"). */
    party: { name: string; role: string }[];
    partyTitle: string;
    /** Akan day names for the day of birth (naming and birthday pages). */
    dayName: { day: string; male: string; female: string } | null;
  };
  contact: { name: string; email: string; phone: string } | null;
  hero: ImageView | null;
  portraits: ImageView[];
  gallery: ImageView[];
  colours: ColourSwatch[];
  events: EventView[];
  primaryEventId: string | null;
  phase: Phase;
  /** The yearly date (wedding day, birthday, date of passing) for counters and the closing card. */
  keyDate: string | null;
  timezone: string;
  rsvp: RsvpView;
  guestbook: { enabled: boolean; moderated: boolean; entries: { id: string; name: string; message: string; createdAt: string }[] };
  shared: { enabled: boolean; moderated: boolean; items: SharedItem[]; total: number };
  gifts: {
    message: string;
    links: { label: string; url: string }[];
    funds: FundView[];
    /** Recent confirmed givers (anonymous ones shown as "Someone special"). */
    supporters: { name: string; message: string }[];
    /** Online MoMo/card payment through Paystack is available. */
    online: boolean;
  };
  thankYouMessage: string;
  /** Guests can look up their table by name on the page. */
  tableFinder: boolean;
  /** Stream link for people watching from afar. */
  livestreamUrl: string;
  /** A host or usher opened a guest's personal link (e.g. by scanning their entry pass): offer check-in. */
  usher: { slug: string; token: string; name: string; tableName: string; maxPartySize: number; checkedInCount: number } | null;
  memories: MemoryView[];
  hiddenSections: string[];
  shareUrl: string;
  /** Links that differ between real pages and samples. */
  links: { qr: string; card: string | null; calendar: string | null; upload: string | null; pass: string | null; live: string | null };
  /** Draft/preview banner, sample pages, and invitation context. */
  mode: "live" | "preview" | "sample";
};
