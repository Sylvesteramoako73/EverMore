import type { CSSProperties } from "react";
import { FONT_STACKS } from "@/app/fonts";
import { formatPlainDate } from "@/lib/dates";
import { getTheme } from "@/lib/themes";
import { Hero } from "./hero";
import { GuestbookPanel, Gallery, RsvpForm, ShareSection, SiteNav } from "./interactive";
import { Reveal } from "./live";
import { Footer, GiftsSection, MemoriesSection, ScheduleSection, Section, StorySection, ThankYouSection } from "./sections";
import type { WeddingView } from "./types";
import "./wedding.css";

/**
 * Renders any couple's wedding page from data + theme. One component for every wedding:
 * the theme decides the look, the wedding's phase decides what leads.
 */
export function WeddingSite({ w, now, inviteToken = null }: { w: WeddingView; now: number; inviteToken?: string | null }) {
  const theme = getTheme(w.themeId);
  const hidden = new Set(w.hiddenSections);
  const married = w.phase === "married";

  const style = {
    "--w-bg": theme.colors.bg,
    "--w-surface": theme.colors.surface,
    "--w-ink": theme.colors.ink,
    "--w-muted": theme.colors.muted,
    "--w-accent": theme.colors.accent,
    "--w-accent-ink": theme.colors.accentInk,
    "--w-line": theme.colors.line,
    "--w-radius": theme.radius,
    "--w-display": FONT_STACKS[theme.fonts.display],
    "--w-body": FONT_STACKS[theme.fonts.body],
    "--w-display-weight": theme.fonts.displayWeight,
  } as CSSProperties;

  const show = {
    story: !hidden.has("story") && Boolean(w.story || w.guestMessage || w.announcement),
    schedule: !hidden.has("schedule") && w.events.length > 0,
    gallery: !hidden.has("gallery") && w.gallery.length > 0,
    rsvp: !hidden.has("rsvp") && (w.rsvp.open || Boolean(w.rsvp.closedReason)),
    guestbook: !hidden.has("guestbook") && w.guestbook.enabled,
    gifts: !hidden.has("gifts") && !married && Boolean(w.gifts.message || w.gifts.links.length),
    memories: !hidden.has("memories") && w.memories.length > 0,
    thankYou: married && Boolean(w.thankYouMessage),
  };

  const nav = [
    married && show.thankYou && { id: "thank-you", label: "Thank You" },
    married && show.memories && { id: "memories", label: "Our Journey" },
    show.story && { id: "story", label: "Our Story" },
    show.schedule && { id: "schedule", label: w.events.length > 1 ? "Schedule" : "Details" },
    !married && show.rsvp && { id: "rsvp", label: "RSVP" },
    show.gallery && { id: "gallery", label: "Gallery" },
    show.guestbook && { id: "guestbook", label: "Guestbook" },
    show.gifts && { id: "gifts", label: "Gifts" },
  ].filter(Boolean) as { id: string; label: string }[];

  const rsvpSection = show.rsvp && (
    <Section id="rsvp" eyebrow="Kindly reply" title="RSVP" theme={theme} tinted>
      <Reveal className="w-surface mx-auto max-w-2xl p-6 sm:p-10">
        {w.rsvp.open ? (
          <>
            {w.rsvp.deadline && <p className="w-muted mb-6 text-center text-sm">Please reply by {formatPlainDate(w.rsvp.deadline)}.</p>}
            <RsvpForm w={w} />
          </>
        ) : (
          <p className="w-muted text-center">{w.rsvp.closedReason}</p>
        )}
      </Reveal>
    </Section>
  );

  const gallerySection = show.gallery && (
    <Section id="gallery" eyebrow={married ? "Our wedding day" : "Captured moments"} title="Gallery" theme={theme}>
      <Gallery images={w.gallery} />
    </Section>
  );

  return (
    <div id="top" style={style} className="w-page flex-1">
      {w.mode !== "live" && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-[#101C35] px-4 py-2.5 text-center text-xs text-[#FAF7F0] sm:text-sm">
          {w.mode === "sample"
            ? "This is a sample wedding page. Create your own in a few minutes."
            : "Preview: only you can see this page until you publish it."}
        </div>
      )}
      <SiteNav monogram={w.monogram} items={nav} />
      <main id="main">
        <Hero w={w} theme={theme} />

        {married ? (
          <>
            {show.thankYou && <ThankYouSection w={w} theme={theme} />}
            {show.memories && <MemoriesSection w={w} theme={theme} />}
            {gallerySection}
            {show.story && <StorySection w={w} theme={theme} />}
            {show.schedule && <ScheduleSection w={w} theme={theme} now={now} />}
          </>
        ) : (
          <>
            {show.story && <StorySection w={w} theme={theme} />}
            {show.schedule && <ScheduleSection w={w} theme={theme} now={now} />}
            {rsvpSection}
            {gallerySection}
            {show.memories && <MemoriesSection w={w} theme={theme} />}
            {show.gifts && <GiftsSection w={w} theme={theme} />}
          </>
        )}

        {show.guestbook && (
          <Section id="guestbook" eyebrow="Leave your love" title="Guestbook" theme={theme} tinted={married}>
            <GuestbookPanel w={w} inviteToken={inviteToken} />
          </Section>
        )}

        <Section id="share" eyebrow="Spread the word" title="Share" theme={theme}>
          <ShareSection w={w} />
        </Section>
      </main>
      <Footer w={w} theme={theme} />
    </div>
  );
}
