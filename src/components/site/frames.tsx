import { Fragment, type ReactNode } from "react";
import { formatLongDate, formatTime, plainDateInZone } from "@/lib/dates";
import type { Theme } from "@/lib/themes";
import { Headline, Picture } from "./hero";
import { Countdown } from "./live";
import { CornerFlourish, GeometricBand } from "./ornaments";
import { mapsDirections } from "./sections";
import { StickyPhotos } from "./sticky-photos";
import type { CelebrationView, ImageView } from "./types";

// Page structures. Every design shows the same content (blocks), but arranges it differently:
// the frame decides the skeleton, the theme decides the look, the occasion decides the words.

export type Block = { id: string; node: ReactNode; label?: string };

type FrameProps = {
  w: CelebrationView;
  theme: Theme;
  now: number;
  nav: { id: string; label: string }[];
  blocks: Block[];
  hero: ReactNode;
  live: ReactNode;
  closing: ReactNode;
};

/** Heroes that put white type over a photo need a light navigation bar. */
export function darkHeroFor(theme: Theme) {
  return ["cinematic", "framed", "editorial", "bordered"].includes(theme.hero) && theme.frame !== "split";
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const all = (blocks: Block[]) => blocks.map((b) => <Fragment key={b.id}>{b.node}</Fragment>);
const photosOf = (w: CelebrationView) => [w.hero, ...w.portraits, ...w.gallery].filter((x): x is ImageView => Boolean(x));
const primaryOf = (w: CelebrationView) => w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];

export function Frame(props: FrameProps) {
  switch (props.theme.frame) {
    case "chapters": return <Chapters {...props} />;
    case "suite": return <Suite {...props} />;
    case "split": return <Split {...props} />;
    case "bento": return <Bento {...props} />;
    case "booklet": return <Booklet {...props} />;
    case "itinerary": return <Itinerary {...props} />;
    case "index": return <IndexFrame {...props} />;
    case "magazine": return <Magazine {...props} />;
    case "royal": return <Royal {...props} />;
    case "storybook":
    case "bands":
    case "classic":
    default:
      // Storybook and bands are pure restyles of the scroll (see celebration.css).
      return (
        <main id="main">
          {props.hero}
          {props.live}
          {all(props.blocks)}
          {props.closing}
        </main>
      );
  }
}

// ───────────────────────────── Chapters: full-bleed photo breaks between parts of the story

const CHAPTER_AT: Record<string, string> = { story: "Where it began", programme: "The celebration", rsvp: "Join us", gallery: "Moments", "thank-you": "With gratitude" };

