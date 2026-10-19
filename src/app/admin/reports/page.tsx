import type { Metadata } from "next";
import { Suspense } from "react";
import { settleReport } from "@/app/actions/admin";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { requireAdmin } from "@/lib/dal";
import { listReports } from "@/server/admin";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reports />
    </Suspense>
  );
}

async function Reports() {
  await requireAdmin();
  const [open, closed] = await Promise.all([listReports("open"), listReports("resolved")]);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl text-navy">Reports</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Guestbook messages that visitors reported. A message reported three times is hidden automatically until someone reviews it; hosts can also hide messages themselves.
        </p>
      </header>
      <section aria-labelledby="open-h">
        <h2 id="open-h" className="mb-3 text-2xl text-navy">Waiting for review ({open.length})</h2>
        {open.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {open.map((r) => (
              <li key={r.id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-destructive/40">
                <p className="text-xs text-muted-foreground">
                  On <a href={`/${r.slug}#guestbook`} target="_blank" rel="noopener" className="underline">{r.celebrationTitle}</a> · reported {r.createdAt.toISOString().slice(0, 10)} · “{r.reason}”
                </p>
                {r.entryMessage ? (
                  <blockquote className="mt-3 flex-1 border-l-2 border-border pl-3 text-navy">
                    {r.entryMessage}
                    <footer className="mt-1 text-sm text-muted-foreground">— {r.entryName} {r.entryStatus === "hidden" && "(currently hidden)"}</footer>
                  </blockquote>
                ) : (
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">The message has since been deleted.</p>
                )}
                <div className="mt-4 flex gap-2 border-t border-border pt-3">
                  <ActionButton variant="outline" action={settleReport.bind(null, r.id, true)} className="text-destructive">Hide message</ActionButton>
                  <ActionButton action={settleReport.bind(null, r.id, false)}>Dismiss report</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">Nothing to review. 🎉</p>
        )}
      </section>
      {closed.length > 0 && (
        <section aria-labelledby="closed-h">
          <h2 id="closed-h" className="mb-3 text-2xl text-navy">Recently hidden</h2>
          <ul className="divide-y divide-border rounded-2xl bg-white ring-1 ring-border">
            {closed.slice(0, 30).map((r) => (
              <li key={r.id} className="p-4 text-sm"><span className="text-navy">{r.entryMessage ?? "(deleted)"}</span> <span className="text-muted-foreground">· {r.celebrationTitle}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
