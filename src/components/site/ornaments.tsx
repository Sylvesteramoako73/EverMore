import type { Ornament } from "@/lib/themes";

// Decorative motifs, drawn in the theme accent colour. All are aria-hidden.

export function OrnamentDivider({ kind, className = "" }: { kind: Ornament; className?: string }) {
  const common = { className: `mx-auto h-6 w-auto text-[var(--w-accent)] ${className}`, "aria-hidden": true } as const;
  switch (kind) {
    case "none":
      return null;
    case "rule":
      return <span aria-hidden className={`block h-px w-24 bg-[var(--w-accent)] ${className}`} />;
    case "botanical":
      return (
        <svg viewBox="0 0 160 24" {...common} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M8 12h52M100 12h52" opacity=".6" />
          <path d="M80 4c-6 4-6 12 0 16 6-4 6-12 0-16z" />
          <path d="M68 12c4-5 9-6 12-6M92 12c-4-5-9-6-12-6M68 12c4 5 9 6 12 6M92 12c-4 5-9 6-12 6" />
        </svg>
      );
    case "filigree":
      return (
        <svg viewBox="0 0 200 24" {...common} fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M10 12h60M130 12h60" />
          <path d="M70 12c8-10 20-10 24 0-4 10-16 10-24 0zM130 12c-8-10-20-10-24 0 4 10 16 10 24 0z" />
          <circle cx="100" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "geometric":
      return (
        <svg viewBox="0 0 160 16" {...common} fill="currentColor">
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${i * 20} 8l10-8 10 8-10 8z`} opacity={i % 2 ? 0.45 : 1} />
          ))}
        </svg>
      );
    case "confetti":
      return (
        <svg viewBox="0 0 160 24" {...common} aria-hidden>
          {[["#E4572E", 10, 8, 0], ["#2EC4B6", 34, 16, 30], ["#FFB627", 58, 6, -20], ["var(--w-accent)", 80, 12, 45], ["#7B61FF", 102, 5, 10], ["#2EC4B6", 126, 15, -35], ["#FFB627", 150, 9, 20]].map(([c, x, y, r], i) => (
            <rect key={i} x={Number(x) - 4} y={Number(y)} width="8" height="4" rx="1" fill={String(c)} transform={`rotate(${r} ${x} ${Number(y) + 2})`} />
          ))}
        </svg>
      );
    case "dove":
      return (
        <svg viewBox="0 0 160 24" {...common} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12h52M100 12h52" opacity=".5" />
          <path d="M70 14c4-1 7-4 9-8 1 3 0 6-2 8 3 0 6 1 9 4-5 1-10 0-14-2-1 1-2 1-3 1z" fill="currentColor" opacity=".85" />
        </svg>
      );
    case "fine-lines":
    default:
      return (
        <svg viewBox="0 0 160 16" {...common} fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M0 8h68M92 8h68" />
          <path d="M80 2l6 6-6 6-6-6z" fill="currentColor" />
        </svg>
      );
  }
}

/** A woven geometric band, used by the Contemporary African Romance theme. */
export function GeometricBand({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden className={`block h-5 w-full ${className}`} preserveAspectRatio="none" viewBox="0 0 240 20">
      <defs>
        <pattern id="w-band" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="var(--w-ink)" />
          <path d="M0 10l10-10 10 10-10 10z" fill="var(--w-accent)" />
          <path d="M20 10l10-10 10 10-10 10z" fill="#D9A441" />
          <path d="M8 10h4M28 10h4" stroke="var(--w-bg)" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="240" height="20" fill="url(#w-band)" />
    </svg>
  );
}

/** A corner flourish for the bordered (Traditional Celebration) hero. */
export function CornerFlourish({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 60" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M2 58V20C2 10 10 2 20 2h38" />
      <path d="M10 58V26c0-9 7-16 16-16h32" opacity=".6" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}
