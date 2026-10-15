import { ArrowRight, Camera, Check, Heart, MapPin, Palette, QrCode, Sparkles, Users } from "lucide-react";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { DesignRail } from "@/components/marketing/design-rail";
import { Button } from "@/components/ui/button";
import { getOccasion } from "@/lib/occasions";
import { SAMPLE_THEMES } from "@/lib/samples";

const P = (name: string) => `/samples/photos/${name}.webp`;

const OCCASIONS = [
  { kind: "wedding", theme: "earth-and-ivory", label: "Weddings", blurb: "Traditional and white wedding, every ceremony, colour and RSVP.", photo: "wed-kente-couple", span: "md:col-span-2 md:row-span-2" },
  { kind: "birthday", theme: "confetti", label: "Birthdays", blurb: "Wishes wall, dress code and everyone's photos.", photo: "bday-cake-group", span: "" },
  { kind: "funeral", theme: "serene", label: "Celebrations of life", blurb: "Order of events, tributes and details, with care.", photo: "mem-candle-flowers", span: "" },
  { kind: "outing", theme: "adventure", label: "Outings & trips", blurb: "Itinerary, meeting point and what to bring.", photo: "trip-sunset-group", span: "md:col-span-2" },
  { kind: "naming", theme: "little-blessings", label: "Naming ceremonies", blurb: "The name, its meaning and blessings.", photo: "baby-fabric", span: "" },
  { kind: "graduation", theme: "modern-minimalist", label: "Graduations", blurb: "Celebrate the graduate with everyone.", photo: "grad-flowers", span: "" },
  { kind: "reunion", theme: "golden-hour", label: "Reunions", blurb: "Family and class reunions, before and after.", photo: "reunion-friends", span: "" },
  { kind: "opening", theme: "luxury-editorial", label: "Grand openings", blurb: "Shops, restaurants, offices: open your doors in style.", photo: "open-boutique", span: "" },
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
      {/* ───────────── Hero */}
      <section className="relative overflow-hidden bg-navy text-ivory">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-champagne/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20 lg:pb-28">
          <div className="animate-rise">
            <p className="eyebrow !text-champagne">Weddings · Birthdays · Memorials · Grand openings · and more</p>
            <h1 className="mt-5 text-[clamp(2.7rem,6vw,4.6rem)] leading-[1.02]">
              Every moment that matters deserves a <em className="text-champagne">beautiful home</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/80">
              Create a stunning page for your celebration in minutes. Share it on WhatsApp, collect RSVPs, gather everyone&apos;s
              photos, and keep the memories long after the day.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gold"><Link href="/sign-up">Create your page, free</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory/10 hover:text-ivory">
                <Link href="#designs">See the designs</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory/70">
              {["No design skills needed", "Guests need no app", "12 designs"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-champagne" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>

          {/* One couple, one story: their photo, and the page they made for their guests. */}
          <div className="relative mx-auto w-full max-w-[520px] pb-10 pl-14 sm:pl-24" aria-hidden>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_50px_100px_-40px_rgba(0,0,0,.8)] ring-1 ring-white/10">
              <Image src={P("wed-kente-couple")} alt="" fill priority sizes="(min-width: 1024px) 440px, 80vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
              <div className="absolute right-6 bottom-6 text-right">
                <p className="font-display text-3xl">Ama &amp; Kofi</p>
                <p className="mt-1 text-xs tracking-[0.25em] text-ivory/80 uppercase">Wedding · 18 January</p>
              </div>
            </div>
            <Phone src="/samples/screens/traditional-celebration-phone.webp" alt="" className="absolute bottom-0 left-0 w-[150px] sm:w-[200px]" />
            <div className="absolute top-8 -right-2 flex items-center gap-3 rounded-2xl bg-white py-3 pr-5 pl-3 text-navy shadow-xl sm:-right-8">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-success/15 text-success"><Check className="h-4 w-4" /></span>
              <span>
                <span className="block text-xs text-muted-foreground">New RSVP</span>
                <span className="block text-sm font-semibold">Esi is coming, +1</span>
              </span>
            </div>
          </div>
        </div>
        {/* Scrolling ribbon of occasions */}
        <div className="border-t border-white/10 py-4">
          <div className="evm-marquee flex gap-10 text-sm tracking-[0.25em] whitespace-nowrap text-ivory/60 uppercase">
            {Array.from({ length: 2 }, (_, k) => (
              <span key={k} className="flex shrink-0 gap-10" aria-hidden={k === 1}>
                {["Weddings", "Birthdays", "Outdoorings", "Grand openings", "Celebrations of life", "Road trips", "Reunions", "Anniversaries", "Graduations", "Baby showers"].map((o) => (
                  <span key={o} className="flex items-center gap-10">{o}<span className="text-champagne">✦</span></span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Occasions bento */}
      <section id="occasions" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Intro eyebrow="For every occasion" title="One home for all of life's gatherings" text="Each occasion gets its own words, sections and designs, from a joyful outdooring to a dignified celebration of life." />
          <ul className="mt-14 grid auto-rows-[220px] gap-4 md:grid-cols-4 md:auto-rows-[240px]">
            {OCCASIONS.map((o) => (
              <li key={o.kind} className={o.span}>
                <Link href={`/samples/${o.theme}?occasion=${o.kind}`} className="group relative block h-full overflow-hidden rounded-3xl">
                  <Image src={P(o.photo)} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                    <h3 className="text-2xl sm:text-3xl">{o.label}</h3>
                    <p className="mt-1 max-w-sm text-sm text-white/80">{o.blurb}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-champagne">
                      See a sample <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted-foreground">Also anniversaries &amp; vow renewals, baby &amp; bridal showers, housewarmings, church and community events.</p>
        </div>
      </section>

      {/* ───────────── Designs: real screenshots */}
      <section id="designs" className="scroll-mt-20 overflow-hidden bg-[#f3eee4] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Intro eyebrow="Twelve complete designs" title="Twelve designs. Twelve different page structures." text="Not the same page in different colours: each design is built differently. A magazine with a contents page, an invitation suite of paper cards, a split screen, a bento board, a booklet, a route with stops. Here they are, exactly as guests see them." />
        </div>
        <div className="mt-10">
        <DesignRail label="Designs">
          {SAMPLE_THEMES.map((t) => (
            <li key={t.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]">
              <Link href={`/samples/${t.id}`} className="group block">
                <Phone src={`/samples/screens/${t.id}-phone.webp`} alt={`${t.name} design`} className="transition-transform duration-500 group-hover:-translate-y-2" />
                <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.2em] text-champagne-deep uppercase">{getOccasion(t.occasion).label}</p>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <h3 className="text-xl text-navy">{t.name}</h3>
                  {t.premium && <span className="mt-1 shrink-0 rounded-full bg-navy px-2 py-0.5 text-[0.6rem] tracking-wider text-champagne uppercase">Premium</span>}
                </div>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{t.tagline}</p>
              </Link>
            </li>
          ))}
        </DesignRail>
        </div>
      </section>

      {/* ───────────── How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Intro eyebrow="How it works" title="Ready to share in three steps" />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Tell us what you're celebrating", text: "Pick the occasion, then add names, dates, the programme and a few photos in a short guided form." },
              { icon: Palette, title: "Choose a design you love", text: "Twelve designs, each with its own feel. Preview your own page live, and add your colours of the day." },
              { icon: QrCode, title: "Share with everyone", text: "A short link and a QR code for WhatsApp, social media and printed cards. Replies and photos roll in." },
            ].map((s, i) => (
              <li key={s.title} className="relative rounded-3xl bg-white p-8 shadow-sm ring-1 ring-navy/5">
                <span className="font-display text-7xl text-champagne/30" aria-hidden>{i + 1}</span>
                <s.icon className="mt-2 h-7 w-7 text-champagne-deep" aria-hidden />
                <h3 className="mt-4 text-2xl text-navy">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Feature stories */}
      <section className="bg-navy py-20 text-ivory sm:py-28">
        <div className="mx-auto max-w-6xl space-y-24 px-4 sm:px-6">
          <Feature
            eyebrow="Share the love"
            title="Everyone's photos, in one place"
            text="Guests upload the photos and videos they take, straight from their phones. Everyone can browse and download them, and you approve what appears."
            points={["No app, no sign-up for guests", "Photos and short videos", "You approve before they appear"]}
            photos={["bday-women", "wed-kente-embrace", "bday-friends"]}
          />
          <Feature
            reverse
            eyebrow="RSVPs that add up"
            title="Know exactly who's coming"
            text="Guests answer for each part of the day. Personal invitation links keep numbers right, and phone contacts are there for those who'd rather call."
            points={["Replies per event", "Guest limits per invitation", "Meal choices and dietary needs"]}
            photos={["wed-kente-dancer", "wed-arch", "wed-vows"]}
          />
          <Feature
            eyebrow="All the details"
            title="Colours of the day, programme and directions"
            text="Show the colours guests can wear, a programme with every moment, venue photos, maps and one-tap directions."
            points={["Colours with names and swatches", "Programme with icons and times", "Maps, directions and calendar links"]}
            photos={["venue-church", "flowers-table", "trip-road"]}
          />
        </div>
      </section>

      {/* ───────────── After the day */}
      <section id="after" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
            <Image src={P("wed-lace")} alt="A groom smiling at his bride" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur">
              <p className="eyebrow">Example</p>
              <p className="mt-1 font-display text-2xl text-navy">Married for 1 year, 4 months and 12 days</p>
            </div>
          </div>
          <div>
            <p className="eyebrow">More than an invitation</p>
            <h2 className="mt-4 text-4xl leading-tight text-navy sm:text-5xl">The day ends. Your story doesn&apos;t.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Afterwards your page becomes a home for the memories: a thank-you note, the photos everyone shared, a timeline of milestones,
              and gentle yearly reminders.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                [Heart, "Thank your guests with a note on the page"],
                [Camera, "Keep every photo your guests shared"],
                [MapPin, "Look back at where it all happened"],
                [Users, "Celebrate anniversaries and milestones together"],
              ].map(([Icon, t]) => {
                const I = Icon as typeof Heart;
                return (
                  <li key={t as string} className="flex items-center gap-3 text-navy">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-blush"><I className="h-4 w-4" aria-hidden /></span>
                    {t as string}
                  </li>
                );
              })}
            </ul>
            <Button asChild variant="outline" className="mt-8"><Link href="/samples/earth-and-ivory?after=1">See a page after the day</Link></Button>
          </div>
        </div>
      </section>

      {/* ───────────── Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-[#f3eee4] py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Intro eyebrow="Pricing" title="Start free. Upgrade if you'd like more." text="EverMore is in early access: everyone gets all features while we finalise plans. We'll announce prices before anything changes and never charge you without your agreement." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Plan name="Free" note="Everything you need to invite and welcome your guests." items={["A complete celebration page", "8 standard designs", "Up to 3 events", "RSVPs, guest list & QR code", "Guest photo sharing", "Guestbook"]} />
            <Plan name="Premium" highlight note="For bigger celebrations and lasting memories." items={["Every design, including premium", "Up to 20 events", "Larger galleries & guest lists", "Co-host & planner access", "Extended memory features", "Custom domain (planned)"]} />
          </div>
        </div>
      </section>

      {/* ───────────── FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Intro eyebrow="Questions" title="Frequently asked" />
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

      {/* ───────────── Closing CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-24 text-center text-white sm:px-12">
          <Image src={P("reunion-hug")} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-navy/75" />
          <div className="relative">
            <h2 className="text-4xl sm:text-6xl">Begin your story today</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">Your page can be ready to share in minutes.</p>
            <Button asChild size="lg" variant="gold" className="mt-8"><Link href="/sign-up">Create your page, free</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Intro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-4xl leading-tight text-navy sm:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

function Feature({ eyebrow, title, text, points, photos, reverse = false }: { eyebrow: string; title: string; text: string; points: string[]; photos: string[]; reverse?: boolean }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="eyebrow !text-champagne">{eyebrow}</p>
        <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h2>
        <p className="mt-5 text-lg leading-relaxed text-ivory/75">{text}</p>
        <ul className="mt-6 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-champagne" aria-hidden /> {p}</li>
          ))}
        </ul>
      </div>
      <div className="grid h-[360px] grid-cols-2 grid-rows-2 gap-3 sm:h-[460px]" aria-hidden>
        {photos.slice(0, 3).map((ph, i) => (
          <div key={ph} className={`relative overflow-hidden rounded-2xl ${i === 0 ? "row-span-2" : ""}`}>
            <Image src={P(ph)} alt="" fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Plan({ name, note, items, highlight = false }: { name: string; note: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl p-8 ${highlight ? "bg-navy text-ivory" : "bg-white ring-1 ring-navy/10"}`}>
      <h3 className="text-3xl">{name}</h3>
      <p className={`mt-2 ${highlight ? "text-ivory/75" : "text-muted-foreground"}`}>{note}</p>
      <ul className="mt-6 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-champagne" aria-hidden /> {i}</li>
        ))}
      </ul>
      <Button asChild variant={highlight ? "gold" : "default"} className="mt-8 w-full"><Link href="/sign-up">Get started</Link></Button>
    </div>
  );
}
