import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { GuestForm, GuestList, ImportGuests, type GuestView } from "@/components/dashboard/guests";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/env";
import { getOccasion } from "@/lib/occasions";
import { listEvents } from "@/server/events";
import { listGuests } from "@/server/guests";
import { listRsvps } from "@/server/rsvp";
import { loadDashboard, whatsappInvite, whatsappReminder } from "../data";
import { PageSkeleton } from "@/components/dashboard/skeleton";

export const metadata: Metadata = { title: "Guests" };

export default function GuestsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Guests />
    </Suspense>
  );
}

async function Guests() {
  const { celebration: c } = await loadDashboard();
  const [guests, events, rsvps] = await Promise.all([listGuests(c.id), listEvents(c.id), listRsvps(c.id)]);
  const replyByGuest = new Map(rsvps.filter((r) => r.guestId).map((r) => [r.guestId!, r.answers.some((a) => a.attending) ? "yes" as const : "no" as const]));
  const remembrance = getOccasion(c.kind).after === "remembrance";

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
      whatsapp: whatsappInvite({ phone: g.phone, name: g.name, title: c.title, link, remembrance }),
      reminder: whatsappReminder({ phone: g.phone, name: g.name, title: c.title, link }),
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
        {views.length > 0 && (
          <Button asChild variant="outline"><a href="/dashboard/guests/export" download><Download className="h-4 w-4" aria-hidden /> Download guest list</a></Button>
        )}
      </header>

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
