"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { requestPayoutAction, savePayoutAccountAction, type ReferralState } from "@/app/actions/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOMO_NETWORKS, formatMoney } from "@/lib/money";

export function InviteTools({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const shown = link.replace(/^https?:\/\//, "");
  const text = `I made a page for my event on EverMore and it looks beautiful. Create yours for GHS 59 with my link: ${shown}`;
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-[#f6f3ec] px-3 py-2.5 text-navy">{shown}</code>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked: the link is shown above to copy by hand */
            }
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy link"}
        </Button>
        <Button asChild variant="gold">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">
            <MessageCircle aria-hidden /> Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Your invite code is <strong className="text-navy">{code}</strong>. Friends can also type it at checkout.</p>
    </div>
  );
}

export function PayoutAccountForm({ momoNumber, momoNetwork, availableMinor, minPayoutMinor }: { momoNumber: string; momoNetwork: string; availableMinor: number; minPayoutMinor: number }) {
  const [saved, save, saving] = useActionState<ReferralState, FormData>(savePayoutAccountAction, undefined);
  const [cashed, setCashed] = useState<ReferralState>();
  const [pending, start] = useTransition();
  const canCash = availableMinor >= minPayoutMinor && Boolean(momoNumber);
  return (
    <div className="mt-6 space-y-6 border-t border-border pt-6">
      <form action={save} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm text-navy">
          Mobile Money number
          <Input name="momoNumber" defaultValue={momoNumber} inputMode="tel" autoComplete="tel" placeholder="024 123 4567" className="mt-1.5" required />
        </label>
        <label className="text-sm text-navy">
          Network
          <select name="momoNetwork" defaultValue={momoNetwork || MOMO_NETWORKS[0]} className="mt-1.5 h-10 w-full rounded-md border border-border bg-white px-3 text-navy">
            {MOMO_NETWORKS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <Button type="submit" variant="outline" disabled={saving}>{saving ? "Saving" : "Save"}</Button>
      </form>
      {saved?.error && <p role="alert" className="text-sm text-destructive">{saved.error}</p>}
      {saved?.ok && <p role="status" className="text-sm text-success">Saved.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="gold"
          disabled={!canCash || pending}
          onClick={() => start(async () => setCashed(await requestPayoutAction()))}
        >
          Cash out {formatMoney(availableMinor)}
        </Button>
        {!canCash && <span className="text-sm text-muted-foreground">{momoNumber ? `Available from ${formatMoney(minPayoutMinor)}.` : "Save your Mobile Money number first."}</span>}
      </div>
      {cashed?.error && <p role="alert" className="text-sm text-destructive">{cashed.error}</p>}
      {cashed?.ok && <p role="status" className="text-sm text-success">Request received. We will send it to your Mobile Money number soon.</p>}
    </div>
  );
}
