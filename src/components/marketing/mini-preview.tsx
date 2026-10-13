import type { CSSProperties } from "react";
import { FONT_STACKS } from "@/app/fonts";
import { sampleWedding } from "@/lib/samples";
import { getTheme } from "@/lib/themes";

/* eslint-disable @next/next/no-img-element -- inline SVG illustrations */

/**
 * A miniature, static rendering of a theme's hero for marketing surfaces (cards, device frames).
 * Uses the same theme tokens and sample data as the real pages.
 */
export function MiniPreview({ themeId, variant = "phone", now }: { themeId: string; variant?: "phone" | "desktop" | "card"; now: number }) {
  const theme = getTheme(themeId);
  const w = sampleWedding(theme.id, { now });
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: w.timezone }).format(
    new Date(w.events[1].startsAt),
  );
  const darkHero = ["framed", "editorial", "bordered"].includes(theme.hero);
  const style = {
    background: theme.colors.bg,
    color: darkHero ? "#fff" : theme.colors.ink,
    fontFamily: FONT_STACKS[theme.fonts.body],
  } as CSSProperties;
  const display = { fontFamily: FONT_STACKS[theme.fonts.display], fontWeight: theme.fonts.displayWeight } as CSSProperties;
  const days = 96;

  return (
    <div style={style} className="relative h-full w-full overflow-hidden" aria-hidden>
      {darkHero && w.hero && (
        <>
          <img src={w.hero.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
        </>
      )}
      {theme.hero === "pattern" && (
        <div className="absolute inset-x-0 top-0 h-2" style={{ background: `repeating-linear-gradient(90deg, ${theme.colors.accent} 0 10px, #D9A441 10px 20px, ${theme.colors.ink} 20px 30px)` }} />
      )}
      <div className={`relative flex h-full flex-col items-center justify-center gap-[6%] px-[8%] text-center ${variant === "desktop" && theme.hero === "split" ? "items-start text-left" : ""}`}>
        {theme.hero === "arch" && w.hero && (
          <img src={w.hero.src} alt="" className={`${variant === "phone" ? "w-[42%]" : "w-[28%]"} rounded-t-full border-4 object-cover`} style={{ aspectRatio: "3/4", borderColor: theme.colors.surface }} />
        )}
        {(theme.hero === "split" || theme.hero === "pattern") && w.hero && variant !== "card" && (
          <img src={w.hero.src} alt="" className="w-[55%] object-cover" style={{ aspectRatio: "4/5", borderRadius: theme.radius }} />
        )}
        <p className="text-[0.5em] font-semibold tracking-[0.3em] uppercase" style={{ color: darkHero ? "rgba(255,255,255,.85)" : theme.colors.accent }}>
          Together with their families
        </p>
        <p style={display} className={`text-[2.4em] leading-[0.95] ${theme.hero === "split" || theme.heading === "ornate" ? "uppercase" : ""} ${theme.hero === "arch" ? "italic" : ""}`}>
          {w.partnerOne}
          <span className="block text-[0.5em] italic" style={{ color: darkHero ? undefined : theme.colors.accent }}>&amp;</span>
          {w.partnerTwo}
        </p>
        <p className="text-[0.5em] tracking-[0.25em] uppercase">{date}</p>
        <div className="flex gap-[0.4em]">
          {[days, 14, 32].map((n, i) => (
            <span
              key={i}
              className="grid min-w-[2.6em] place-items-center px-[0.5em] py-[0.35em] text-[0.65em]"
              style={{ border: `1px solid ${darkHero ? "rgba(255,255,255,.35)" : theme.colors.line}`, borderRadius: theme.radius, ...display }}
            >
              {n}
            </span>
          ))}
        </div>
        <span
          className="px-[1.4em] py-[0.6em] text-[0.45em] font-semibold tracking-[0.2em] uppercase"
          style={{ background: darkHero ? "#fff" : theme.colors.accent, color: darkHero ? "#111" : theme.colors.accentInk, borderRadius: theme.radius }}
        >
          RSVP
        </span>
      </div>
    </div>
  );
}

export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2.4rem] border-[10px] border-navy bg-navy p-0 shadow-[0_40px_80px_-30px_rgba(16,28,53,.55)] ${className}`}>
      <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] text-[11px]">
        <div className="absolute top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-navy" />
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-navy/10 bg-white shadow-[0_40px_90px_-40px_rgba(16,28,53,.5)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-navy/10 bg-[#f4f1ea] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-0.5 text-[10px] text-mist">evermore.example/w/ama-and-kofi</span>
      </div>
      <div className="aspect-[16/10] text-[15px]">{children}</div>
    </div>
  );
}
