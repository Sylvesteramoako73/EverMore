import type { Phase } from "@/lib/wedding-rules";

// Everything a wedding page renders, already filtered for the viewer. Built on the server
// (src/server/public-wedding.ts) or from sample data; contains no private fields.

export type ImageView = { id: string; src: string; thumb: string; alt: string; caption: string; width: number | null; height: number | null; placeholder: string | null };

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
};

export type RsvpView = {
  open: boolean;
  closedReason: string | null;
  deadline: string | null;
  events: { id: string; name: string; startsAt: string; timezone: string }[];
  maxPartySize: number;
  mealOptions: string[];
  askDietary: boolean;
  /** Present when viewing through a personal invitation link. */
  invitation: { token: string; guestName: string; existing: boolean } | null;
};

export type MemoryView = { id: string; title: string; body: string; happenedOn: string; location: string; images: ImageView[] };

export type WeddingView = {
  id: string;
  slug: string;
  themeId: string;
  partnerOne: string;
  partnerTwo: string;
  monogram: string;
  guestMessage: string;
  story: string;
  announcement: string;
  hashtag: string;
  dressCode: string;
  contact: { name: string; email: string; phone: string } | null;
  hero: ImageView | null;
  portraits: ImageView[];
  gallery: ImageView[];
  events: EventView[];
  primaryEventId: string | null;
  phase: Phase;
  marriageDate: string | null;
  timezone: string;
  rsvp: RsvpView;
  guestbook: { enabled: boolean; moderated: boolean; entries: { id: string; name: string; message: string; createdAt: string }[] };
  gifts: { message: string; links: { label: string; url: string }[] };
  thankYouMessage: string;
  memories: MemoryView[];
  hiddenSections: string[];
  shareUrl: string;
  /** Draft/preview banner, sample pages, and invitation context. */
  mode: "live" | "preview" | "sample";
};
