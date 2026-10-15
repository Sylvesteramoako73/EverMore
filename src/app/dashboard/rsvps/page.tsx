import type { Metadata } from "next";
import { Download, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { removeRsvp } from "@/app/actions/dashboard";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { listEvents } from "@/server/events";
import { eventTotals, listRsvps, rsvpSummary } from "@/server/rsvp";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "RSVPs" };

export default function RsvpsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Rsvps />
    </Suspense>
  );
}

async function Rsvps() {
  const { celebration: c } = await loadDashboard();
  const [rsvps, totals, events, summary] = await Promise.all([listRsvps(c.id), eventTotals(c.id), listEvents(c.id), rsvpSummary(c.id)]);
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  // Meal choices among people who said yes.
  const meals = new Map<string, number>();
  for (const r of rsvps) if (r.mealChoice && r.answers.some((a) => a.attending)) meals.set(r.mealChoice, (meals.get(r.mealChoice) ?? 0) + 1);
  const dietary = rsvps.filter((r) => r.dietary && r.answers.some((a) => a.attending));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl text-navy">RSVPs</h1>
          <p className="mt-1 text-muted-foreground">
            {summary.replies} replies · {summary.attending} coming ({summary.people} people) · {summary.declined} can&apos;t come
          </p>
        </div>
        {rsvps.length > 0 && (
          <Button asChild variant="outline"><a href="/dashboard/rsvps/export" download><Download className="h-4 w-4" aria-hidden /> Download as spreadsheet</a></Button>
        )}
      </header>

      {totals.length > 0 && (
        <section aria-label="Totals by event" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {totals.map((t) => (
            <div key={t.eventId} className="rounded-2xl bg-white p-5 ring-1 ring-border">
              <p className="truncate font-medium text-navy">{t.name}</p>
              <p className="text-xs text-muted-foreground">{formatLongDate(t.startsAt, c.timezone)}</p>
              <p className="mt-3 font-display text-4xl text-navy">{t.guests}<span className="ml-2 text-base text-muted-foreground">people</span></p>
              <p className="mt-1 text-sm text-muted-foreground"><span className="text-success">{t.yes} yes</span> · {t.no} no</p>
            </div>
          ))}
        </section>
      )}

      {(meals.size > 0 || dietary.length > 0) && (
        <section aria-labelledby="catering-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <h2 id="catering-h" className="text-2xl text-navy">For the caterer</h2>
          {meals.size > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...meals].map(([meal, n]) => (
                <li key={meal} className="rounded-full bg-muted px-3 py-1 text-sm text-navy">{meal}: <strong>{n}</strong></li>
              ))}
            </ul>
          )}
          {dietary.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {dietary.map((r) => <li key={r.id}><strong className="text-navy">{r.name}:</strong> <span className="text-muted-foreground">{r.dietary}</span></li>)}
            </ul>
          )}
        </section>
      )}

      {rsvps.length ? (
        <section aria-label="All replies" className="overflow-hidden rounded-2xl bg-white ring-1 ring-border">
          <ul className="divide-y divide-border">
            {rsvps.map((r) => {
              const yes = r.answers.some((a) => a.attending);
              return (
                <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-navy">{r.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${yes ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{yes ? "Coming" : "Can't come"}</span>
                      {r.guestId && <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs text-navy">Personal link</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{[r.email, r.phone].filter(Boolean).join(" · ")}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {r.answers.map((a) => (
                        <li key={a.eventId} className="text-navy">
                          {eventName.get(a.eventId) ?? "Event"}: <span className={a.attending ? "text-success" : "text-muted-foreground"}>{a.attending ? `yes, ${a.partySize}` : "no"}</span>
                        </li>
                      ))}
                    </ul>
                    {(r.mealChoice || r.dietary) && <p className="mt-1 text-sm text-muted-foreground">{[r.mealChoice, r.dietary].filter(Boolean).join(" · ")}</p>}
                    {r.message && <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-navy italic">&ldquo;{r.message}&rdquo;</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <time className="text-xs text-muted-foreground" dateTime={new Date(r.updatedAt).toISOString()}>{formatLongDate(new Date(r.updatedAt), c.timezone)}</time>
                    <ActionButton action={removeRsvp.bind(null, r.id)} confirm={`Delete ${r.name}'s reply? This can't be undone.`} className="text-destructive">
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="font-display text-2xl text-navy">No replies yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Share your page link or send personal invitations from the Guests page. Replies appear here straight away.</p>
        </div>
      )}
    </div>
  );
}
