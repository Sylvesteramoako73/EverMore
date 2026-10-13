import {
  CalendarHeart,
  Camera,
  Clock,
  Gift,
  Heart,
  MapPin,
  MessageSquareHeart,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { BrowserFrame, MiniPreview, PhoneFrame } from "@/components/marketing/mini-preview";
import { Button } from "@/components/ui/button";
import { currentTime } from "@/lib/clock";
import { SAMPLE_THEMES } from "@/lib/samples";

const FEATURES = [
  { icon: Sparkles, title: "A website, designed for you", text: "Answer a few questions and get a complete, professionally designed page. No design skills needed." },
  { icon: Clock, title: "Live countdown", text: "Guests see exactly how long until your big day, then a celebration message once it arrives." },
  { icon: QrCode, title: "Invitations & QR codes", text: "A short link and a QR code for WhatsApp, social media, email and printed cards." },
  { icon: Users, title: "RSVPs that add up", text: "Replies per event, guest limits per invitation, meal choices and dietary needs, all in one place." },
  { icon: CalendarHeart, title: "Every celebration", text: "Traditional, civil, religious, reception: different dates and venues, one page." },
  { icon: MapPin, title: "Maps & directions", text: "Each venue with a map and one-tap directions. No app for guests to install." },
  { icon: MessageSquareHeart, title: "Digital guestbook", text: "Warm wishes from your guests, with optional approval before they appear." },
  { icon: Camera, title: "Photo gallery", text: "A beautiful, fast gallery that looks great on any phone." },
  { icon: Gift, title: "Gift notes", text: "Share registry links or a gentle note, without ever showing bank details publicly." },
  { icon: Heart, title: "Memories, kept", text: "After the wedding your page becomes your story: photos, milestones and anniversaries." },
];

const FAQ = [
  ["How long does it take to create our website?", "Most couples finish in about ten minutes. You fill in a guided form; we design the page. You can preview it before anyone else sees it and keep editing after you publish."],
  ["Do our guests need an account or an app?", "No. Guests open your link or scan the QR code in any browser to see the details, find the venues and RSVP."],
  ["Can we have more than one event?", "Yes. Add a traditional ceremony, church or civil ceremony, reception and more, each with its own date, venue, dress code and RSVP."],
  ["Who can see our page?", "You choose. Unlisted pages are visible to anyone with the link but kept out of search engines. Private pages only open through each guest's personal invitation link. Public pages can optionally appear in search results."],
  ["Can we change details after sharing the link?", "Yes. Edits appear on your page as soon as you save. If you change your page address, the old link and printed QR codes keep working."],
  ["What happens after the wedding?", "Your page changes from an invitation into a memory page: a thank-you note, your wedding photos, a timeline of milestones and a counter of how long you've been married. You can get anniversary reminders by email."],
  ["How long will our page stay online?", "For as long as your account is active under our retention policy. You can export your guest list at any time, and you can delete everything whenever you like."],
];

export default async function HomePage() {
  "use cache";
  cacheLife("hours");
  const now = currentTime();

  return (
    <>
      {/* ───────────── Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-blush blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div className="animate-rise">
            <p className="eyebrow">Wedding websites · Invitations · Memories</p>
            <h1 className="mt-5 text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.02] text-navy">
              Your love story deserves more than an <em className="text-champagne-deep">invitation</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Create a beautiful wedding website, invite your loved ones, collect RSVPs and preserve your memories in one place.
              Your story starts here, and stays with you.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/sign-up">Create your wedding website</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/samples/timeless-elegance">Explore a sample wedding</Link></Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Free to start · No design skills needed · Works beautifully on phones</p>
          </div>
          <div className="relative mx-auto w-full max-w-xl" aria-label="Preview of a sample wedding website on a laptop and a phone" role="img">
            <BrowserFrame className="w-[88%]">
              <MiniPreview themeId="timeless-elegance" variant="desktop" now={now} />
            </BrowserFrame>
            <PhoneFrame className="absolute -right-2 -bottom-10 w-[34%] sm:right-0">
              <MiniPreview themeId="romantic-garden" now={now} />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* ───────────── How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-navy/5 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro eyebrow="How it works" title="Three steps to your wedding website" />
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["Tell us your story", "Enter your names, wedding date, events and photographs in a short guided form."],
              ["Your website comes to life", "EverMore designs your personalised wedding website and QR code automatically."],
              ["Share, celebrate & remember", "Invite your guests, manage RSVPs and keep your memories after the wedding."],
            ].map(([title, text], i) => (
              <li key={title} className="relative">
                <span className="font-display text-6xl text-champagne/70">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-2xl text-navy">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro eyebrow="Everything in one place" title="Thoughtful details, for you and your guests" />
          <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-navy">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-navy">{title}</h3>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Themes */}
      <section id="themes" className="scroll-mt-20 bg-navy py-20 text-ivory sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro eyebrow="Six complete designs" title="Find the one that feels like you" inverted />
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_THEMES.map((t) => (
              <li key={t.id}>
                <Link href={`/samples/${t.id}`} className="group block rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-champagne/50">
                  <div className="aspect-[4/5] overflow-hidden rounded-xl text-[13px] transition-transform duration-500 group-hover:scale-[1.01]">
                    <MiniPreview themeId={t.id} variant="card" now={now} />
                  </div>
                  <div className="flex items-start justify-between gap-3 px-1 pt-4 pb-1">
                    <div>
                      <h3 className="text-xl">{t.name}</h3>
                      <p className="mt-1 text-sm text-ivory/70">{t.tagline}</p>
                    </div>
                    {t.premium && <span className="shrink-0 rounded-full border border-champagne/50 px-2 py-0.5 text-[0.65rem] tracking-wider text-champagne uppercase">Premium</span>}
                  </div>
                  <span className="sr-only">View the {t.name} sample wedding</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-sm text-ivory/60">Sample pages use illustrations and invented names. Your page shows your own photographs.</p>
        </div>
      </section>

      {/* ───────────── After the wedding */}
      <section id="after" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow">More than an invitation</p>
            <h2 className="mt-4 text-4xl leading-tight text-navy sm:text-5xl">The wedding ends. Your story doesn&apos;t.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              When the day has passed, your page gently becomes a home for your memories: a thank-you note to your guests,
              your wedding photographs, a timeline of milestones and a count of every day you&apos;ve been married.
            </p>
            <Button asChild variant="outline" className="mt-8"><Link href="/samples/timeless-elegance?after=1">See a page after the wedding</Link></Button>
          </div>
          <ol className="relative space-y-8 border-l border-champagne/40 pl-8">
            {[
              ["Before", "Announce the day, share every event, collect RSVPs and count down together."],
              ["On the day", "Guests find venues, schedules and directions in seconds, and leave their wishes."],
              ["After", "Thank your guests, add official photos and memories, and celebrate each anniversary."],
            ].map(([title, text]) => (
              <li key={title} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[2.4rem] h-3.5 w-3.5 rounded-full border-2 border-champagne bg-ivory" />
                <h3 className="text-2xl text-navy">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </li>
            ))}
            <li className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy/5">
              <p className="eyebrow">Example</p>
              <p className="mt-2 font-display text-2xl text-navy">Married for 1 year, 4 months and 12 days</p>
              <p className="mt-1 text-sm text-muted-foreground">Calculated live from your wedding date, so it&apos;s always right.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ───────────── Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-navy/5 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionIntro eyebrow="Pricing" title="Start free. Upgrade if you'd like more." />
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            EverMore is in early access: every couple gets all features while we finalise our plans. We&apos;ll announce prices before
            anything changes, and we&apos;ll never charge you without your agreement.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Plan
              name="Free"
              note="Everything you need to invite and welcome your guests."
              items={["A complete wedding website", "3 standard themes", "Up to 3 events", "RSVP collection & guest list", "QR code & sharing", "Guestbook"]}
            />
            <Plan
              name="Premium"
              highlight
              note="For bigger celebrations and lasting memories."
              items={["Every theme, including premium designs", "Up to 20 events", "Larger galleries & guest lists", "Partner & planner collaboration", "Extended memory features", "Custom domain (planned)"]}
            />
          </div>
        </div>
      </section>

      {/* ───────────── FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionIntro eyebrow="Questions" title="Frequently asked" />
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
        <div className="mx-auto max-w-5xl rounded-3xl bg-navy px-6 py-16 text-center text-ivory sm:px-12">
          <h2 className="text-4xl sm:text-5xl">Begin your story today</h2>
          <p className="mx-auto mt-4 max-w-xl text-ivory/75">Your wedding website can be ready to share in minutes.</p>
          <Button asChild size="lg" variant="gold" className="mt-8"><Link href="/sign-up">Create your wedding website</Link></Button>
        </div>
      </section>
    </>
  );
}

function SectionIntro({ eyebrow, title, inverted = false }: { eyebrow: string; title: string; inverted?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={inverted ? "eyebrow !text-champagne" : "eyebrow"}>{eyebrow}</p>
      <h2 className={`mt-4 text-4xl leading-tight sm:text-5xl ${inverted ? "text-ivory" : "text-navy"}`}>{title}</h2>
      <div className="hairline mx-auto mt-6 justify-center" aria-hidden>◆</div>
    </div>
  );
}

function Plan({ name, note, items, highlight = false }: { name: string; note: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-8 ${highlight ? "bg-navy text-ivory" : "bg-ivory ring-1 ring-navy/10"}`}>
      <h3 className="text-3xl">{name}</h3>
      <p className={`mt-2 ${highlight ? "text-ivory/75" : "text-muted-foreground"}`}>{note}</p>
      <ul className="mt-6 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span aria-hidden className="text-champagne">✓</span>
            {i}
          </li>
        ))}
      </ul>
      <Button asChild variant={highlight ? "gold" : "default"} className="mt-8 w-full">
        <Link href="/sign-up">Get started</Link>
      </Button>
    </div>
  );
}
