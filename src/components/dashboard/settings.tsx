"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { saveGuestFeatures } from "@/app/actions/celebration";
import { inviteHelper } from "@/app/actions/dashboard";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/validation";

export type GuestFeatureValues = {
  rsvpEnabled: boolean;
  openRsvp: boolean;
  defaultPartySize: number;
  mealOptions: string[];
  askDietary: boolean;
  guestbookEnabled: boolean;
  guestbookModeration: boolean;
  guestUploadsEnabled: boolean;
  guestUploadsModeration: boolean;
  giftMessage: string;
  giftLinks: { label: string; url: string }[];
  thankYouMessage: string;
  hiddenSections: string[];
  tableFinderEnabled: boolean;
  livestreamUrl: string;
};

const SECTIONS: [string, string][] = [
  ["story", "Story / about"],
  ["schedule", "Programme"],
  ["colours", "Colours of the day"],
  ["gallery", "Gallery"],
  ["rsvp", "RSVP"],
  ["shared", "Guests' shared photos"],
  ["guestbook", "Guestbook"],
  ["gifts", "Gifts"],
  ["memories", "Memories"],
];

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4 hover:border-navy/40">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 shrink-0 accent-[var(--navy)]" />
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function GuestFeaturesForm({ values }: { values: GuestFeatureValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveGuestFeatures, undefined);
  const [links, setLinks] = useState(values.giftLinks.length ? values.giftLinks : []);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-8" noValidate>
      <FormAlert state={state} />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg text-navy">RSVP</legend>
        <Toggle name="rsvpEnabled" label="Collect RSVPs on the page" defaultChecked={values.rsvpEnabled} />
        <Toggle
          name="openRsvp"
          label="Anyone with the link can reply"
          hint="Turn off to accept replies only from personal invitation links on your guest list."
          defaultChecked={values.openRsvp}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="People per reply (open RSVP)" hint="The most someone can reply for without a personal link." errors={e.defaultPartySize}>
            <Input name="defaultPartySize" type="number" min={1} max={10} defaultValue={values.defaultPartySize} className="w-28" />
          </Field>
          <Field label="Meal options" optional hint="One per line. Leave empty to not ask." errors={e.mealOptions}>
            <Textarea name="mealOptions" rows={3} defaultValue={values.mealOptions.join("\n")} />
          </Field>
        </div>
        <Toggle name="askDietary" label="Ask about dietary needs" defaultChecked={values.askDietary} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg text-navy">Guestbook</legend>
        <Toggle name="guestbookEnabled" label="Let guests leave messages" defaultChecked={values.guestbookEnabled} />
        <Toggle name="guestbookModeration" label="Approve messages before they appear" defaultChecked={values.guestbookModeration} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg text-navy">Guests&apos; photos &amp; videos</legend>
        <Toggle name="guestUploadsEnabled" label="Let guests share photos and videos" defaultChecked={values.guestUploadsEnabled} />
        <Toggle
          name="guestUploadsModeration"
          label="Approve uploads before they appear"
          hint="Recommended. You'll see new uploads on the Photos page."
          defaultChecked={values.guestUploadsModeration}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg text-navy">Gifts</legend>
        <Field label="A note about gifts" optional hint="e.g. Mobile Money details, or “Your presence is the greatest gift.”" errors={e.giftMessage}>
          <Textarea name="giftMessage" rows={3} defaultValue={values.giftMessage} />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy">Gift links <span className="font-normal text-muted-foreground">(optional, up to 5)</span></p>
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input name="giftLabel" aria-label={`Link ${i + 1} label`} placeholder="Label, e.g. Registry" defaultValue={l.label} className="w-40" />
              <Input name="giftUrl" aria-label={`Link ${i + 1} address`} placeholder="https://" defaultValue={l.url} />
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          {e.giftLinks && <p className="text-[0.8rem] text-destructive" role="alert">{e.giftLinks[0]}</p>}
          {links.length < 5 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>
              <Plus className="h-4 w-4" aria-hidden /> Add a link
            </Button>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg text-navy">On the day</legend>
        <Toggle
          name="tableFinderEnabled"
          label="Let guests find their table by name"
          hint="Adds a “Find your table” search. Guests with personal links always see their own table."
          defaultChecked={values.tableFinderEnabled}
        />
        <Field label="Livestream link" optional hint="YouTube links play right on your page. Facebook and others open in a new tab." errors={e.livestreamUrl}>
          <Input name="livestreamUrl" type="url" placeholder="https://youtube.com/live/…" defaultValue={values.livestreamUrl} />
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg text-navy">After the day</legend>
        <Field label="Thank-you message" optional hint="Shown at the top of your page once the day has passed." errors={e.thankYouMessage}>
          <Textarea name="thankYouMessage" rows={3} defaultValue={values.thankYouMessage} />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-lg text-navy">Sections to hide</legend>
        <p className="mb-3 text-sm text-muted-foreground">Tick anything you don&apos;t want on your page.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SECTIONS.map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy">
              <input type="checkbox" name="hiddenSections" value={id} defaultChecked={values.hiddenSections.includes(id)} className="accent-[var(--navy)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton pending="Saving…">Save guest settings</SubmitButton>
    </form>
  );
}

export function InviteHelperForm({ plannerAllowed }: { plannerAllowed: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(inviteHelper, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Their email" errors={e.email}>
          <Input name="email" type="email" autoComplete="off" defaultValue={state?.ok ? "" : (state?.values?.email ?? "")} key={state?.ok ? "sent" : "form"} />
        </Field>
        <Field label="Role" errors={e.role}>
          <select name="role" defaultValue="cohost" className="h-10 rounded-lg border border-input bg-white px-3 text-sm">
            <option value="cohost">Co-host (partner, family)</option>
            {plannerAllowed && <option value="planner">Planner</option>}
          </select>
        </Field>
      </div>
      <SubmitButton pending="Sending…">Send invitation</SubmitButton>
    </form>
  );
}
