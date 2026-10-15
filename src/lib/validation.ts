import { parseParty } from "./akan";
import { z } from "zod";
import { isValidTimeZone } from "./dates";
import { slugProblem } from "./slug";
import { getOccasion, OCCASION_KINDS, PROGRAMME_ICONS } from "./occasions";
import { THEME_IDS } from "./themes";

// Shared schemas: the same rules run in forms (for instant feedback) and on the server (authoritative).

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const required = (max: number, label: string) => text(max).min(1, `${label} is required.`);
const plainDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const optionalPlainDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Choose a valid date.")
  .transform((v) => (v === "" ? null : v));
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");
const timezone = z.string().refine(isValidTimeZone, "Choose a valid timezone.");
/** HTML checkboxes send "on" or nothing. */
const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());
const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.");
const optionalCoord = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), "Enter a valid coordinate.");

// ───────────────────────────── Onboarding / celebration details

/**
 * Step 1: what is being celebrated and who it's about. Honorees arrive as honoree0/honoree0Display…
 * and are checked against the occasion (two partners for a wedding, one for a birthday, none for an outing).
 */
export const basicsSchema = z.preprocess(
  (v) => ({ title: "", honoree0: "", honoree0Display: "", honoree1: "", honoree1Display: "", monogram: "", ...(v as object) }),
  z
  .object({
    kind: z.enum(OCCASION_KINDS, { message: "Choose what you're celebrating." }),
    title: text(120),
    honoree0: text(80),
    honoree0Display: text(40),
    honoree1: text(80),
    honoree1Display: text(40),
    monogram: text(8),
  })
  .superRefine((d, ctx) => {
    const occasion = getOccasion(d.kind);
    const names = [d.honoree0, d.honoree1];
    for (let i = 0; i < occasion.honorees.min; i++) {
      if (!names[i]) ctx.addIssue({ code: "custom", path: [`honoree${i}`], message: `${occasion.honorees.labels[i] ?? "Name"} is required.` });
    }
    if (occasion.honorees.min === 0 && !d.title) ctx.addIssue({ code: "custom", path: ["title"], message: "Give your celebration a name." });
  })
  .transform((d) => {
    const occasion = getOccasion(d.kind);
    const honorees = [
      { fullName: d.honoree0, displayName: d.honoree0Display },
      { fullName: d.honoree1, displayName: d.honoree1Display },
    ]
      .slice(0, occasion.honorees.max)
      .filter((h) => h.fullName)
      // Display names default to the first name.
      .map((h) => ({ fullName: h.fullName, displayName: h.displayName || h.fullName.split(/\s+/)[0] }));
    return {
      kind: d.kind,
      honorees,
      title: d.title || occasion.defaultTitle(honorees.map((h) => h.displayName)),
      monogram: d.monogram,
    };
  }),
);
export type BasicsInput = z.infer<typeof basicsSchema>;

const optionalAge = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 130), "Enter an age between 0 and 130.");

/** Step 2: the details. Occasion-specific fields are optional and stored together in `details`. */
const INFO_FIELDS = [
  "keyDate", "timezone", "subtype", "story", "guestMessage", "rsvpDeadline", "dressCode", "announcement", "hashtag",
  "contactName", "contactEmail", "contactPhone", "relationshipStartDate", "engagementDate", "dateOfBirth", "turningAge",
  "dateOfPassing", "nameMeaning", "parents", "meetingPoint", "packingList", "costNote", "institution", "party",
] as const;

