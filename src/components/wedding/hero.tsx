import type { Theme } from "@/lib/themes";
import { formatLongDate } from "@/lib/dates";
import { CornerFlourish, GeometricBand, OrnamentDivider } from "./ornaments";
import { Countdown, MarriedFor } from "./live";
import type { ImageView, WeddingView } from "./types";

/* eslint-disable @next/next/no-img-element -- images come from our own media route with pre-generated sizes */

export function Picture({
  image,
  className = "",
  priority = false,
  sizes = "100vw",
}: {
  image: ImageView;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <img
      src={image.src}
      srcSet={`${image.thumb} 640w, ${image.src} 1800w`}
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

function Names({ w, theme, className = "" }: { w: WeddingView; theme: Theme; className?: string }) {
  return (
    <h1 className={`w-display ${className}`}>
      <span className="block">{w.partnerOne}</span>
      <span className={`my-1 block text-[0.5em] ${theme.fonts.displayItalicAmp ? "italic" : ""} opacity-90`}>&amp;</span>
      <span className="block">{w.partnerTwo}</span>
    </h1>
  );
}

function Lead({ w }: { w: WeddingView }) {
  if (w.phase === "married") return <>Happily married</>;
  if (w.phase === "today") return <>Today we celebrate our forever</>;
  return <>Together with their families</>;
}

function Invitation({ w }: { w: WeddingView }) {
  if (w.phase === "married" || w.phase === "today") return null;
  return <p className="text-base opacity-90 sm:text-lg">joyfully invite you to celebrate their wedding</p>;
}

function DateLine({ w }: { w: WeddingView }) {
  const primary = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  if (!primary) return null;
  return (
    <p className="text-[0.78rem] font-semibold tracking-[0.28em] uppercase">
      {formatLongDate(new Date(primary.startsAt), primary.timezone)}
      {primary.venueName && <span className="mt-1.5 block font-normal tracking-[0.2em] opacity-90">{primary.venueName}</span>}
    </p>
  );
}

/** Countdown before, a gentle message on the day, and the marriage counter afterwards. */
function Moment({ w, tone }: { w: WeddingView; tone: "light" | "dark" }) {
  const primary = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  if (w.phase === "married" && w.marriageDate) {
    return (
      <p className="w-display text-2xl sm:text-3xl">
        <MarriedFor since={w.marriageDate} timezone={w.timezone} />
      </p>
    );
  }
  if (!primary) return null;
  return (
    <Countdown
      to={primary.startsAt}
      tone={tone}
      after={<p className="w-display text-2xl italic sm:text-3xl">Today we celebrate our forever</p>}
    />
  );
}

function Cta({ w, light }: { w: WeddingView; light: boolean }) {
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
          "radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, var(--w-accent) 55%, transparent), transparent 60%), radial-gradient(90% 80% at 90% 90%, color-mix(in srgb, var(--w-ink) 70%, transparent), transparent 70%), var(--w-ink)",
      }}
    />
  );
}

export function Hero({ w, theme }: { w: WeddingView; theme: Theme }) {
  const img = w.hero;

  switch (theme.hero) {
    // Photo on one side, typography on the other. Stacks on phones.
    case "split":
      return (
        <header className="grid min-h-[100svh] md:grid-cols-2">
          <div className="relative min-h-[52svh] md:order-2 md:min-h-full">
            {img ? <Picture image={img} priority sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          </div>
          <div className="flex flex-col justify-center gap-7 px-6 py-14 sm:px-12 md:py-20 lg:px-20">
            <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
            <Names w={w} theme={theme} className="w-hero-in text-6xl leading-[0.95] uppercase sm:text-7xl lg:text-8xl" />
            <div className="w-hero-in space-y-3 [animation-delay:150ms]"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="w-hero-in [animation-delay:300ms]"><Moment w={w} tone="dark" /></div>
            <div><Cta w={w} light={false} /></div>
          </div>
        </header>
      );

    // Photo set inside an arch, botanical details, soft palette.
    case "arch":
      return (
        <header className="relative overflow-hidden px-6 pt-16 pb-20 text-center sm:pt-20">
          <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
          <div className="w-hero-in relative mx-auto mt-8 aspect-[3/4] w-[min(78vw,420px)] overflow-hidden w-arch border-[6px] border-[var(--w-surface)] shadow-[0_30px_80px_-30px_rgba(0,0,0,.35)]">
            {img ? <Picture image={img} priority sizes="420px" className="h-full w-full object-cover" /> : <Fallback className="h-full w-full" />}
          </div>
          <Names w={w} theme={theme} className="w-hero-in mt-10 text-6xl italic sm:text-7xl" />
          <div className="mt-5"><OrnamentDivider kind={theme.ornament} /></div>
          <div className="mt-5 space-y-3"><Invitation w={w} /><DateLine w={w} /></div>
          <div className="mt-8 flex justify-center"><Moment w={w} tone="dark" /></div>
          <div className="mt-8"><Cta w={w} light={false} /></div>
        </header>
      );

    // Full-bleed photo, oversized left-aligned Didone type: a magazine cover.
    case "editorial":
      return (
        <header className="relative flex min-h-[100svh] items-end overflow-hidden text-[var(--w-ink)]">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div className="relative z-10 w-full px-6 pt-32 pb-14 sm:px-12 lg:px-20 lg:pb-20">
            <p className="w-eyebrow w-hero-in"><Lead w={w} /></p>
            <h1 className="w-display w-hero-in mt-6 text-[clamp(3.6rem,13vw,10rem)] leading-[0.88]">
              {w.partnerOne}
              <br />
              <span className="italic text-[var(--w-accent)]">&amp;</span> {w.partnerTwo}
            </h1>
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
            <Names w={w} theme={theme} className="w-hero-in text-5xl tracking-[0.06em] uppercase sm:text-7xl" />
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
              <h1 className="w-display w-hero-in text-[clamp(3.4rem,10vw,7rem)] leading-[0.92]">
                {w.partnerOne} <span className="italic text-[var(--w-accent)]">&amp;</span> {w.partnerTwo}
              </h1>
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

    // Full-bleed photo with names inside a fine inset frame.
    case "framed":
    default:
      return (
        <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 text-center text-white">
          {img ? <Picture image={img} priority className="w-hero-zoom absolute inset-0 h-full w-full object-cover" /> : <Fallback className="absolute inset-0" />}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
          <div aria-hidden className="pointer-events-none absolute inset-4 border border-white/40 sm:inset-8" />
          <div className="relative z-10 flex flex-col items-center gap-6 py-24">
            <p className="w-eyebrow w-hero-in !text-white/90"><Lead w={w} /></p>
            <Names w={w} theme={theme} className="w-hero-in text-6xl sm:text-8xl lg:text-9xl" />
            <OrnamentDivider kind={theme.ornament} className="!text-white/80" />
            <div className="w-hero-in space-y-3 [animation-delay:200ms]"><Invitation w={w} /><DateLine w={w} /></div>
            <div className="w-hero-in [animation-delay:350ms]"><Moment w={w} tone="light" /></div>
            <Cta w={w} light />
          </div>
        </header>
      );
  }
}
