import Link from "next/link";
import { cn } from "@/lib/utils";

/** EverMore wordmark: an interlocking-rings mark and the name in the display serif. */
export function Logo({ href = "/", className, inverted = false }: { href?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="EverMore home">
      <svg viewBox="0 0 40 28" className="h-6 w-auto" aria-hidden>
        <circle cx="14" cy="14" r="10" fill="none" stroke="var(--champagne)" strokeWidth="2" />
        <circle cx="26" cy="14" r="10" fill="none" stroke={inverted ? "var(--ivory)" : "var(--navy)"} strokeWidth="2" />
      </svg>
      <span className={cn("font-display text-[1.35rem] leading-none tracking-tight", inverted ? "text-ivory" : "text-navy")}>
        Ever<span className="text-champagne italic">More</span>
      </span>
    </Link>
  );
}
