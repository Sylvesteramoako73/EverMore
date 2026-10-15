"use client";

import { Camera, CameraOff, Minus, Plus, Search, UserCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { checkIn, lookupPass, type CheckInResult } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DeskGuest = { id: string; name: string; phone: string; tableName: string; maxPartySize: number; checkedInCount: number };

type Found = Extract<CheckInResult, { ok: true }>;

/**
 * The usher's desk: scan an entry pass (where the browser supports camera barcode scanning)
 * or search by name, then check the party in with the number of people who arrived.
 */
export function CheckInDesk({ guests }: { guests: DeskGuest[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const arrived = guests.reduce((n, g) => n + g.checkedInCount, 0);
  const expected = guests.reduce((n, g) => n + g.maxPartySize, 0);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return guests.filter((g) => `${g.name} ${g.phone} ${g.tableName}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [q, guests]);

  const onScan = (text: string) =>
    start(async () => {
      const r = await lookupPass(text);
      if (r.ok) {
        setSelected(r);
        setError(null);
      } else setError(r.error);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
            <p className="text-sm text-muted-foreground">Arrived</p>
            <p className="font-display text-4xl text-navy" aria-live="polite">{arrived}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
            <p className="text-sm text-muted-foreground">Invited (max)</p>
            <p className="font-display text-4xl text-navy">{expected}</p>
          </div>
        </div>

        <Scanner onScan={onScan} />

        <div>
          <label className="relative block">
            <span className="sr-only">Search by name, phone or table</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or table" className="h-14 pl-12 text-lg" />
          </label>
          {matches.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-white ring-1 ring-border">
              {matches.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected({ ok: true, ...g });
                      setError(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy">{g.name}</span>
                      <span className="block text-sm text-muted-foreground">{[g.tableName, `up to ${g.maxPartySize}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    {g.checkedInCount > 0 && <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Arrived · {g.checkedInCount}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
        {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-5 text-destructive">{error}</p>}
        {selected ? (
          <Party
            key={selected.id}
            guest={selected}
            pending={pending}
            onSave={(count) =>
              start(async () => {
                const r = await checkIn(selected.id, count);
                if (r.ok) setSelected(r);
                else setError(r.error);
              })
            }
          />
        ) : (
          !error && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-muted-foreground">
              <UserCheck className="mx-auto h-8 w-8" aria-hidden />
              <p className="mt-3">Scan a guest&apos;s entry pass or search for their name.</p>
            </div>
          )
        )}
      </aside>
    </div>
  );
}

function Party({ guest, pending, onSave }: { guest: Found; pending: boolean; onSave: (count: number) => void }) {
  const [count, setCount] = useState(guest.checkedInCount || guest.maxPartySize);
  const done = guest.checkedInCount > 0;
  return (
    <div className={cn("rounded-2xl p-6 ring-2", done ? "bg-success/5 ring-success" : "bg-white ring-navy")}>
      <p className="text-sm text-muted-foreground">{done ? "Checked in" : "Invitation for"}</p>
      <p className="mt-1 font-display text-3xl text-navy">{guest.name}</p>
      {guest.tableName && <p className="mt-2 inline-block rounded-full bg-blush px-3 py-1 text-navy">{guest.tableName}</p>}
      <p className="mt-4 text-sm text-muted-foreground">Up to {guest.maxPartySize} {guest.maxPartySize === 1 ? "person" : "people"} on this invitation</p>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" size="icon-lg" variant="outline" aria-label="One fewer" onClick={() => setCount((c) => Math.max(1, c - 1))}><Minus aria-hidden /></Button>
        <span className="w-12 text-center font-display text-4xl text-navy" aria-label={`${count} people`}>{count}</span>
        <Button type="button" size="icon-lg" variant="outline" aria-label="One more" onClick={() => setCount((c) => Math.min(50, c + 1))}><Plus aria-hidden /></Button>
      </div>
      {count > guest.maxPartySize && <p className="mt-2 text-sm text-amber-700">That&apos;s more than this invitation allows.</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" size="lg" disabled={pending} onClick={() => onSave(count)}>{done ? "Update" : "Check in"}</Button>
        {done && <Button type="button" variant="ghost" disabled={pending} onClick={() => onSave(0)}>Undo check-in</Button>}
      </div>
    </div>
  );
}

const noop = () => () => {};

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/** Camera QR scanning with the browser's built-in BarcodeDetector (Chrome on Android, recent Safari). */
function Scanner({ onScan }: { onScan: (text: string) => void }) {
  const [on, setOn] = useState(false);
  const supported = useSyncExternalStore(noop, () => "BarcodeDetector" in window, () => true);
  const [problem, setProblem] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  // Keep the latest callback without restarting the camera on every render.
  const handler = useRef(onScan);
  useEffect(() => {
    handler.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
    const detector = new Ctor({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          const text = codes[0]?.rawValue;
          // Ignore the same code for a few seconds so one pass isn't read many times.
          if (text && (text !== last.current.text || Date.now() - last.current.at > 4000)) {
            last.current = { text, at: Date.now() };
            handler.current(text);
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        setProblem("We couldn't open the camera. Allow camera access, or search by name instead.");
        setOn(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);

  if (!supported)
    return <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">This browser can&apos;t scan here. Scan passes with your phone&apos;s camera app instead: while you&apos;re signed in, the guest&apos;s page shows a Check in button. Or search by name below.</p>;

  return (
    <div className="space-y-3">
      {on && <video ref={video} muted playsInline className="aspect-video w-full rounded-2xl bg-black object-cover" />}
      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      <Button type="button" variant={on ? "outline" : "default"} size="lg" onClick={() => { setProblem(null); setOn((o) => !o); }}>
        {on ? <CameraOff aria-hidden /> : <Camera aria-hidden />} {on ? "Stop scanning" : "Scan entry passes"}
      </Button>
    </div>
  );
}
