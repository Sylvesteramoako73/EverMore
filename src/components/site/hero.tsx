import { formatLongDate, formatPlainDate } from "@/lib/dates";
import type { Theme } from "@/lib/themes";
import { Countdown, MarriedFor } from "./live";
import { CornerFlourish, GeometricBand, OrnamentDivider } from "./ornaments";
import type { CelebrationView, ImageView } from "./types";

/* eslint-disable @next/next/no-img-element -- images come from our own media route with pre-generated sizes */

export function Picture({ image, className = "", priority = false, sizes = "100vw" }: { image: ImageView; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <img
      src={image.src}
      srcSet={image.thumb !== image.src ? `${image.thumb} 640w, ${image.src} 1800w` : undefined}
      sizes={sizes}
      alt={image.alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      style={image.placeholder ? { backgroundImage: `url(${image.placeholder})`, backgroundSize: "cover" } : undefined}
    />
  );
}

/** Two people: stacked names joined by an ampersand. Anyone else: the headline. */
export function Headline({ w, theme, className = "", stacked = true }: { w: CelebrationView; theme: Theme; className?: string; stacked?: boolean }) {
  const couple = w.names.length === 2 && (w.occasion.kind === "wedding" || w.occasion.kind === "anniversary");
  if (!couple) return <h1 className={`w-display ${className}`}>{w.title}</h1>;
  const amp = <span className={`${theme.fonts.displayItalicAmp ? "italic" : ""} opacity-90`}>&amp;</span>;
  return stacked ? (
    <h1 className={`w-display ${className}`}>
      <span className="block">{w.names[0]} {amp}</span>
      <span className="block">{w.names[1]}</span>
    </h1>
  ) : (
    <h1 className={`w-display ${className}`}>
      {w.names[0]} {amp} {w.names[1]}
    </h1>
  );
}

function Lead({ w }: { w: CelebrationView }) {
  if (w.phase === "after") return <>{w.occasion.copy.afterLead}</>;
  if (w.phase === "today") return <>{w.occasion.copy.today}</>;
  return <>{w.occasion.copy.hostLine}</>;
}

function Invitation({ w }: { w: CelebrationView }) {
  if (w.phase === "after" || w.phase === "today") return null;
  return <p className="text-base opacity-90 sm:text-lg">{w.occasion.copy.invitation}</p>;
}

function primary(w: CelebrationView) {
  return w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
}

function DateLine({ w }: { w: CelebrationView }) {
  const { born, passed } = w.facts.lifeDates;
  const p = primary(w);
  return (
    <div className="space-y-1.5 text-[0.78rem] font-semibold tracking-[0.26em] uppercase">
      {w.occasion.after === "remembrance" && (born || passed) && (
        <p className="tracking-[0.2em] normal-case">
          {born ? formatPlainDate(born) : ""} {born && passed ? "–" : ""} {passed ? formatPlainDate(passed) : ""}
        </p>
      )}
      {p && <p>{formatLongDate(new Date(p.startsAt), p.timezone)}</p>}
      {p?.venueName && <p className="font-normal tracking-[0.2em] opacity-90">{p.venueName}</p>}
    </div>
  );
}

/** Countdown before (if the occasion has one), a message on the day, a counter or line afterwards. */
function Moment({ w, tone }: { w: CelebrationView; tone: "light" | "dark" }) {
  const p = primary(w);
  if (w.phase === "after") {
    if (w.occasion.after === "married" && w.keyDate) {
      return (
        <p className="w-display text-2xl sm:text-3xl">
          <MarriedFor since={w.keyDate} timezone={w.timezone} prefix={w.occasion.kind === "anniversary" ? "Together for" : "Married for"} />
        </p>
      );
    }
    return null;
  }
  if (!p || !w.occasion.countdown) return null;
  return <Countdown to={p.startsAt} tone={tone} after={<p className="w-display text-2xl italic sm:text-3xl">{w.occasion.copy.today}</p>} />;
}

function Cta({ w, light }: { w: CelebrationView; light: boolean }) {
  if (!w.rsvp.open || w.hiddenSections.includes("rsvp")) return null;
  return (
    <a href="#rsvp" className={`w-btn ${light ? "w-btn-light" : ""}`}>
      RSVP
    </a>
  );
}

function Fallback({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background:
          "radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, var(--w-accent) 55%, transparent), transparent 60%), radial-gradient(90% 80% at 90% 90%, color-mix(in srgb, var(--w-band) 80%, transparent), transparent 70%), var(--w-band)",
      }}
    />
  );
}

