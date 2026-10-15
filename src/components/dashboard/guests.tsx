"use client";

import { Check, MessageCircle, MoreHorizontal, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { importGuestList, newInviteLink, removeGuest, saveGuest, setInvitationSent } from "@/app/actions/dashboard";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validation";
import { CopyButton } from "./bits";

export type GuestView = {
  id: string;
  name: string;
  email: string;
  phone: string;
  maxPartySize: number;
  notes: string;
  eventIds: string[];
  sent: boolean;
  reply: "yes" | "no" | null;
  link: string;
  whatsapp: string;
};
export type EventOption = { id: string; name: string };

export function GuestForm({ guest, events, onDone }: { guest?: GuestView; events: EventOption[]; onDone?: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await saveGuest(guest?.id ?? null, prev, fd);
    if (r?.ok) onDone?.();
    return r;
  }, undefined);
  const e = state?.errors ?? {};
  const v = state?.ok ? {} : (state?.values ?? {});
  // Remount the fields after a successful add so the form clears.
  const [round, setRound] = useState(0);
  return (
    <form
      action={async (fd) => {
        await action(fd);
        if (!guest) setRound((n) => n + 1);
      }}
      className="space-y-4"
      noValidate
    >
      <FormAlert state={state} />
      <div key={round} className="space-y-4">
        <Field label="Name or household" hint='e.g. "Auntie Esi & family"' errors={e.name}>
          <Input name="name" defaultValue={v.name ?? guest?.name ?? ""} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" optional hint="For WhatsApp, e.g. 024 123 4567" errors={e.phone}>
            <Input name="phone" type="tel" defaultValue={v.phone ?? guest?.phone ?? ""} />
          </Field>
          <Field label="Email" optional errors={e.email}>
            <Input name="email" type="email" defaultValue={v.email ?? guest?.email ?? ""} />
          </Field>
        </div>
        <Field label="People on this invitation" hint="Including the guest. They can't reply for more than this." errors={e.maxPartySize}>
          <Input name="maxPartySize" type="number" min={1} max={20} defaultValue={v.maxPartySize ?? guest?.maxPartySize ?? 2} className="w-28" />
        </Field>
        {events.length > 1 && (
          <fieldset>
            <legend className="text-sm font-medium text-navy">Invited to</legend>
            <p className="text-[0.8rem] text-muted-foreground">Leave all unticked to invite them to everything.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {events.map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm">
                  <input type="checkbox" name="eventIds" value={ev.id} defaultChecked={guest?.eventIds.includes(ev.id)} className="accent-[var(--navy)]" />
                  {ev.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Field label="Private notes" optional hint="Only you can see these." errors={e.notes}>
          <Textarea name="notes" rows={2} defaultValue={v.notes ?? guest?.notes ?? ""} />
        </Field>
      </div>
      <SubmitButton pending="Saving…">{guest ? "Save changes" : "Add guest"}</SubmitButton>
    </form>
  );
}

export function ImportGuests() {
  const [state, action] = useActionState<FormState, FormData>(importGuestList, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <p className="text-sm text-muted-foreground">
        Upload a CSV (from Excel or Google Sheets) with a <strong>Name</strong> column. Optional columns: Phone, Email, Party size.
      </p>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-white px-4 py-4 text-sm text-navy hover:border-navy">
        <Upload className="h-4 w-4" aria-hidden />
        <input type="file" name="file" accept=".csv,text/csv" required className="text-sm file:hidden" />
      </label>
      <SubmitButton pending="Importing…">Import guests</SubmitButton>
    </form>
  );
}

const FILTERS = [
  ["all", "All"],
  ["unsent", "Not sent"],
  ["waiting", "No reply"],
  ["yes", "Coming"],
  ["no", "Can't come"],
] as const;

export function GuestList({ guests, events }: { guests: GuestView[]; events: EventOption[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return guests.filter((g) => {
      if (needle && !`${g.name} ${g.phone} ${g.email}`.toLowerCase().includes(needle)) return false;
      if (filter === "unsent") return !g.sent;
      if (filter === "waiting") return g.reply === null;
      if (filter === "yes" || filter === "no") return g.reply === filter;
      return true;
    });
  }, [guests, q, filter]);

  if (!guests.length)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <p className="font-display text-2xl text-navy">No guests yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Add guests to give each household a personal invitation link. You&apos;ll see exactly who has replied, and you can send links on WhatsApp in one tap.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search guests</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" className="pl-9" />
        </label>
        <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter guests">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={cn("rounded-full px-3 py-1.5 text-sm whitespace-nowrap", filter === id ? "bg-navy text-ivory" : "bg-white text-navy ring-1 ring-border hover:ring-navy")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{shown.length} of {guests.length} invitations</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-white ring-1 ring-border">
        {shown.map((g) => <GuestItem key={g.id} guest={g} events={events} />)}
      </ul>
    </div>
  );
}

function GuestItem({ guest: g, events }: { guest: GuestView; events: EventOption[] }) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); });
  return (
    <li className={cn("p-4 sm:p-5", pending && "opacity-60")}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-navy">{g.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[g.phone, g.email].filter(Boolean).join(" · ") || "No contact details"} · up to {g.maxPartySize}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", g.reply === "yes" ? "bg-success/10 text-success" : g.reply === "no" ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-700")}>
              {g.reply === "yes" ? "Coming" : g.reply === "no" ? "Can't come" : "No reply yet"}
            </span>
            {g.sent && <span className="rounded-full bg-navy/5 px-2 py-0.5 text-navy">Invitation sent</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="bg-[#1f8f4e] text-white hover:bg-[#187540]">
            <a
              href={g.whatsapp}
              target="_blank"
              rel="noopener"
              onClick={() => { if (!g.sent) run(() => setInvitationSent(g.id, true)); }}
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
          </Button>
          <CopyButton text={g.link} />
          <div className="relative">
            <Button type="button" size="icon-sm" variant="ghost" aria-expanded={menu} aria-label={`More for ${g.name}`} onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
            {menu && (
              <div className="absolute right-0 z-10 mt-1 w-56 rounded-xl bg-white p-1 shadow-lg ring-1 ring-border" onMouseLeave={() => setMenu(false)}>
                <MenuItem onClick={() => { setEditing(true); setMenu(false); }}>Edit details</MenuItem>
                <MenuItem onClick={() => { setMenu(false); run(() => setInvitationSent(g.id, !g.sent)); }}>
                  <Check className="h-4 w-4" aria-hidden /> {g.sent ? "Mark as not sent" : "Mark as sent"}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenu(false);
                    if (window.confirm("Make a new link? The old link will stop working.")) run(() => newInviteLink(g.id));
                  }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden /> New invitation link
                </MenuItem>
                <MenuItem
                  danger
                  onClick={() => {
                    setMenu(false);
                    if (window.confirm(`Remove ${g.name}? Their reply, if any, is kept.`)) run(() => removeGuest(g.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>
      {editing && (
        <div className="mt-4 rounded-xl bg-muted/50 p-4">
          <GuestForm guest={g} events={events} onDone={() => setEditing(false)} />
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      )}
    </li>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted", danger ? "text-destructive" : "text-navy")}>
      {children}
    </button>
  );
}
