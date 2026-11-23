"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { eventDraftsSnapshot, parseEventDrafts, removeEventDraft, startsLocalFor, subscribeEventDrafts, type EventDraft } from "@/lib/event-drafts";

function put(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!(el instanceof HTMLInputElement)) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const when = (d: EventDraft) => (d.date ? new Date(`${d.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "date to add");

/** Events the host described earlier, offered one at a time. Using one fills the form below it; nothing is saved until they press Save. */
export function EventDrafts({ celebrationId }: { celebrationId: string }) {
  const raw = useSyncExternalStore(subscribeEventDrafts, () => eventDraftsSnapshot(celebrationId), () => "[]");
  const drafts = useMemo(() => parseEventDrafts(raw), [raw]);
  const [note, setNote] = useState("");

  if (!drafts.length && !note) return null;

  function use(i: number) {
    const form = document.getElementById("event-form");
    const d = drafts[i];
    if (!(form instanceof HTMLFormElement) || !d) return;
    put(form, "name", d.name);
    put(form, "startsLocal", startsLocalFor(d));
    put(form, "venueName", d.venueName);
    put(form, "venueAddress", d.venueAddress);
    setNote(
      d.time
        ? "Filled in below. Please check it, then press Save."
        : `Filled in below. You did not give a time, so please set the start time yourself, then press Save.`,
    );
    removeEventDraft(celebrationId, i);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section aria-labelledby="drafts-title" className="mb-6 rounded-2xl border border-champagne bg-white p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-champagne-deep" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 id="drafts-title" className="text-lg text-navy">From your description</h2>
            <p className="mt-1 text-sm text-muted-foreground">{drafts.length ? "We found these in what you wrote. Pick one to fill the form, check it, then save." : "Nothing more to add from your description."}</p>
          </div>
          {note && <p aria-live="polite" className="text-sm text-navy">{note}</p>}
          <ul className="space-y-2">
            {drafts.map((d, i) => (
              <li key={`${d.name}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-navy">{d.name || "Event"}</p>
                  <p className="text-muted-foreground">
                    {when(d)}{d.time ? `, ${d.time}` : ""}{d.venueName ? ` at ${d.venueName}` : ""}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => use(i)}>Use this</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
