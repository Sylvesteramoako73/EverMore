import { ArrowRight, BookOpen, Camera, Download, Eye, MailCheck, MessageSquareHeart, Printer, QrCode, Tv, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CopyButton } from "@/components/dashboard/bits";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { getOccasion } from "@/lib/occasions";
import { formatLongDate, formatTime } from "@/lib/dates";
import { listEvents } from "@/server/events";
import { eventTotals, listRsvps, rsvpSummary } from "@/server/rsvp";
import { listMedia } from "@/server/media";
import { loadDashboard, recentViews, waitingCounts } from "./data";

export default function DashboardHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { user, celebration: c, pageUrl } = await loadDashboard();
  const occasion = getOccasion(c.kind);
  const [summary, totals, views, waiting, rsvps, events, photos] = await Promise.all([
    rsvpSummary(c.id),
    eventTotals(c.id),
    recentViews(c.id),
    waitingCounts(c.id),
    listRsvps(c.id),
    listEvents(c.id),
    listMedia(c.id),
  ]);
  const live = c.status === "published";
  const maxViews = Math.max(1, ...views.days.map((d) => d.views));
  const last30 = views.days.reduce((n, d) => n + d.views, 0);
  const remembrance = occasion.after === "remembrance";

  const steps = [
    { done: events.length > 0, label: "Add the programme and venues", href: "/onboarding?step=3" },
    { done: photos.length >= 3, label: "Add a few photos", href: "/dashboard/photos" },
    { done: live, label: "Publish your page", href: "/onboarding?step=6" },
    { done: summary.invitations > 0, label: "Add your guest list for personal invitation links", href: "/dashboard/guests" },
    { done: summary.replies > 0 || views.total > 0, label: "Share your link on WhatsApp", href: "#share" },
  ];
  const todo = steps.filter((s) => !s.done);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{occasion.label}</p>
        <h1 className="mt-2 text-4xl text-navy sm:text-5xl">Welcome back, {user.name.split(" ")[0]}</h1>
      </header>

      {!live && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-navy">Your page isn&apos;t live yet</p>
            <p className="text-sm text-muted-foreground">Only you can see it. Publish when you&apos;re ready to share it with guests.</p>
          </div>
          <Button asChild><Link href="/onboarding?step=6">Review &amp; publish</Link></Button>
        </div>
      )}

      {/* Share */}
      <section id="share" aria-labelledby="share-h" className="grid gap-6 rounded-2xl bg-navy p-6 text-ivory sm:p-8 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h2 id="share-h" className="text-2xl">Share your page</h2>
          <p className="mt-1 text-sm text-ivory/70">Post it on WhatsApp and social media, or print the QR code on cards and programmes.</p>
          <p className="mt-5 truncate rounded-lg bg-white/10 px-4 py-3 font-mono text-sm">{pageUrl}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={pageUrl} variant="default" className="bg-champagne text-navy hover:bg-[#d3a95c]" />
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory">
              <a href={`https://wa.me/?text=${encodeURIComponent(`${remembrance ? "Details for" : "You're invited:"} ${c.title} ${pageUrl}`)}`} target="_blank" rel="noopener">
                Share on WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory">
              <a href={`/${c.slug}/qr?format=png&download=1`}><Download className="h-4 w-4" aria-hidden /> QR code</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory">
              <a href={`/${c.slug}/card`} target="_blank" rel="noopener"><Printer className="h-4 w-4" aria-hidden /> Printable card</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory">
              <a href={`/${c.slug}/programme`} target="_blank" rel="noopener"><BookOpen className="h-4 w-4" aria-hidden /> {remembrance ? "Funeral brochure" : "Programme booklet"}</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory">
              <a href={`/${c.slug}/live`} target="_blank" rel="noopener"><Tv className="h-4 w-4" aria-hidden /> Slideshow for the venue</a>
            </Button>
          </div>
        </div>
        {live && (
          // eslint-disable-next-line @next/next/no-img-element -- generated SVG from our own route
          <img src={`/${c.slug}/qr?color=navy&size=400`} alt="QR code for your page" className="hidden h-36 w-36 rounded-xl bg-white p-2 lg:block" />
        )}
      </section>

      {/* Numbers */}
      <section aria-label="At a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Eye} label="Page views" value={last30} note={`last 30 days · ${views.total} in total`} />
        <Stat icon={MailCheck} label={remembrance ? "Attending" : "Coming"} value={summary.people} note={`${summary.attending} yes · ${summary.declined} no`} href="/dashboard/rsvps" />
        <Stat icon={Users} label="Invitations" value={summary.invitations} note={summary.invitations ? `${summary.pending} haven't replied yet` : "Add your guest list"} href="/dashboard/guests" />
        <Stat
          icon={waiting.photos ? Camera : MessageSquareHeart}
          label="Waiting for you"
          value={waiting.photos + waiting.messages}
          note={`${waiting.photos} photo${waiting.photos === 1 ? "" : "s"} · ${waiting.messages} message${waiting.messages === 1 ? "" : "s"} to approve`}
          href={waiting.photos ? "/dashboard/photos" : "/dashboard/messages"}
          highlight={waiting.photos + waiting.messages > 0}
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Per event */}
        <section aria-labelledby="events-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <div className="flex items-center justify-between gap-4">
            <h2 id="events-h" className="text-2xl text-navy">Replies by event</h2>
            <Link href="/dashboard/rsvps" className="text-sm text-champagne-deep hover:underline">All replies</Link>
          </div>
          {totals.length ? (
            <ul className="mt-5 divide-y divide-border">
              {totals.map((t) => (
                <li key={t.eventId} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{formatLongDate(t.startsAt, c.timezone)} · {formatTime(t.startsAt, c.timezone)}</p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-right text-sm">
                    <span><span className="block text-xl font-semibold text-navy">{t.guests}</span><span className="text-xs text-muted-foreground">people</span></span>
                    <span><span className="block text-xl font-semibold text-success">{t.yes}</span><span className="text-xs text-muted-foreground">yes</span></span>
                    <span><span className="block text-xl font-semibold text-muted-foreground">{t.no}</span><span className="text-xs text-muted-foreground">no</span></span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Add events to your programme to collect replies for each one. <Link className="text-champagne-deep underline" href="/onboarding?step=3">Add events</Link></p>
          )}
        </section>

        {/* Views chart */}
        <section aria-labelledby="views-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <h2 id="views-h" className="text-2xl text-navy">Visits</h2>
          <p className="text-sm text-muted-foreground">Daily page views, last 30 days</p>
          <div className="mt-6 flex h-32 items-end gap-[3px]" role="img" aria-label={`${last30} views in the last 30 days`}>
            {views.days.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.views}`} className="flex-1 rounded-t-sm bg-champagne/70" style={{ height: `${Math.max(3, (d.views / maxViews) * 100)}%`, opacity: d.views ? 1 : 0.25 }} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Latest replies */}
        <section aria-labelledby="latest-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <h2 id="latest-h" className="text-2xl text-navy">Latest replies</h2>
          {rsvps.length ? (
            <ul className="mt-4 divide-y divide-border">
              {rsvps.slice(0, 5).map((r) => {
                const yes = r.answers.some((a) => a.attending);
                const people = Math.max(0, ...r.answers.filter((a) => a.attending).map((a) => a.partySize));
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy">{r.name}</p>
                      {r.message && <p className="truncate text-sm text-muted-foreground">&ldquo;{r.message}&rdquo;</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${yes ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {yes ? `Coming${people > 1 ? ` · ${people}` : ""}` : "Can't come"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No replies yet. They&apos;ll appear here as guests RSVP.</p>
          )}
        </section>

        {/* Next steps */}
        <section aria-labelledby="next-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
          <h2 id="next-h" className="text-2xl text-navy">{todo.length ? "Next steps" : "You're all set"}</h2>
          <ul className="mt-4 space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${s.done ? "border-success bg-success text-white" : "border-border"}`} aria-hidden>
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-sm ${s.done ? "text-muted-foreground line-through" : "text-navy"}`}>{s.label}</span>
                  {!s.done && <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
                  <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" aria-hidden /> Printed QR codes keep working even if you change your page address.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  href,
  highlight = false,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  note: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${highlight ? "text-champagne-deep" : "text-muted-foreground"}`} aria-hidden />
      </div>
      <p className="mt-2 font-display text-4xl text-navy">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </>
  );
  const cls = `block rounded-2xl bg-white p-5 ring-1 ${highlight ? "ring-champagne" : "ring-border"}`;
  return href ? <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}
