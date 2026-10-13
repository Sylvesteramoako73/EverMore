"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { saveCouple, saveWeddingInfo } from "@/app/actions/wedding";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WEDDING_TYPES, type FormState } from "@/lib/validation";
import { AutosaveStatus, useAutosave } from "./autosave";

export type CoupleValues = {
  partnerOneFullName: string;
  partnerOneDisplayName: string;
  partnerTwoFullName: string;
  partnerTwoDisplayName: string;
  monogram: string;
  story: string;
  guestMessage: string;
  relationshipStartDate: string | null;
  engagementDate: string | null;
};

export type WeddingInfoValues = {
  weddingDate: string | null;
  timezone: string;
  weddingType: string;
  rsvpDeadline: string | null;
  dressCode: string;
  announcement: string;
  hashtag: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

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

/**
 * Couple details. With `autosave` (existing weddings) changes save as you type; the first time
 * (no wedding yet) the Continue button creates the wedding.
 */
export function CoupleForm({
  values,
  autosave,
  submitLabel,
  onSaved,
}: {
  values?: CoupleValues;
  autosave: boolean;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(saveCouple, undefined);
  const { status, schedule } = useAutosave(ref, saveCouple);
  const tzRef = useRef<HTMLInputElement>(null);
  // New weddings default to the browser's timezone; written straight into the hidden field.
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);
  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);
  const e = state?.errors ?? {};
  const v = (k: keyof CoupleValues) => state?.values?.[k] ?? values?.[k] ?? "";

  return (
    <form ref={ref} action={action} onChange={autosave ? schedule : undefined} className="space-y-8" noValidate>
      <input ref={tzRef} type="hidden" name="browserTimezone" defaultValue="" />
      <FormAlert state={state?.ok ? undefined : state} />
      <Group title="Your names" description="Your full names appear in invitations; display names are what guests see in large type.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your full name" errors={e.partnerOneFullName}>
            <Input name="partnerOneFullName" autoComplete="name" defaultValue={v("partnerOneFullName")} required />
          </Field>
          <Field label="Your partner's full name" errors={e.partnerTwoFullName}>
            <Input name="partnerTwoFullName" defaultValue={v("partnerTwoFullName")} required />
          </Field>
          <Field label="Display name" optional hint="Defaults to your first name." errors={e.partnerOneDisplayName}>
            <Input name="partnerOneDisplayName" defaultValue={v("partnerOneDisplayName")} />
          </Field>
          <Field label="Partner's display name" optional errors={e.partnerTwoDisplayName}>
            <Input name="partnerTwoDisplayName" defaultValue={v("partnerTwoDisplayName")} />
          </Field>
          <Field label="Monogram or initials" optional hint="For example A&K. Shown in your page's menu." errors={e.monogram}>
            <Input name="monogram" maxLength={8} defaultValue={v("monogram")} />
          </Field>
        </div>
      </Group>

      <Group title="Your story" description="All optional. Leave anything blank if you prefer a simple invitation.">
        <Field label="A message to your guests" optional errors={e.guestMessage}>
          <Textarea name="guestMessage" rows={3} placeholder="We can't wait to celebrate with the people we love most." defaultValue={v("guestMessage")} />
        </Field>
        <Field label="How you met, the proposal, your love story" optional errors={e.story}>
          <Textarea name="story" rows={6} defaultValue={v("story")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="When your relationship began" optional errors={e.relationshipStartDate}>
            <Input type="date" name="relationshipStartDate" defaultValue={v("relationshipStartDate")} />
          </Field>
          <Field label="Engagement date" optional errors={e.engagementDate}>
            <Input type="date" name="engagementDate" defaultValue={v("engagementDate")} />
          </Field>
        </div>
      </Group>

      <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        {autosave ? <AutosaveStatus status={status} /> : <span />}
        <SubmitButton size="lg" pending="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function WeddingInfoForm({
  values,
  zones,
  submitLabel,
  onSaved,
}: {
  values: WeddingInfoValues;
  zones: string[];
  submitLabel: string;
  onSaved?: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(saveWeddingInfo, undefined);
  const { status, schedule } = useAutosave(ref, saveWeddingInfo);
  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);
  const e = state?.errors ?? {};
  const v = (k: keyof WeddingInfoValues) => state?.values?.[k] ?? values[k] ?? "";

  return (
    <form ref={ref} action={action} onChange={schedule} className="space-y-8" noValidate>
      <FormAlert state={state?.ok ? undefined : state} />
      <Group title="The big day" description="You'll add each ceremony and celebration with its own time and venue in the next step.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Wedding date" optional hint="The date you'll count anniversaries from. Leave blank to use your main event's date." errors={e.weddingDate}>
            <Input type="date" name="weddingDate" defaultValue={v("weddingDate")} />
          </Field>
          <Field label="Your timezone" hint="Used for your RSVP deadline and new events." errors={e.timezone}>
            <select name="timezone" defaultValue={v("timezone") || "UTC"} className="h-11 w-full rounded-lg border border-input bg-white px-3.5 text-base">
              {zones.map((z) => (
                <option key={z} value={z}>{z.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Type of wedding" optional errors={e.weddingType}>
            <Input name="weddingType" list="wedding-types" defaultValue={v("weddingType")} placeholder="Traditional & religious" />
          </Field>
          <Field label="RSVP deadline" optional hint="RSVPs close at the end of this day." errors={e.rsvpDeadline}>
            <Input type="date" name="rsvpDeadline" defaultValue={v("rsvpDeadline")} />
          </Field>
          <Field label="Dress code" optional hint="A general note; each event can have its own." errors={e.dressCode}>
            <Input name="dressCode" defaultValue={v("dressCode")} placeholder="Formal, with a splash of colour" />
          </Field>
          <Field label="Wedding hashtag" optional errors={e.hashtag}>
            <Input name="hashtag" defaultValue={v("hashtag")} placeholder="AmaAndKofi2027" />
          </Field>
        </div>
        <datalist id="wedding-types">
          {WEDDING_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
        <Field label="Announcement" optional hint="Anything else guests should know: accommodation, children, travel…" errors={e.announcement}>
          <Textarea name="announcement" rows={4} defaultValue={v("announcement")} />
        </Field>
      </Group>

      <Group title="Questions from guests" description="Optional contact shown at the bottom of your page.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Contact name" optional errors={e.contactName}>
            <Input name="contactName" defaultValue={v("contactName")} placeholder="Our planner, Efua" />
          </Field>
          <Field label="Contact email" optional errors={e.contactEmail}>
            <Input type="email" name="contactEmail" defaultValue={v("contactEmail")} />
          </Field>
          <Field label="Contact phone" optional errors={e.contactPhone}>
            <Input type="tel" name="contactPhone" defaultValue={v("contactPhone")} />
          </Field>
        </div>
      </Group>

      <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        <AutosaveStatus status={status} />
        <SubmitButton size="lg" pending="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export type { FormState };