export const celebrationInfoSchema = z.preprocess(
  // The form only shows fields relevant to the occasion; anything absent counts as empty.
  (v) => ({ ...Object.fromEntries(INFO_FIELDS.map((k) => [k, ""])), ...(v as object) }),
  z
  .object({
    keyDate: optionalPlainDate,
    timezone,
    subtype: text(60),
    story: text(8000),
    guestMessage: text(2000),
    rsvpDeadline: optionalPlainDate,
    dressCode: text(200),
    announcement: text(2000),
    hashtag: z
      .string()
      .trim()
      .transform((v) => v.replace(/^#/, ""))
      .refine((v) => v === "" || /^[\p{L}\p{N}_]{2,40}$/u.test(v), "Use letters, numbers or underscores (no spaces)."),
    contactName: text(80),
    contactEmail: optionalEmail,
    contactPhone: text(40),
    // Occasion-specific
    relationshipStartDate: optionalPlainDate,
    engagementDate: optionalPlainDate,
    dateOfBirth: optionalPlainDate,
    turningAge: optionalAge,
    dateOfPassing: optionalPlainDate,
    nameMeaning: text(500),
    parents: text(200),
    meetingPoint: text(300),
    packingList: z.string().transform((v) => v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 30)),
    costNote: text(500),
    institution: text(160),
    party: z.string().max(4000).transform(parseParty),
  })
  .transform(({ relationshipStartDate, engagementDate, dateOfBirth, turningAge, dateOfPassing, nameMeaning, parents, meetingPoint, packingList, costNote, institution, party, ...rest }) => ({
    ...rest,
    details: { relationshipStartDate, engagementDate, dateOfBirth, turningAge, dateOfPassing, nameMeaning, parents, meetingPoint, packingList, costNote, institution, party },
  })),
);
export type CelebrationInfoInput = z.infer<typeof celebrationInfoSchema>;

const hexColour = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #A09081.");

/** Colours of the day: up to 5 named swatches. */
export const coloursSchema = z
  .array(z.object({ name: required(30, "Colour name"), hex: hexColour, note: text(120) }))
  .max(5, "Add up to 5 colours.");

export const rsvpContactsSchema = z
  .array(z.object({ name: required(60, "Name"), phone: z.string().trim().regex(/^[+0-9 ()-]{6,20}$/, "Enter a phone number.") }))
  .max(6, "Add up to 6 contacts.");

export const eventSchema = z
  .object({
    name: required(80, "Event name"),
    startsLocal: localDateTime,
    endsLocal: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Choose a valid end time.")
      .transform((v) => (v === "" ? null : v)),
    timezone,
    venueName: text(120),
    venueAddress: text(300),
    venueLat: optionalCoord(-90, 90),
    venueLng: optionalCoord(-180, 180),
    description: text(2000),
    dressCode: text(200),
    icon: z.string().refine((v) => v === "" || (PROGRAMME_ICONS as readonly string[]).includes(v), "Choose an icon.").default(""),
    rsvpRequired: checkbox,
    inviteOnly: checkbox,
  })
  .transform((e) => ({ ...e, venueMediaId: undefined as string | null | undefined }))
  // Same format and timezone, so a string comparison orders them correctly.
  .refine((e) => e.endsLocal === null || e.endsLocal > e.startsLocal, {
    path: ["endsLocal"],
    message: "The end must be after the start.",
  })
  .refine((e) => (e.venueLat === null) === (e.venueLng === null), {
    path: ["venueLng"],
    message: "Enter both latitude and longitude, or neither.",
  });
export type EventInput = z.infer<typeof eventSchema>;

export const themeSchema = z.object({ themeId: z.enum(THEME_IDS) });

const httpsUrl = z
  .string()
  .trim()
  .url("Enter a full link starting with https://")
  .refine((v) => v.startsWith("https://"), "Links must start with https://");

export const SECTION_IDS = ["story", "schedule", "colours", "gallery", "rsvp", "shared", "guestbook", "gifts", "memories"] as const;

export const guestFeaturesSchema = z.object({
  rsvpEnabled: checkbox,
  openRsvp: checkbox,
  defaultPartySize: z.coerce.number().int().min(1).max(10),
  mealOptions: z
    .string()
    .transform((v) => [...new Set(v.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean))])
    .refine((v) => v.length <= 8, "Offer up to 8 meal options.")
    .refine((v) => v.every((o) => o.length <= 60), "Keep each meal option under 60 characters."),
  askDietary: checkbox,
  guestbookEnabled: checkbox,
  guestbookModeration: checkbox,
  guestUploadsEnabled: checkbox,
  guestUploadsModeration: checkbox,
  giftMessage: text(2000),
  giftLinks: z
    .array(z.object({ label: required(60, "Label"), url: httpsUrl }))
    .max(5, "Add up to 5 links."),
  thankYouMessage: text(2000),
  hiddenSections: z.array(z.enum(SECTION_IDS)),
  tableFinderEnabled: checkbox,
  livestreamUrl: z.union([z.literal(""), httpsUrl]),
});

export const publishSettingsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((v, ctx) => {
      const problem = slugProblem(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  visibility: z.enum(["public", "unlisted", "private"]),
  allowIndexing: checkbox,
});

// ───────────────────────────── Guests

/** Optional fields may be absent from the guest form (no phone field, meals not offered, declining). */
export const rsvpBaseSchema = z.preprocess(
  (v) => ({ phone: "", mealChoice: "", dietary: "", message: "", ...(v as object) }),
  z.object({
  name: required(100, "Your name"),
  email,
  phone: text(40),
  // Hidden when the guest declines everything, so default to 1.
  partySize: z.preprocess(
    (v) => (v === undefined || v === "" ? 1 : v),
    z.coerce.number({ message: "Choose how many people." }).int("Choose how many people.").min(1, "At least 1 person."),
  ),
  mealChoice: text(60),
  dietary: text(300),
  message: text(1000),
}),
);

export const guestbookSchema = z.object({
  name: required(80, "Your name"),
  message: required(1000, "Message"),
});

export const guestSchema = z.object({
  name: required(120, "Name"),
  email: optionalEmail,
  phone: text(40),
  maxPartySize: z.coerce.number().int().min(1, "At least 1.").max(20, "At most 20."),
  notes: text(500),
  tableName: text(60),
  eventIds: z.array(z.uuid()),
});
export type GuestInput = z.infer<typeof guestSchema>;

// ───────────────────────────── Memories & preferences

export const memorySchema = z.object({
  title: required(140, "Title"),
  body: text(5000),
  happenedOn: plainDate,
  location: text(140),
  isPublic: checkbox,
});

export const anniversarySchema = z.object({
  emailEnabled: checkbox,
  remindDaysBefore: z.array(z.coerce.number().int().refine((n) => [0, 1, 7, 30].includes(n))).max(4),
  includeMemoryPrompt: checkbox,
});

// ───────────────────────────── Form plumbing

export type FieldErrors = Record<string, string[] | undefined>;
export type FormState = { ok?: boolean; message?: string; errors?: FieldErrors; values?: Record<string, string> } | undefined;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** String values from a submitted form, to re-fill it after a failed submit. Never includes passwords. */
export function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION") && !/password/i.test(k)) values[k] = v;
  }
  return values;
}
