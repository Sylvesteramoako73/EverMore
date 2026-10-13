import { z } from "zod";
import { isValidTimeZone } from "./dates";
import { slugProblem } from "./slug";
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

// ───────────────────────────── Onboarding / wedding details

export const coupleSchema = z
  .object({
    partnerOneFullName: required(80, "Your full name"),
    partnerOneDisplayName: text(40),
    partnerTwoFullName: required(80, "Your partner's full name"),
    partnerTwoDisplayName: text(40),
    monogram: text(8),
    story: text(8000),
    guestMessage: text(2000),
    relationshipStartDate: optionalPlainDate,
    engagementDate: optionalPlainDate,
  })
  // Display names default to the first name.
  .transform((d) => ({
    ...d,
    partnerOneDisplayName: d.partnerOneDisplayName || d.partnerOneFullName.split(/\s+/)[0],
    partnerTwoDisplayName: d.partnerTwoDisplayName || d.partnerTwoFullName.split(/\s+/)[0],
  }));
export type CoupleInput = z.infer<typeof coupleSchema>;

export const WEDDING_TYPES = [
  "Traditional",
  "Religious",
  "Civil",
  "Traditional & religious",
  "Destination",
  "Elopement",
  "Other",
] as const;

export const weddingInfoSchema = z.object({
  weddingDate: optionalPlainDate,
  timezone,
  weddingType: text(60),
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
});
export type WeddingInfoInput = z.infer<typeof weddingInfoSchema>;

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
    rsvpRequired: checkbox,
    inviteOnly: checkbox,
  })
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

export const SECTION_IDS = ["story", "schedule", "gallery", "rsvp", "guestbook", "gifts", "memories"] as const;

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
  giftMessage: text(2000),
  giftLinks: z
    .array(z.object({ label: required(60, "Label"), url: httpsUrl }))
    .max(5, "Add up to 5 links."),
  thankYouMessage: text(2000),
  hiddenSections: z.array(z.enum(SECTION_IDS)),
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

export const rsvpBaseSchema = z.object({
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
});

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
