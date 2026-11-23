"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type HeroSlide = { kind: string; theme: string; label: string; headline: string; subline: string; /** Singular, for "See a ___ sample". */ noun: string; photo: string; position?: string; /** A portrait photo used instead on phones. */ mobilePhoto?: string; mobilePosition?: string };

const EVERY = 6500;

/**
 * Full screen hero that fades through photos of each occasion. The headline and the main button stay
 * put; the small link underneath follows the photo on screen and opens a sample for that occasion.
 * It stops while the pointer or keyboard is on it, and does not move at all for people who ask
 * their device to reduce motion.
 */
export function HeroCarousel({ slides, signUpHref, priceNote }: { slides: HeroSlide[]; signUpHref: string; priceNote: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(q.matches);
    set();
    q.addEventListener("change", set);
    return () => q.removeEventListener("change", set);
  }, []);

  const running = !paused && !held && !reduced;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), EVERY);
    return () => clearTimeout(t);
  }, [running, i, slides.length]);

  const now = slides[i]!;
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Occasions you can celebrate"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className="relative flex h-[100svh] min-h-[640px] items-end justify-center overflow-hidden bg-navy text-white"
    >
      {slides.map((s, n) => (
        <Fragment key={s.photo}>
          <Image
            src={`/samples/photos/${s.photo}.webp`}
            alt=""
            fill
            priority={n === 0}
            sizes="100vw"
            quality={90}
            style={{ objectPosition: s.position ?? "50% 40%" }}
            className={`object-cover transition-opacity duration-[1400ms] ease-in-out ${s.mobilePhoto ? "hidden md:block" : ""} ${n === i ? "opacity-100" : "opacity-0"}`}
          />
          {s.mobilePhoto && (
            <Image
              src={`/samples/photos/${s.mobilePhoto}.webp`}
              alt=""
              fill
              sizes="100vw"
              quality={90}
              style={{ objectPosition: s.mobilePosition ?? "50% 30%" }}
              className={`object-cover transition-opacity duration-[1400ms] ease-in-out md:hidden ${n === i ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </Fragment>
      ))}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,28,53,.5),rgba(16,28,53,0)_28%,rgba(16,28,53,0)_38%,rgba(16,28,53,.93))]" />

      <div className="animate-rise relative w-full px-4 pb-[6svh] text-center">
        <h1 key={now.kind} className="animate-rise font-light">
          <span className="block text-[clamp(2.4rem,6.4vw,5rem)] leading-[1.05] [text-shadow:0_2px_30px_rgba(16,28,53,.55)]">{now.headline}</span>
        </h1>
        <p key={`${now.kind}-sub`} className="animate-rise mx-auto mt-4 min-h-[3.5rem] max-w-2xl text-base text-white/90 [text-shadow:0_1px_16px_rgba(16,28,53,.6)] sm:text-lg">{now.subline}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg" variant="gold" className="h-14 px-10 text-base shadow-xl shadow-navy/40"><Link href={signUpHref}>Create your page</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-14 border-white/60 bg-white/10 px-8 text-base text-white backdrop-blur-sm hover:bg-white hover:text-navy">
            <Link href={`/samples/${now.theme}?occasion=${now.kind}`}>See a {now.noun} sample</Link>
          </Button>
        </div>

        <p className="mt-4 text-sm text-white/80">{priceNote}</p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <p className="min-w-[10.5rem] text-sm tracking-[0.2em] text-white/90 uppercase" aria-live={running ? "off" : "polite"}>{now.label}</p>
          <div role="group" aria-label="Choose a photo" className="flex items-center">
            {slides.map((s, n) => (
              <button
                key={s.photo}
                type="button"
                onClick={() => setI(n)}
                aria-label={`${s.label}, photo ${n + 1} of ${slides.length}`}
                aria-current={n === i}
                className="group grid h-8 w-6 place-items-center focus-visible:outline-none"
              >
                <span className={`h-[3px] rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-champagne ${n === i ? "w-6 bg-champagne" : "w-3 bg-white/50 group-hover:bg-white"}`} />
              </button>
            ))}
          </div>
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play the slideshow" : "Pause the slideshow"}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/40 text-white/90 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-champagne focus-visible:outline-none"
            >
              {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
