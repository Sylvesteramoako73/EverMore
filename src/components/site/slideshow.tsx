"use client";

import { Maximize, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type Slide =
  | { kind: "photo"; id: string; src: string; caption: string }
  | { kind: "message"; id: string; text: string; name: string };

/** Cycles through slides every 7 seconds and fetches new photos and messages every minute. */
export function Slideshow({ title, url, slides }: { title: string; url: string; slides: Slide[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  const slide = slides.length ? slides[i % slides.length] : null;

  return (
    <div className="relative flex min-h-svh flex-col bg-black text-white">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!slide && (
          <div className="px-6 text-center">
            <p className="font-display text-5xl">{title}</p>
            <p className="mt-4 text-white/70">Photos and messages from guests will appear here.</p>
          </div>
        )}
        {slide?.kind === "photo" && (
          <figure key={slide.id} className="animate-fade absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- guest media from our own route */}
            <img src={slide.src} alt={slide.caption || "Guest photo"} className="max-h-full max-w-full object-contain" />
            {slide.caption && <figcaption className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-lg">{slide.caption}</figcaption>}
          </figure>
        )}
        {slide?.kind === "message" && (
          <blockquote key={slide.id} className="animate-fade mx-auto max-w-4xl px-8 text-center">
            <p className="font-display text-[clamp(2rem,4.5vw,4rem)] leading-snug italic">&ldquo;{slide.text}&rdquo;</p>
            <footer className="mt-8 text-2xl text-[#C69A4A]">— {slide.name}</footer>
          </blockquote>
        )}
      </div>
      <footer className="flex items-center justify-between gap-4 bg-black/80 px-6 py-4">
        <div className="min-w-0">
          <p className="truncate font-display text-2xl">{title}</p>
          <p className="truncate text-sm text-white/60">Share your photos at {url.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setPaused((p) => !p)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
          </button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Full screen">
            <Maximize className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
