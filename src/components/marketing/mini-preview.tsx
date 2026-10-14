import type { CSSProperties, ReactNode } from "react";
import { FONT_STACKS } from "@/app/fonts";
import type { OccasionKind } from "@/lib/occasions";
import { sampleCelebration } from "@/lib/samples";
import { getTheme } from "@/lib/themes";

/* eslint-disable @next/next/no-img-element -- inline SVG illustrations */

/**
 * A miniature, static rendering of a theme's hero for marketing surfaces (cards, device frames).
 * Uses the same theme tokens and sample data as the real pages.
 */
export function MiniPreview({
  themeId,
  occasion = "wedding",
  variant = "phone",
  now,
}: {
  themeId: string;
  occasion?: OccasionKind;
  variant?: "phone" | "desktop" | "card";
  now: number;
}) {
  const theme = getTheme(themeId);
  const w = sampleCelebration(theme.id, { occasion, now });
  const main = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: w.timezone }).format(new Date(main.startsAt));
  const photoBehind = ["cinematic", "framed", "editorial", "bordered"].includes(theme.hero);
  const style = { background: theme.colors.bg, color: photoBehind ? "#fff" : theme.colors.ink, fontFamily: FONT_STACKS[theme.fonts.body] } as CSSProperties;
  const display = { fontFamily: FONT_STACKS[theme.fonts.display], fontWeight: theme.fonts.displayWeight } as CSSProperties;
  const couple = w.names.length === 2;
  const left = theme.hero === "cinematic" || (variant === "desktop" && theme.hero === "split");

  const photo = (className: string, extra?: CSSProperties) =>
    w.hero ? <img src={w.hero.src} alt="" className={`object-cover ${className}`} style={extra} /> : null;

  let picture: ReactNode = null;
  if (theme.hero === "arch") picture = photo(`${variant === "phone" ? "w-[42%]" : "w-[28%]"} rounded-t-full border-4`, { aspectRatio: "3/4", borderColor: theme.colors.surface });
  if (theme.hero === "oval") picture = photo(`${variant === "phone" ? "w-[40%]" : "w-[24%]"} rounded-[50%/46%]`, { aspectRatio: "4/5" });
  if ((theme.hero === "split" || theme.hero === "pattern") && variant !== "card") picture = photo("w-[55%]", { aspectRatio: "4/5", borderRadius: theme.radius });
  if (theme.hero === "collage") {
    picture = (
      <div className="relative h-[28%] w-[62%]">
        {[0, 1, 2].map((i) => {
          const img = i === 0 ? w.hero : w.portraits[i - 1];
          return (
            <div key={i} className={`absolute w-[46%] bg-white p-[3%] pb-[9%] shadow ${["top-0 left-0 -rotate-6", "top-[8%] right-0 rotate-6", "bottom-0 left-[27%] -rotate-2"][i]}`}>
              {img && <img src={img.src} alt="" className="aspect-[4/5] w-full object-cover" />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={style} className="relative h-full w-full overflow-hidden" aria-hidden>
      {photoBehind && (
        <>
          {photo("absolute inset-0 h-full w-full")}
          <div className="absolute inset-0" style={{ background: theme.colors.heroOverlay }} />
        </>
      )}
      {theme.hero === "pattern" && (
        <div className="absolute inset-x-0 top-0 h-2" style={{ background: `repeating-linear-gradient(90deg, ${theme.colors.accent} 0 10px, #D9A441 10px 20px, ${theme.colors.ink} 20px 30px)` }} />
      )}
      <div className={`relative flex h-full flex-col justify-center gap-[5%] px-[8%] ${left ? "items-start text-left" : "items-center text-center"}`}>
        {picture}
        <p className="text-[0.5em] font-semibold tracking-[0.3em] uppercase" style={{ color: photoBehind ? "rgba(255,255,255,.85)" : theme.colors.accent }}>
          {w.occasion.copy.hostLine}
        </p>
        <p
          style={display}
          className={`leading-[0.95] ${couple ? "text-[2.3em]" : "text-[1.7em]"} ${theme.heading === "minimal-caps" || theme.heading === "ornate" ? "uppercase" : ""} ${theme.hero === "arch" ? "italic" : ""}`}
        >
          {couple ? (
            <>
              {w.names[0]}
              <span className="block text-[0.5em] italic" style={{ color: photoBehind ? undefined : theme.colors.accent }}>&amp;</span>
              {w.names[1]}
            </>
          ) : (
            w.title
          )}
        </p>
        <p className="text-[0.5em] tracking-[0.25em] uppercase">{date}</p>
        {w.occasion.countdown && (
          <div className="flex gap-[0.4em]">
            {[96, 14, 32].map((n, i) => (
              <span
                key={i}
                className="grid min-w-[2.6em] place-items-center px-[0.5em] py-[0.35em] text-[0.65em]"
                style={{ border: `1px solid ${photoBehind ? "rgba(255,255,255,.35)" : theme.colors.line}`, borderRadius: theme.radius, ...display }}
              >
                {n}
              </span>
            ))}
          </div>
        )}
        {w.rsvp.open && (
          <span
            className="px-[1.4em] py-[0.6em] text-[0.45em] font-semibold tracking-[0.2em] uppercase"
            style={{ background: photoBehind ? "#fff" : theme.colors.accent, color: photoBehind ? "#111" : theme.colors.accentInk, borderRadius: theme.radius }}
          >
            RSVP
          </span>
        )}
      </div>
    </div>
  );
}

export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2.4rem] border-[10px] border-navy bg-navy p-0 shadow-[0_40px_80px_-30px_rgba(16,28,53,.55)] ${className}`}>
      <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] text-[11px]">
        <div className="absolute top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-navy" />
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({ children, className = "", address = "evermore.example/ama-and-kofi" }: { children: ReactNode; className?: string; address?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-navy/10 bg-white shadow-[0_40px_90px_-40px_rgba(16,28,53,.5)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-navy/10 bg-[#f4f1ea] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e2d9c7]" />
        <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-0.5 text-[10px] text-mist">{address}</span>
      </div>
      <div className="aspect-[16/10] text-[15px]">{children}</div>
    </div>
  );
}
