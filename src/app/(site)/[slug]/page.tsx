import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { CelebrationSite } from "@/components/site/celebration-site";
import { currentTime } from "@/lib/clock";
import { formatLongDate } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { loadPublicCelebration, recordPageView } from "@/server/public-celebration";
import { resolveSlug } from "@/server/celebrations";
import { memberCheck } from "@/server/viewer";

type Props = PageProps<"/[slug]">;

// Deliberately blocking: the address is resolved before streaming so unknown pages return a real 404
// and old addresses a real permanent redirect (both impossible once a response has started).
export const instant = false;

const tokenFrom = (sp: Record<string, string | string[] | undefined>) => (typeof sp.invite === "string" ? sp.invite : null);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  await connection(); // depends on the database and the current time: always request-time
  const { slug } = await params;
  const result = await loadPublicCelebration(slug, { inviteToken: tokenFrom(await searchParams), isMember: async () => false });
  if (result.kind !== "ok") return { title: "Celebration", robots: { index: false, follow: false } };
  const { view: w, celebration } = result;
  const primary = w.events.find((e) => e.id === w.primaryEventId);
  const title = w.title;
  const when = primary ? formatLongDate(new Date(primary.startsAt), primary.timezone) : "";
  const description = [when && `${when}${primary?.venueName ? ` · ${primary.venueName}` : ""}.`, w.guestMessage.slice(0, 150)]
    .filter(Boolean)
    .join(" ");
  // Only public pages whose couple opted in may be indexed. Unlisted is not the same as private:
  // it only keeps the page out of search results.
  const indexable = celebration.status === "published" && celebration.visibility === "public" && celebration.allowIndexing;
  const canonical = appUrl(`/${w.slug}`);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url: canonical,
      title: w.occasion.after === "remembrance" ? title : `${title} · ${w.phase === "after" ? "Thank you" : "You're invited"}`,
      description,
      images: w.hero && celebration.visibility !== "private" ? [{ url: appUrl(w.hero.src), alt: w.hero.alt || title }] : undefined,
    },
    twitter: { card: w.hero ? "summary_large_image" : "summary", title, description },
  };
}

export default async function CelebrationPage(props: Props) {
  // Resolve the address before streaming starts, so unknown pages get a real 404 and old
  // addresses a real permanent redirect (both are impossible once the response has begun).
  await connection(); // the database driver reads the clock internally: request-time only
  const { slug } = await props.params;
  const resolved = await resolveSlug(slug);
  if (!resolved) notFound();
  if (resolved.canonicalSlug !== slug) {
    const token = tokenFrom(await props.searchParams);
    permanentRedirect(`/${resolved.canonicalSlug}${token ? `?invite=${encodeURIComponent(token)}` : ""}`);
  }
  return (
    <Suspense fallback={<CelebrationLoading />}>
      <Celebration {...props} />
    </Suspense>
  );
}

async function Celebration({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const inviteToken = tokenFrom(await searchParams);
  const result = await loadPublicCelebration(slug, { inviteToken, isMember: memberCheck() });

  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(`/${result.slug}${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ""}`);
  if (result.kind === "private") return <PrivateNotice title={result.title} />;

  const { view, celebration } = result;
  if (view.mode === "live") after(() => recordPageView(celebration.id, celebration.timezone).catch(() => {}));
  return <CelebrationSite w={view} now={currentTime()} inviteToken={inviteToken} />;
}

function CelebrationLoading() {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-ivory" role="status" aria-label="Loading the celebration page">
      <div className="flex flex-col items-center gap-4 text-navy">
        <svg viewBox="0 0 40 28" className="h-8 w-auto animate-pulse" aria-hidden>
          <circle cx="14" cy="14" r="10" fill="none" stroke="var(--champagne)" strokeWidth="2" />
          <circle cx="26" cy="14" r="10" fill="none" stroke="var(--navy)" strokeWidth="2" />
        </svg>
        <span className="font-display text-lg italic">Opening the invitation…</span>
      </div>
    </div>
  );
}

function PrivateNotice({ title }: { title: string }) {
  return (
    <main id="main" className="grid min-h-[100svh] place-items-center bg-ivory px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Private celebration</p>
        <h1 className="mt-4 text-4xl text-navy">{title}</h1>
        <p className="mt-4 text-muted-foreground">
          This celebration page is shared privately. Please open it using the personal invitation link the couple sent you.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-navy underline underline-offset-4">
          About EverMore
        </Link>
      </div>
    </main>
  );
}
