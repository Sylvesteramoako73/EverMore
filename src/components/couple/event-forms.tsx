"use client";

import { shrinkInputFiles } from "@/lib/shrink-image";
import { MapPin, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { makePrimaryEvent, removeEvent, saveEvent } from "@/app/actions/celebration";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatLongDate, formatTimeRange } from "@/lib/dates";
import { PROGRAMME_ICONS } from "@/lib/occasions";
import type { FormState } from "@/lib/validation";

const ICON_LABELS: Record<string, string> = {
  rings: "Rings", church: "Church", camera: "Photos", dinner: "Meal", music: "Music", cake: "Cake", gift: "Gift", glass: "Toast",
  bus: "Travel", map: "Explore", sun: "Morning", flower: "Flowers", dove: "Dove", candle: "Candle", star: "Star", heart: "Heart",
};

export type EventValues = {
  id: string;
  name: string;
  startsLocal: string;
  endsLocal: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueLat: number | null;
  venueLng: number | null;
  description: string;
  dressCode: string;
  icon: string;
  /** Thumbnail of the venue photo, if one is set. */
  venueImage: string | null;
  rsvpRequired: boolean;
  inviteOnly: boolean;
};

function ToggleField({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-white p-4">
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <Switch name={name} defaultChecked={defaultChecked} aria-label={label} />
    </label>
  );
}

