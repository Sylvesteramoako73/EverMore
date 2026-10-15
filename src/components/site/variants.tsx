import { MapPin } from "lucide-react";
import { formatLongDate, formatTimeRange, plainDateInZone } from "@/lib/dates";
import type { Theme } from "@/lib/themes";
import { Picture } from "./hero";
import { Reveal } from "./live";
import { iconFor, mapsDirections, mapsSearch, Section } from "./sections";
import type { CelebrationView, EventView, ImageView } from "./types";

// Section layouts that differ per theme (theme.layout). The same content, genuinely different designs.

// ───────────────────────────── Story

type Fact = [string, string];

function facts(w: CelebrationView): Fact[] {
  const f = w.facts;
  return [
    w.occasion.kind === "naming" && f.nameMeaning && ["The meaning", f.nameMeaning],
    f.parents && ["Proud parents", f.parents],
    w.occasion.kind === "birthday" && f.turningAge && ["Turning", String(f.turningAge)],
    f.institution && ["Graduating from", f.institution],
    f.dayName && [`Born on a ${f.dayName.day}`, `${f.dayName.male} · ${f.dayName.female}`],
  ].filter(Boolean) as Fact[];
}

function FactCards({ items, center = false }: { items: Fact[]; center?: boolean }) {
  if (!items.length) return null;
  return (
    <dl className={`mt-8 grid gap-4 sm:grid-cols-2 ${center ? "mx-auto max-w-xl text-center" : ""}`}>
      {items.map(([label, value]) => (
        <div key={label} className="w-card p-5">
          <dt className="w-eyebrow">{label}</dt>
          <dd className="w-display mt-2 text-2xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StoryVariant({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const items = facts(w);
  if (!w.story && !w.guestMessage && !w.announcement && !items.length) return null;
  const photo: ImageView | undefined = w.portraits[0] ?? w.gallery[0];
  const eyebrow = w.phase === "after" ? "Where it began" : "Welcome";
  const title = w.occasion.copy.storyTitle;
  const quote = w.guestMessage && <p className="w-display text-2xl leading-snug italic sm:text-3xl">&ldquo;{w.guestMessage}&rdquo;</p>;
  const story = w.story && <p className="w-muted whitespace-pre-line">{w.story}</p>;
  const extra = (
    <>
      {w.announcement && <p className="mt-6 whitespace-pre-line">{w.announcement}</p>}
      {w.hashtag && <p className="w-eyebrow mt-6">#{w.hashtag}</p>}
    </>
  );

  switch (theme.layout.story) {
    // A narrow, quiet column with a framed photo above.
    case "centered":
      return (
        <Section id="story" eyebrow={eyebrow} title={title} theme={theme}>
          <Reveal className="mx-auto max-w-2xl text-center">
            {photo && (
              <div className={`mx-auto mb-10 w-[min(70vw,300px)] overflow-hidden ${theme.hero === "arch" || theme.id === "romantic-garden" ? "w-arch" : theme.id === "serene" ? "w-oval" : "w-photo"}`}>
                <Picture image={photo} sizes="300px" className="aspect-[4/5] w-full object-cover" />
              </div>
            )}
            {quote}
            <FactCards items={items} center />
            {story && <div className="mt-8">{story}</div>}
            {extra}
          </Reveal>
        </Section>
      );

    // Magazine spread: a giant pull quote, two text columns with a drop cap, a tall photo.
    case "magazine":
      return (
        <Section id="story" eyebrow={eyebrow} title={title} theme={theme}>
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <Reveal>
              {w.guestMessage && (
                <p className="w-display border-l-2 border-[var(--w-accent)] pl-6 text-3xl leading-tight sm:text-5xl">{w.guestMessage}</p>
              )}
              {w.story && <p className="w-dropcap mt-10 whitespace-pre-line sm:columns-2 sm:gap-10">{w.story}</p>}
              <FactCards items={items} />
              {extra}
            </Reveal>
            {photo && (
              <Reveal className="w-photo self-start">
                <Picture image={photo} sizes="(min-width: 1024px) 420px, 90vw" className="aspect-[3/4] w-full object-cover" />
                {photo.caption && <p className="w-muted mt-2 text-xs tracking-widest uppercase">{photo.caption}</p>}
              </Reveal>
            )}
          </div>
        </Section>
      );

    // A large photo with the story on an overlapping card.
    case "overlap":
      return (
        <Section id="story" eyebrow={eyebrow} title={title} theme={theme}>
          <div className="relative mx-auto max-w-5xl">
            {photo && (
              <Reveal className={`w-photo lg:w-[62%] ${theme.photo === "polaroid" ? "w-tilt-l" : ""}`}>
                <Picture image={photo} sizes="(min-width: 1024px) 640px, 92vw" className="aspect-[4/3] w-full object-cover" />
              </Reveal>
            )}
            <Reveal className={`w-card relative z-10 -mt-16 p-7 sm:p-10 lg:absolute lg:top-1/2 lg:right-0 lg:mt-0 lg:w-[48%] lg:-translate-y-1/2 ${photo ? "mx-4 lg:mx-0" : ""}`}>
              {quote}
              {story && <div className="mt-6">{story}</div>}
              <FactCards items={items} />
              {extra}
            </Reveal>
          </div>
        </Section>
      );

    // Photo beside text (the theashies-style layout).
    case "split":
    default:
      return (
        <Section id="story" eyebrow={eyebrow} title={title} theme={theme}>
          <div className={`mx-auto grid max-w-5xl items-center gap-12 ${photo ? "lg:grid-cols-[0.85fr_1.15fr]" : ""}`}>
            {photo && (
              <Reveal className="w-photo mx-auto w-full max-w-sm">
                <Picture image={photo} sizes="(min-width: 1024px) 380px, 90vw" className="aspect-[4/5] w-full object-cover" />
              </Reveal>
            )}
            <Reveal className={photo ? "" : "mx-auto max-w-2xl text-center"}>
              {quote}
              <FactCards items={items} />
              {story && <div className="mt-8">{story}</div>}
              {extra}
            </Reveal>
          </div>
        </Section>
      );
  }
}

// ───────────────────────────── Venues

function VenueButtons({ e, center = true }: { e: EventView; center?: boolean }) {
  return (
    <div className={`mt-6 flex flex-wrap gap-2 ${center ? "justify-center" : ""}`}>
      <a className="w-btn w-btn-sm" href={mapsSearch(e)} target="_blank" rel="noopener noreferrer">
        <MapPin className="h-4 w-4" aria-hidden /> View map<span className="sr-only"> for {e.venueName || e.name} (opens in a new tab)</span>
      </a>
      <a className="w-btn w-btn-sm w-btn-ghost" href={mapsDirections(e)} target="_blank" rel="noopener noreferrer">
        Directions<span className="sr-only"> to {e.venueName || e.name} (opens in a new tab)</span>
      </a>
    </div>
  );
}

function osmEmbed(e: EventView) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${e.venueLng! - 0.008},${e.venueLat! - 0.005},${e.venueLng! + 0.008},${e.venueLat! + 0.005}&layer=mapnik&marker=${e.venueLat},${e.venueLng}`;
}

/** One card per distinct venue, so a church used twice appears once. */
function distinctVenues(events: EventView[]) {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.venueName}|${e.venueAddress}`.toLowerCase();
    if (!(e.venueName || e.venueAddress) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function VenuesVariant({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const venues = distinctVenues(w.events);
  if (!venues.length) return null;
  const eyebrow = w.phase === "after" ? "Where it happened" : "Where to find us";
  const title = venues.length > 1 ? "The Venues" : "The Venue";

  if (theme.layout.venues === "split") {
    return (
      <Section id="venues" eyebrow={eyebrow} title={title} theme={theme}>
        <ul className="space-y-14">
          {venues.map((e, i) => (
            <Reveal as="li" key={e.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <div className={`w-photo ${i % 2 ? "md:order-2" : ""}`}>
                {e.venueImage ? (
                  <Picture image={e.venueImage} sizes="(min-width: 768px) 560px, 92vw" className="aspect-[4/3] w-full object-cover" />
                ) : e.venueLat !== null && e.venueLng !== null ? (
                  <iframe title={`Map of ${e.venueName || e.name}`} src={osmEmbed(e)} loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full border-0" />
                ) : (
                  <div aria-hidden className="grid aspect-[4/3] w-full place-items-center bg-[var(--w-tint)] text-[var(--w-accent)]"><MapPin className="h-10 w-10" /></div>
                )}
              </div>
              <div>
                <p className="w-eyebrow">{e.name}</p>
                <h3 className="w-display mt-3 text-4xl sm:text-5xl">{e.venueName || e.name}</h3>
                {e.venueAddress && <p className="w-muted mt-3 text-lg">{e.venueAddress}</p>}
                <VenueButtons e={e} center={false} />
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>
    );
  }

  if (theme.layout.venues === "minimal") {
    return (
      <Section id="venues" eyebrow={eyebrow} title={title} theme={theme}>
        <ul className="mx-auto max-w-2xl divide-y divide-[var(--w-line)] border-y border-[var(--w-line)]">
          {venues.map((e) => (
            <Reveal as="li" key={e.id} className="py-8 text-center">
              <p className="w-eyebrow">{e.name}</p>
              <p className="w-display mt-2 text-3xl">{e.venueName || e.name}</p>
              {e.venueAddress && <p className="w-muted mt-1">{e.venueAddress}</p>}
              <p className="mt-4 space-x-4 text-sm">
                <a className="underline underline-offset-4" href={mapsSearch(e)} target="_blank" rel="noopener noreferrer">Map<span className="sr-only"> for {e.venueName}</span></a>
                <a className="underline underline-offset-4" href={mapsDirections(e)} target="_blank" rel="noopener noreferrer">Directions<span className="sr-only"> to {e.venueName}</span></a>
              </p>
            </Reveal>
          ))}
        </ul>
      </Section>
    );
  }

  return (
    <Section id="venues" eyebrow={eyebrow} title={title} theme={theme}>
      <ul className={`grid gap-6 ${venues.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-2xl"}`}>
        {venues.map((e) => (
          <Reveal as="li" key={e.id} className="w-card flex flex-col p-6 text-center sm:p-8">
            <h3 className="w-display text-3xl italic">{e.name}</h3>
            {e.venueName && <p className="mt-3 font-semibold">{e.venueName}</p>}
            {e.venueAddress && <p className="w-muted text-sm">{e.venueAddress}</p>}
            {e.venueImage ? (
              <div className="w-photo mt-6">
                <Picture image={e.venueImage} sizes="(min-width: 768px) 520px, 90vw" className="aspect-[16/8] w-full object-cover" />
              </div>
            ) : e.venueLat !== null && e.venueLng !== null ? (
              <iframe title={`Map of ${e.venueName || e.name}`} src={osmEmbed(e)} loading="lazy" referrerPolicy="no-referrer" className="mt-6 aspect-[16/8] w-full rounded-[var(--w-radius)] border-0" />
            ) : null}
            <VenueButtons e={e} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

// ───────────────────────────── Programme

function when(e: EventView, withDay: boolean) {
  const start = new Date(e.startsAt);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: e.timezone }).format(start);
  return `${withDay ? `${day} · ` : ""}${formatTimeRange(start, e.endsAt ? new Date(e.endsAt) : null, e.timezone)}`;
}

function CalendarLink({ w, e, now }: { w: CelebrationView; e: EventView; now: number }) {
  if (!w.links.calendar || Date.parse(e.startsAt) <= now) return null;
  return (
    <a className="mt-3 inline-block text-sm underline underline-offset-4" href={`${w.links.calendar}?event=${e.id}`}>
      Add to calendar<span className="sr-only">: {e.name}</span>
    </a>
  );
}

export function ProgrammeVariant({ w, theme, now }: { w: CelebrationView; theme: Theme; now: number }) {
  if (!w.events.length) return null;
  const multiDay = new Set(w.events.map((e) => plainDateInZone(new Date(e.startsAt), e.timezone))).size > 1;
  const intro = w.dressCode ? <p>Dress code: <strong className="font-semibold">{w.dressCode}</strong></p> : undefined;
  const layout = theme.layout.schedule;
  const tone = theme.layout.pop && layout === "cards" ? "pop" : "tint";
  const props = { id: "programme", eyebrow: w.occasion.label, title: w.occasion.copy.scheduleTitle, theme, intro } as const;

  if (layout === "list") {
    return (
      <Section {...props} tone="tint">
        <ol className="mx-auto max-w-3xl divide-y divide-[var(--w-line)] border-y border-[var(--w-line)]">
          {w.events.map((e) => (
            <Reveal as="li" key={e.id} className="grid gap-2 py-8 sm:grid-cols-[180px_1fr] sm:gap-10">
              <p className="w-display text-2xl sm:text-right">
                {formatTimeRange(new Date(e.startsAt), null, e.timezone).replace(/ [A-Z]{2,4}[+-]?\d*$/, "")}
                {multiDay && <span className="w-muted block font-sans text-xs tracking-widest uppercase">{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: e.timezone }).format(new Date(e.startsAt))}</span>}
              </p>
              <div>
                <h3 className="w-display text-3xl">{e.name}</h3>
                {(e.venueName || e.venueAddress) && <p className="w-muted mt-1">{[e.venueName, e.venueAddress].filter(Boolean).join(", ")}</p>}
                {e.description && <p className="mt-3 whitespace-pre-line">{e.description}</p>}
                {e.dressCode && <p className="w-muted mt-2 text-sm">Dress code: {e.dressCode}</p>}
                <CalendarLink w={w} e={e} now={now} />
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>
    );
  }

  if (layout === "cards") {
    return (
      <Section {...props} tone={tone}>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {w.events.map((e, i) => {
            const Icon = iconFor(e);
            return (
              <Reveal as="li" key={e.id} className={`w-card relative p-7 ${theme.id === "confetti" ? (i % 2 ? "rotate-1" : "-rotate-1") : ""}`}>
                <span className="w-display absolute top-4 right-5 text-5xl opacity-15" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: i % 2 ? "var(--w-accent2)" : "var(--w-accent)" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="w-eyebrow mt-5">{when(e, multiDay)}</p>
                <h3 className="w-display mt-2 text-3xl">{e.name}</h3>
                {(e.venueName || e.venueAddress) && <p className="w-muted mt-2 text-sm">{[e.venueName, e.venueAddress].filter(Boolean).join(", ")}</p>}
                {e.description && <p className="mt-3 text-[0.95rem] whitespace-pre-line">{e.description}</p>}
                {e.dressCode && <p className="w-muted mt-2 text-sm">Dress code: {e.dressCode}</p>}
                <CalendarLink w={w} e={e} now={now} />
              </Reveal>
            );
          })}
        </ol>
      </Section>
    );
  }

  // Boarding passes: playful for trips, graphic for bold themes.
  if (layout === "ticket") {
    return (
      <Section {...props} tone="tint">
        <ol className="mx-auto max-w-4xl space-y-6">
          {w.events.map((e, i) => {
            const start = new Date(e.startsAt);
            const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: e.timezone }).format(start);
            const mon = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: e.timezone }).format(start);
            return (
              <Reveal as="li" key={e.id} className="w-card w-ticket grid overflow-visible sm:grid-cols-[150px_1fr]">
                <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-[var(--w-line)] p-5 sm:flex-col sm:justify-center sm:border-r-2 sm:border-b-0" style={{ background: "color-mix(in srgb, var(--w-accent) 12%, transparent)" }}>
                  <span className="w-eyebrow">Stop {String(i + 1).padStart(2, "0")}</span>
                  <span className="w-display text-5xl leading-none">{day}</span>
                  <span className="text-sm font-semibold tracking-[0.3em] uppercase">{mon}</span>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h3 className="w-display text-3xl uppercase">{e.name}</h3>
                    {e.description && <p className="w-muted mt-2 whitespace-pre-line">{e.description}</p>}
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div><dt className="w-eyebrow !tracking-[0.2em]">Time</dt><dd className="mt-1 font-semibold">{formatTimeRange(start, e.endsAt ? new Date(e.endsAt) : null, e.timezone)}</dd></div>
                      <div><dt className="w-eyebrow !tracking-[0.2em]">Where</dt><dd className="mt-1 font-semibold">{e.venueName || "TBC"}</dd></div>
                      {e.dressCode && <div className="col-span-2"><dt className="w-eyebrow !tracking-[0.2em]">Wear</dt><dd className="mt-1">{e.dressCode}</dd></div>}
                    </dl>
                  </div>
                  {(e.venueName || e.venueAddress) && (
                    <a href={mapsDirections(e)} target="_blank" rel="noopener noreferrer" className="w-btn w-btn-sm">
                      <MapPin className="h-4 w-4" aria-hidden /> Go<span className="sr-only"> to {e.venueName} (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Section>
    );
  }

  // Luxury agenda: oversized times in the display face.
  if (layout === "agenda") {
    return (
      <Section {...props} tone="tint">
        <ol className="space-y-12">
          {w.events.map((e) => {
            const start = new Date(e.startsAt);
            const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: e.timezone }).format(start);
            return (
              <Reveal as="li" key={e.id} className="grid items-baseline gap-4 border-t border-[var(--w-line)] pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-12">
                <p className="w-display w-accent text-[clamp(4rem,12vw,8rem)] leading-none">{time}</p>
                <div>
                  <p className="w-eyebrow">{formatLongDate(start, e.timezone)}</p>
                  <h3 className="w-display mt-3 text-4xl sm:text-5xl">{e.name}</h3>
                  {(e.venueName || e.venueAddress) && <p className="w-muted mt-2">{[e.venueName, e.venueAddress].filter(Boolean).join(", ")}</p>}
                  {e.description && <p className="mt-4 max-w-xl whitespace-pre-line">{e.description}</p>}
                  {e.dressCode && <p className="w-muted mt-2 text-sm tracking-widest uppercase">{e.dressCode}</p>}
                  <CalendarLink w={w} e={e} now={now} />
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Section>
    );
  }

  // Zig-zag timeline (default).
  return (
    <Section {...props} tone="tint">
      <ol className="relative mx-auto max-w-4xl space-y-12 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-[var(--w-line)] md:before:left-1/2">
        {w.events.map((e, i) => {
          const Icon = iconFor(e);
          const right = i % 2 === 1;
          return (
            <Reveal as="li" key={e.id} className="relative grid gap-5 pl-14 md:grid-cols-2 md:gap-12 md:pl-0">
              <span aria-hidden className="absolute top-1 left-1 grid h-9 w-9 place-items-center rounded-full border border-[var(--w-line)] bg-[var(--w-surface)] text-[var(--w-accent)] md:left-1/2 md:-translate-x-1/2">
                <Icon className="h-4 w-4" />
              </span>
              <div className={right ? "md:col-start-2" : "md:pr-6 md:text-right"}>
                <p className="w-eyebrow">{when(e, multiDay)}</p>
                <h3 className="w-display mt-2 text-3xl sm:text-4xl">{e.name}</h3>
                {e.description && <p className="w-muted mt-3 whitespace-pre-line">{e.description}</p>}
                {e.dressCode && <p className="mt-2 text-sm"><span className="w-muted">Dress code:</span> {e.dressCode}</p>}
                <CalendarLink w={w} e={e} now={now} />
              </div>
              {(e.venueName || e.venueAddress) && (
                <div className={right ? "md:col-start-1 md:row-start-1 md:pl-6" : ""}>
                  <div className="w-card flex items-center gap-4 p-5">
                    <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--w-tint)] text-[var(--w-accent)]"><MapPin className="h-5 w-5" /></span>
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
