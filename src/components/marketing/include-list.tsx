"use client";

import Image from "next/image";
import { useState } from "react";

export type IncludeItem = { title: string; text: string; photo: string };

/** A big list on a dark band. Hover, focus or tap an item and the photo beside it changes. */
export function IncludeList({ items }: { items: IncludeItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
      <ul className="space-y-1 lg:text-right">
        {items.map((it, i) => (
          <li key={it.title}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={`block w-full py-2 text-left font-display text-[clamp(1.8rem,4vw,3.2rem)] leading-tight font-light transition-colors focus-visible:outline-none lg:text-right ${
                active === i ? "text-white" : "text-white/45 hover:text-white/80 focus-visible:text-white"
              }`}
            >
              {it.title}
            </button>
            <p className={`overflow-hidden text-ivory/70 transition-all duration-500 lg:ml-auto lg:max-w-md ${active === i ? "max-h-24 pb-3 opacity-100" : "max-h-0 opacity-0"}`}>{it.text}</p>
          </li>
        ))}
      </ul>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-sm" aria-hidden>
        {items.map((it, i) => (
          <Image
            key={it.photo}
            src={`/samples/photos/${it.photo}.webp`}
            alt=""
            fill
            sizes="(min-width: 1024px) 420px, 90vw"
            className={`object-cover transition-opacity duration-700 ${active === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
    </div>
  );
}