export function EventForm({
  event,
  zones,
  defaultTimezone,
  returnTo,
  cancelHref,
  suggestions,
}: {
  event?: EventValues;
  zones: string[];
  defaultTimezone: string;
  returnTo: string;
  cancelHref: string;
  /** Event name ideas for this occasion (e.g. "Wake-keeping", "Meet-up & departure"). */
  suggestions: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(saveEvent.bind(null, event?.id ?? null, returnTo), undefined);
  const e = state?.errors ?? {};
  const v = (k: keyof EventValues) => state?.values?.[k] ?? (event && event[k] !== null ? String(event[k]) : "");
  const checked = (k: "rsvpRequired" | "inviteOnly", fallback: boolean) =>
    state?.values ? state.values[k] === "on" : (event?.[k] ?? fallback);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormAlert state={state} />
      <Field label="Event name" hint="For example: Traditional celebration, Church ceremony, Reception." errors={e.name}>
        <Input name="name" list="event-names" defaultValue={v("name")} required />
      </Field>
      <datalist id="event-names">
        {suggestions.map((n) => <option key={n} value={n} />)}
      </datalist>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" errors={e.startsLocal}>
          <Input type="datetime-local" name="startsLocal" defaultValue={v("startsLocal")} required />
        </Field>
        <Field label="Ends" optional errors={e.endsLocal}>
          <Input type="datetime-local" name="endsLocal" defaultValue={v("endsLocal")} />
        </Field>
      </div>
      <Field label="Timezone of the venue" hint="Times are shown to guests in the venue's local time." errors={e.timezone}>
        <select name="timezone" defaultValue={v("timezone") || defaultTimezone} className="h-11 w-full rounded-lg border border-input bg-white px-3.5 text-base">
          {zones.map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Venue name" optional errors={e.venueName}>
          <Input name="venueName" defaultValue={v("venueName")} placeholder="Holy Trinity Cathedral" />
        </Field>
        <Field label="Venue address" optional hint="We use it to place the venue on the map." errors={e.venueAddress}>
          <Input name="venueAddress" defaultValue={v("venueAddress")} placeholder="High Street, Accra" />
        </Field>
      </div>
      <details className="rounded-xl border border-border bg-white p-4" open={Boolean(e.venueLat || e.venueLng)}>
        <summary className="cursor-pointer text-sm font-medium text-navy">Adjust the map pin</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Leave blank to place the pin from the address. If it lands in the wrong spot, paste exact coordinates from a maps app.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Latitude" errors={e.venueLat}>
            <Input name="venueLat" inputMode="decimal" defaultValue={v("venueLat")} placeholder="5.6037" />
          </Field>
          <Field label="Longitude" errors={e.venueLng}>
            <Input name="venueLng" inputMode="decimal" defaultValue={v("venueLng")} placeholder="-0.1870" />
          </Field>
        </div>
      </details>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Programme icon" optional hint="Shown on your timeline. Leave on automatic to pick one from the name." errors={e.icon}>
          <select name="icon" defaultValue={v("icon")} className="h-11 w-full rounded-lg border border-input bg-white px-3.5 text-base">
            <option value="">Automatic</option>
            {PROGRAMME_ICONS.map((i) => <option key={i} value={i}>{ICON_LABELS[i] ?? i}</option>)}
          </select>
        </Field>
        <div className="space-y-2">
          <Field label="Venue photo" optional hint="Shown on the venue card. JPEG, PNG or WebP, up to 15 MB.">
            <Input type="file" name="venuePhoto" accept="image/jpeg,image/png,image/webp,image/avif" className="py-2" onChange={(e) => shrinkInputFiles(e.currentTarget)} />
          </Field>
          {event?.venueImage && (
            <label className="flex items-center gap-2 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.venueImage} alt="" className="h-10 w-16 rounded object-cover" />
              <input type="checkbox" name="removeVenuePhoto" className="h-4 w-4 accent-[var(--navy)]" /> Remove current photo
            </label>
          )}
        </div>
      </div>

      <Field label="Dress code" optional errors={e.dressCode}>
        <Input name="dressCode" defaultValue={v("dressCode")} placeholder="Kente & traditional attire" />
      </Field>
      <Field label="Details for guests" optional errors={e.description}>
        <Textarea name="description" rows={3} defaultValue={v("description")} placeholder="Parking, programme, what to expect…" />
      </Field>

      <ToggleField name="rsvpRequired" label="Ask guests to RSVP" description="Guests answer for this event in your RSVP form." defaultChecked={checked("rsvpRequired", true)} />
      <ToggleField
        name="inviteOnly"
        label="Invited guests only"
        description="Hidden from your public page. Only guests whose personal invitation includes it will see it."
        defaultChecked={checked("inviteOnly", false)}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href={cancelHref}>Cancel</Link></Button>
        <SubmitButton pending="Saving…">{event ? "Save event" : "Add event"}</SubmitButton>
      </div>
    </form>
  );
}

export function EventList({
  events,
  primaryEventId,
  editHrefPrefix,
  totals,
}: {
  events: EventValues[];
  primaryEventId: string | null;
  /** Edit link is `${editHrefPrefix}${eventId}` (a string, since functions can't cross to client components). */
  editHrefPrefix: string;
  totals?: Record<string, { yes: number; no: number; guests: number }>;
}) {
  const [pending, start] = useTransition();
  if (!events.length) return null;
  return (
    <ol className="space-y-3" aria-busy={pending}>
      {events.map((ev) => {
        const isMain = ev.id === primaryEventId;
        const t = totals?.[ev.id];
        return (
          <li key={ev.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-sans text-lg font-semibold text-navy">{ev.name}</h3>
                {isMain && <Badge className="bg-champagne/15 text-champagne-deep">Main event</Badge>}
                {ev.inviteOnly && <Badge variant="outline">Invited guests only</Badge>}
                {!ev.rsvpRequired && <Badge variant="outline">No RSVP</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatLongDate(new Date(ev.startsAt), ev.timezone)} · {formatTimeRange(new Date(ev.startsAt), ev.endsAt ? new Date(ev.endsAt) : null, ev.timezone)}
              </p>
              {(ev.venueName || ev.venueAddress) && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {[ev.venueName, ev.venueAddress].filter(Boolean).join(", ")}
                  {ev.venueAddress && ev.venueLat === null && <span className="text-destructive"> · not found on the map</span>}
                </p>
              )}
              {t && ev.rsvpRequired && (
                <p className="mt-2 text-sm">
                  <strong>{t.guests}</strong> guests coming <span className="text-muted-foreground">· {t.yes} yes · {t.no} no</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${editHrefPrefix}${ev.id}`}><Pencil aria-hidden /> Edit</Link>
              </Button>
              {!isMain && (
                <Button variant="ghost" size="sm" onClick={() => start(() => makePrimaryEvent(ev.id))}>
                  <Star aria-hidden /> Make main event
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete "${ev.name}"? Guests' replies for this event will also be removed.`)) start(() => removeEvent(ev.id));
                }}
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
