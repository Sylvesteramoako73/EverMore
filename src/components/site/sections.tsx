import { GiftPanel } from "./gifts";
import {
  Bus, Cake, Camera, Check, Church, Feather, Flame, Flower2, Gift, GlassWater, Heart, Map, Music, Phone, Star, Sun, Utensils,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatLongDate, formatPlainDate, formatTime, parsePlainDate, plainDateInZone } from "@/lib/dates";
import type { Theme } from "@/lib/themes";
import { Picture } from "./hero";
import { Countdown, Reveal } from "./live";
import { GeometricBand, OrnamentDivider } from "./ornaments";
import type { CelebrationView, EventView } from "./types";

// Server-rendered sections of a celebration page. Each reads its look from the theme.

export function Section({
  id, eyebrow, title, theme, children, tone = "plain", intro,
}: {
  id: string;
  eyebrow: string;
  title: string;
  theme: Theme;
  children: ReactNode;
  tone?: "plain" | "tint" | "band" | "pop";
  intro?: ReactNode;
}) {
  const bg = tone === "tint" ? "var(--w-tint)" : tone === "band" ? "var(--w-band)" : tone === "pop" ? "var(--w-accent)" : "var(--w-bg)";
  const shaped = tone !== "plain" && theme.layout.divider !== "none";
  const left = theme.heading === "editorial-left";
  const size =
    theme.heading === "minimal-caps" ? "text-3xl tracking-[0.12em] uppercase sm:text-4xl"
    : theme.heading === "script-centered" ? "text-5xl italic sm:text-6xl"
    : theme.heading === "ornate" ? "text-4xl tracking-[0.08em] uppercase sm:text-5xl"
    : theme.heading === "editorial-left" ? "text-5xl sm:text-7xl"
    : "text-5xl sm:text-6xl";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      style={{ ["--w-section-bg" as string]: bg }}
      className={`scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 ${tone === "tint" ? "w-tint" : tone === "band" ? "w-band" : tone === "pop" ? "w-pop" : ""} ${shaped ? "w-shaped" : ""}`}
    >
      {shaped && <SectionShape kind={theme.layout.divider} fill={bg} />}
      <div className="mx-auto max-w-6xl">
        <Reveal className={`mb-12 sm:mb-16 ${left ? "text-left" : "text-center"}`}>
          {theme.heading === "band" && <GeometricBand className="mx-auto mb-6 !h-3 max-w-[9rem]" />}
          <p className="w-eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className={`w-display mt-3 ${size}`}>{title}</h2>
          {!left && theme.heading !== "classic" && <div className="mt-5"><OrnamentDivider kind={theme.ornament} /></div>}
          {left && <div className="mt-6 h-px w-24 bg-[var(--w-accent)]" />}
          {intro && <div className={`w-muted mt-6 max-w-2xl ${left ? "" : "mx-auto"}`}>{intro}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

// ───────────────────────────── Save the date: tilted photo + month calendar

/** Wavy, zig-zag or curved edges painted in the section's own colour, overlapping its neighbours. */
export function SectionShape({ kind, fill }: { kind: Theme["layout"]["divider"]; fill: string }) {
  const d =
    kind === "wave" ? "M0 48 C 200 0 400 0 600 24 S 1000 48 1200 12 V48 Z"
    : kind === "curve" ? "M0 48 Q 600 -6 1200 48 Z"
    : `M0 48 ${Array.from({ length: 31 }, (_, i) => `L${i * 40} ${i % 2 ? 20 : 40}`).join(" ")} L1200 48 Z`;
  return (
    <>
      <svg aria-hidden className="w-shape w-shape-top" viewBox="0 0 1200 48" preserveAspectRatio="none"><path d={d} fill={fill} /></svg>
      <svg aria-hidden className="w-shape w-shape-bottom" viewBox="0 0 1200 48" preserveAspectRatio="none"><path d={d} fill={fill} /></svg>
    </>
  );
}

export function SaveTheDate({ w }: { w: CelebrationView }) {
  const p = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  if (!p) return null;
  const { y, m, d } = parsePlainDate(plainDateInZone(new Date(p.startsAt), p.timezone));
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const photo = w.portraits[0] ?? w.gallery[0] ?? w.hero;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

  return (
    <section aria-labelledby="save-title" className="w-band px-5 py-20 sm:px-8 sm:py-24">
      <div className={`mx-auto grid max-w-5xl items-center gap-14 ${photo ? "md:grid-cols-2" : ""}`}>
        {photo && (
          <Reveal className="mx-auto w-[min(78vw,320px)]">
            <figure className="w-tilt-l bg-white p-3 pb-12 shadow-[0_30px_60px_-30px_rgba(0,0,0,.7)]">
              <Picture image={photo} sizes="320px" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="w-display mt-3 text-center text-2xl text-[#2a1b13] italic">Moments</figcaption>
            </figure>
          </Reveal>
        )}
        <Reveal className="text-center">
          <h2 id="save-title" className="w-display text-3xl tracking-[0.12em] uppercase sm:text-4xl">Save the Date</h2>
          <p className="mt-2 text-sm opacity-80">{formatLongDate(new Date(p.startsAt), p.timezone)}</p>
          <table className="mx-auto mt-8 w-full max-w-sm text-sm" aria-label={`Calendar for ${monthName}`}>
            <caption className="sr-only">{monthName}</caption>
            <thead>
              <tr>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => <th key={x} scope="col" className="pb-3 text-xs font-semibold tracking-wider uppercase opacity-80">{x}</th>)}</tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
                <tr key={r}>
                  {cells.slice(r * 7, r * 7 + 7).map((n, i) => (
                    <td key={i} className="py-1.5 text-center">
                      {n === d ? (
                        <span className="inline-grid h-8 w-11 place-items-center rounded-full border border-current font-bold" aria-label={`${n}, the big day`}>{n}</span>
                      ) : (
                        <span className="opacity-85">{n ?? ""}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

// ───────────────────────────── Story & occasion facts

// ───────────────────────────── Venues

export function mapsSearch(e: EventView) {
  const q = e.venueLat !== null && e.venueLng !== null ? `${e.venueLat},${e.venueLng}` : [e.venueName, e.venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
export function mapsDirections(e: EventView) {
  const q = e.venueLat !== null && e.venueLng !== null ? `${e.venueLat},${e.venueLng}` : [e.venueName, e.venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

// ───────────────────────────── Programme timeline

const ICONS: Record<string, typeof Heart> = {
  rings: Heart, church: Church, camera: Camera, dinner: Utensils, music: Music, cake: Cake, gift: Gift, glass: GlassWater,
  bus: Bus, map: Map, sun: Sun, flower: Flower2, dove: Feather, candle: Flame, star: Star, heart: Heart,
};

/** A sensible icon when the host hasn't picked one. */
export function iconFor(e: EventView) {
  if (e.icon && ICONS[e.icon]) return ICONS[e.icon];
  const n = e.name.toLowerCase();
  if (/church|service|mass|thanksgiving|dedication/.test(n)) return Church;
  if (/photo/.test(n)) return Camera;
  if (/reception|dinner|lunch|brunch|meal/.test(n)) return Utensils;
  if (/party|dance|after/.test(n)) return Music;
  if (/birthday|cake/.test(n)) return Cake;
  if (/depart|meet|bus|travel|arriv/.test(n)) return Bus;
  if (/hike|tour|cruise|explore/.test(n)) return Map;
  if (/wake|burial|funeral|memorial|rites/.test(n)) return Feather;
  if (/wedding|engagement|vow/.test(n)) return Heart;
  return Star;
}

// ───────────────────────────── Colours of the day

export function ColoursSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  if (!w.colours.length) return null;
  const names = w.colours.map((c) => c.name);
  const title = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
  return (
    <Section id="colours" eyebrow="Colours of the day" title={title} theme={theme} tone={theme.layout.pop ? "pop" : "plain"} intro={<p>Join us in these colours, if you&apos;d like to.</p>}>
      <ul className={`mx-auto grid max-w-5xl gap-5 ${w.colours.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${w.colours.length > 3 ? "lg:grid-cols-5" : ""}`}>
        {w.colours.map((c) => (
          <Reveal as="li" key={c.hex + c.name} className="w-card flex flex-col items-center p-5 text-center">
            <span aria-hidden className="aspect-square w-full max-w-[220px] rounded-full border border-black/5" style={{ background: c.hex }} />
            <p className="w-display mt-5 text-2xl">{c.name}</p>
            {c.note && <p className="w-muted mt-1 text-sm">{c.note}</p>}
            <p className="mt-3 rounded-full bg-[var(--w-tint)] px-3 py-1 font-mono text-xs uppercase">{c.hex}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

// ───────────────────────────── Trip details (outings)

export function TripSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const f = w.facts;
  if (!f.meetingPoint && !f.packingList.length && !f.costNote) return null;
  return (
    <Section id="trip" eyebrow="Good to know" title="Trip Details" theme={theme}>
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {f.meetingPoint && (
          <Reveal className="w-card p-7">
            <p className="w-eyebrow">Meeting point</p>
            <p className="mt-3 whitespace-pre-line text-lg">{f.meetingPoint}</p>
            {f.costNote && (
              <>
                <p className="w-eyebrow mt-8">Costs</p>
                <p className="mt-3 whitespace-pre-line">{f.costNote}</p>
              </>
            )}
          </Reveal>
        )}
        {f.packingList.length > 0 && (
          <Reveal className="w-card p-7">
            <p className="w-eyebrow">What to bring</p>
            <ul className="mt-4 space-y-2.5">
              {f.packingList.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--w-accent)] text-[var(--w-accent-ink)]"><Check className="h-3 w-3" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
        {!f.meetingPoint && f.costNote && (
          <Reveal className="w-card p-7"><p className="w-eyebrow">Costs</p><p className="mt-3 whitespace-pre-line">{f.costNote}</p></Reveal>
        )}
      </div>
    </Section>
  );
}

// ───────────────────────────── RSVP contacts & countdown band

export function RsvpContacts({ w }: { w: CelebrationView }) {
  if (!w.rsvp.contacts.length) return null;
  return (
    <div className="mt-8 border-t border-[var(--w-line)] pt-6">
      <p className="w-label">Prefer to call or message?</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {w.rsvp.contacts.map((c) => (
          <li key={c.name + c.phone} className="flex items-center justify-between gap-3 rounded-[max(calc(var(--w-radius)*0.5),2px)] bg-[var(--w-tint)] px-4 py-3 text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="flex items-center gap-3">
              <a href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden /> {c.phone}
              </a>
              {/* WhatsApp needs the international number; we don't guess a country code. */}
              {c.phone.trim().startsWith("+") && (
                <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">
                  WhatsApp<span className="sr-only"> {c.name}</span>
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CountdownBand({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const p = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  if (!p || !w.occasion.countdown || w.phase !== "upcoming") return null;
  const look = theme.layout.countdown;
  const cls = look === "band" ? "w-band" : look === "big" ? (theme.layout.pop ? "w-pop" : "w-band") : "";
  const heading = w.occasion.kind === "outing" ? "Adventure Awaits" : w.occasion.kind === "birthday" ? "The Party Starts In" : "Our Big Day Awaits";
  return (
    <section aria-label="Countdown" className={`px-5 py-20 text-center sm:py-24 ${cls}`}>
      <Reveal>
        <p className={`w-display ${look === "big" ? "text-3xl uppercase tracking-[0.12em] sm:text-4xl" : "text-4xl italic sm:text-5xl"}`}>{heading}</p>
        <div className="mx-auto mt-10 flex max-w-4xl justify-center">
          <Countdown to={p.startsAt} tone={look === "circles" ? "dark" : "light"} look={look === "band" ? "boxes" : look} after={<p className="w-display text-2xl italic">{w.occasion.copy.today}</p>} />
        </div>
      </Reveal>
    </section>
  );
}

// ───────────────────────────── Gifts, thank you, memories

export function GiftsSection({ w, theme, inviteToken = null }: { w: CelebrationView; theme: Theme; inviteToken?: string | null }) {
  return (
    <Section id="gifts" eyebrow="With gratitude" title={w.occasion.kind === "funeral" ? "Donations" : "Gifts"} theme={theme}>
      <Reveal className="mx-auto max-w-2xl text-center">
        {w.gifts.message && <p className="w-muted whitespace-pre-line">{w.gifts.message}</p>}
        {w.gifts.links.length > 0 && (
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {w.gifts.links.map((l) => (
              <li key={l.url}>
                <a className="w-btn w-btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer nofollow">
                  {l.label}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
      {w.gifts.funds.length > 0 && <GiftPanel w={w} inviteToken={inviteToken} />}
    </Section>
  );
}

export function ThankYouSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  return (
    <Section id="thank-you" eyebrow="From our hearts" title={w.occasion.copy.thankYouTitle} theme={theme}>
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="w-display text-2xl leading-snug italic sm:text-3xl">{w.thankYouMessage}</p>
        <p className="w-display w-accent mt-8 text-2xl">— {w.title}</p>
      </Reveal>
    </Section>
  );
}

export function MemoriesSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  return (
    <Section id="memories" eyebrow={w.occasion.after === "remembrance" ? "A life remembered" : "Forever after"} title={w.occasion.after === "remembrance" ? "Memories" : "Our Journey"} theme={theme} tone="tint">
      <ol className="relative mx-auto max-w-3xl space-y-14 before:absolute before:top-3 before:bottom-3 before:left-[0.6rem] before:w-px before:bg-[var(--w-line)]">
        {w.memories.map((m) => (
          <Reveal as="li" key={m.id} className="relative pl-10">
            <span aria-hidden className="absolute top-2 left-0 h-5 w-5 rounded-full border-2 border-[var(--w-accent)] bg-[var(--w-bg)]" />
            <p className="w-eyebrow">
              {formatPlainDate(m.happenedOn)}
              {m.location && <span className="w-muted font-normal normal-case tracking-normal"> · {m.location}</span>}
            </p>
            <h3 className="w-display mt-2 text-3xl">{m.title}</h3>
            {m.body && <p className="w-muted mt-3 whitespace-pre-line">{m.body}</p>}
            {m.images.length > 0 && (
              <div className={`mt-5 grid gap-3 ${m.images.length > 1 ? "grid-cols-2" : ""}`}>
                {m.images.slice(0, 4).map((img) => (
                  <div key={img.id} className="w-photo"><Picture image={img} sizes="(min-width: 768px) 360px, 45vw" className="aspect-[4/3] w-full object-cover" /></div>
                ))}
              </div>
            )}
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

// ───────────────────────────── Closing invitation & footer

export function ClosingCard({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const p = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  return (
    <section aria-label="Invitation" className="px-5 pt-20 pb-10 text-center sm:pt-28">
      <Reveal className="mx-auto max-w-3xl">
        <p className="w-eyebrow">{w.occasion.label} {w.occasion.after === "remembrance" ? "details" : "invitation"}</p>
        <p className="w-display mt-5 text-5xl sm:text-7xl">{w.title}</p>
        {p && (
          <p className="w-muted mt-5">
            {formatLongDate(new Date(p.startsAt), p.timezone)} · {formatTime(new Date(p.startsAt), p.timezone)}
            {p.venueName && <><br />{p.venueName}{p.venueAddress && `, ${p.venueAddress}`}</>}
          </p>
        )}
        {theme.ornament !== "none" && <div className="mt-8"><OrnamentDivider kind={theme.ornament} /></div>}
      </Reveal>
    </section>
  );
}

export function Footer({ w }: { w: CelebrationView }) {
  return (
    <footer className="w-line border-t px-5 py-12 text-center">
      {w.contact && (
        <p className="w-muted text-sm">
          Questions? {w.contact.name && <>{w.contact.name} · </>}
          {w.contact.email && <a className="underline underline-offset-4" href={`mailto:${w.contact.email}`}>{w.contact.email}</a>}
          {w.contact.email && w.contact.phone && " · "}
          {w.contact.phone && <a className="underline underline-offset-4" href={`tel:${w.contact.phone.replace(/\s/g, "")}`}>{w.contact.phone}</a>}
        </p>
      )}
      <p className="w-muted mt-6 text-xs">
        Made with love on <Link href="/" className="underline underline-offset-4">EverMore</Link>
      </p>
    </footer>
  );
}
