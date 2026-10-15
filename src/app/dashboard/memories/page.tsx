import type { Metadata } from "next";
import { Lock, MapPin, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { removeMemory } from "@/app/actions/dashboard";
import { ActionButton } from "@/components/dashboard/bits";
import { EditMemory, MemoryForm, RemindersForm } from "@/components/dashboard/memories";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { formatPlainDate } from "@/lib/dates";
import { primaryEvent, yearlyDate } from "@/lib/celebration-rules";
import { listEvents } from "@/server/events";
import { listMemories } from "@/server/memories";
import { getReminderPreference } from "@/server/reminders";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Memories" };

export default function MemoriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Memories />
    </Suspense>
  );
}

const REMINDER: Partial<Record<string, string>> = {
  wedding: "each wedding anniversary",
  anniversary: "each anniversary",
  funeral: "each remembrance day",
  birthday: "each birthday",
  naming: "each birthday",
};

async function Memories() {
  const { celebration: c, user } = await loadDashboard();
  const [memories, pref, events] = await Promise.all([listMemories(c.id, { onlyPublic: false }), getReminderPreference(c.id, user.id), listEvents(c.id)]);
  const yearly = yearlyDate(c.keyDate, primaryEvent(events, c.primaryEventId));
  const what = REMINDER[c.kind];
  const timeline = [...memories].sort((a, b) => b.happenedOn.localeCompare(a.happenedOn));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl text-navy">Memories</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          A timeline that grows with you: milestones, anniversaries and moments worth keeping. Public memories appear on your page in the
          {c.kind === "funeral" ? " “Memories”" : " “Our Journey”"} section.
        </p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="timeline-h">
          <h2 id="timeline-h" className="mb-4 text-2xl text-navy">Timeline</h2>
          {timeline.length ? (
            <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[0.45rem] before:w-px before:bg-border">
              {timeline.map((m) => (
                <li key={m.id} className="relative pl-8">
                  <span aria-hidden className="absolute top-6 left-0 h-4 w-4 rounded-full border-2 border-champagne bg-white" />
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="eyebrow">{formatPlainDate(m.happenedOn)}</p>
                        <p className="mt-1 text-xl text-navy">{m.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {m.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> {m.location}</span>}
                          {!m.isPublic && <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" aria-hidden /> Private</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <EditMemory memory={{ id: m.id, title: m.title, body: m.body, happenedOn: m.happenedOn, location: m.location, isPublic: m.isPublic }} />
                        <ActionButton action={removeMemory.bind(null, m.id)} confirm={`Delete "${m.title}"?`} className="text-destructive">
                          <Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Delete</span>
                        </ActionButton>
                      </div>
                    </div>
                    {m.body && <p className="mt-3 text-sm whitespace-pre-line text-navy/90">{m.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">No memories yet. Add your first one.</p>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="add-memory-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
            <h2 id="add-memory-h" className="mb-4 text-2xl text-navy">Add a memory</h2>
            <MemoryForm />
          </section>
          {what && (
            <section aria-labelledby="reminders-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
              <h2 id="reminders-h" className="mb-1 text-2xl text-navy">Reminders</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {yearly ? `Counting from ${formatPlainDate(yearly)}.` : "Add the date on the details step so we know when to remind you."}
              </p>
              <RemindersForm values={{ emailEnabled: pref.emailEnabled, remindDaysBefore: pref.remindDaysBefore }} what={what} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
