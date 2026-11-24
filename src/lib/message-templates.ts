import type { OccasionKind } from "@/lib/occasions";

// WhatsApp wording for guests: an invitation, a nudge to reply, and the reminder for the event itself.
// Three styles in English and Twi, with wording that fits each kind of occasion. No exclamation marks
// and no dashes used as punctuation. Safe on the client and the server.

export type MessageStyle = "classic" | "warm" | "brief";
export type MessageLang = "en" | "tw";
export type MessageType = "invite" | "reply" | "event3" | "eventToday";

export const STYLES: { id: MessageStyle; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Formal and gracious" },
  { id: "warm", label: "Warm", hint: "Friendly and personal" },
  { id: "brief", label: "Brief", hint: "Short and to the point" },
];

export const parseStyle = (v: unknown): MessageStyle => (v === "warm" || v === "brief" ? v : "classic");
export const parseLang = (v: unknown): MessageLang => (v === "tw" ? "tw" : "en");

export type MessageVars = {
  kind: OccasionKind;
  /** The guest's name as saved. */
  guest: string;
  /** The page title, for example "Ama & Kofi" or "Ama's 40th Birthday". */
  title: string;
  link: string;
  /** "30 May" when the host set a reply deadline. */
  deadline?: string | null;
  /** The event's name and when it happens, for the two event reminders. */
  event?: string;
  when?: string;
};

// ───────────────────────────── How each occasion is referred to

/** Words that tell us the host's title already names the occasion, so we should not name it twice. */
const NAMED = /wedding|anniversary|funeral|burial|memorial|tribute|celebration of life|naming|outdoor|ceremony|birthday|graduation|reunion|shower|opening|launch|trip|getaway|outing/i;

function reference(kind: OccasionKind, title: string, lang: MessageLang) {
  const t = title.trim() || "our celebration";
  if (NAMED.test(t)) return t;
  if (lang === "tw") {
    if (kind === "wedding") return `${t} ayeforohyɛ`;
    if (kind === "funeral") return `${t} ayie`;
    if (kind === "naming") return `${t} abadintoɔ`;
    if (kind === "anniversary") return `${t} aware afahyɛ`;
    return t;
  }
  if (kind === "wedding") return `the wedding of ${t}`;
  if (kind === "anniversary") return `the anniversary celebration of ${t}`;
  if (kind === "funeral") return `the celebration of life of ${t}`;
  if (kind === "naming") return `the naming ceremony of ${t}`;
  return t;
}

// A closing line for celebrations, by kind. Index 0 is the classic voice, 1 the warm one.
const FLOURISH: Record<OccasionKind, [string, string]> = {
  wedding: ["Your presence will make our day complete.", "It would mean the world to celebrate with the people we love."],
  birthday: ["Your company would make the day truly special.", "Come happy and hungry, and help us celebrate."],
  funeral: ["", ""],
  outing: ["Good company makes every journey better.", "Pack your good mood, we are saving you a seat."],
  naming: ["Please join us as we welcome our little one with love and blessings.", "Come and share in the joy of a new life and a beautiful new name."],
  anniversary: ["Please celebrate with us another chapter of love and faithfulness.", "Come and share in the joy of the years behind us and the years ahead."],
  graduation: ["Please join us in honouring years of hard work and a bright future.", "Come and cheer on a proud moment with us."],
  reunion: ["It has been too long, and it will be wonderful to see you.", "Come and catch up, laugh, and make new memories together."],
  shower: ["Please come and shower the guest of honour with love and good wishes.", "Come and share the joy, the laughter and the good wishes."],
  opening: ["We would be honoured to have you with us as we open our doors.", "Come and see what we have built, and share this milestone with us."],
  other: ["We would be honoured by your presence.", "It would mean a great deal to have you with us."],
};

const FLOURISH_TW: [string, string] = [
  "Wo ho a wobɛba no bɛma yɛn anigye aboro so.",
  "Yɛpɛ sɛ yɛne wo bɛyɛ no ho anigye.",
];

const HONORIFIC = /^(auntie|aunty|uncle|nana|mr|mrs|ms|miss|dr|pastor|rev|apostle|prophet|elder|deacon|madam|sir|chief|hon|prof|papa|maame|opanin|osofo|togbe|mama)\.?$/i;

/** "Auntie Esi Mensah" becomes "Auntie Esi", "Kofi Mensah" becomes "Kofi". */
function firstName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length > 1 && HONORIFIC.test(parts[0])) return `${parts[0]} ${parts[1]}`;
  return parts[0] || full;
}

// ───────────────────────────── English

