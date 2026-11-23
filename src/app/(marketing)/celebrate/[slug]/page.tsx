import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appHref, siteHref } from "@/lib/hosts";
import { formatMoney } from "@/lib/money";
import { PAGE_PRICE_MINOR } from "@/lib/plans";
import { LANDINGS, getLanding } from "@/lib/landing";

export function generateStaticParams() {
  return LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = getLanding((await params).slug);
  if (!l) return {};
  return { title: l.title, description: l.description, alternates: { canonical: siteHref(`/celebrate/${l.slug}`) } };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const l = getLanding((await params).slug);
  if (!l) notFound();
  const price = formatMoney(PAGE_PRICE_MINOR);
  const others = LANDINGS.filter((o) => o.slug !== l.slug);

  return (
    <>
      <section className="relative flex min-h-[78svh] items-end justify-center overflow-hidden bg-navy text-white">
        <Image src={`/samples/photos/${l.photo}.webp`} alt="" fill priority sizes="100vw" quality={90} style={{ objectPosition: l.position }} className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,28,53,.5),rgba(16,28,53,0)_30%,rgba(16,28,53,.93))]" />
        <div className="relative w-full px-4 pb-14 text-center">
          <h1 className="mx-auto max-w-4xl text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.05] font-light [text-shadow:0_2px_30px_rgba(16,28,53,.55)]">{l.h1}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">{l.intro}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gold" className="h-14 px-10 text-base"><Link href={appHref("/sign-up")}>Create your {l.noun} page</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-14 border-white/60 bg-white/10 px-8 text-base text-white backdrop-blur-sm hover:bg-white hover:text-navy">
              <Link href={`/samples/${l.theme}?occasion=${l.kind}`}>See a {l.noun} sample</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-white/80">Build and preview free. Pay {price} only when you publish.</p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <h2 className="text-center text-4xl font-light text-navy sm:text-5xl">What your {l.noun} page holds</h2>
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {l.includes.map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-1.5 h-4 w-4 shrink-0 text-champagne-deep" aria-hidden />
                <div><h3 className="text-xl font-light text-navy">{t}</h3><p className="text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#f6f3ec] py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-4xl font-light text-navy">Questions</h2>
          <div className="mt-10 divide-y divide-navy/10 border-y border-navy/10">
            {l.faq.map(([q, a]) => (
              <div key={q} className="py-5">
                <h3 className="text-lg text-navy">{q}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-muted-foreground">Other occasions: {others.map((o, i) => (
            <span key={o.slug}>{i > 0 && ", "}<Link href={`/celebrate/${o.slug}`} className="text-navy underline underline-offset-4">{o.noun}</Link></span>
          ))}.</p>
          <div className="mt-8 text-center">
            <Button asChild size="lg" variant="gold" className="h-12 px-8 text-base"><Link href={appHref("/sign-up")}>Create your page <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
