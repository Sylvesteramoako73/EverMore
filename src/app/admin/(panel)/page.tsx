import { Suspense } from "react";
import Link from "next/link";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { requireAdmin } from "@/lib/dal";
import { formatMoney } from "@/lib/money";
import { getOccasion } from "@/lib/occasions";
import { listAllCelebrations, listUsers, platformStats } from "@/server/admin";

export default function AdminHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin();
  const [s, users, pages] = await Promise.all([platformStats(), listUsers("", 6), listAllCelebrations("", 6)]);
  const kinds = Object.entries(s.byKind).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">EverMore</p>
        <h1 className="mt-2 text-4xl text-navy sm:text-5xl">Platform overview</h1>
      </header>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={s.users} note={`+${s.newUsers7} this week · +${s.newUsers30} in 30 days`} href="/admin/users" />
        <Stat label="Pages" value={s.totalPages} note={`${s.pages.published ?? 0} live · ${s.pages.draft ?? 0} drafts · ${s.pages.archived ?? 0} taken down`} href="/admin/pages" />
        <Stat label="Page visits" value={s.views30} note="last 30 days" />
        <Stat label="Open reports" value={s.openReports} note={`${s.suspended} suspended account${s.suspended === 1 ? "" : "s"}`} href="/admin/reports" highlight={s.openReports > 0} />
        <Stat label="RSVPs" value={s.rsvps} note="replies from guests, all pages" />
        <Stat label="Gifts" value={s.gifts} note={`${formatMoney(s.giftTotal)} confirmed`} />
      </section>

      <section aria-labelledby="kinds-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
        <h2 id="kinds-h" className="text-2xl text-navy">Pages by occasion</h2>
        {kinds.length ? (
          <ul className="mt-4 space-y-2">
            {kinds.map(([kind, n]) => (
              <li key={kind} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-navy">{getOccasion(kind).label}</span>
                <span className="h-2.5 rounded-full bg-champagne" style={{ width: `${Math.max(4, (n / Math.max(...kinds.map((k) => k[1]))) * 60)}%` }} />
                <span className="text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No pages yet.</p>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="new-users-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <div className="flex items-center justify-between"><h2 id="new-users-h" className="text-2xl text-navy">Newest users</h2><Link href="/admin/users" className="text-sm text-champagne-deep hover:underline">All users</Link></div>
          <ul className="mt-4 divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-navy">{u.name} <span className="text-muted-foreground">· {u.email}</span></span>
                <span className="shrink-0 text-muted-foreground">{u.createdAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="new-pages-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <div className="flex items-center justify-between"><h2 id="new-pages-h" className="text-2xl text-navy">Newest pages</h2><Link href="/admin/pages" className="text-sm text-champagne-deep hover:underline">All pages</Link></div>
          <ul className="mt-4 divide-y divide-border">
            {pages.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2.5 text-sm">
                <a href={`/${p.slug}`} target="_blank" rel="noopener" className="min-w-0 truncate text-navy hover:underline">{p.title} <span className="text-muted-foreground">· {getOccasion(p.kind).label}</span></a>
                <span className="shrink-0 text-muted-foreground">{p.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, href, highlight = false }: { label: string; value: number; note: string; href?: string; highlight?: boolean }) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="mt-2 font-display text-4xl text-navy">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </>
  );
  const cls = `block rounded-2xl bg-white p-5 ring-1 ${highlight ? "ring-destructive" : "ring-border"}`;
  return href ? <Link href={href} className={`${cls} hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}
