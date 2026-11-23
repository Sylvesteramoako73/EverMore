import { ArrowRight, Check, Heart, Lock, Smartphone, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { DesignRail } from "@/components/marketing/design-rail";
import { IncludeList } from "@/components/marketing/include-list";
import { Button } from "@/components/ui/button";
import { appHref, siteHref } from "@/lib/hosts";
import { formatMoney } from "@/lib/money";
import { getOccasion } from "@/lib/occasions";
import { PAGE_PRICE_MINOR } from "@/lib/plans";
import { SAMPLE_THEMES } from "@/lib/samples";

export const metadata: Metadata = { alternates: { canonical: siteHref("/") } };

const P = (name: string) => `/samples/photos/${name}.webp`;

const OCCASIONS = [
  { theme: "earth-and-ivory", kind: "wedding", label: "Weddings", photo: "home-wedding-green-tall" },
  { theme: "confetti", kind: "birthday", label: "Birthdays", photo: "home-birthday-tall" },
  { theme: "serene", kind: "funeral", label: "Celebrations of life", photo: "mem-candle-flowers" },
  { theme: "little-blessings", kind: "naming", label: "Naming ceremonies", photo: "home-naming-hd" },
  { theme: "modern-minimalist", kind: "graduation", label: "Graduations", photo: "home-graduation-tall" },
  { theme: "golden-hour", kind: "reunion", label: "Reunions", photo: "reunion-friends" },
] as const;

const HERO_SLIDES = [
  { kind: "wedding", theme: "earth-and-ivory", label: "Weddings", noun: "wedding", headline: "One page for your whole wedding.", subline: "Share your story and programme, collect RSVPs and gifts, and keep every photo your guests take.", photo: "home-wedding-green-wide", position: "50% 25%" },
  { kind: "birthday", theme: "confetti", label: "Birthdays", noun: "birthday", headline: "A birthday page everyone will open.", subline: "Share the details, collect RSVPs and wishes, and gather the photos from the party in one place.", photo: "home-birthday-wide", position: "50% 30%" },
  { kind: "funeral", theme: "serene", label: "Celebrations of life", noun: "celebration of life", headline: "A gentle home for a life well lived.", subline: "Share the order of service, tributes and directions, and receive contributions from family and friends.", photo: "mem-church-candle", position: "50% 45%" },
  { kind: "naming", theme: "little-blessings", label: "Naming ceremonies", noun: "naming ceremony", headline: "Welcome your baby with one page.", subline: "Invite family with the programme and directions, collect RSVPs, and keep the blessings and photos.", photo: "home-naming-hd", position: "50% 35%" },
  { kind: "graduation", theme: "modern-minimalist", label: "Graduations", noun: "graduation", headline: "Celebrate your graduate in one place.", subline: "Invite family and friends, share the day's details, and gather photos and gifts for the big day.", photo: "home-graduation-hero", position: "50% 48%", mobilePhoto: "home-graduation-hero", mobilePosition: "50% 32%" },
  { kind: "reunion", theme: "golden-hour", label: "Reunions", noun: "reunion", headline: "Bring everyone back together.", subline: "Share the date and venue, see who is coming, and collect photos and memories from the day.", photo: "reunion-friends", position: "50% 30%" },
  { kind: "outing", theme: "adventure", label: "Outings and trips", noun: "outing", headline: "Plan the trip, share the memories.", subline: "Give everyone the itinerary, meeting points and directions, then collect the photos afterwards.", photo: "trip-boat-sunset", position: "50% 50%" },
  { kind: "opening", theme: "luxury-editorial", label: "Grand openings", noun: "grand opening", headline: "Open your doors to a full house.", subline: "Send a beautiful invitation with the programme and directions, track RSVPs and share the day's photos.", photo: "open-champagne", position: "50% 40%" },
] as const;

const INCLUDES = [
  { title: "Know exactly who is coming", text: "Guests answer for each part of the day through a personal link, so your numbers stay right.", photo: "wed-kente-dancer" },
  { title: "Photos from every guest", text: "Everyone uploads from their phone. You approve what shows, and everyone can download.", photo: "bday-women" },
  { title: "Colours of the day", text: "Show the colours guests can wear, with names and swatches.", photo: "flowers-table" },
  { title: "No more where is it", text: "Every moment with a time, venue photos, maps and one tap directions.", photo: "venue-church" },
  { title: "Receive gifts without chasing", text: "Guests send by Mobile Money, or pay online when you switch it on.", photo: "wed-ring" },
  { title: "A page that lasts", text: "After the day it becomes a memory page, with a thank you note, the shared photos and a count of every day since.", photo: "wed-lace" },
] as const;

const FAQ = [
  ["How long does it take to make a page?", "Most people finish in about ten minutes. You fill in a guided form; we design the page. You can preview it before anyone else sees it and keep editing after you publish."],
  ["What occasions can I use EverMore for?", "Weddings, birthdays, funerals and memorials, naming ceremonies and outdoorings, grand openings, outings and trips, reunions, anniversaries, showers, graduations, and anything else worth gathering for. Each gets wording, sections and designs that fit."],
  ["Do guests need an account or an app?", "No. Guests open your link or scan the QR code in any browser to see the details, find the venues and RSVP."],
  ["Can guests share their own photos?", "Yes. Guests upload photos and short videos to a shared gallery that everyone can browse and download. By default you approve each upload before it appears."],
  ["Who can see our page?", "You choose. Unlisted pages are visible to anyone with the link but kept out of search engines. Private pages only open through each guest's personal invitation link. Public pages can optionally appear in search results."],
  ["Can we change details after sharing the link?", "Yes. Edits appear as soon as you save. If you change your page address, the old link and printed QR codes keep working."],
  ["What happens after the day?", "Your page becomes a memory page: a thank-you note, the photos guests shared, a timeline of milestones and, for couples, a count of every day you've been married."],
  ["How long will our page stay online?", "For as long as your account is active under our retention policy. You can export your guest list at any time and delete everything whenever you like."],
];

function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] border-[7px] border-[#0b1426] bg-[#0b1426] shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] ${className}`}>
      <div className="relative aspect-[390/664] overflow-hidden rounded-[1.7rem] bg-white">
        {/* Screenshots are already small WebP files and get replaced in place, so skip the optimiser cache. */}
        <Image src={src} alt={alt} fill unoptimized className="object-cover object-top" />
      </div>
    </div>
  );
}

