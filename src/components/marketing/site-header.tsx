"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#occasions", label: "Occasions" },
  { href: "/#designs", label: "Designs" },
  { href: "/#includes", label: "What is included" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "Questions" },
];

/**
 * Sits over the hero photo on the home page and turns solid once you scroll. On every other page it
 * is a plain sticky bar. The menu opens as a panel from the left.
 */
export function SiteHeader({
  signInHref,
  signUpHref,
}: {
  signInHref: string;
  signUpHref: string;
}) {
  const home = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        openRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clear = home && !scrolled && !open;
  return (
    <>
      <header
        className={`${home ? "fixed inset-x-0" : "sticky"} top-0 z-40 transition-colors duration-300 ${
          clear
            ? "bg-gradient-to-b from-navy/50 to-transparent text-ivory"
            : "border-b border-navy/5 bg-white/90 text-navy backdrop-blur-md"
        }`}
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
          <button
            ref={openRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="inline-flex h-11 items-center gap-2 rounded-full px-2 text-sm tracking-wide transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-champagne focus-visible:outline-none"
          >
            <Menu className="h-6 w-6" aria-hidden />
            <span className="hidden sm:inline">Menu</span>
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <Logo inverted={clear} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={signInHref}
              className="hidden px-3 text-sm transition-opacity hover:opacity-70 md:inline"
            >
              Sign in
            </Link>
            <Button
              asChild
              size="sm"
              variant="gold"
              className="hidden sm:inline-flex"
            >
              <Link href={signUpHref}>Create your page</Link>
            </Button>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          id="site-menu"
        >
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          />
          <nav
            aria-label="Main"
            className="animate-rise relative flex h-full w-[min(88vw,26rem)] flex-col bg-white px-8 py-6 text-navy shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  openRef.current?.focus();
                }}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-navy/5 focus-visible:ring-2 focus-visible:ring-champagne focus-visible:outline-none"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <ul className="mt-12 space-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 font-display text-3xl font-light transition-colors hover:text-champagne-deep"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto space-y-3 pt-8">
              <Button asChild size="lg" variant="gold" className="w-full">
                <Link href={signUpHref}>Create your page</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={signInHref}>Sign in</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
