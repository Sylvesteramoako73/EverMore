"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { setGuestReminded } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuestView } from "./guests";

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

function history(g: GuestView) {
  if (!g.remindedAt || g.remindCount === 0) return "Not reminded yet";
  const times = g.remindCount === 1 ? "once" : `${g.remindCount} times`;
  return `Reminded ${times}, last on ${day.format(new Date(g.remindedAt))}`;
}

/** Guests who were invited but have not replied, with a one tap WhatsApp nudge that remembers who was nudged. */
export function ReplyQueue({ guests }: { guests: GuestView[] }) {
  const waiting = guests.filter((g) => g.sent && g.reply === null);
  if (waiting.length === 0) return null;
  const reachable = waiting.filter((g) => g.phone);
  const noPhone = waiting.length - reachable.length;
  // Least recently nudged first, so the people who have heard nothing come to the top.
  const ordered = [...reachable].sort((a, b) => (a.remindedAt ?? "").localeCompare(b.remindedAt ?? ""));
  return (
    <section aria-labelledby="waiting-heading" className="rounded-2xl bg-white p-5 ring-1 ring-border sm:p-6">
      <h2 id="waiting-heading" className="font-display text-xl text-navy">Waiting for a reply</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {waiting.length} {waiting.length === 1 ? "guest has" : "guests have"} not answered yet. One tap opens WhatsApp with a friendly nudge ready to send.
      </p>
      {ordered.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {ordered.map((g) => <QueueRow key={g.id} guest={g} />)}
        </ul>
      )}
      {noPhone > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {noPhone} {noPhone === 1 ? "guest has" : "guests have"} no phone number saved, so there is nothing to message. Add one from their details.
        </p>
      )}
    </section>
  );
}

function QueueRow({ guest: g }: { guest: GuestView }) {
  const [pending, start] = useTransition();
  return (
    <li className={cn("flex flex-wrap items-center gap-3 py-3", pending && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy">{g.name}</p>
        <p className="text-sm text-muted-foreground">{history(g)}</p>
      </div>
      <Button asChild size="sm" className="bg-[#1f8f4e] text-white hover:bg-[#187540]">
        <a href={g.reminder} target="_blank" rel="noopener" onClick={() => start(async () => { await setGuestReminded(g.id); })}>
          <MessageCircle className="h-4 w-4" aria-hidden /> Remind on WhatsApp
        </a>
      </Button>
    </li>
  );
}
