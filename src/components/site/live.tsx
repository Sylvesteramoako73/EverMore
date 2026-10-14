"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { calendarDuration, describeDuration, plainDateInZone } from "@/lib/dates";

// ───────────────────────────── Shared one-second clock
// The server snapshot is null, so the server renders placeholders and hydration never disagrees.

const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => now || Date.now(), () => null);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown. Never shows negative values: once the moment passes it shows `after`. */
export function Countdown({
  to,
  after,
  tone = "light",
  look = "boxes",
}: {
  to: string;
  after: ReactNode;
  tone?: "light" | "dark";
  look?: "boxes" | "big" | "circles";
}) {
  const current = useNow();
  const target = Date.parse(to);
  if (current !== null && current >= target) return <>{after}</>;
  const diff = current === null ? null : target - current;
  const units = [
    ["Days", diff === null ? "–" : String(Math.floor(diff / 86_400_000))],
    ["Hours", diff === null ? "–" : pad(Math.floor(diff / 3_600_000) % 24)],
    ["Minutes", diff === null ? "–" : pad(Math.floor(diff / 60_000) % 60)],
    ["Seconds", diff === null ? "–" : pad(Math.floor(diff / 1000) % 60)],
  ];
  if (look === "big") {
    return (
      <div role="timer" aria-label="Time until the celebration" className="grid grid-cols-4 gap-3 sm:gap-8">
        {units.map(([label, value]) => (
          <div key={label} className="text-center">
            <span className="w-display block text-[clamp(3rem,11vw,7.5rem)] leading-none tabular-nums">{value}</span>
            <span className="mt-2 block text-[0.65rem] font-semibold tracking-[0.3em] uppercase opacity-80">{label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (look === "circles") {
    return (
      <div role="timer" aria-label="Time until the celebration" className="flex flex-wrap justify-center gap-3 sm:gap-5">
        {units.map(([label, value], i) => (
          <div
            key={label}
            className="grid h-20 w-20 place-items-center rounded-full border-2 text-center sm:h-28 sm:w-28"
            style={{ borderColor: i % 2 ? "var(--w-accent2)" : "var(--w-accent)" }}
          >
            <span>
              <span className="w-display block text-2xl leading-none tabular-nums sm:text-4xl">{value}</span>
              <span className="mt-1 block text-[0.55rem] tracking-[0.2em] uppercase opacity-80">{label}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  const box =
    tone === "light"
      ? "border-white/30 bg-white/10 text-white backdrop-blur-sm"
      : "border-[var(--w-line)] bg-[var(--w-surface)] text-[var(--w-ink)]";
  return (
    <div role="timer" aria-label="Time until the celebration" className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map(([label, value]) => (
        <div key={label} className={`min-w-[4.2rem] rounded-[max(var(--w-radius),4px)] border px-2 py-3 text-center sm:min-w-[5.5rem] ${box}`}>
          <span className="w-display block text-3xl tabular-nums sm:text-4xl">{value}</span>
          <span className="mt-1 block text-[0.6rem] tracking-[0.22em] uppercase opacity-80">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** "Married for 1 year, 4 months and 12 days", computed from today's date in the couple's timezone. */
export function MarriedFor({ since, timezone, prefix = "Married for" }: { since: string; timezone: string; prefix?: string }) {
  const current = useNow();
  if (current === null) return <span className="opacity-0">{prefix}</span>;
  const today = plainDateInZone(new Date(current), timezone);
  return (
    <span>
      {prefix} {describeDuration(calendarDuration(since, today))}
    </span>
  );
}

/** Fades its children in when scrolled into view (CSS keeps content visible without JS or with reduced motion). */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "section" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error -- ref type differs per tag but all are HTMLElements
    <Tag ref={ref} className={`w-reveal ${className}`}>
      {children}
    </Tag>
  );
}
