"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Horizontal, snap-scrolling row of designs with previous/next buttons. */
export function DesignRail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 260), behavior: "smooth" });
  };

  const btn =
    "grid h-12 w-12 place-items-center rounded-full bg-white text-navy shadow-lg ring-1 ring-navy/10 transition hover:bg-navy hover:text-ivory disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Kept inside the page column so the row sits centred under the heading. Fades only the edge that has more designs beyond it. */}
      <ul
        ref={ref}
        onScroll={update}
        aria-label={label}
        style={{ maskImage: `linear-gradient(to right, ${edge.start ? "#000" : "transparent"}, #000 32px, #000 calc(100% - 32px), ${edge.end ? "#000" : "transparent"})` }}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pt-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" className={btn} onClick={() => go(-1)} disabled={edge.start} aria-label="Previous designs">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => go(1)} disabled={edge.end} aria-label="More designs">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
