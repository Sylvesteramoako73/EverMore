import {
  Bus, Cake, Camera, Check, Church, Feather, Flame, Flower2, Gift, GlassWater, Heart, Map, MapPin, Music, Phone, Star, Sun, Utensils,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatLongDate, formatPlainDate, formatTime, formatTimeRange, parsePlainDate, plainDateInZone } from "@/lib/dates";
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
  tone?: "plain" | "tint" | "band";
  intro?: ReactNode;
}) {
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
      className={`scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 ${tone === "tint" ? "w-tint" : tone === "band" ? "w-band" : ""}`}
    >
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

export function StorySection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const f = w.facts;
  const facts = [
    w.occasion.kind === "naming" && f.nameMeaning && ["The meaning", f.nameMeaning],
    f.parents && ["Proud parents", f.parents],
    w.occasion.kind === "birthday" && f.turningAge && ["Turning", String(f.turningAge)],
    f.institution && ["Graduating from", f.institution],
  ].filter(Boolean) as [string, string][];
  const hasText = Boolean(w.story || w.guestMessage || w.announcement || facts.length);
  if (!hasText) return null;
  const portrait = w.portraits[1] ?? w.portraits[0];
  return (
    <Section id="story" eyebrow={w.phase === "after" ? "Where it began" : "Welcome"} title={w.occasion.copy.storyTitle} theme={theme}>
      <div className={`mx-auto grid max-w-5xl items-center gap-12 ${portrait ? "lg:grid-cols-[0.85fr_1.15fr]" : ""}`}>
        {portrait && (
          <Reveal className="w-photo mx-auto w-full max-w-sm">
            <Picture image={portrait} sizes="(min-width: 1024px) 380px, 90vw" className="aspect-[4/5] w-full object-cover" />
          </Reveal>
        )}
        <Reveal className={portrait ? "" : "mx-auto max-w-2xl text-center"}>
          {w.guestMessage && <p className="w-display text-2xl leading-snug italic sm:text-3xl">&ldquo;{w.guestMessage}&rdquo;</p>}
          {facts.length > 0 && (
            <dl className={`mt-8 grid gap-4 ${portrait ? "" : "justify-center"} sm:grid-cols-2`}>
              {facts.map(([label, value]) => (
                <div key={label} className="w-card p-5">
                  <dt className="w-eyebrow">{label}</dt>
                  <dd className="w-display mt-2 text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {w.story && <p className="w-muted mt-8 whitespace-pre-line">{w.story}</p>}
          {w.announcement && <p className="mt-8 whitespace-pre-line">{w.announcement}</p>}
          {w.hashtag && <p className="w-eyebrow mt-8">#{w.hashtag}</p>}
        </Reveal>
      </div>
    </Section>
  );
}

// ───────────────────────────── Venues

function mapsSearch(e: EventView) {
  const q = e.venueLat !== null && e.venueLng !== null ? `${e.venueLat},${e.venueLng}` : [e.venueName, e.venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
function mapsDirections(e: EventView) {
  const q = e.venueLat !== null && e.venueLng !== null ? `${e.venueLat},${e.venueLng}` : [e.venueName, e.venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function VenuesSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const withVenue = w.events.filter((e) => e.venueName || e.venueAddress);
  if (!withVenue.length) return null;
  return (
    <Section id="venues" eyebrow={w.phase === "after" ? "Where it happened" : "Where to find us"} title={withVenue.length > 1 ? "The Venues" : "The Venue"} theme={theme}>
      <ul className={`grid gap-6 ${withVenue.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-2xl"}`}>
        {withVenue.map((e) => (
          <Reveal as="li" key={e.id} className="w-surface flex flex-col p-6 text-center sm:p-8">
            <h3 className="w-display text-3xl italic">{e.name}</h3>
            {e.venueName && <p className="mt-3 font-semibold">{e.venueName}</p>}
            {e.venueAddress && <p className="w-muted text-sm">{e.venueAddress}</p>}
            {e.venueImage ? (
              <div className="w-photo mt-6">
                <Picture image={e.venueImage} sizes="(min-width: 768px) 520px, 90vw" className="aspect-[16/7] w-full object-cover" />
              </div>
            ) : e.venueLat !== null && e.venueLng !== null ? (
              <iframe
                title={`Map of ${e.venueName || e.name}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${e.venueLng! - 0.008},${e.venueLat! - 0.005},${e.venueLng! + 0.008},${e.venueLat! + 0.005}&layer=mapnik&marker=${e.venueLat},${e.venueLng}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="mt-6 aspect-[16/7] w-full rounded-[var(--w-radius)] border-0 grayscale-[30%]"
              />
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <a className="w-btn w-btn-sm" href={mapsSearch(e)} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4" aria-hidden /> View map<span className="sr-only"> for {e.venueName || e.name} (opens in a new tab)</span>
              </a>
              <a className="w-btn w-btn-sm w-btn-ghost" href={mapsDirections(e)} target="_blank" rel="noopener noreferrer">
                Directions<span className="sr-only"> to {e.venueName || e.name} (opens in a new tab)</span>
              </a>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

// ───────────────────────────── Programme timeline

const ICONS: Record<string, typeof Heart> = {
  rings: Heart, church: Church, camera: Camera, dinner: Utensils, music: Music, cake: Cake, gift: Gift, glass: GlassWater,
  bus: Bus, map: Map, sun: Sun, flower: Flower2, dove: Feather, candle: Flame, star: Star, heart: Heart,
};

/** A sensible icon when the host hasn't picked one. */
function iconFor(e: EventView) {
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

export function ProgrammeSection({ w, theme, now }: { w: CelebrationView; theme: Theme; now: number }) {
  if (!w.events.length) return null;
  const multiDay = new Set(w.events.map((e) => plainDateInZone(new Date(e.startsAt), e.timezone))).size > 1;
  return (
    <Section
      id="programme"
      eyebrow={w.occasion.label}
      title={w.occasion.copy.scheduleTitle}
      theme={theme}
      tone="tint"
      intro={w.dressCode ? <p>Dress code: <strong className="font-semibold text-[var(--w-ink)]">{w.dressCode}</strong></p> : undefined}
    >
      <ol className="relative mx-auto max-w-4xl space-y-12 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-[var(--w-line)] md:before:left-1/2">
        {w.events.map((e, i) => {
          const Icon = iconFor(e);
          const start = new Date(e.startsAt);
          const right = i % 2 === 1;
          return (
            <Reveal as="li" key={e.id} className="relative grid gap-5 pl-14 md:grid-cols-2 md:gap-12 md:pl-0">
              <span aria-hidden className="absolute top-1 left-1 grid h-9 w-9 place-items-center rounded-full border border-[var(--w-line)] bg-[var(--w-surface)] text-[var(--w-accent)] md:left-1/2 md:-translate-x-1/2">
                <Icon className="h-4 w-4" />
              </span>
              <div className={right ? "md:col-start-2" : "md:pr-6 md:text-right"}>
                <p className="w-eyebrow">
                  {multiDay ? `${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: e.timezone }).format(start)} · ` : ""}
                  {formatTimeRange(start, e.endsAt ? new Date(e.endsAt) : null, e.timezone)}
                </p>
                <h3 className="w-display mt-2 text-3xl sm:text-4xl">{e.name}</h3>
                {e.description && <p className="w-muted mt-3 whitespace-pre-line">{e.description}</p>}
                {e.dressCode && <p className="mt-2 text-sm"><span className="w-muted">Dress code:</span> {e.dressCode}</p>}
                {w.links.calendar && Date.parse(e.startsAt) > now && (
                  <a className="mt-3 inline-block text-sm underline underline-offset-4" href={`${w.links.calendar}?event=${e.id}`}>
                    Add to calendar<span className="sr-only">: {e.name}</span>
                  </a>
                )}
              </div>
              {(e.venueName || e.venueAddress) && (
                <div className={right ? "md:col-start-1 md:row-start-1 md:pl-6" : ""}>
                  <div className="w-card flex items-center gap-4 p-5">
                    <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--w-tint)] text-[var(--w-accent)]">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="font-semibold">{e.venueName || "Venue"}</p>
                      {e.venueAddress && <p className="w-muted truncate text-sm">{e.venueAddress}</p>}
                    </div>
                  </div>
                </div>
              )}
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}

// ───────────────────────────── Colours of the day

export function ColoursSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
  if (!w.colours.length) return null;
  const names = w.colours.map((c) => c.name);
  const title = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
  return (
    <Section id="colours" eyebrow="Colours of the day" title={title} theme={theme} intro={<p>Join us in these colours, if you&apos;d like to.</p>}>
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
  return (
    <section aria-label="Countdown" className="px-5 py-20 text-center sm:py-24">
      <Reveal>
        <p className="w-display text-4xl italic sm:text-5xl">{w.occasion.kind === "outing" ? "Adventure Awaits" : "Our Big Day Awaits"}</p>
        <div className="mx-auto mt-8 flex max-w-md justify-center">
          <Countdown to={p.startsAt} tone="dark" after={<p className="w-display text-2xl italic">{w.occasion.copy.today}</p>} />
        </div>
        {theme.ornament !== "none" && <div className="mt-8"><OrnamentDivider kind={theme.ornament} /></div>}
      </Reveal>
    </section>
  );
}

// ───────────────────────────── Gifts, thank you, memories

export function GiftsSection({ w, theme }: { w: CelebrationView; theme: Theme }) {
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
