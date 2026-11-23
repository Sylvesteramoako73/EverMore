"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { setGuestReminded } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; href: string; remindedAt: string | null };

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

/** Shown only on the two days a reminder is due. Guests with an email already get one automatically; this is for those without. */
export function EventReminderList({ eventName, days, guests }: { eventName: string; days: 0 | 3; guests: Item[] }) {
  if (guests.length === 0) return null;
  return (
    <section aria-labelledby="event-reminders-h" className="rounded-2xl bg-white p-5 ring-1 ring-champagne sm:p-6">
      <h2 id="event-reminders-h" className="font-display text-xl text-navy">
        {days === 0 ? `Today: ${eventName}` : `${eventName} is in 3 days`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Guests with an email are reminded automatically. These guests have only a phone number, so one tap opens WhatsApp with the reminder ready to send.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {guests.map((g) => <Row key={g.id} item={g} />)}
      </ul>
    </section>
  );
}

function Row({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  return (
    <li className={cn("flex flex-wrap items-center gap-3 py-3", pending && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy">{item.name}</p>
        {item.remindedAt && <p className="text-sm text-muted-foreground">Last reminded on {day.format(new Date(item.remindedAt))}</p>}
      </div>
      <Button asChild size="sm" className="bg-[#1f8f4e] text-white hover:bg-[#187540]">
        <a href={item.href} target="_blank" rel="noopener" onClick={() => start(async () => { await setGuestReminded(item.id); })}>
          <MessageCircle className="h-4 w-4" aria-hidden /> Remind on WhatsApp
        </a>
      </Button>
    </li>
  );
}
