"use client";

import { useEffect, useState } from "react";
import type { ImageView } from "./types";

/**
 * The split design's photo panel: stays put on large screens while the content scrolls, and
 * cross-fades to a new photo as each section comes into view.
 */
export function StickyPhotos({ photos, ids }: { photos: ImageView[]; ids: string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = els.indexOf(e.target as HTMLElement);
            if (i >= 0) setActive(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  if (!photos.length) return <div aria-hidden className="hidden bg-[var(--w-band)] lg:block" />;
  const current = active % photos.length;
  return (
    <div aria-hidden className="relative hidden lg:block">
      <div className="sticky top-0 h-svh overflow-hidden">
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- our own media route, pre-sized
          <img
            key={p.id}
            src={p.src}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