function english(type: MessageType, style: MessageStyle, v: MessageVars, ref: string, grieving: boolean): string {
  const g = v.guest.trim();
  const first = firstName(g);
  const by = v.deadline ? ` We would be grateful to hear from you by ${v.deadline}.` : "";
  const byGentle = v.deadline ? ` It would help us greatly to know by ${v.deadline}.` : "";
  const ev = v.event || "the event";
  const when = v.when ? ` ${v.when}.` : "";
  const [fc, fw] = FLOURISH[v.kind];
  const today = type === "eventToday";

  if (grieving) {
    switch (type) {
      case "invite":
        return {
          classic: `Dear ${g}, with heavy hearts and deep gratitude for a life well lived, the family invites you to ${ref}. Your personal link has the order of service, the venue and directions: ${v.link}`,
          warm: `Dear ${g}, the family would be comforted to have you with them as they celebrate and remember. Everything you need for ${ref} is here, and you can let us know if you can come: ${v.link}`,
          brief: `${g}, the family invites you to ${ref}. Details and directions: ${v.link}`,
        }[style];
      case "reply":
        return {
          classic: `Dear ${g}, a gentle note about ${ref}. If you hope to be with the family, please let us know here.${byGentle} ${v.link}`,
          warm: `Dear ${first}, we are thinking of you. If you plan to be with the family for ${ref}, a quick word here helps them prepare. No pressure at all.${byGentle} ${v.link}`,
          brief: `${first}, a gentle reminder to tell the family if you can join ${ref}.${byGentle} ${v.link}`,
        }[style];
      default:
        return {
          classic: `Dear ${g}, ${today ? `today is ${ev} for ${ref}` : `${ev} for ${ref} is in three days`}.${when} Your presence will be a comfort to the family. The order of service and directions are here: ${v.link}`,
          warm: `Dear ${first}, ${today ? `today we gather for ${ev}` : `in three days we gather for ${ev}`} in memory of a loved one.${when} If you are able to be with the family, everything you need is here: ${v.link}`,
          brief: `${first}, ${today ? "today" : "in three days"}: ${ev} for ${ref}.${when} Directions: ${v.link}`,
        }[style];
    }
  }

  switch (type) {
    case "invite":
      return {
        classic: `Dear ${g}, with joy and gratitude, we invite you to ${ref}. ${fc} Your personal invitation has the programme, the venue and directions, and you can reply in a few seconds: ${v.link}`,
        warm: `Hello ${first}, we would love to have you with us at ${ref}. ${fw} Everything you need is on your personal invitation, and it takes seconds to answer: ${v.link}`,
        brief: `${g}, you are invited to ${ref}. Details and RSVP: ${v.link}`,
      }[style];
    case "reply":
      return {
        classic: `Dear ${g}, a gentle reminder about ${ref}. We have not yet received your reply, and it helps us plan with care.${by} You can answer in a few seconds: ${v.link}`,
        warm: `Hello ${first}, we are counting the days to ${ref} and saving you a place. Could you let us know if you can make it?${by} ${v.link}`,
        brief: `${first}, please reply for ${ref}.${by} ${v.link}`,
      }[style];
    default:
      return {
        classic: `Dear ${g}, ${today ? `today is the day. ${ev} for ${ref} takes place today` : `a warm reminder that ${ev} for ${ref} is in three days`}.${when} The programme and directions are here: ${v.link}`,
        warm: `Hello ${first}, ${today ? `the day is here. ${ev} for ${ref} is today` : `just three more days until ${ev} for ${ref}`}.${when} Programme and directions: ${v.link}`,
        brief: `${first}, ${today ? "today" : "in three days"}: ${ev} for ${ref}.${when} Directions: ${v.link}`,
      }[style];
  }
}

// ───────────────────────────── Twi
// Written by Claude and meant to be checked and corrected by a Twi speaker.

