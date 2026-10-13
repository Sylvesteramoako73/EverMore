"use client";

import { Check, Monitor, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { chooseTheme } from "@/app/actions/wedding";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/themes";

export function ThemePicker({ themes, current, slug, premiumAllowed }: { themes: Theme[]; current: string; slug: string; premiumAllowed: boolean }) {
  const [selected, setSelected] = useState(current);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [version, setVersion] = useState(0);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_minmax(340px,440px)]">
      <fieldset>
        <legend className="sr-only">Choose a theme</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {themes.map((t) => {
            const locked = t.premium && !premiumAllowed;
            const isSelected = selected === t.id;
            return (
              <label
                key={t.id}
                className={`relative block cursor-pointer rounded-2xl border-2 bg-white p-4 transition ${isSelected ? "border-navy shadow-md" : "border-border hover:border-navy/30"} ${locked ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={isSelected}
                  disabled={locked || pending}
                  className="sr-only"
                  onChange={() => {
                    setSelected(t.id);
                    start(async () => {
                      const res = await chooseTheme(t.id);
                      if (!res.ok) {
                        toast.error(res.error ?? "Couldn't change theme.");
                        setSelected(current);
                      } else setVersion((v) => v + 1);
                    });
                  }}
                />
                <span className="flex h-16 overflow-hidden rounded-lg" aria-hidden>
                  {[t.colors.bg, t.colors.accent, t.colors.ink, t.colors.line].map((c, i) => (
                    <span key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{t.name}</span>
                  {t.premium && <span className="rounded-full border border-champagne/60 px-2 py-0.5 text-[0.65rem] text-champagne-deep uppercase">Premium</span>}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.tagline}</span>
                {isSelected && (
                  <span className="absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-navy text-ivory">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">Selected</span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-muted-foreground">{pending ? "Applying theme…" : ""}</p>
      </fieldset>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-navy">Preview with your details</p>
          <div className="flex gap-1" role="group" aria-label="Preview size">
            <Button size="icon-sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} aria-label="Phone preview"><Smartphone /></Button>
            <Button size="icon-sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} aria-label="Desktop preview"><Monitor /></Button>
          </div>
        </div>
        <div className={`mx-auto overflow-hidden rounded-[1.5rem] border-[8px] border-navy bg-navy ${device === "mobile" ? "w-[330px]" : "w-full"}`}>
          <div className={device === "mobile" ? "h-[620px]" : "h-[520px]"}>
            {device === "mobile" ? (
              <iframe key={`${version}-m`} src={`/w/${slug}`} title="Preview of your wedding page" className="h-full w-full bg-white" />
            ) : (
              // Render at desktop width and scale down to fit.
              <div className="relative h-full w-full overflow-hidden bg-white">
                <iframe key={`${version}-d`} src={`/w/${slug}`} title="Desktop preview of your wedding page" className="absolute top-0 left-0 h-[1040px] w-[1280px] origin-top-left scale-[0.5] border-0" />
              </div>
            )}
          </div>
        </div>
        <a href={`/w/${slug}`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-sm text-navy underline underline-offset-4">
          Open full preview in a new tab
        </a>
      </div>
    </div>
  );
}
