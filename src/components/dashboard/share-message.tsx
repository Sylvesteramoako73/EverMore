"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/share-message";

/** The message the host sends with their link. They can edit it before copying or opening WhatsApp. */
export function ShareMessage({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-5 space-y-3">
      <label htmlFor="share-text" className="text-sm font-medium text-ivory">Your message</label>
      <textarea
        id="share-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-ivory outline-none focus-visible:ring-2 focus-visible:ring-champagne"
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="bg-champagne text-navy hover:bg-[#d3a95c]">
          <a href={whatsappLink(text)} target="_blank" rel="noopener">
            <MessageCircle className="h-4 w-4" aria-hidden /> Send on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/20 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked: the text is selectable above */
            }
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} <span aria-live="polite">{copied ? "Copied" : "Copy message"}</span>
        </Button>
      </div>
    </div>
  );
}
