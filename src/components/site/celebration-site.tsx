import type { CSSProperties, ReactNode } from "react";
import { FONT_STACKS } from "@/app/fonts";
import { formatPlainDate } from "@/lib/dates";
import { getTheme } from "@/lib/themes";
import { Hero } from "./hero";
import { Gallery, GuestbookPanel, RsvpForm, ShareSection, SiteNav } from "./interactive";
import { Reveal } from "./live";
import {
  ClosingCard, ColoursSection, CountdownBand, Footer, GiftsSection, MemoriesSection, PartySection, RsvpContacts, SaveTheDate, Section,
  ThankYouSection, TripSection,
} from "./sections";
import { ProgrammeVariant, StoryVariant, VenuesVariant } from "./variants";
import { SharedMoments } from "./shared-moments";
import { EntryPass, HappeningNow, Livestream, TableFinder, UsherBar } from "./day";
import type { CelebrationView } from "./types";
import "./celebration.css";

/**
 * Renders any celebration page from data + theme. One component for every occasion: the theme
 * decides the look, the occasion decides the wording, the phase decides what leads.
 */
export function CelebrationSite({ w, now, inviteToken = null }: { w: CelebrationView; now: number; inviteToken?: string | null }) {
  const theme = getTheme(w.themeId);
  const hidden = new Set(w.hiddenSections);
  const after = w.phase === "after";
  const remembrance = w.occasion.after === "remembrance";

  const style = {
    "--w-bg": theme.colors.bg,
    "--w-tint": theme.colors.tint,
    "--w-surface": theme.colors.surface,
    "--w-ink": theme.colors.ink,
    "--w-muted": theme.colors.muted,
    "--w-accent": theme.colors.accent,
    "--w-accent-ink": theme.colors.accentInk,
    "--w-accent2": theme.accent2,
    "--w-line": theme.colors.line,
    "--w-band": theme.colors.band,
    "--w-band-ink": theme.colors.bandInk,
    "--w-radius": theme.radius,
    "--w-display": FONT_STACKS[theme.fonts.display],
    "--w-body": FONT_STACKS[theme.fonts.body],
    "--w-display-weight": theme.fonts.displayWeight,
  } as CSSProperties;

  const show = {
    // "Save the Date" is a wedding custom; other occasions lead straight into their story and programme.
    saveTheDate: w.occasion.kind === "wedding" && !after && w.events.length > 0 && !hidden.has("schedule"),
    story: !hidden.has("story"),
    schedule: !hidden.has("schedule") && w.events.length > 0,
    colours: !hidden.has("colours") && w.colours.length > 0,
    gallery: !hidden.has("gallery") && w.gallery.length > 0,
    rsvp: !after && !hidden.has("rsvp") && (w.rsvp.open || Boolean(w.rsvp.closedReason) || w.rsvp.contacts.length > 0),
    shared: !hidden.has("shared") && w.shared.enabled && (w.phase !== "upcoming" || w.shared.items.length > 0 || w.mode === "sample"),
    guestbook: !hidden.has("guestbook") && w.guestbook.enabled,
    gifts: !hidden.has("gifts") && !after && Boolean(w.gifts.message || w.gifts.links.length || w.gifts.funds.length),
    memories: !hidden.has("memories") && w.memories.length > 0,
    thankYou: after && Boolean(w.thankYouMessage),
    livestream: Boolean(w.livestreamUrl) && !after,
    party: !hidden.has("story") && w.facts.party.length > 0,
    tables: w.tableFinder && !after,
  };

  const nav = [
    after && show.thankYou && { id: "thank-you", label: w.occasion.copy.thankYouTitle },
    show.story && { id: "story", label: w.occasion.copy.storyTitle },
    show.schedule && { id: "programme", label: w.occasion.copy.scheduleTitle },
    show.colours && { id: "colours", label: "Colours" },
    show.rsvp && { id: "rsvp", label: "RSVP" },
    show.tables && { id: "tables", label: "Tables" },
    show.livestream && { id: "livestream", label: "Watch live" },
    show.gallery && { id: "gallery", label: "Gallery" },
    show.shared && { id: "shared", label: "Share" },
    show.guestbook && { id: "guestbook", label: w.occasion.copy.guestbookTitle },
  ].filter(Boolean) as { id: string; label: string }[];

  const rsvp = show.rsvp && (
    <Section
      id="rsvp"
      eyebrow="RSVP"
      title={w.rsvp.deadline ? `Kindly reply by ${formatPlainDate(w.rsvp.deadline, "short")}` : "Kindly reply"}
      theme={theme}
      tone="tint"
    >
      <Reveal className="w-card mx-auto max-w-2xl p-6 sm:p-10">
        {w.rsvp.open ? <RsvpForm w={w} /> : w.rsvp.closedReason ? <p className="w-muted text-center">{w.rsvp.closedReason}</p> : null}
        <RsvpContacts w={w} />
      </Reveal>
      {w.rsvp.invitation && <div className="mt-8"><EntryPass w={w} /></div>}
    </Section>
  );

  const livestream = show.livestream && (
    <Section id="livestream" eyebrow="Can't be there?" title="Watch Live" theme={theme}>
      <Livestream url={w.livestreamUrl} />
    </Section>
  );

  const tables = show.tables && (
    <Section id="tables" eyebrow="Seating" title="Find Your Table" theme={theme} tone="tint">
      <TableFinder w={w} />
    </Section>
  );

  const gallery = show.gallery && (
    <Section id="gallery" eyebrow={after ? "On the day" : "Captured moments"} title="Gallery" theme={theme}>
      <Gallery images={w.gallery} layout={theme.layout.gallery} />
    </Section>
  );

  const shared = show.shared && (
    <Section id="shared" eyebrow="Share the love" title={after ? "Shared Moments" : "Capture the Moments"} theme={theme} tone="tint">
      <SharedMoments w={w} inviteToken={inviteToken} />
    </Section>
  );

  const guestbook = show.guestbook && (
    <Section id="guestbook" eyebrow={remembrance ? "In loving memory" : "Leave your love"} title={w.occasion.copy.guestbookTitle} theme={theme}>
      <GuestbookPanel w={w} inviteToken={inviteToken} />
    </Section>
  );

  let body: ReactNode;
  if (after) {
    body = (
      <>
        {show.thankYou && <ThankYouSection w={w} theme={theme} />}
        {shared}
        {gallery}
        {show.memories && <MemoriesSection w={w} theme={theme} />}
        {show.story && <StoryVariant w={w} theme={theme} />}
        {show.party && <PartySection w={w} theme={theme} />}
        {show.schedule && <ProgrammeVariant w={w} theme={theme} now={now} />}
        {guestbook}
      </>
    );
  } else {
    body = (
      <>
        {show.saveTheDate && <SaveTheDate w={w} />}
        {show.story && <StoryVariant w={w} theme={theme} />}
        {show.party && <PartySection w={w} theme={theme} />}
        {show.schedule && <ProgrammeVariant w={w} theme={theme} now={now} />}
        {show.schedule && <VenuesVariant w={w} theme={theme} />}
        {show.colours && <ColoursSection w={w} theme={theme} />}
        {w.occasion.kind === "outing" && <TripSection w={w} theme={theme} />}
        {w.phase === "today" && tables}
        {w.phase === "today" && livestream}
        {rsvp}
        {w.phase !== "today" && tables}
        {w.phase !== "today" && livestream}
        {!remembrance && <CountdownBand w={w} theme={theme} />}
        {gallery}
        {show.memories && <MemoriesSection w={w} theme={theme} />}
        {shared}
        {guestbook}
        {show.gifts && <GiftsSection w={w} theme={theme} inviteToken={inviteToken} />}
      </>
    );
  }

  return (
    <div id="top" style={style} data-photo={theme.photo} data-card={theme.layout.card} data-texture={theme.layout.texture} className="w-page flex-1">
      {w.mode !== "live" && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-[#101C35] px-4 py-2.5 text-center text-xs text-[#FAF7F0] sm:text-sm">
          {w.mode === "sample" ? "This is a sample page. Create your own in a few minutes." : "Preview: only you can see this page until you publish it."}
        </div>
      )}
      <SiteNav monogram={w.monogram} items={nav} darkHero={["cinematic", "framed", "editorial", "bordered"].includes(theme.hero)} />
      <main id="main">
        <Hero w={w} theme={theme} />
        {w.phase === "today" && <HappeningNow w={w} initialNow={now} />}
        {body}
        <ClosingCard w={w} theme={theme} />
        <section aria-label="Share this page" className="px-5 pb-20">
          <ShareSection w={w} />
        </section>
      </main>
      <Footer w={w} />
      {w.usher && <UsherBar usher={w.usher} />}
    </div>
  );
}
