"use client";

import { PARTY_TITLES } from "@/lib/akan";
import { Cake, Feather, Heart, Loader2, Sparkles, Store, Users } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { draftFromSentence } from "@/app/actions/ai";
import { saveBasics, saveCelebrationInfo, saveColours, saveRsvpContacts } from "@/app/actions/celebration";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOccasion, OCCASION_GROUPS, OCCASIONS, type ColourSwatch, type OccasionDetails, type OccasionKind, type RsvpContact } from "@/lib/occasions";
import type { FormState } from "@/lib/validation";
import { AutosaveStatus, useAutosave } from "./autosave";

export type BasicsValues = { kind: OccasionKind; title: string; honorees: { fullName: string; displayName: string }[]; monogram: string };

export type CelebrationInfoValues = {
  keyDate: string | null;
  timezone: string;
  subtype: string;
  story: string;
  guestMessage: string;
  rsvpDeadline: string | null;
  dressCode: string;
  announcement: string;
  hashtag: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  details: OccasionDetails;
};

const GROUP_ICONS = { love: Heart, milestones: Cake, remembrance: Feather, together: Users, business: Store } as const;

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="text-2xl text-navy">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Footer({ autosave, status, label }: { autosave: boolean; status: Parameters<typeof AutosaveStatus>[0]["status"]; label: string }) {
  return (
    <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
      {autosave ? <AutosaveStatus status={status} /> : <span />}
      <SubmitButton size="lg" pending="Saving…">{label}</SubmitButton>
    </div>
  );
}


// ───────────────────────────── Describe your event (AI draft)

const DRAFT_LABELS: Record<string, string> = {
  keyDate: "date", dressCode: "dress code", guestMessage: "message to guests", story: "story", announcement: "notes for guests",
  hashtag: "hashtag", turningAge: "age", institution: "school", meetingPoint: "meeting point", packingList: "what to bring",
  costNote: "costs", nameMeaning: "name meaning", parents: "parents", dateOfBirth: "date of birth", dateOfPassing: "date of passing",
};

const SENTENCE_EXAMPLES: Partial<Record<OccasionKind, string>> = {
  wedding: "Our traditional wedding is on 12 December in Takoradi, dress code is kente and gold, about 300 guests.",
  birthday: "My 40th birthday on 14 March at Axim Beach Resort, white and gold dress code, about 80 guests.",
  graduation: "I am graduating from the University of Cape Coast with a BSc in Nursing, celebration lunch on 20 June.",
  funeral: "Celebrating the life of our father, Mr Kwame Mensah, who passed on 3 May, burial service in Sekondi.",
  naming: "Our daughter's naming ceremony on Saturday 9 August in Kumasi, her name is Nhyira which means blessing.",
};

