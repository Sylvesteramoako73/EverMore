import type { Metadata } from "next";
import { Check, EyeOff, Flag, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { moderateMessage, removeMessage } from "@/app/actions/dashboard";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { formatLongDate } from "@/lib/dates";
import { listGuestbook } from "@/server/guestbook";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages />
    </Suspense>
  );
}

const GROUPS = [
  { status: "pending", title: "Waiting for approval", empty: "" },
  { status: "approved", title: "On your page", empty: "No messages on your page yet." },
  { status: "hidden", title: "Hidden", empty: "" },
] as const;

async function Messages() {
  const { celebration: c } = await loadDashboard();
  const entries = await listGuestbook(c.id, { onlyApproved: false });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl text-navy">Messages</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Wishes and tributes from your guestbook.{" "}
          {c.guestbookModeration ? "New messages wait for your approval." : "New messages appear straight away; you can hide any of them."}{" "}
          <Link href="/dashboard/settings#guests" className="text-champagne-deep underline">Change this</Link>
        </p>
      </header>

      {!c.guestbookEnabled && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-navy ring-1 ring-amber-200">The guestbook is switched off, so guests can&apos;t leave new messages. Turn it on in Settings.</p>
      )}

      {GROUPS.map((g) => {
        const list = entries.filter((e) => e.status === g.status);
        if (!list.length && !g.empty) return null;
        return (
          <section key={g.status} aria-labelledby={`${g.status}-h`}>
            <h2 id={`${g.status}-h`} className="mb-3 text-2xl text-navy">{g.title} <span className="text-base text-muted-foreground">({list.length})</span></h2>
            {list.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {list.map((e) => (
                  <li key={e.id} className={`flex flex-col rounded-2xl bg-white p-5 ring-1 ${g.status === "pending" ? "ring-champagne" : "ring-border"}`}>
                    <p className="flex-1 whitespace-pre-line text-navy">{e.message}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      — {e.name} · {formatLongDate(e.createdAt, c.timezone)}
                      {e.reportCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-destructive"><Flag className="h-3.5 w-3.5" aria-hidden /> reported {e.reportCount}×</span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {e.status !== "approved" && (
                        <ActionButton variant="outline" action={moderateMessage.bind(null, e.id, "approved")}>
                          <Check className="h-4 w-4" aria-hidden /> {e.status === "pending" ? "Approve" : "Show again"}
                        </ActionButton>
                      )}
                      {e.status !== "hidden" && (
                        <ActionButton action={moderateMessage.bind(null, e.id, "hidden")}>
                          <EyeOff className="h-4 w-4" aria-hidden /> Hide
                        </ActionButton>
                      )}
                      <ActionButton action={removeMessage.bind(null, e.id)} confirm="Delete this message for good?" className="text-destructive">
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">{g.empty}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
