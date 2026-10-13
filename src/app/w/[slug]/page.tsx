import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { WeddingSite } from "@/components/wedding/wedding-site";
import { currentTime } from "@/lib/clock";
import { formatLongDate } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { loadPublicWedding, recordPageView } from "@/server/public-wedding";
import { resolveSlug } from "@/server/weddings";
import { memberCheck } from "@/server/viewer";

type Props = PageProps<"/w/[slug]">;

const tokenFrom = (sp: Record<string, string | string[] | undefined>) => (typeof sp.invite === "string" ? sp.invite : null);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  await connection(); // depends on the database and the current time: always request-time
  const { slug } = await params;
  const result = await loadPublicWedding(slug, { inviteToken: tokenFrom(await searchParams), isMember: async () => false });
  if (result.kind !== "ok") return { title: "Wedding", robots: { index: false, follow: false } };
  const { view: w, wedding } = result;
  const primary = w.events.find((e) => e.id === w.primaryEventId);
  const title = `${w.partnerOne} & ${w.partnerTwo}`;
  const when = primary ? formatLongDate(new Date(primary.startsAt), primary.timezone) : "";
  const description = [when && `${when}${primary?.venueName ? ` · ${primary.venueName}` : ""}.`, w.guestMessage.slice(0, 150)]
    .filter(Boolean)
    .join(" ");
  // Only public pages whose couple opted in may be indexed. Unlisted is not the same as private:
  // it only keeps the page out of search results.
  const indexable = wedding.status === "published" && wedding.visibility === "public" && wedding.allowIndexing;
  const canonical = appUrl(`/w/${w.slug}`);
  return {
    title: { absolute: `${title} · Our Wedding` },
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} · ${w.phase === "married" ? "Our wedding" : "You're invited"}`,
      description,
      images: w.hero && wedding.visibility !== "private" ? [{ url: appUrl(w.hero.src), alt: w.hero.alt || title }] : undefined,
    },
    twitter: { card: w.hero ? "summary_large_image" : "summary", title, description },
  };
}

export default async function WeddingPage(props: Props) {
  // Resolve the address before streaming starts, so unknown pages get a real 404 and old
  // addresses a real permanent redirect (both are impossible once the response has begun).
  await connection(); // the database driver reads the clock internally: request-time only
  const { slug } = await props.params;
  const resolved = await resolveSlug(slug);
  if (!resolved) notFound();
  if (resolved.canonicalSlug !== slug) {
    const token = tokenFrom(await props.searchParams);
    permanentRedirect(`/w/${resolved.canonicalSlug}${token ? `?invite=${encodeURIComponent(token)}` : ""}`);
  }
  return (
    <Suspense fallback={<WeddingLoading />}>
      <Wedding {...props} />
    </Suspense>
  );
}

async function Wedding({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const inviteToken = tokenFrom(await searchParams);
  const result = await loadPublicWedding(slug, { inviteToken, isMember: memberCheck() });

  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(`/w/${result.slug}${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ""}`);
  if (result.kind === "private") return <PrivateNotice couple={result.couple} />;

  const { view, wedding } = result;
  if (view.mode === "live") after(() => recordPageView(wedding.id, wedding.timezone).catch(() => {}));
  return <WeddingSite w={view} now={currentTime()} inviteToken={inviteToken} />;
}

function WeddingLoading() {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-ivory" role="status" aria-label="Loading the wedding page">
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

function PrivateNotice({ couple }: { couple: string }) {
  return (
    <main id="main" className="grid min-h-[100svh] place-items-center bg-ivory px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Private celebration</p>
        <h1 className="mt-4 text-4xl text-navy">{couple}</h1>
        <p className="mt-4 text-muted-foreground">
          This wedding page is shared privately. Please open it using the personal invitation link the couple sent you.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-navy underline underline-offset-4">
          About EverMore
        </Link>
      </div>
    </main>
  );
}