function Chapters({ w, blocks, hero, live, closing }: FrameProps) {
  const photos = photosOf(w).slice(1);
  let n = 0;
  return (
    <main id="main">
      {hero}
      {live}
      {blocks.map((b) => {
        const lead = CHAPTER_AT[b.id];
        const photo = lead ? photos[n % Math.max(photos.length, 1)] : undefined;
        const chapter = lead ? ROMAN[n++] : null;
        return (
          <Fragment key={b.id}>
            {chapter && (
              <div className="w-chapter relative grid min-h-[72svh] place-items-center overflow-hidden text-center text-white" aria-hidden>
                {photo && <Picture image={photo} sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-black/45" />
                <div className="relative px-6">
                  <p className="text-[0.7rem] font-medium tracking-[0.5em] uppercase opacity-85">Chapter {chapter}</p>
                  <p className="w-display mt-5 text-5xl italic sm:text-7xl">{lead}</p>
                  <div className="mx-auto mt-7 h-px w-20 bg-white/60" />
                </div>
              </div>
            )}
            {b.node}
          </Fragment>
        );
      })}
      {closing}
    </main>
  );
}

// ───────────────────────────── Suite: an invitation suite of paper cards on a table

function Suite({ w, theme, blocks, live, closing }: FrameProps) {
  const p = primaryOf(w);
  return (
    <main id="main" className="w-suite px-3 pt-24 pb-10 sm:px-6">
      <article className="w-sheet mx-auto max-w-3xl overflow-hidden text-center">
        {w.hero && (
          <div className="relative aspect-[3/2] overflow-hidden">
            <Picture image={w.hero} priority sizes="(min-width: 768px) 768px, 100vw" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="relative px-6 pt-16 pb-16 sm:px-16">
          <span aria-hidden className="w-seal absolute -top-9 left-1/2 grid h-[4.5rem] w-[4.5rem] -translate-x-1/2 place-items-center rounded-full font-display text-xl">
            {w.monogram}
          </span>
          <p className="w-eyebrow">{w.phase === "after" ? w.occasion.copy.afterLead : w.occasion.copy.hostLine}</p>
          <Headline w={w} theme={theme} stacked={false} className="mt-6 text-5xl leading-tight sm:text-6xl" />
          {w.phase !== "after" && <p className="w-display mx-auto mt-5 max-w-lg text-xl italic opacity-85">{w.occasion.copy.invitation}</p>}
          <div className="mx-auto my-8 h-px w-16 bg-[var(--w-accent)]" />
          {p && (
            <p className="text-[0.74rem] font-medium tracking-[0.3em] uppercase">
              {formatLongDate(new Date(p.startsAt), p.timezone)}
              {p.venueName && <span className="mt-2 block font-normal">{p.venueName}</span>}
            </p>
          )}
          {w.phase === "upcoming" && p && w.occasion.countdown && (
            <div className="mt-10"><Countdown to={p.startsAt} tone="dark" seconds={false} after={null} /></div>
          )}
          {w.rsvp.open && <a href="#rsvp" className="w-cta mt-10">Kindly RSVP</a>}
        </div>
      </article>
      {live}
      {blocks.map((b) => (
        <div key={b.id} className="w-sheet mx-auto mt-10 max-w-4xl overflow-hidden sm:mt-14">{b.node}</div>
      ))}
      <div className="mt-14">{closing}</div>
    </main>
  );
}

// ───────────────────────────── Split: a fixed photo panel that changes as you read

function Split({ w, theme, blocks, hero, live, closing }: FrameProps) {
  const p = primaryOf(w);
  const photos = photosOf(w);
  return (
    <main id="main">
      <div className="lg:hidden">{hero}</div>
      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <StickyPhotos photos={photos} ids={["intro", ...blocks.map((b) => b.id)]} />
        <div className="min-w-0">
          <section id="intro" aria-label="Invitation" className="hidden min-h-svh flex-col justify-center gap-7 px-16 py-28 lg:flex xl:px-24">
            <p className="w-eyebrow">{w.phase === "after" ? w.occasion.copy.afterLead : w.occasion.copy.hostLine}</p>
            <Headline w={w} theme={theme} className="text-7xl leading-[0.95] xl:text-8xl" />
            {w.phase !== "after" && <p className="w-display max-w-md text-2xl italic opacity-85">{w.occasion.copy.invitation}</p>}
            {p && (
              <p className="text-[0.74rem] font-medium tracking-[0.3em] uppercase">
                {formatLongDate(new Date(p.startsAt), p.timezone)}
                {p.venueName && <span className="mt-2 block font-normal">{p.venueName}</span>}
              </p>
            )}
            {w.phase === "upcoming" && p && w.occasion.countdown && <Countdown to={p.startsAt} tone="dark" align="start" seconds={false} after={null} />}
            {w.rsvp.open && <div><a href="#rsvp" className="w-cta">Kindly RSVP</a></div>}
          </section>
          {live}
          {all(blocks)}
          {closing}
        </div>
      </div>
    </main>
  );
}

// ───────────────────────────── Bento: everything at a glance in tiles, then the details

function Bento({ w, theme, now, blocks, hero, live, closing }: FrameProps) {
  const p = primaryOf(w);
  const photos = photosOf(w);
  const days = p ? Math.ceil((Date.parse(p.startsAt) - now) / 86_400_000) : null;
  const local = p ? plainDateInZone(new Date(p.startsAt), p.timezone) : null;
  const [y, m, d] = local ? local.split("-").map(Number) : [];
  const month = local ? new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d))) : "";
  const weekday = local ? new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d))) : "";
  return (
    <main id="main">
      {hero}
      {live}
      <section aria-label="At a glance" className="w-feature px-4 pb-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl auto-rows-[170px] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:auto-rows-[200px]">
          {photos[1] && (
            <div className="w-tile col-span-2 row-span-2 overflow-hidden">
              <Picture image={photos[1]} sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full object-cover" />
            </div>
          )}
          {p && (
            <div className="w-tile w-tile-accent col-span-2 flex items-center gap-6 p-6">
              <span className="w-display text-8xl leading-none">{d}</span>
              <span>
                <span className="w-display block text-3xl">{month}</span>
                <span className="block text-sm tracking-[0.2em] uppercase opacity-80">{weekday} · {formatTime(new Date(p.startsAt), p.timezone)}</span>
              </span>
            </div>
          )}
          {days !== null && days > 0 && (
            <div className="w-tile flex flex-col justify-end p-5">
              <span className="w-display text-6xl leading-none">{days}</span>
              <span className="mt-2 text-xs tracking-[0.25em] uppercase opacity-70">{days === 1 ? "day to go" : "days to go"}</span>
            </div>
          )}
          {p?.venueName && (
            <a href={mapsDirections(p)} target="_blank" rel="noopener noreferrer" className="w-tile flex flex-col justify-end p-5 transition-transform hover:-translate-y-0.5">
              <span className="text-xs tracking-[0.25em] uppercase opacity-70">Where</span>
              <span className="w-display mt-2 text-2xl leading-tight">{p.venueName}</span>
              <span className="mt-2 text-xs underline underline-offset-4">Directions</span>
            </a>
          )}
          {w.colours.length > 0 ? (
            <div className="w-tile col-span-2 flex flex-col justify-between p-5">
              <span className="text-xs tracking-[0.25em] uppercase opacity-70">Wear the colours</span>
              <span className="flex gap-3">
                {w.colours.slice(0, 5).map((c) => (
                  <span key={c.name} className="flex flex-col items-center gap-1 text-xs">
                    <span className="h-12 w-12 rounded-full border border-black/10" style={{ background: c.hex }} />
                    {c.name}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <div className="w-tile col-span-2 flex items-center p-6">
              <p className="w-display text-2xl leading-snug italic">&ldquo;{w.guestMessage || w.occasion.copy.invitation}&rdquo;</p>
            </div>
          )}
          {w.rsvp.open && (
            <a href="#rsvp" className="w-tile w-tile-accent2 flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
              <span className="text-xs tracking-[0.25em] uppercase">Are you coming?</span>
              <span className="w-display text-3xl">RSVP →</span>
            </a>
          )}
          {photos[2] && (
            <div className="w-tile overflow-hidden">
              <Picture image={photos[2]} sizes="25vw" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </section>
      {all(blocks.filter((b) => b.id !== "date" && b.id !== "countdown"))}
      {closing}
      <span className="sr-only">{theme.name}</span>
    </main>
  );
}

// ───────────────────────────── Booklet: one quiet column, numbered like an order of service

function Booklet({ blocks, hero, live, closing, nav }: FrameProps) {
  return (
    <main id="main" className="w-booklet">
      {hero}
      {live}
      {nav.length > 2 && (
        <nav aria-label="Contents" className="mx-auto max-w-md px-6 pb-16 text-center">
          <p className="w-eyebrow">Contents</p>
          <ol className="mt-6 space-y-3">
            {nav.map((n, i) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="w-display text-xl hover:opacity-70">
                  <span className="w-accent mr-3 text-base">{ROMAN[i]}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="mx-auto max-w-[46rem]">{all(blocks)}</div>
      {closing}
    </main>
  );
}

// ───────────────────────────── Itinerary: a route running down the page, each part a stop

function Itinerary({ blocks, hero, live, closing }: FrameProps) {
  return (
    <main id="main">
      {hero}
      {live}
      <div className="w-route">{all(blocks)}</div>
      {closing}
    </main>
  );
}

// ───────────────────────────── Index: a fixed sidebar with the essentials and a numbered contents

function IndexFrame({ w, theme, blocks, live, closing, nav }: FrameProps) {
  const p = primaryOf(w);
  return (
    <div className="lg:pl-[22rem]">
      <aside className="w-index-side border-b border-[var(--w-line)] px-6 py-10 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[22rem] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-10 lg:py-12">
        <a href="#top" className="w-display text-2xl">{w.monogram}</a>
        <p className="w-eyebrow mt-10">{w.phase === "after" ? w.occasion.copy.afterLead : w.occasion.copy.hostLine}</p>
        <Headline w={w} theme={theme} stacked={false} className="mt-4 text-4xl leading-tight" />
        {p && (
          <p className="mt-6 text-[0.72rem] font-medium tracking-[0.26em] uppercase">
            {formatLongDate(new Date(p.startsAt), p.timezone)}
            {p.venueName && <span className="mt-1 block font-normal opacity-80">{p.venueName}</span>}
          </p>
        )}
        {w.phase === "upcoming" && p && w.occasion.countdown && (
          <div className="mt-8 [&_.w-display]:!text-3xl"><Countdown to={p.startsAt} tone="dark" align="start" seconds={false} after={null} /></div>
        )}
        <nav aria-label="Sections" className="mt-10 hidden lg:block">
          <ol className="space-y-2.5 text-sm">
            {nav.map((n, i) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="group flex gap-4 hover:opacity-70">
                  <span className="w-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span>{n.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {w.rsvp.open && <a href="#rsvp" className="w-cta mt-10 self-start lg:mt-auto">Kindly RSVP</a>}
      </aside>
      <main id="main">
        {w.hero && (
          <div className="relative h-[62svh] overflow-hidden lg:h-svh">
            <Picture image={w.hero} priority sizes="(min-width: 1024px) 70vw, 100vw" className="h-full w-full object-cover" />
          </div>
        )}
        {live}
        {all(blocks)}
        {closing}
      </main>
    </div>
  );
}

// ───────────────────────────── Magazine: cover, contents, then articles

function Magazine({ w, blocks, hero, live, closing, nav }: FrameProps) {
  const photos = photosOf(w).slice(1);
  return (
    <main id="main">
      {hero}
      {live}
      {nav.length > 2 && (
        <section aria-label="In this issue" className="w-feature px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-6 border-b border-[var(--w-line)] pb-6">
              <p className="w-display text-4xl sm:text-5xl">In this issue</p>
              <p className="w-eyebrow hidden sm:block">{w.title}</p>
            </div>
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {nav.slice(0, 6).map((n, i) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="group grid grid-cols-[5.5rem_1fr] items-center gap-5">
                    <span className="aspect-square overflow-hidden bg-[var(--w-tint)]">
                      {photos[i % Math.max(photos.length, 1)] && (
                        <Picture image={photos[i % photos.length]} sizes="88px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </span>
                    <span>
                      <span className="w-accent block text-xs tracking-[0.3em]">No. {String(i + 1).padStart(2, "0")}</span>
                      <span className="w-display mt-1 block text-2xl leading-tight group-hover:underline">{n.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      {all(blocks)}
      {closing}
    </main>
  );
}

// ───────────────────────────── Royal: the whole programme inside one ornate gold frame

function Royal({ blocks, hero, live, closing }: FrameProps) {
  return (
    <main id="main">
      {hero}
      {live}
      <div className="px-3 py-16 sm:px-8 sm:py-24">
        <div className="w-royal relative mx-auto max-w-6xl">
          <CornerFlourish className="absolute top-3 left-3 h-12 w-12 text-[var(--w-accent)]" />
          <CornerFlourish className="absolute top-3 right-3 h-12 w-12 -scale-x-100 text-[var(--w-accent)]" />
          <CornerFlourish className="absolute bottom-3 left-3 h-12 w-12 -scale-y-100 text-[var(--w-accent)]" />
          <CornerFlourish className="absolute right-3 bottom-3 h-12 w-12 -scale-100 text-[var(--w-accent)]" />
          <GeometricBand className="!h-2" />
          {all(blocks)}
          <GeometricBand className="!h-2" />
        </div>
      </div>
      {closing}
    </main>
  );
}
