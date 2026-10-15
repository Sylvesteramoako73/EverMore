"use client";

import { Minus, Plus, Radio, Search, Ticket, UserCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { checkInFromPass } from "@/app/actions/dashboard";
import { findTable } from "@/app/actions/public";
import { formatTime } from "@/lib/dates";
import type { CelebrationView, EventView } from "./types";

/** On the day: what's happening now and what's next, refreshed every minute. */
export function HappeningNow({ w, initialNow }: { w: CelebrationView; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const at = (e: EventView) => new Date(e.startsAt).getTime();
  const end = (e: EventView) => (e.endsAt ? new Date(e.endsAt).getTime() : at(e) + 2 * 3600_000);
  const sorted = [...w.events].sort((a, b) => at(a) - at(b));
  const current = sorted.find((e) => at(e) <= now && now < end(e));
  const next = sorted.find((e) => at(e) > now);
  if (!current && !next) return null;
  return (
    <div className="sticky top-0 z-30 bg-[var(--w-band)] px-4 py-3 text-center text-sm text-[var(--w-band-ink)]" role="status" aria-live="polite">
      <span className="mr-2 inline-flex items-center gap-1.5 font-semibold tracking-wider uppercase">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--w-accent)]" aria-hidden /> Live
      </span>
      {current ? (
        <>Happening now: <strong>{current.name}</strong>{current.venueName ? ` at ${current.venueName}` : ""}</>
      ) : null}
      {current && next ? <span className="mx-2 opacity-60">·</span> : null}
      {next ? (
        <>Up next: <strong>{next.name}</strong> at {formatTime(new Date(next.startsAt), next.timezone)}</>
      ) : null}
    </div>
  );
}

/** A guest's personal entry pass: their QR code and table, shown when they open their invitation link. */
export function EntryPass({ w }: { w: CelebrationView }) {
  const inv = w.rsvp.invitation;
  if (!inv || !w.links.pass) return null;
  return (
    <div className="w-card mx-auto flex max-w-xl flex-col items-center gap-6 p-6 text-center sm:flex-row sm:text-left">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated QR from our own route */}
      <img src={w.links.pass} alt="Your entry pass QR code" width={150} height={150} className="h-[150px] w-[150px] shrink-0 rounded-lg bg-white p-2" />
      <div>
        <p className="w-eyebrow inline-flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5" aria-hidden /> Your entry pass</p>
        <p className="w-display mt-2 text-2xl">{inv.guestName}</p>
        {inv.tableName && <p className="mt-1 text-lg">Your table: <strong>{inv.tableName}</strong></p>}
        <p className="w-muted mt-2 text-sm">Show this at the entrance. A screenshot works too.</p>
      </div>
    </div>
  );
}

/** "Find your table": search the seating plan by name (only when the hosts switch it on). */
export function TableFinder({ w }: { w: CelebrationView }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ name: string; tableName: string }[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="w-card mx-auto max-w-xl p-6 sm:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResults(await findTable(w.slug, q)));
        }}
        className="flex gap-2"
        role="search"
      >
        <label htmlFor="table-q" className="sr-only">Your name</label>
        <input id="table-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your name" minLength={3} className="w-input flex-1" />
        <button type="submit" className="w-btn" disabled={pending || q.trim().length < 3}>
          <Search className="h-4 w-4" aria-hidden /> Find
        </button>
      </form>
      <div aria-live="polite" className="mt-4">
        {results && results.length === 0 && <p className="w-muted text-sm">We couldn&apos;t find that name. Try your surname, or ask an usher.</p>}
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-3 border-b border-[var(--w-line)] pb-2">
                <span>{r.name}</span>
                <strong className="w-accent">{r.tableName}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** YouTube links become an embedded player; anything else is a clear button. */
export function Livestream({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return (
    <div className="mx-auto max-w-3xl text-center">
      {yt ? (
        <div className="w-card overflow-hidden">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
            title="Livestream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      ) : null}
      <a href={url} target="_blank" rel="noopener noreferrer" className={`w-btn ${yt ? "w-btn-ghost mt-6" : ""}`}>
        <Radio className="h-4 w-4" aria-hidden /> {yt ? "Open on YouTube" : "Watch the livestream"}<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

/**
 * Shown only to the hosts and their ushers (signed-in members) when they open a guest's personal link,
 * typically by scanning the entry pass with the phone's camera app.
 */
export function UsherBar({ usher }: { usher: NonNullable<CelebrationView["usher"]> }) {
  const [count, setCount] = useState(usher.checkedInCount || usher.maxPartySize);
  const [done, setDone] = useState(usher.checkedInCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div role="region" aria-label="Check-in" className="fixed inset-x-0 bottom-0 z-[60] border-t border-black/10 bg-[#101C35] px-4 py-3 text-[#FAF7F0] shadow-2xl">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
        <UserCheck className="h-5 w-5 shrink-0 text-[#C69A4A]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{usher.name}</p>
          <p className="text-xs opacity-75">
            {[usher.tableName, done ? `Checked in · ${done}` : `Up to ${usher.maxPartySize}`].filter(Boolean).join(" · ")}
            {error && <span className="ml-2 text-[#ffb4a8]">{error}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="One fewer" onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Minus className="h-4 w-4" aria-hidden /></button>
          <span className="w-8 text-center text-xl font-semibold" aria-label={`${count} people`}>{count}</span>
          <button type="button" aria-label="One more" onClick={() => setCount((c) => Math.min(50, c + 1))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Plus className="h-4 w-4" aria-hidden /></button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await checkInFromPass(usher.slug, usher.token, count);
              if (r.ok) {
                setDone(r.checkedInCount);
                setError(null);
              } else setError(r.error);
            })
          }
          className="rounded-full bg-[#C69A4A] px-5 py-2.5 text-sm font-semibold text-[#101C35] disabled:opacity-60"
        >
          {pending ? "Saving…" : done ? "Update" : "Check in"}
        </button>
      </div>
    </div>
  );
}
