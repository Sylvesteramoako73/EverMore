import type { Metadata } from "next";
import { Suspense } from "react";
import { takeDownPage } from "@/app/actions/admin";
import { SearchBox } from "@/components/admin/nav";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { requireAdmin } from "@/lib/dal";
import { getOccasion } from "@/lib/occasions";
import { getTheme } from "@/lib/themes";
import { listAllCelebrations } from "@/server/admin";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage(props: PageProps<"/admin/pages">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Pages {...props} />
    </Suspense>
  );
}

const STATUS: Record<string, string> = { published: "bg-success/10 text-success", draft: "bg-amber-50 text-amber-700", archived: "bg-destructive/10 text-destructive" };
const LABEL: Record<string, string> = { published: "Live", draft: "Draft", archived: "Taken down" };

async function Pages({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const pages = await listAllCelebrations(q, 200);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl text-navy">Pages</h1>
        <p className="mt-1 text-muted-foreground">Every celebration page. Taking a page down hides it from the public immediately; restoring returns it to the owner as a draft to republish.</p>
      </header>
      <SearchBox placeholder="Search by title or address" defaultValue={q} />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
            <tr><th className="p-4">Page</th><th className="p-4">Owner</th><th className="p-4">Design</th><th className="p-4">RSVPs</th><th className="p-4">Visits</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pages.map((p) => (
              <tr key={p.id}>
                <td className="p-4">
                  <a href={`/${p.slug}`} target="_blank" rel="noopener" className="font-medium text-navy hover:underline">{p.title}</a>
                  <span className="block text-xs text-muted-foreground">{getOccasion(p.kind).label} · /{p.slug} · {p.visibility}</span>
                </td>
                <td className="p-4 text-muted-foreground">{p.ownerName}<span className="block text-xs">{p.ownerEmail}</span></td>
                <td className="p-4 text-muted-foreground">{getTheme(p.themeId).name}</td>
                <td className="p-4">{p.rsvps}</td>
                <td className="p-4">{p.views}</td>
                <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[p.status]}`}>{LABEL[p.status]}</span></td>
                <td className="p-4 text-right">
                  {p.status === "archived" ? (
                    <ActionButton variant="outline" action={takeDownPage.bind(null, p.id, false)}>Restore</ActionButton>
                  ) : (
                    <ActionButton action={takeDownPage.bind(null, p.id, true)} confirm={`Take down "${p.title}"? Guests will no longer be able to open it.`} className="text-destructive">Take down</ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pages.length && <p className="p-8 text-center text-muted-foreground">No pages found.</p>}
      </div>
    </div>
  );
}