export default async function HomePage() {
  "use cache";
  cacheLife("hours");

  return (
    <>
      {/* ───────────── Hero: a photo for every occasion, one headline, one clear button */}
      <HeroCarousel signUpHref={appHref("/sign-up")} slides={[...HERO_SLIDES]} priceNote={`Build and preview free. Pay ${formatMoney(PAGE_PRICE_MINOR)} only when you publish.`} />

      {/* ───────────── What EverMore is, shown rather than described */}
      <section aria-labelledby="what-is" className="bg-[#f6f3ec] py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
          <div className="text-center lg:text-right">
            <p className="text-sm tracking-[0.2em] text-champagne-deep uppercase">What EverMore is</p>
            <h2 id="what-is" className="mt-3 text-4xl leading-tight font-light text-navy sm:text-5xl">A website for your celebration.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">You build it once in about ten minutes and share one link on WhatsApp. Everything about the day lives on that page, and your guests need no app.</p>
          </div>
          <Phone src="/samples/screens/earth-and-ivory-phone.webp" alt="A finished wedding page on a phone" className="mx-auto w-[230px] sm:w-[260px]" />
          <ul className="space-y-5">
            {[
              ["Your story and programme", "Every ceremony with its time and venue."],
              ["RSVPs and directions", "Guests reply and find the venue in one tap."],
              ["Gifts and guest photos", "Mobile Money gifts, and photos from every phone."],
              ["Memories afterwards", "The page stays as a keepsake of the day."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-1.5 h-4 w-4 shrink-0 text-champagne-deep" aria-hidden />
                <div><h3 className="text-xl font-light text-navy">{t}</h3><p className="text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-4 px-4 text-center sm:grid-cols-4 sm:px-8">
          {[["Not just an invitation card", "It also takes RSVPs, gifts and photos."], ["Not an app to download", "Guests open a link in any browser."], ["Not only a fundraiser", "Gifts are one part of the page."], ["Not a planner you hire", "You build it yourself, with our guide."]].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-5 ring-1 ring-navy/10">
              <p className="text-navy">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Occasions */}
      <section id="occasions" className="scroll-mt-20 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <Intro title="Made for every occasion" text="Pick what you are celebrating and EverMore sets up the right sections for you, from wedding ceremonies and RSVPs to tributes and order of service." />
          <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
            {OCCASIONS.map((o) => (
              <li key={o.kind}>
                <Link href={`/samples/${o.theme}?occasion=${o.kind}`} className="group block text-center">
                  <span className="relative block aspect-[3/4] overflow-hidden bg-mist">
                    <Image src={P(o.photo)} alt="" fill sizes="(min-width: 1024px) 15vw, (min-width: 768px) 30vw, 45vw" quality={90} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="mt-4 block text-base text-navy">{o.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-sm text-muted-foreground">Also outings and trips, grand openings, anniversaries, showers and church and community events.</p>
        </div>
      </section>

      {/* ───────────── Designs */}
      <section id="designs" className="scroll-mt-20 overflow-hidden bg-[#f6f3ec] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Intro title="Choose your design" text="Twelve complete designs, each built differently: a magazine, an invitation suite, a split screen, a booklet, a route with stops. Here they are, exactly as your guests see them." />
        </div>
        <div className="mt-10">
          <DesignRail label="Designs">
            {SAMPLE_THEMES.map((t) => (
              <li key={t.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]">
                <Link href={`/samples/${t.id}`} className="group block">
                  <Phone src={`/samples/screens/${t.id}-phone.webp`} alt={`${t.name} design`} className="transition-transform duration-500 group-hover:-translate-y-2" />
                  <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.2em] text-champagne-deep uppercase">{getOccasion(t.occasion).label}</p>
                  <h3 className="mt-1 text-xl font-light text-navy">{t.name}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{t.tagline}</p>
                </Link>
              </li>
            ))}
          </DesignRail>
        </div>
      </section>

      {/* ───────────── What every page includes */}
      <section id="includes" className="scroll-mt-20 bg-navy py-20 text-ivory sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <p className="mb-10 text-center text-lg text-champagne lg:text-right">Everything you need, on one page</p>
          <IncludeList items={[...INCLUDES]} />
        </div>
      </section>

      {/* ───────────── Two ways in */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-8 md:grid-cols-2">
          {[
            { href: "/samples/earth-and-ivory?occasion=wedding", photo: "home-wedding-green-wide", title: "Plan a wedding", text: "Traditional and white wedding, every ceremony, colour and RSVP, with gifts and guest photos, on one page your guests will keep." },
            { href: "/samples/serene?occasion=funeral", photo: "mem-church-candle", title: "Remember a loved one", text: "The order of events, tributes and details, shared with care and kept for the family." },
          ].map((p) => (
            <Link key={p.title} href={p.href} className="group relative block aspect-[3/4] overflow-hidden sm:aspect-[4/5] md:aspect-[3/4]">
              <Image src={P(p.photo)} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <h2 className="text-3xl font-light sm:text-5xl">{p.title}</h2>
                <p className="mt-3 max-w-md text-white/85">{p.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm">See a sample <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────── How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-[#f6f3ec] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Intro title="From idea to invitation in ten minutes" text="Fill in a short guided form, preview it privately, then share one link with everyone." />
          <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
            {[
              ["Tell us about the day", "Pick the occasion, then add names, dates, the programme, venues and a few photos."],
              ["Choose a design you love", "Twelve designs, each with its own feel. See your own page in each one before you decide."],
              ["Share, then watch it fill up", "Send one link or QR code on WhatsApp or print it on cards. RSVPs, gifts and photos arrive in one place."],
            ].map(([title, text], i) => (
              <li key={title} className="text-center">
                <span className="font-display text-6xl font-light text-champagne" aria-hidden>{i + 1}</span>
                <h3 className="mt-3 text-2xl font-light text-navy">{title}</h3>
                <p className="mx-auto mt-3 max-w-xs leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 text-center">
            <Button asChild size="lg" className="h-12 px-8 text-base"><Link href={appHref("/sign-up")}>Create your page</Link></Button>
          </div>
        </div>
      </section>

      {/* ───────────── Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Intro
            title="One simple price"
            text={`Build and preview your page at no cost. When you are ready to share it, publish for ${formatMoney(PAGE_PRICE_MINOR)}, paid once per celebration by Mobile Money or card. No subscription.`}
          />
          <div className="mx-auto mt-12 max-w-xl">
            <Plan
              name="Your celebration page"
              highlight
              price={`${formatMoney(PAGE_PRICE_MINOR)} once`}
              note="Everything you need to invite, welcome and remember."
              items={["A complete celebration page", "Every design", "Up to 20 events", "RSVPs, guest list and QR code", "Guest photo sharing and guestbook", "Co-host and planner access", "A memory page after the day"]}
            />
          </div>
        </div>
      </section>

      {/* ───────────── FAQ */}
      <section id="faq" className="scroll-mt-20 bg-[#f6f3ec] py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Intro title="Questions, answered" />
          <div className="mt-12 divide-y divide-navy/10 border-y border-navy/10">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-navy [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden className="text-2xl text-champagne transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Closing call, then the reassurance strip */}
      <section className="relative isolate overflow-hidden py-28 text-center text-white sm:py-36">
        <Image src={P("reunion-hug")} alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-navy/80" />
        <div className="px-4">
          <h2 className="text-4xl font-light sm:text-6xl">Begin your story today</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">Your page can be ready to share in minutes.</p>
          <Button asChild size="lg" variant="gold" className="mt-8 h-12 px-8 text-base"><Link href={appHref("/sign-up")}>Create your page</Link></Button>
        </div>
      </section>
      <section aria-label="Why EverMore" className="bg-white py-14">
        <ul className="mx-auto grid max-w-6xl gap-10 px-4 text-center sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            [Wallet, "One price, paid once", `${formatMoney(PAGE_PRICE_MINOR)} by Mobile Money or card. No subscription.`],
            [Smartphone, "Guests need no app", "They open your link or scan the QR code in any browser."],
            [Lock, "Private if you want it", "Public, unlisted or invitation only. You choose who sees it."],
            [Heart, "Yours after the day", "Your page becomes a home for the memories."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Heart;
            return (
              <li key={title as string}>
                <I className="mx-auto h-7 w-7 text-champagne-deep" aria-hidden />
                <h3 className="mt-4 text-lg text-navy">{title as string}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{text as string}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function Intro({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-4xl leading-tight font-light text-navy sm:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

function Plan({ name, price, note, items, highlight = false }: { name: string; price?: string; note: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl p-8 ${highlight ? "bg-navy text-ivory" : "bg-white ring-1 ring-navy/10"}`}>
      <h3 className="text-3xl">{name}</h3>
      {price && <p className={`mt-3 text-2xl ${highlight ? "text-champagne" : "text-navy"}`}>{price}</p>}
      <p className={`mt-2 ${highlight ? "text-ivory/75" : "text-muted-foreground"}`}>{note}</p>
      <ul className="mt-6 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-champagne" aria-hidden /> {i}</li>
        ))}
      </ul>
      <Button asChild variant={highlight ? "gold" : "default"} className="mt-8 w-full"><Link href={appHref("/sign-up")}>Get started</Link></Button>
    </div>
  );
}