export function Hero({ w, theme }: { w: CelebrationView; theme: Theme }) {
  const img = w.hero;

  switch (theme.hero) {
    // Full-bleed photograph with big left-aligned serif names: the theashies look, refined.
    case "cinematic":
      return (
        <header className="relative flex min-h-[92svh] items-end overflow-hidden text-white sm:items-center">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-6 pt-28 pb-16 sm:px-10">
            <p className="w-eyebrow w-hero-in !text-white/80"><Lead w={w} /></p>
            <Headline w={w} theme={theme} className="w-hero-in max-w-3xl text-[clamp(3.2rem,9vw,7.5rem)] leading-[0.98]" />
            <div className="w-hero-in max-w-xl space-y-4 [animation-delay:150ms]"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="flex flex-wrap items-center gap-6 pt-2"><Moment w={w} tone="light" /><Cta w={w} light /></div>
          </div>
        </header>
      );

    // Photo on one side, typography on the other. Stacks on phones.
    case "split":
      return (
        <header className="grid min-h-[100svh] md:grid-cols-2">
          <div className="relative min-h-[52svh] md:order-2 md:min-h-full">
            {img ? <Picture image={img} priority sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          </div>
          <div className="flex flex-col justify-center gap-7 px-6 py-14 sm:px-12 md:py-20 lg:px-20">
            <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
            <Headline w={w} theme={theme} className={`w-hero-in text-6xl leading-[0.95] sm:text-7xl lg:text-8xl ${theme.heading === "minimal-caps" ? "uppercase" : ""}`} />
            <div className="w-hero-in space-y-3 [animation-delay:150ms]"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="w-hero-in [animation-delay:300ms]"><Moment w={w} tone="dark" /></div>
            <div><Cta w={w} light={false} /></div>
          </div>
        </header>
      );

    // Photo set inside an arch, botanical details, soft palette.
    case "arch":
      return (
        <header className="relative overflow-hidden px-6 pt-20 pb-20 text-center">
          <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
          <div className="w-hero-in relative mx-auto mt-8 aspect-[3/4] w-[min(78vw,420px)] overflow-hidden w-arch border-[6px] border-[var(--w-surface)] shadow-[0_30px_80px_-30px_rgba(0,0,0,.35)]">
            {img ? <Picture image={img} priority sizes="420px" className="h-full w-full object-cover" /> : <Fallback className="h-full w-full" />}
          </div>
          <Headline w={w} theme={theme} stacked={false} className="w-hero-in mt-10 text-5xl italic sm:text-7xl" />
          <div className="mt-5"><OrnamentDivider kind={theme.ornament} /></div>
          <div className="mt-5 space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
          <div className="mt-8 flex justify-center"><Moment w={w} tone="dark" /></div>
          <div className="mt-8"><Cta w={w} light={false} /></div>
        </header>
      );

    // An oval portrait on a quiet background, for remembrance.
    case "oval":
      return (
        <header className="relative px-6 pt-24 pb-20 text-center">
          <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
          <div className="w-hero-in mx-auto mt-10 aspect-[4/5] w-[min(70vw,340px)] overflow-hidden w-oval border border-[var(--w-line)] p-2">
            <div className="h-full w-full overflow-hidden w-oval">
              {img ? <Picture image={img} priority sizes="340px" className="h-full w-full object-cover" /> : <Fallback className="h-full w-full" />}
            </div>
          </div>
          <Headline w={w} theme={theme} stacked={false} className="w-hero-in mx-auto mt-10 max-w-3xl text-5xl sm:text-6xl" />
          <div className="mt-6"><OrnamentDivider kind={theme.ornament} /></div>
          <div className="mx-auto mt-6 max-w-xl space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
          <div className="mt-8 flex justify-center"><Moment w={w} tone="dark" /></div>
          <div className="mt-8"><Cta w={w} light={false} /></div>
        </header>
      );

    // Three tilted photos around bold type: party energy.
    case "collage": {
      const shots = [w.hero, ...w.portraits, ...w.gallery].filter((x): x is ImageView => Boolean(x)).slice(0, 3);
      return (
        <header className="relative overflow-hidden px-6 pt-24 pb-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7 text-center lg:text-left">
              <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
              <Headline w={w} theme={theme} stacked={false} className="w-hero-in text-[clamp(3.2rem,9vw,6.5rem)] leading-[0.95]" />
              <OrnamentDivider kind={theme.ornament} className="lg:mx-0" />
              <div className="space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
              <div className="flex justify-center lg:justify-start"><Moment w={w} tone="dark" /></div>
              <Cta w={w} light={false} />
            </div>
            <div className="relative mx-auto h-[420px] w-full max-w-md" aria-hidden={!shots.length}>
              {(shots.length ? shots : [null, null, null]).map((s, i) => (
                <div
                  key={i}
                  className={`absolute w-[58%] bg-white p-2.5 pb-9 shadow-[0_24px_50px_-24px_rgba(0,0,0,.5)] ${
                    ["top-0 left-0 -rotate-6", "top-10 right-0 rotate-6", "bottom-0 left-[20%] -rotate-2"][i]
                  }`}
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    {s ? <Picture image={s} priority={i === 0} sizes="260px" className="h-full w-full object-cover" /> : <Fallback className="h-full w-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>
      );
    }

    // Full-bleed photo, oversized left-aligned type: a magazine cover.
    case "editorial":
      return (
        <header className="relative flex min-h-[100svh] items-end overflow-hidden text-white">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div className="relative z-10 w-full px-6 pt-32 pb-14 sm:px-12 lg:px-20 lg:pb-20">
            <p className="w-eyebrow w-hero-in !text-white/85"><Lead w={w} /></p>
            <Headline
              w={w}
              theme={theme}
              stacked={false}
              className={`w-hero-in mt-6 max-w-5xl text-[clamp(3.4rem,11vw,9rem)] leading-[0.9] ${theme.heading === "minimal-caps" ? "uppercase" : ""}`}
            />
            <div className="mt-8 h-px w-28 bg-[var(--w-accent)]" />
            <div className="mt-6 max-w-xl space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="mt-8 flex flex-wrap items-center gap-6"><Moment w={w} tone="light" /><Cta w={w} light={false} /></div>
          </div>
        </header>
      );

    // Ornate double border framing centred capitals.
    case "bordered":
      return (
        <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden p-4 text-white sm:p-8">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 border border-[var(--w-accent)] px-6 py-16 text-center outline outline-1 outline-offset-[6px] outline-[var(--w-accent)]/60 sm:px-12">
            <CornerFlourish className="absolute top-2 left-2 h-10 w-10 text-[var(--w-accent)]" />
            <CornerFlourish className="absolute top-2 right-2 h-10 w-10 -scale-x-100 text-[var(--w-accent)]" />
            <CornerFlourish className="absolute bottom-2 left-2 h-10 w-10 -scale-y-100 text-[var(--w-accent)]" />
            <CornerFlourish className="absolute right-2 bottom-2 h-10 w-10 -scale-100 text-[var(--w-accent)]" />
            <p className="w-eyebrow w-hero-in !text-[#F1D79B]"><Lead w={w} /></p>
            <Headline w={w} theme={theme} className="w-hero-in text-5xl tracking-[0.05em] uppercase sm:text-7xl" />
            <OrnamentDivider kind={theme.ornament} className="!text-[#F1D79B]" />
            <div className="space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
            <Moment w={w} tone="light" />
            <Cta w={w} light />
          </div>
        </header>
      );

    // Woven geometric bands with an offset portrait.
    case "pattern":
      return (
        <header className="relative overflow-hidden">
          <GeometricBand />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="order-2 space-y-7 lg:order-1">
              <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
              <Headline w={w} theme={theme} stacked={false} className="w-hero-in text-[clamp(3.2rem,9vw,6.5rem)] leading-[0.92]" />
              <div className="space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
              <Moment w={w} tone="dark" />
              <Cta w={w} light={false} />
            </div>
            <div className="relative order-1 lg:order-2">
              <div aria-hidden className="absolute -top-4 -right-4 h-full w-full rounded-[var(--w-radius)] bg-[var(--w-accent)]" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--w-radius)]">
                {img ? <Picture image={img} priority sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full object-cover" /> : <Fallback className="h-full w-full" />}
              </div>
            </div>
          </div>
          <GeometricBand />
        </header>
      );

    // Full-bleed photo with centred names inside a fine inset frame.
    case "framed":
    default:
      return (
        <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 text-center text-white">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div aria-hidden className="pointer-events-none absolute inset-4 border border-white/40 sm:inset-8" />
          <div className="relative z-10 flex flex-col items-center gap-6 py-24">
            <p className="w-eyebrow w-hero-in !text-white/90"><Lead w={w} /></p>
            <Headline w={w} theme={theme} className="w-hero-in text-6xl sm:text-8xl" />
            <OrnamentDivider kind={theme.ornament} className="!text-white/80" />
            <div className="w-hero-in space-y-3 [animation-delay:200ms]"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="w-hero-in [animation-delay:350ms]"><Moment w={w} tone="light" /></div>
            <Cta w={w} light />
          </div>
        </header>
      );
  }
}
