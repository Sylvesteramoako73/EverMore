import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { requireAdmin } from "@/lib/dal";
import { recentActivity } from "@/server/admin";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActivityList />
    </Suspense>
  );
}

/** Readable names for logged actions. */
const LABELS: Record<string, string> = {
  "celebration.published": "published a page",
  "celebration.unpublished": "unpublished a page",
  "celebration.slug_changed": "changed a page address",
  "guest.created": "added a guest",
  "guest.deleted": "removed a guest",
  "guest.imported": "imported a guest list",
  "guest.link_regenerated": "made a new invitation link",
  "rsvp.deleted": "deleted a reply",
  "member.invited": "invited a co-host",
  "member.joined": "joined as a co-host",
  "member.removed": "removed a co-host",
  "gift.confirmed": "confirmed a gift",
  "gift.failed": "marked a gift not received",
  "admin.user_suspended": "suspended an account",
  "admin.user_restored": "restored an account",
  "admin.page_taken_down": "took down a page",
  "admin.page_restored": "restored a page",
  "admin.report_hidden": "hid a reported message",
  "admin.report_dismissed": "dismissed a report",
};

async function ActivityList() {
  await requireAdmin();
  const rows = await recentActivity(200);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl text-navy">Activity</h1>
        <p className="mt-1 text-muted-foreground">The latest sensitive actions across EverMore, newest first.</p>
      </header>
      <ul className="divide-y divide-border rounded-2xl bg-white ring-1 ring-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
            <span className="text-navy">
              <strong className="font-medium">{r.actorName ?? "Someone"}</strong> {LABELS[r.action] ?? r.action}
              {r.celebrationTitle && <span className="text-muted-foreground"> · {r.celebrationTitle}</span>}
            </span>
            <time className="text-muted-foreground" dateTime={r.createdAt.toISOString()}>{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</time>
          </li>
        ))}
        {!rows.length && <li className="p-8 text-center text-muted-foreground">No activity yet.</li>}
      </ul>
    </div>
  );
}
