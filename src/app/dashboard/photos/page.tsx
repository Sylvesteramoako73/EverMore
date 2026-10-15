import type { Metadata } from "next";
import { Check, Download, EyeOff, Play } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { moderateShared } from "@/app/actions/dashboard";
import { PhotoManager } from "@/components/couple/photo-manager";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { listMedia, listShared } from "@/server/media";
import { toSharedItem } from "@/server/public-celebration";
import { photoItem } from "@/server/views";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Photos" };

export default function PhotosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Photos />
    </Suspense>
  );
}

async function Photos() {
  const { celebration: c } = await loadDashboard();
  const [pending, approved, hidden, own] = await Promise.all([
    listShared(c.id, { onlyApproved: false, status: "pending", limit: 200 }),
    listShared(c.id, { onlyApproved: false, status: "approved", limit: 200 }),
    listShared(c.id, { onlyApproved: false, status: "hidden", limit: 200 }),
    listMedia(c.id),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl text-navy">Photos</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Photos and videos your guests share, and your own photos for the page.{" "}
          {c.guestUploadsEnabled
            ? c.guestUploadsModeration ? "Guest uploads wait for your approval before anyone else sees them." : "Guest uploads appear straight away; you can hide any of them."
            : "Guest uploads are switched off."}{" "}
          <Link href="/dashboard/settings#guests" className="text-champagne-deep underline">Change this</Link>
        </p>
      </header>

      <SharedGroup title="Waiting for approval" items={pending.items} total={pending.total} highlight empty="Nothing waiting. New uploads that need your approval will show up here." />
      <SharedGroup title="Shared by guests" items={approved.items} total={approved.total} empty="No guest photos yet. Guests can add theirs from the “Share the love” section of your page." />
      {hidden.total > 0 && <SharedGroup title="Hidden" items={hidden.items} total={hidden.total} />}

      <section aria-labelledby="own-h" className="space-y-4">
        <h2 id="own-h" className="text-2xl text-navy">Your photos</h2>
        <PhotoManager photos={own.map(photoItem)} heroId={c.heroMediaId} />
      </section>
    </div>
  );
}

function SharedGroup({
  title,
  items,
  total,
  empty,
  highlight = false,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listShared>>["items"];
  total: number;
  empty?: string;
  highlight?: boolean;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-2xl text-navy">{title} <span className="text-base text-muted-foreground">({total})</span></h2>
      {items.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => {
            const s = toSharedItem(m, false);
            return (
              <li key={m.id} className={`overflow-hidden rounded-2xl bg-white ring-1 ${highlight ? "ring-champagne" : "ring-border"}`}>
                <div className="relative aspect-square bg-muted">
                  {m.kind === "video" ? (
                    <>
                      <video src={s.src} preload="metadata" muted className="h-full w-full object-cover" />
                      <Play className="absolute top-2 left-2 h-6 w-6 rounded-full bg-black/60 p-1 text-white" aria-label="Video" />
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- private media served from our own route
                    <img src={s.thumb} alt={s.alt} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm text-navy">{m.guestName || "A guest"}</p>
                  {m.caption && <p className="line-clamp-2 text-xs text-muted-foreground">{m.caption}</p>}
                  <div className="flex flex-wrap gap-1">
                    {m.status !== "approved" && (
                      <ActionButton variant="outline" action={moderateShared.bind(null, m.id, "approved")}>
                        <Check className="h-4 w-4" aria-hidden /> {m.status === "pending" ? "Approve" : "Show"}
                      </ActionButton>
                    )}
                    {m.status !== "hidden" && (
                      <ActionButton action={moderateShared.bind(null, m.id, "hidden")}>
                        <EyeOff className="h-4 w-4" aria-hidden /> Hide
                      </ActionButton>
                    )}
                    <a href={s.downloadUrl} className="inline-flex h-9 items-center px-2 text-muted-foreground hover:text-navy" aria-label="Download">
                      <Download className="h-4 w-4" aria-hidden />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : empty ? (
        <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : null}
    </section>
  );
}
