"use client";

import { useEffect } from "react";

type Gtag = (command: "event", name: string, params?: Record<string, string>) => void;

function send(name: string, params?: Record<string, string>) {
  (window as unknown as { gtag?: Gtag }).gtag?.("event", name, params);
}

/** Sends one analytics event when the page it sits on is shown. */
export function TrackEvent({ name }: { name: string }) {
  useEffect(() => {
    send(name);
  }, [name]);
  return null;
}

/** Counts clicks on the "Create your page" and sign up links across the website. */
export function TrackClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      if (/\/sign-up(\?|$|#)/.test(href)) send("cta_click", { link_text: (link?.textContent ?? "").trim().slice(0, 60), link_url: href });
      else if (/wa\.me\//.test(href)) send("whatsapp_click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
