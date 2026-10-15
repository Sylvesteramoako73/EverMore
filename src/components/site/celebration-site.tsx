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
import { darkHeroFor, Frame, type Block } from "./frames";
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
    // The date-and-calendar section; its heading comes from the occasion ("Save the Date" only for weddings).
    saveTheDate: !after && !remembrance && w.events.length > 0 && !hidden.has("schedule"),
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

  // The page as an ordered list of blocks. Each design's frame arranges them its own way.
  const B = (id: string, node: ReactNode, label?: string): Block | null => (node ? { id, node, label } : null);
  const blocks = (
    after
      ? [
          B("thank-you", show.thankYou && <ThankYouSection w={w} theme={theme} />, w.occasion.copy.thankYouTitle),
          B("shared", shared, "Shared moments"),
          B("gallery", gallery, "Gallery"),
          B("memories", show.memories && <MemoriesSection w={w} theme={theme} />, "Memories"),
          B("story", show.story && <StoryVariant w={w} theme={theme} />, w.occasion.copy.storyTitle),
          B("party", show.party && <PartySection w={w} theme={theme} />, w.facts.partyTitle),
          B("programme", show.schedule && <ProgrammeVariant w={w} theme={theme} now={now} />, w.occasion.copy.scheduleTitle),
          B("guestbook", guestbook, w.occasion.copy.guestbookTitle),
        ]
      : [
          B("date", show.saveTheDate && <SaveTheDate w={w} theme={theme} />),
          B("story", show.story && <StoryVariant w={w} theme={theme} />, w.occasion.copy.storyTitle),
          B("party", show.party && <PartySection w={w} theme={theme} />, w.facts.partyTitle),
          B("programme", show.schedule && <ProgrammeVariant w={w} theme={theme} now={now} />, w.occasion.copy.scheduleTitle),
          B("venues", show.schedule && <VenuesVariant w={w} theme={theme} />, "Venues"),
          B("colours", show.colours && <ColoursSection w={w} theme={theme} />, "Colours"),
          B("trip", w.occasion.kind === "outing" && <TripSection w={w} theme={theme} />, "Good to know"),
          B("tables-now", w.phase === "today" && tables, "Tables"),
          B("livestream-now", w.phase === "today" && livestream, "Watch live"),
          B("rsvp", rsvp, "RSVP"),
          B("tables", w.phase !== "today" && tables, "Tables"),
          B("livestream", w.phase !== "today" && livestream, "Watch live"),
          B("countdown", !remembrance && <CountdownBand w={w} theme={theme} />),
          B("gallery", gallery, "Gallery"),
          B("memories", show.memories && <MemoriesSection w={w} theme={theme} />, "Memories"),
          B("shared", shared, "Share"),
          B("guestbook", guestbook, w.occasion.copy.guestbookTitle),
          B("gifts", show.gifts && <GiftsSection w={w} theme={theme} inviteToken={inviteToken} />, w.occasion.kind === "funeral" ? "Donations" : "Gifts"),
        ]
  ).filter((b): b is Block => Boolean(b));

  const ownNav = theme.frame === "index" || theme.frame === "booklet";

  return (
    <div id="top" style={style} data-frame={theme.frame} data-photo={theme.photo} data-card={theme.layout.card} data-texture={theme.layout.texture} className="w-page flex-1">
      {w.mode !== "live" && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-[#101C35] px-4 py-2.5 text-center text-xs text-[#FAF7F0] sm:text-sm">
          {w.mode === "sample" ? "This is a sample page. Create your own in a few minutes." : "Preview: only you can see this page until you publish it."}
        </div>
      )}
      {!ownNav && <SiteNav monogram={w.monogram} items={nav} darkHero={darkHeroFor(theme)} />}
      <Frame
        w={w}
        theme={theme}
        now={now}
        nav={nav}
        blocks={blocks}
        hero={<Hero w={w} theme={theme} />}
        live={w.phase === "today" ? <HappeningNow w={w} initialNow={now} /> : null}
        closing={
          <>
            <ClosingCard w={w} theme={theme} />
            <section aria-label="Share this page" className="w-feature px-5 pb-20">
              <ShareSection w={w} />
            </section>
          </>
        }
      />
      <Footer w={w} />
      {w.usher && <UsherBar usher={w.usher} />}
    </div>
  );
}
