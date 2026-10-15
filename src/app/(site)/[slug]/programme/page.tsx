import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type CSSProperties } from "react";
import { FONT_STACKS } from "@/app/fonts";
import { PrintButton } from "@/components/print-button";
import { formatLongDate, formatPlainDate, formatTimeRange } from "@/lib/dates";
import { getTheme } from "@/lib/themes";
import { loadPublicCelebration } from "@/server/public-celebration";
import { memberCheck } from "@/server/viewer";

export const metadata: Metadata = { title: "Programme", robots: { index: false } };

/**
 * A printable programme booklet (A5 pages): the order of events with times and venues, the people with
 * special roles and, for remembrance, the biography and tributes. Print or save as PDF from the browser.
 */
export default function ProgrammePage(props: PageProps<"/[slug]/programme">) {
  return (
    <Suspense>
      <Programme {...props} />
    </Suspense>
  );
}

async function Programme({ params }: PageProps<"/[slug]/programme">) {
  await connection();
  const { slug } = await params;
  const result = await loadPublicCelebration(slug, { inviteToken: null, isMember: memberCheck() });
  if (result.kind !== "ok") notFound();
  const w = result.view;
  const theme = getTheme(w.themeId);
  const remembrance = w.occasion.after === "remembrance";
  const dark = theme.colors.bg === "#0E0E0F";
  const ink = dark ? "#111" : theme.colors.ink;
  const page: CSSProperties = { background: dark ? "#fff" : theme.colors.bg, color: ink, fontFamily: FONT_STACKS[theme.fonts.body], borderColor: theme.colors.accent };
  const display: CSSProperties = { fontFamily: FONT_STACKS[theme.fonts.display] };
  const accent: CSSProperties = { color: theme.colors.accent };
  const life = w.facts.lifeDates;
  const sheet = "mx-auto flex aspect-[148/210] w-full max-w-[148mm] flex-col border p-[12mm] shadow-xl break-after-page print:max-w-none print:border-0 print:shadow-none";
  const tributes = remembrance ? w.guestbook.entries.slice(0, 8) : [];

  return (
    <main id="main" className="flex min-h-screen flex-col items-center gap-6 bg-neutral-100 p-6 print:block print:bg-white print:p-0">
      <PrintButton />

      {/* Cover */}
      <article className={`${sheet} items-center justify-between text-center`} style={page}>
        <p className="text-[0.65rem] font-semibold tracking-[0.3em] uppercase" style={accent}>
          {remembrance ? "Order of Service" : "Programme"}
        </p>
        <div className="flex flex-col items-center">
          {w.hero && (
            // eslint-disable-next-line @next/next/no-img-element -- print layout, our own media route
            <img src={w.hero.src} alt={w.hero.alt} className={`mb-6 h-[70mm] w-[56mm] object-cover ${remembrance ? "rounded-[50%]" : "rounded-t-full"}`} />
          )}
          <h1 className="text-4xl leading-tight" style={display}>{w.title}</h1>
          {remembrance && (life.born || life.passed) && (
            <p className="mt-3 text-sm tracking-wide">
              {life.born ? formatPlainDate(life.born) : ""}
              {life.born && life.passed ? " – " : ""}
              {life.passed ? formatPlainDate(life.passed) : ""}
            </p>
          )}
          {w.guestMessage && <p className="mt-4 max-w-[100mm] text-sm italic">{w.guestMessage}</p>}
        </div>
        {w.events[0] && (
          <p className="text-xs font-semibold tracking-[0.2em] uppercase">
            {formatLongDate(new Date(w.events[0].startsAt), w.events[0].timezone)}
            {w.events[0].venueName && <span className="mt-1 block font-normal normal-case tracking-normal">{w.events[0].venueName}</span>}
          </p>
        )}
      </article>

      {/* Biography / story */}
      {w.story && (
        <article className={sheet} style={page}>
          <h2 className="text-center text-2xl" style={display}>{w.occasion.copy.storyTitle}</h2>
          <div className="mx-auto my-4 h-px w-16" style={{ background: theme.colors.accent }} />
          <p className="text-[0.8rem] leading-relaxed whitespace-pre-line">{w.story}</p>
        </article>
      )}

      {/* Order of events */}
      {w.events.length > 0 && (
        <article className={sheet} style={page}>
          <h2 className="text-center text-2xl" style={display}>{w.occasion.copy.scheduleTitle}</h2>
          <div className="mx-auto my-4 h-px w-16" style={{ background: theme.colors.accent }} />
          <ol className="space-y-4">
            {w.events.map((e) => (
              <li key={e.id} className="grid grid-cols-[30mm_1fr] gap-3 text-[0.8rem]">
                <span className="font-semibold" style={accent}>
                  {formatTimeRange(new Date(e.startsAt), e.endsAt ? new Date(e.endsAt) : null, e.timezone)}
                </span>
                <span>
                  <span className="block text-base" style={display}>{e.name}</span>
                  {e.venueName && <span className="block opacity-80">{e.venueName}{e.venueAddress ? `, ${e.venueAddress}` : ""}</span>}
                  {e.description && <span className="mt-1 block">{e.description}</span>}
                  {e.dressCode && <span className="mt-1 block text-[0.7rem] tracking-wide uppercase opacity-80">Dress: {e.dressCode}</span>}
                </span>
              </li>
            ))}
          </ol>
        </article>
      )}

      {/* People, tributes, thanks */}
      {(w.facts.party.length > 0 || tributes.length > 0 || w.colours.length > 0) && (
        <article className={sheet} style={page}>
          {w.facts.party.length > 0 && (
            <>
              <h2 className="text-center text-2xl" style={display}>{w.facts.partyTitle}</h2>
              <div className="mx-auto my-4 h-px w-16" style={{ background: theme.colors.accent }} />
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.8rem]">
                {w.facts.party.map((p, i) => (
                  <li key={i}><span className="font-semibold">{p.name}</span>{p.role ? <span className="opacity-80"> · {p.role}</span> : null}</li>
                ))}
              </ul>
            </>
          )}
          {tributes.length > 0 && (
            <>
              <h2 className="mt-8 text-center text-2xl" style={display}>Tributes</h2>
              <div className="mx-auto my-4 h-px w-16" style={{ background: theme.colors.accent }} />
              <ul className="space-y-3 text-[0.75rem]">
                {tributes.map((t) => (
                  <li key={t.id}><p className="italic">&ldquo;{t.message}&rdquo;</p><p className="mt-0.5 text-right" style={accent}>— {t.name}</p></li>
                ))}
              </ul>
            </>
          )}
          {w.colours.length > 0 && (
            <p className="mt-auto pt-6 text-center text-[0.7rem] tracking-wide uppercase">
              Colours of the day: {w.colours.map((c) => c.name).join(" · ")}
            </p>
          )}
        </article>
      )}

      {/* Back cover */}
      <article className={`${sheet} items-center justify-center text-center`} style={page}>
        <p className="max-w-[100mm] text-xl italic" style={display}>
          {w.thankYouMessage || (remembrance ? "The family thanks you for your love, prayers and support." : "Thank you for celebrating with us.")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated QR from our own route */}
        <img src={`${w.links.qr}?format=svg`} alt="" className="mt-10 h-24 w-24" />
        <p className="mt-2 text-[0.65rem]">Photos, messages and more</p>
        <p className="font-mono text-[0.6rem] opacity-80">{w.shareUrl.replace(/^https?:\/\//, "")}</p>
      </article>
    </main>
  );
}