function twi(type: MessageType, style: MessageStyle, v: MessageVars, ref: string, grieving: boolean): string {
  const g = v.guest.trim();
  const first = firstName(g);
  const by = v.deadline ? ` Yɛpɛ sɛ yɛte wo nka ansa na ${v.deadline}.` : "";
  const ev = v.event || "nhyiamu no";
  const when = v.when ? ` ${v.when}.` : "";
  const today = type === "eventToday";
  const [fc, fw] = FLOURISH_TW;

  if (grieving) {
    switch (type) {
      case "invite":
        return {
          classic: `Nua ${g}, abusua no frɛ wo ma ${ref}. Wobɛhunu nhyehyɛeɛ ne kwan a wobɛfa so wɔ wo ankasa link yi so: ${v.link}`,
          warm: `Nua ${g}, abusua no bɛpɛ sɛ wo ne wɔn bɛtena wɔ ${ref} mu. Nsɛm nyinaa wɔ ha, na wobɛtumi aka sɛ wobɛba anaa worenba: ${v.link}`,
          brief: `${g}, abusua no frɛ wo ma ${ref}. Nsɛm ne kwan: ${v.link}`,
        }[style];
      case "reply":
        return {
          classic: `Nua ${g}, yɛkae wo brɛoo wɔ ${ref} ho. Sɛ wobɛtumi abɛka abusuafoɔ no ho a, ka kyerɛ yɛn wɔ ha.${by} ${v.link}`,
          warm: `Nua ${first}, yɛte wo ho. Sɛ wopɛ sɛ wobɛka abusua no ho wɔ ${ref} mu a, ka kyerɛ yɛn wɔ ha. Hwee nsi wo so.${by} ${v.link}`,
          brief: `${first}, ka kyerɛ abusua no sɛ wobɛba ${ref} anaa.${by} ${v.link}`,
        }[style];
      default:
        return {
          classic: `Nua ${g}, ${today ? `ɛnnɛ ne ${ev} ma ${ref}` : `aka nnansa a ${ev} ma ${ref} bɛba`}.${when} Wo ho a wobɛba no bɛma abusua no ahotɔ. Nhyehyɛeɛ ne kwan: ${v.link}`,
          warm: `Nua ${first}, ${today ? `ɛnnɛ yɛboaboa yɛn ho ano` : `nnansa akyi yɛbɛboaboa yɛn ho ano`} wɔ ${ev} mu.${when} Sɛ wotumi ba a, nsɛm nyinaa wɔ ha: ${v.link}`,
          brief: `${first}, ${today ? "ɛnnɛ" : "nnansa akyi"}: ${ev} ma ${ref}.${when} Kwan: ${v.link}`,
        }[style];
    }
  }

  switch (type) {
    case "invite":
      return {
        classic: `Ɔdɔfo ${g}, ɛyɛ yɛn anigye sɛ yɛfrɛ wo ma ${ref}. ${fc} Wobɛhunu nhyehyɛeɛ nyinaa wɔ wo ankasa link yi so, na wobɛtumi aka sɛ wobɛba anaa worenba: ${v.link}`,
        warm: `Hello ${first}, yɛpɛ sɛ wo ne yɛn bɛtena wɔ ${ref} mu. ${fw} Nsɛm nyinaa wɔ wo link yi so, na ɛyɛ mmirika sɛ wobɛbua: ${v.link}`,
        brief: `${g}, yɛfrɛ wo ma ${ref}. Nsɛm ne mmuae: ${v.link}`,
      }[style];
    case "reply":
      return {
        classic: `Ɔdɔfo ${g}, yɛkae wo brɛoo wɔ ${ref} ho. Yɛnnya wo mmuae mfa, na ɛboa yɛn ma yɛhyehyɛ ade yiye.${by} Wobɛtumi abua wɔ ha: ${v.link}`,
        warm: `Hello ${first}, yɛrebɛkyerɛ ${ref} na yɛagya wo hɔ. Wobɛtumi aka kyerɛ yɛn sɛ wobɛba anaa?${by} ${v.link}`,
        brief: `${first}, bua ma ${ref}.${by} ${v.link}`,
      }[style];
    default:
      return {
        classic: `Ɔdɔfo ${g}, ${today ? `ɛnnɛ ne da no. ${ev} ma ${ref} wɔ ɛnnɛ` : `yɛkae wo brɛoo sɛ aka nnansa a ${ev} ma ${ref} bɛba`}.${when} Nhyehyɛeɛ ne kwan a wobɛfa so: ${v.link}`,
        warm: `Hello ${first}, ${today ? `da no aduru. ${ev} ma ${ref} ne ɛnnɛ` : `aka nnansa pɛ na ${ev} ma ${ref} aba`}.${when} Nhyehyɛeɛ ne kwan: ${v.link}`,
        brief: `${first}, ${today ? "ɛnnɛ" : "nnansa akyi"}: ${ev} ma ${ref}.${when} Kwan: ${v.link}`,
      }[style];
  }
}

// ───────────────────────────── Public

export function renderMessage(type: MessageType, v: MessageVars, style: MessageStyle = "classic", lang: MessageLang = "en", remembrance = v.kind === "funeral"): string {
  const ref = reference(v.kind, v.title, lang);
  const text = lang === "tw" ? twi(type, style, v, ref, remembrance) : english(type, style, v, ref, remembrance);
  return text.replace(/\s{2,}/g, " ").replace(/\s+([.,:])/g, "$1").trim();
}
