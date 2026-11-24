import type { Metadata } from "next";
import { Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GuestForm, GuestList, ImportGuests, type GuestView } from "@/components/dashboard/guests";
import { ReplyQueue } from "@/components/dashboard/reply-queue";
import { EventReminderList } from "@/components/dashboard/event-reminders";
import { reminderDayFor } from "@/server/guest-reminders";
import { formatLongDate, formatTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/env";
import { getOccasion } from "@/lib/occasions";
import { listEvents } from "@/server/events";
import { listGuests } from "@/server/guests";
import { listRsvps } from "@/server/rsvp";
import { loadDashboard, parseLang, whatsappInvite, whatsappReminder, whatsappEventReminder } from "../data";
import { PageSkeleton } from "@/components/dashboard/skeleton";

export const metadata: Metadata = { title: "Guests" };

export default function GuestsPage(props: PageProps<"/dashboard/guests">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Guests {...props} />
    </Suspense>
  );
}

async function Guests({ searchParams }: PageProps<"/dashboard/guests">) {
  const [{ celebration: c }, sp] = await Promise.all([loadDashboard(), searchParams]);
  const lang = parseLang(sp.lang);
  const [guests, events, rsvps] = await Promise.all([listGuests(c.id), listEvents(c.id), listRsvps(c.id)]);
  const replyByGuest = new Map(rsvps.filter((r) => r.guestId).map((r) => [r.guestId!, r.answers.some((a) => a.attending) ? "yes" as const : "no" as const]));
  const remembrance = getOccasion(c.kind).after === "remembrance";
  const deadline = c.rsvpDeadline ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${c.rsvpDeadline}T12:00:00Z`)) : null;

  // Events due a reminder today (3 days away, or today): guests with no email get a one tap WhatsApp instead.
  const due = events.map((e) => ({ e, days: reminderDayFor(e.startsLocal, e.timezone, new Date()) })).filter((x) => x.days !== null).sort((a, b) => a.e.startsAt.getTime() - b.e.startsAt.getTime())[0];

  const views: GuestView[] = guests.map((g) => {
    const link = appUrl(`/${c.slug}?invite=${g.inviteToken}`);
    return {
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      maxPartySize: g.maxPartySize,
      notes: g.notes,
      eventIds: g.eventIds,
      sent: Boolean(g.invitationSentAt),
      reply: replyByGuest.get(g.id) ?? null,
      link,
      whatsapp: whatsappInvite({ phone: g.phone, name: g.name, title: c.title, link, remembrance, lang }),
      reminder: whatsappReminder({ phone: g.phone, name: g.name, title: c.title, link, deadline, remembrance, lang }),
      remindedAt: g.remindedAt ? g.remindedAt.toISOString() : null,
      remindCount: g.reminderCount,
      tableName: g.tableName,
      checkedIn: g.checkedInCount,
    };
  });
  const options = events.map((e) => ({ id: e.id, name: e.name }));
  const sent = views.filter((v) => v.sent).length;
  const replied = views.filter((v) => v.reply).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl text-navy">Guests</h1>
          <p className="mt-1 text-muted-foreground">
            {views.length} invitation{views.length === 1 ? "" : "s"} · {sent} sent · {replied} replied
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Language of WhatsApp messages" className="inline-flex overflow-hidden rounded-full ring-1 ring-border">
            <Link href="/dashboard/guests" aria-current={lang === "en" ? "true" : undefined} className={`px-3 py-1.5 text-sm ${lang === "en" ? "bg-navy text-white" : "bg-white text-navy"}`}>English</Link>
            <Link href="/dashboard/guests?lang=tw" aria-current={lang === "tw" ? "true" : undefined} className={`px-3 py-1.5 text-sm ${lang === "tw" ? "bg-navy text-white" : "bg-white text-navy"}`}>Twi</Link>
          </div>
        {views.length > 0 && (
          <Button asChild variant="outline"><a href="/dashboard/guests/export" download><Download className="h-4 w-4" aria-hidden /> Download guest list</a></Button>
        )}
        </div>
      </header>

      {due && c.guestRemindersEnabled && (
        <EventReminderList
          eventName={due.e.name}
          days={due.days!}
          guests={views
            .filter((g) => g.phone && !g.email && g.reply !== "no")
            .map((g) => ({
              id: g.id,
              name: g.name,
              href: whatsappEventReminder({
                phone: g.phone,
                name: g.name,
                title: c.title,
                eventName: due.e.name,
                when: `${formatLongDate(due.e.startsAt, due.e.timezone)}, ${formatTime(due.e.startsAt, due.e.timezone)}`,
                link: g.link,
                days: due.days!,
                remembrance,
                lang,
              }),
              remindedAt: g.remindedAt,
            }))}
        />
      )}
      <ReplyQueue guests={views} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GuestList guests={views} events={options} />
        <aside className="space-y-6">
          <section aria-labelledby="add-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
            <h2 id="add-h" className="mb-4 text-2xl text-navy">Add a guest</h2>
            <GuestForm events={options} />
          </section>
          <section aria-labelledby="import-h" className="rounded-2xl bg-white p-6 ring-1 ring-border">
            <h2 id="import-h" className="mb-3 text-2xl text-navy">Import a list</h2>
            <ImportGuests />
          </section>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Each guest gets a personal link. It lets them reply for up to the number of people you set, and only for the events they&apos;re invited to.
            If a link is shared by mistake, make a new one from the guest&apos;s menu.
          </p>
        </aside>
      </div>
    </div>
  );
}
