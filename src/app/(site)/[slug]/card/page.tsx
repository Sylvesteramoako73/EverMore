import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FONT_STACKS } from "@/app/fonts";
import { PrintButton } from "@/components/print-button";
import { formatLongDate } from "@/lib/dates";
import { getTheme } from "@/lib/themes";
import { loadPublicCelebration } from "@/server/public-celebration";
import { memberCheck } from "@/server/viewer";

export const metadata: Metadata = { title: "Printable invitation", robots: { index: false } };

/** A printable A5 invitation card with the QR code, styled in the couple's theme. */
export default function CardPage(props: PageProps<"/[slug]/card">) {
  return (
    <Suspense>
      <Card {...props} />
    </Suspense>
  );
}

async function Card({ params }: PageProps<"/[slug]/card">) {
  await connection();
  const { slug } = await params;
  const result = await loadPublicCelebration(slug, { inviteToken: null, isMember: memberCheck() });
  if (result.kind !== "ok") notFound();
  const w = result.view;
  const theme = getTheme(w.themeId);
  const primary = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];

  return (
    <main id="main" className="flex min-h-screen flex-col items-center gap-6 bg-neutral-100 p-6 print:bg-white print:p-0">
      <PrintButton />
      <article
        className="flex aspect-[148/210] w-full max-w-[148mm] flex-col items-center justify-between border p-[12mm] text-center shadow-xl print:max-w-none print:shadow-none"
        style={{ background: theme.colors.bg === "#0E0E0F" ? "#FFFFFF" : theme.colors.bg, color: theme.colors.ink === "#F3EEE4" ? "#111" : theme.colors.ink, fontFamily: FONT_STACKS[theme.fonts.body], borderColor: theme.colors.accent }}
      >
        <p className="text-[0.65rem] font-semibold tracking-[0.3em] uppercase" style={{ color: theme.colors.accent }}>
          {w.occasion.copy.hostLine}
        </p>
        <div>
          <h1 className="text-5xl leading-tight" style={{ fontFamily: FONT_STACKS[theme.fonts.display] }}>
            {w.title}
          </h1>
          <p className="mt-4 text-sm">{w.occasion.copy.invitation}</p>
          {primary && (
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] uppercase">
              {formatLongDate(new Date(primary.startsAt), primary.timezone)}
              {primary.venueName && <span className="mt-1 block font-normal">{primary.venueName}</span>}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${w.links.qr}?format=svg`} alt="" className="h-28 w-28" />
          <p className="text-[0.65rem]">Scan for details{w.rsvp.open ? " & RSVP" : ""}</p>
          <p className="font-mono text-[0.6rem] break-all opacity-80">{w.shareUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </article>
    </main>
  );
}
