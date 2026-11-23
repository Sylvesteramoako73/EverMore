"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { draftThankYous } from "@/app/actions/thanks";
import { CopyButton } from "@/components/dashboard/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { canWhatsApp, whatsappTo } from "@/lib/whatsapp";

export type Giver = { id: string; name: string; phone: string };

/** AI drafted thank you notes for everyone whose gift was received. The host edits each, then sends it from their own WhatsApp. */
export function ThankYous({ givers }: { givers: Giver[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const written = givers.filter((g) => drafts[g.id] !== undefined);

  function write() {
    setError("");
    start(async () => {
      const r = await draftThankYous();
      if (r.ok) setDrafts((d) => ({ ...r.thanks, ...d }));
      else setError(r.message);
    });
  }

  return (
    <section aria-labelledby="thanks-h" className="rounded-2xl bg-white p-5 ring-1 ring-border sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="thanks-h" className="text-2xl text-navy">Say thank you</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We write a warm, personal note for each person who gave. Read it, change anything you like, then send it from your own WhatsApp. Nothing is sent for you.
          </p>
        </div>
        <Button type="button" onClick={write} disabled={pending}>
          <Sparkles className="h-4 w-4" aria-hidden /> {pending ? "Writing..." : written.length ? "Write the rest" : "Write my thank you notes"}
        </Button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {written.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {written.map((g) => (
            <li key={g.id} className="space-y-2 py-4">
              <label htmlFor={`thanks-${g.id}`} className="font-medium text-navy">{g.name}</label>
              <Textarea
                id={`thanks-${g.id}`}
                rows={4}
                value={drafts[g.id]}
                onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
              />
              <div className="flex flex-wrap items-center gap-2">
                {g.phone && canWhatsApp(g.phone) ? (
                  <Button asChild size="sm" className="bg-[#1f8f4e] text-white hover:bg-[#187540]">
                    <a href={whatsappTo(g.phone, drafts[g.id])} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4" aria-hidden /> Send on WhatsApp</a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">No phone number saved, so copy it instead.</span>
                )}
                <CopyButton text={drafts[g.id]} label="Copy message" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
