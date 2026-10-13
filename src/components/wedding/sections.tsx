import type { ReactNode } from "react";
import { formatLongDate, formatPlainDate, formatTimeRange } from "@/lib/dates";
import type { Theme } from "@/lib/themes";
import { Picture } from "./hero";
import { Reveal } from "./live";
import { GeometricBand, OrnamentDivider } from "./ornaments";
import type { EventView, WeddingView } from "./types";

// Server-rendered sections of a wedding page. Each reads its look from the theme.

export function Section({
  id,
  eyebrow,
  title,
  theme,
  children,
  tinted = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  theme: Theme;
  children: ReactNode;
  tinted?: boolean;
}) {
  const left = theme.heading === "editorial-left";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 ${tinted ? "bg-[var(--w-surface)]" : ""}`}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className={`mb-12 sm:mb-16 ${left ? "text-left" : "text-center"}`}>
          {theme.heading === "band" && <GeometricBand className="mx-auto mb-6 !h-3 max-w-[9rem]" />}
          <p className="w-eyebrow">{eyebrow}</p>
          <h2
            id={`${id}-title`}
            className={`w-display mt-3 ${
              theme.heading === "minimal-caps"
                ? "text-3xl tracking-[0.12em] uppercase sm:text-4xl"
                : theme.heading === "script-centered"
                  ? "text-5xl italic sm:text-6xl"
                  : theme.heading === "ornate"
                    ? "text-4xl tracking-[0.08em] uppercase sm:text-5xl"
                    : theme.heading === "editorial-left"
                      ? "text-5xl sm:text-7xl"
                      : "text-5xl sm:text-6xl"
            }`}
          >
            {title}
          </h2>
          {!left && <div className="mt-5"><OrnamentDivider kind={theme.ornament} /></div>}
          {left && <div className="mt-6 h-px w-24 bg-[var(--w-accent)]" />}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

export function StorySection({ w, theme }: { w: WeddingView; theme: Theme }) {
  const married = w.phase === "married";
  return (
    <Section id="story" eyebrow={married ? "Where it began" : "Welcome"} title={w.story ? "Our Story" : "A Note From Us"} theme={theme}>
      <div className={`mx-auto grid max-w-5xl items-center gap-12 ${w.portraits.length ? "lg:grid-cols-[0.9fr_1.1fr]" : ""}`}>
        {w.portraits.length > 0 && (
          <Reveal className="grid grid-cols-2 gap-3">
            {w.portraits.slice(0, 2).map((p, i) => (
              <div key={p.id} className={`overflow-hidden rounded-[var(--w-radius)] ${i === 1 ? "mt-10" : ""}`}>
                <Picture image={p} sizes="(min-width: 1024px) 22vw, 45vw" className="aspect-[3/4] h-full w-full object-cover" />
              </div>
            ))}
          </Reveal>
        )}
        <Reveal className={w.portraits.length ? "" : "mx-auto max-w-2xl text-center"}>
          {w.guestMessage && (
            <p className="w-display text-2xl leading-snug italic sm:text-3xl">&ldquo;{w.guestMessage}&rdquo;</p>
          )}
          {w.story && <p className="w-muted mt-8 whitespace-pre-line">{w.story}</p>}
          {w.announcement && <p className="mt-8 whitespace-pre-line">{w.announcement}</p>}
          <p className="w-display w-accent mt-10 text-3xl italic">
            {w.partnerOne} &amp; {w.partnerTwo}
          </p>
          {w.hashtag && <p className="w-eyebrow mt-4">#{w.hashtag}</p>}
        </Reveal>
      </div>
    </Section>
  );
}

function directionsUrl(e: EventView) {
  const destination =
    e.venueLat !== null && e.venueLng !== null ? `${e.venueLat},${e.venueLng}` : [e.venueName, e.venueAddress].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function osmEmbed(lat: number, lng: number) {
  const d = 0.008;
  const bbox = [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function EventDetails({ e, slug, showCalendar }: { e: EventView; slug: string; showCalendar: boolean }) {
  const start = new Date(e.startsAt);
  const hasVenue = Boolean(e.venueName || e.venueAddress);
  return (
    <div className="space-y-5">
      <div>
        <p className="w-eyebrow">{formatLongDate(start, e.timezone)}</p>
        <h3 className="w-display mt-2 text-3xl sm:text-4xl">{e.name}</h3>
        <p className="w-muted mt-1">{formatTimeRange(start, e.endsAt ? new Date(e.endsAt) : null, e.timezone)}</p>
      </div>
      {hasVenue && (
        <div>
          {e.venueName && <p className="text-lg font-medium">{e.venueName}</p>}
          {e.venueAddress && <p className="w-muted">{e.venueAddress}</p>}
        </div>
      )}
      {e.dressCode && (
        <p>
          <span className="w-label !mb-0 inline">Dress code · </span>
          {e.dressCode}
        </p>
      )}
      {e.description && <p className="w-muted whitespace-pre-line">{e.description}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {hasVenue && (
          <a className="w-btn" href={directionsUrl(e)} target="_blank" rel="noopener noreferrer">
            Directions<span className="sr-only"> to {e.venueName || e.name} (opens in a new tab)</span>
          </a>
        )}
        {showCalendar && (
          <a className="w-btn w-btn-ghost" href={`/w/${slug}/calendar.ics?event=${e.id}`}>
            Add to calendar<span className="sr-only">: {e.name}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function EventMap({ e }: { e: EventView }) {
  if (e.venueLat === null || e.venueLng === null) return null;
  return (
    <iframe
      title={`Map of ${e.venueName || e.name}`}
      src={osmEmbed(e.venueLat, e.venueLng)}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-full min-h-[260px] w-full rounded-[var(--w-radius)] border-0 grayscale-[30%]"
    />
  );
}

export function ScheduleSection({ w, theme, now }: { w: WeddingView; theme: Theme; now: number }) {
  const married = w.phase === "married";
  const title = w.events.length > 1 ? (married ? "The Celebrations" : "The Celebrations") : "The Details";
  const eyebrow = married ? "Where it all happened" : "Join us";

  if (theme.schedule === "timeline") {
    return (
      <Section id="schedule" eyebrow={eyebrow} title={title} theme={theme} tinted>
        <ol className="relative mx-auto max-w-4xl space-y-14 before:absolute before:top-3 before:bottom-3 before:left-[0.6rem] before:w-px before:bg-[var(--w-line)] sm:before:left-1/2">
          {w.events.map((e, i) => {
            const hasMap = e.venueLat !== null && e.venueLng !== null;
            return (
              <Reveal as="li" key={e.id} className="relative pl-10 sm:grid sm:grid-cols-2 sm:gap-14 sm:pl-0">
                <span aria-hidden className="absolute top-2 left-0 h-5 w-5 rounded-full border-2 border-[var(--w-accent)] bg-[var(--w-bg)] sm:left-1/2 sm:-translate-x-1/2" />
                <div className={i % 2 ? "sm:col-start-2" : "sm:text-right [&_.flex]:sm:justify-end"}>
                  <EventDetails e={e} slug={w.slug} showCalendar={Date.parse(e.startsAt) > now} />
                </div>
                {hasMap && (
                  <div className={`mt-6 h-64 sm:mt-0 ${i % 2 ? "sm:col-start-1 sm:row-start-1" : ""}`}>
                    <EventMap e={e} />
                  </div>
                )}
              </Reveal>
            );
          })}
        </ol>
      </Section>
    );
  }

  return (
    <Section id="schedule" eyebrow={eyebrow} title={title} theme={theme} tinted>
      <ol className={`grid gap-6 ${w.events.length > 1 ? "lg:grid-cols-2" : "mx-auto max-w-3xl"}`}>
        {w.events.map((e) => (
          <Reveal as="li" key={e.id} className="w-surface flex flex-col gap-6 overflow-hidden p-6 sm:p-8">
            <EventDetails e={e} slug={w.slug} showCalendar={Date.parse(e.startsAt) > now} />
            {e.venueLat !== null && <div className="h-56"><EventMap e={e} /></div>}
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

export function GiftsSection({ w, theme }: { w: WeddingView; theme: Theme }) {
  return (
    <Section id="gifts" eyebrow="With gratitude" title="Gifts" theme={theme}>
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

export function ThankYouSection({ w, theme }: { w: WeddingView; theme: Theme }) {
  return (
    <Section id="thank-you" eyebrow="From our hearts" title="Thank You" theme={theme}>
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="w-display text-2xl leading-snug italic sm:text-3xl">{w.thankYouMessage}</p>
        <p className="w-display w-accent mt-8 text-2xl">— {w.partnerOne} &amp; {w.partnerTwo}</p>
      </Reveal>
    </Section>
  );
}

export function MemoriesSection({ w, theme }: { w: WeddingView; theme: Theme }) {
  return (
    <Section id="memories" eyebrow="Forever after" title="Our Journey" theme={theme} tinted>
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
                  <Picture key={img.id} image={img} sizes="(min-width: 768px) 360px, 45vw" className="aspect-[4/3] w-full rounded-[var(--w-radius)] object-cover" />
                ))}
              </div>
            )}
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

export function Footer({ w, theme }: { w: WeddingView; theme: Theme }) {
  return (
    <footer className="w-line border-t px-5 py-16 text-center">
      <p className="w-display text-4xl sm:text-5xl">
        {w.partnerOne} <span className="w-accent italic">&amp;</span> {w.partnerTwo}
      </p>
      {w.marriageDate && <p className="w-eyebrow mt-4">{formatPlainDate(w.marriageDate)}</p>}
      <div className="mt-6"><OrnamentDivider kind={theme.ornament} /></div>
      {w.contact && (
        <p className="w-muted mt-8 text-sm">
          Questions? {w.contact.name && <>{w.contact.name} · </>}
          {w.contact.email && <a className="underline underline-offset-4" href={`mailto:${w.contact.email}`}>{w.contact.email}</a>}
          {w.contact.email && w.contact.phone && " · "}
          {w.contact.phone && <a className="underline underline-offset-4" href={`tel:${w.contact.phone.replace(/\s/g, "")}`}>{w.contact.phone}</a>}
        </p>
      )}
      <p className="w-muted mt-10 text-xs">
        Made with love on <a href="/" className="underline underline-offset-4">EverMore</a>
      </p>
    </footer>
  );
}