/** Fills only the boxes the host has left empty, so nothing they typed is ever overwritten. */
function setIfEmpty(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (!value || el.value.trim()) return false;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  // Lets React and the autosave see the change as if the host typed it.
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function DescribeBox({ formRef, kind }: { formRef: RefObject<HTMLFormElement | null>; kind: OccasionKind }) {
  const [sentence, setSentence] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setNote(null);
    start(async () => {
      const result = await draftFromSentence(sentence);
      const form = formRef.current;
      if (!result.ok || !form) return setNote({ tone: "error", text: result.ok ? "Please try again." : result.message });
      const filled: string[] = [];
      for (const [name, raw] of Object.entries(result.draft)) {
        const value = Array.isArray(raw) ? raw.join("\n") : raw === null ? "" : String(raw);
        if (setIfEmpty(form, name, value)) filled.push(DRAFT_LABELS[name] ?? name);
      }
      setNote(
        filled.length
          ? { tone: "ok", text: `Drafted: ${filled.join(", ")}. Please read each one and change anything that is not right.` }
          : { tone: "ok", text: "Nothing new to fill in. Add more detail, or the boxes below are already filled." },
      );
    });
  }

  return (
    <section aria-labelledby="describe-title" className="rounded-2xl border border-champagne bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-champagne-deep" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 id="describe-title" className="text-xl text-navy">Describe your event in one sentence</h2>
            <p className="mt-1 text-sm text-muted-foreground">We will draft the empty boxes below for you. You review everything, and we never make up a venue, time or name.</p>
          </div>
          <Textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            rows={3}
            maxLength={600}
            aria-label="Your event in one sentence"
            placeholder={SENTENCE_EXAMPLES[kind] ?? "Tell us what it is, when, where and anything guests should know."}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={run} disabled={pending || sentence.trim().length < 15}>
              {pending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Drafting…</>) : "Fill in my details"}
            </Button>
            <p aria-live="polite" className={`text-sm ${note?.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>{note?.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────── Step 1: what & who

/**
 * Choose the occasion, then name the people it's about. With `autosave` (existing celebrations)
 * changes save as you type; the first time the Continue button creates the celebration.
 */
export function BasicsForm({ values, autosave, submitLabel, onSaved }: { values?: BasicsValues; autosave: boolean; submitLabel: string; onSaved?: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const tzRef = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(saveBasics, undefined);
  const { status, schedule } = useAutosave(ref, saveBasics);
  const [kind, setKind] = useState<OccasionKind>((state?.values?.kind as OccasionKind) ?? values?.kind ?? "wedding");
  const [names, setNames] = useState<string[]>([
    state?.values?.honoree0 ?? values?.honorees[0]?.displayName ?? "",
    state?.values?.honoree1 ?? values?.honorees[1]?.displayName ?? "",
  ]);
  const occasion = getOccasion(kind);
  const e = state?.errors ?? {};

  // New celebrations default to the browser's timezone; written straight into the hidden field.
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);
  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);

  const suggested = occasion.defaultTitle(names.slice(0, occasion.honorees.max).map((n) => n.split(/\s+/)[0]).filter(Boolean));

  return (
    <form ref={ref} action={action} onChange={autosave ? schedule : undefined} className="space-y-10" noValidate>
      <input ref={tzRef} type="hidden" name="browserTimezone" defaultValue="" />
      <FormAlert state={state?.ok ? undefined : state} />

      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-navy">What are you celebrating?</legend>
        <div className="space-y-6">
          {OCCASION_GROUPS.map((g) => {
            const Icon = GROUP_ICONS[g.id];
            const items = Object.values(OCCASIONS).filter((o) => o.group === g.id);
            return (
              <div key={g.id}>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {g.label}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((o) => (
                    <label
                      key={o.kind}
                      className={`cursor-pointer rounded-xl border-2 bg-white p-4 transition ${kind === o.kind ? "border-navy shadow-sm" : "border-border hover:border-navy/30"}`}
                    >
                      <input type="radio" name="kind" value={o.kind} checked={kind === o.kind} onChange={() => setKind(o.kind)} className="sr-only" />
                      <span className="block font-semibold text-navy">{o.label}</span>
                      <span className="mt-1 block text-sm leading-snug text-muted-foreground">{o.pitch}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {e.kind && <p className="mt-2 text-sm text-destructive" role="alert">{e.kind[0]}</p>}
      </fieldset>

      {occasion.honorees.max > 0 && (
        <Group title={occasion.honorees.max === 2 ? "The two of you" : "Who it's for"} description="Full names appear in invitations; display names are what guests see in large type.">
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: occasion.honorees.max }, (_, i) => (
              <div key={i} className="space-y-4">
                <Field label={occasion.honorees.labels[i] ?? "Full name"} optional={i >= occasion.honorees.min} errors={e[`honoree${i}`]}>
                  <Input
                    name={`honoree${i}`}
                    defaultValue={state?.values?.[`honoree${i}`] ?? values?.honorees[i]?.fullName ?? ""}
                    onChange={(ev) => setNames((n) => n.map((x, j) => (j === i ? ev.target.value : x)))}
                    autoComplete={i === 0 && occasion.honorees.max === 2 ? "name" : "off"}
                  />
                </Field>
                <Field label="Display name" optional hint="Defaults to the first name." errors={e[`honoree${i}Display`]}>
                  <Input name={`honoree${i}Display`} defaultValue={state?.values?.[`honoree${i}Display`] ?? values?.honorees[i]?.displayName ?? ""} />
                </Field>
              </div>
            ))}
          </div>
        </Group>
      )}

      <Group title="Headline" description="The big title on your page.">
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          <Field
            label="Title"
            optional={occasion.honorees.min > 0}
            hint={occasion.honorees.min > 0 ? `Leave blank to use “${suggested}”.` : "For example: Akosombo Getaway, Class of 2006 Reunion."}
            errors={e.title}
          >
            <Input name="title" defaultValue={state?.values?.title ?? values?.title ?? ""} placeholder={suggested} />
          </Field>
          <Field label="Monogram" optional hint="Shown in your page's menu." errors={e.monogram}>
            <Input name="monogram" maxLength={8} defaultValue={state?.values?.monogram ?? values?.monogram ?? ""} placeholder="A&K" />
          </Field>
        </div>
      </Group>

      <Footer autosave={autosave} status={status} label={submitLabel} />
    </form>
  );
}

// ───────────────────────────── Step 2: details

export function DetailsForm({
  kind,
  values,
  zones,
  submitLabel,
  onSaved,
  aiEnabled = false,
}: {
  kind: OccasionKind;
  values: CelebrationInfoValues;
  zones: string[];
  submitLabel: string;
  onSaved?: () => void;
  aiEnabled?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(saveCelebrationInfo, undefined);
  const { status, schedule } = useAutosave(ref, saveCelebrationInfo);
  const occasion = getOccasion(kind);
  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);
  const e = state?.errors ?? {};
  const v = (k: keyof Omit<CelebrationInfoValues, "details">) => state?.values?.[k] ?? String(values[k] ?? "");
  const d = (k: keyof OccasionDetails) => {
    const raw = state?.values?.[k] ?? values.details[k];
    // Lists come back one per line; party members as "Name — Role".
    if (Array.isArray(raw)) return raw.map((x) => (typeof x === "string" ? x : `${x.name}${x.role ? ` — ${x.role}` : ""}`)).join("\n");
    return raw === null || raw === undefined ? "" : String(raw);
  };
  // Birthdays, namings and memorials take their yearly date from the dates below.
  const ownKeyDate = !["birthday", "funeral", "naming"].includes(kind);
  const party = PARTY_TITLES[kind];

  return (
    <form ref={ref} action={action} onChange={schedule} className="space-y-8" noValidate>
      <FormAlert state={state?.ok ? undefined : state} />

      {aiEnabled && <DescribeBox formRef={ref} kind={kind} />}

      {kind === "funeral" && (
        <Group title="Life dates" description="Shown gently under the name. Used for remembrance reminders, if you want them.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date of birth" optional errors={e.dateOfBirth}><Input type="date" name="dateOfBirth" defaultValue={d("dateOfBirth")} /></Field>
            <Field label="Date of passing" optional errors={e.dateOfPassing}><Input type="date" name="dateOfPassing" defaultValue={d("dateOfPassing")} /></Field>
          </div>
        </Group>
      )}
      {kind === "birthday" && (
        <Group title="The birthday">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date of birth" optional hint="Only used for yearly reminders; not shown on the page." errors={e.dateOfBirth}><Input type="date" name="dateOfBirth" defaultValue={d("dateOfBirth")} /></Field>
            <Field label="Turning" optional hint="For a milestone like 30, 50 or 70." errors={e.turningAge}><Input type="number" min={0} max={130} name="turningAge" defaultValue={d("turningAge")} /></Field>
          </div>
        </Group>
      )}
      {kind === "naming" && (
        <Group title="The little one">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date of birth" optional errors={e.dateOfBirth}><Input type="date" name="dateOfBirth" defaultValue={d("dateOfBirth")} /></Field>
            <Field label="Parents" optional errors={e.parents}><Input name="parents" defaultValue={d("parents")} placeholder="Akosua & Kojo Mensah" /></Field>
          </div>
          <Field label="The name & its meaning" optional errors={e.nameMeaning}><Textarea name="nameMeaning" rows={2} defaultValue={d("nameMeaning")} placeholder="Nhyira means “blessing” in Twi." /></Field>
        </Group>
      )}
      {kind === "graduation" && (
        <Group title="The graduation">
          <Field label="School or university" optional errors={e.institution}><Input name="institution" defaultValue={d("institution")} /></Field>
        </Group>
      )}
      {kind === "outing" && (
        <Group title="Trip details" description="Shown in a “Good to know” section.">
          <Field label="Meeting point" optional errors={e.meetingPoint}><Textarea name="meetingPoint" rows={2} defaultValue={d("meetingPoint")} placeholder="Accra Mall car park, main entrance. The bus leaves at 7:00." /></Field>
          <Field label="What to bring" optional hint="One item per line." errors={e.packingList}><Textarea name="packingList" rows={4} defaultValue={d("packingList")} placeholder={"Swimwear\nWalking shoes\nSunscreen"} /></Field>
          <Field label="Costs" optional errors={e.costNote}><Textarea name="costNote" rows={2} defaultValue={d("costNote")} placeholder="GH₵ 850 per person covers transport, lodging and meals." /></Field>
        </Group>
      )}
      {(kind === "wedding" || kind === "anniversary") && (
        <Group title="Your love story dates" description="Optional; used for your memories timeline.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="When you met or started dating" optional errors={e.relationshipStartDate}><Input type="date" name="relationshipStartDate" defaultValue={d("relationshipStartDate")} /></Field>
            <Field label="Engagement date" optional errors={e.engagementDate}><Input type="date" name="engagementDate" defaultValue={d("engagementDate")} /></Field>
          </div>
        </Group>
      )}

      {party && (
        <Group title={party.title} description={party.hint}>
          <Field label="One person per line: name — role" optional errors={e.party}>
            <Textarea name="party" rows={4} defaultValue={d("party")} placeholder={party.example} />
          </Field>
        </Group>
      )}

      <Group title="When" description="You'll add each part of the day, with its own time and venue, in the next step.">
        <div className="grid gap-5 sm:grid-cols-2">
          {ownKeyDate && (
            <Field label={occasion.copy.keyDateLabel} optional hint="Leave blank to use your main event's date." errors={e.keyDate}>
              <Input type="date" name="keyDate" defaultValue={v("keyDate")} />
            </Field>
          )}
          <Field label="Your timezone" hint="Used for reply deadlines and new events." errors={e.timezone}>
            <select name="timezone" defaultValue={v("timezone") || "UTC"} className="h-11 w-full rounded-lg border border-input bg-white px-3.5 text-base">
              {zones.map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Reply deadline" optional hint="RSVPs close at the end of this day." errors={e.rsvpDeadline}>
            <Input type="date" name="rsvpDeadline" defaultValue={v("rsvpDeadline")} />
          </Field>
          <Field label="Dress code" optional hint="Each event can also have its own." errors={e.dressCode}>
            <Input name="dressCode" defaultValue={v("dressCode")} placeholder={kind === "funeral" ? "Black & red" : "Formal, with a splash of colour"} />
          </Field>
        </div>
      </Group>

      <Group title={occasion.copy.storyTitle} description="All optional. Leave anything blank for a simple page.">
        <Field label="A short message to guests" optional errors={e.guestMessage}>
          <Textarea name="guestMessage" rows={2} defaultValue={v("guestMessage")} />
        </Field>
        <Field label={kind === "funeral" ? "Life story" : "The story"} optional errors={e.story}>
          <Textarea name="story" rows={6} defaultValue={v("story")} />
        </Field>
        <Field label="Anything else guests should know" optional hint="Accommodation, children, travel, parking…" errors={e.announcement}>
          <Textarea name="announcement" rows={3} defaultValue={v("announcement")} />
        </Field>
        {kind !== "funeral" && (
          <Field label="Hashtag" optional errors={e.hashtag}>
            <Input name="hashtag" defaultValue={v("hashtag")} placeholder="AmaAndKofi2027" />
          </Field>
        )}
      </Group>

      <Group title="Questions from guests" description="Optional contact shown at the bottom of your page.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Contact name" optional errors={e.contactName}><Input name="contactName" defaultValue={v("contactName")} /></Field>
          <Field label="Contact email" optional errors={e.contactEmail}><Input type="email" name="contactEmail" defaultValue={v("contactEmail")} /></Field>
          <Field label="Contact phone" optional errors={e.contactPhone}><Input type="tel" name="contactPhone" defaultValue={v("contactPhone")} /></Field>
        </div>
      </Group>

      <Footer autosave status={status} label={submitLabel} />
    </form>
  );
}

// ───────────────────────────── Colours of the day

const COLOUR_PRESETS: ColourSwatch[][] = [
  [{ name: "Taupe", hex: "#A09081", note: "" }, { name: "Mocha", hex: "#291811", note: "" }, { name: "Ivory", hex: "#F6EEE1", note: "" }],
  [{ name: "Emerald", hex: "#0F6B4F", note: "" }, { name: "Gold", hex: "#C69A4A", note: "" }],
  [{ name: "Black", hex: "#111111", note: "" }, { name: "Red", hex: "#9B1C1C", note: "" }],
  [{ name: "Blush", hex: "#F2D5D3", note: "" }, { name: "Sage", hex: "#AEBFA5", note: "" }, { name: "White", hex: "#FFFFFF", note: "" }],
];

export function ColoursEditor({ colours, useColourTheme = true }: { colours: ColourSwatch[]; useColourTheme?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveColours, undefined);
  const [rows, setRows] = useState<ColourSwatch[]>(colours.length ? colours : []);
  const update = (i: number, patch: Partial<ColourSwatch>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      {rows.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Start from a palette, or add your own colours.</p>
          <div className="flex flex-wrap gap-2">
            {COLOUR_PRESETS.map((p) => (
              <button key={p.map((c) => c.name).join()} type="button" onClick={() => setRows(p)} className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm hover:border-navy/40">
                <span className="flex" aria-hidden>{p.map((c) => <span key={c.hex} className="-ml-1 h-4 w-4 rounded-full border border-black/10 first:ml-0" style={{ background: c.hex }} />)}</span>
                {p.map((c) => c.name).join(", ")}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((c, i) => (
          <li key={i} className="grid items-end gap-3 rounded-xl border border-border bg-white p-3 sm:grid-cols-[auto_1fr_1fr_2fr_auto]">
            <label className="block">
              <span className="sr-only">Colour {i + 1}</span>
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#000000"} onChange={(ev) => update(i, { hex: ev.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-input bg-white p-1" />
            </label>
            <Field label="Name"><Input name="colourName" value={c.name} onChange={(ev) => update(i, { name: ev.target.value })} /></Field>
            <Field label="Hex"><Input name="colourHex" value={c.hex} onChange={(ev) => update(i, { hex: ev.target.value })} /></Field>
            <Field label="Note" optional><Input name="colourNote" value={c.note} onChange={(ev) => update(i, { note: ev.target.value })} placeholder="e.g. Saturday" /></Field>
            <Button type="button" variant="ghost" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label={`Remove ${c.name || "colour"}`}>Remove</Button>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
        <input type="checkbox" name="useColourTheme" defaultChecked={useColourTheme} className="mt-1 h-4 w-4 accent-[var(--navy)]" />
        <span>
          <span className="block text-sm font-medium text-navy">Design the page in these colours</span>
          <span className="block text-sm text-muted-foreground">Buttons, accents and colour bands take on your colours of the day. Untick to keep the design&apos;s own palette.</span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {rows.length < 5 && (
          <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, { name: "", hex: "#C69A4A", note: "" }])}>+ Add a colour</Button>
        )}
        <SubmitButton pending="Saving…">Save colours</SubmitButton>
      </div>
    </form>
  );
}

// ───────────────────────────── RSVP contacts

export function RsvpContactsEditor({ contacts }: { contacts: RsvpContact[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveRsvpContacts, undefined);
  const [rows, setRows] = useState<RsvpContact[]>(contacts.length ? contacts : [{ name: "", phone: "" }]);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <p className="text-sm text-muted-foreground">Shown beside your RSVP form. Use the international format (+233…) so guests can also tap to WhatsApp.</p>
      <ul className="space-y-3">
        {rows.map((c, i) => (
          <li key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Name"><Input name="contactName" defaultValue={c.name} /></Field>
            <Field label="Phone"><Input name="contactPhone" type="tel" defaultValue={c.phone} placeholder="+233 54 123 4567" /></Field>
            <Button type="button" variant="ghost" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>Remove</Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {rows.length < 6 && <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, { name: "", phone: "" }])}>+ Add a contact</Button>}
        <SubmitButton pending="Saving…">Save contacts</SubmitButton>
      </div>
    </form>
  );
}

