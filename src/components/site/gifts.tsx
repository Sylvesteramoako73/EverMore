"use client";

import { Check, Copy, Heart, Smartphone } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { giveGift, type GiftState } from "@/app/actions/public";
import { formatMoney } from "@/lib/money";
import type { CelebrationView, FundView } from "./types";

const PRESETS = [50, 100, 200, 500];
const noop = () => () => {};

/** Funds with progress, MoMo details and a give form. Works without JavaScript for the MoMo details. */
export function GiftPanel({ w, inviteToken }: { w: CelebrationView; inviteToken: string | null }) {
  // Back from Paystack checkout: ?gift=thanks|pending|failed (read on the client only).
  const outcome = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("gift"),
    () => null,
  );
  const { funds, supporters } = w.gifts;

  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-6 text-left">
      {outcome && (
        <p role="status" className="w-card p-4 text-center">
          {outcome === "thanks"
            ? "Thank you! Your gift has been received."
            : outcome === "failed"
              ? "The payment didn't go through. You can try again below."
              : "We're waiting for the payment to be confirmed. You'll get a receipt by email."}
        </p>
      )}
      {funds.map((f) => <FundCard key={f.id} fund={f} w={w} inviteToken={inviteToken} />)}
      {supporters.length > 0 && (
        <div className="text-center">
          <p className="w-eyebrow">With love from</p>
          <p className="w-muted mt-2">{supporters.map((s) => s.name).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

function FundCard({ fund: f, w, inviteToken }: { fund: FundView; w: CelebrationView; inviteToken: string | null }) {
  const [open, setOpen] = useState(false);
  const pct = f.goal && f.raised !== null ? Math.min(100, Math.round((f.raised / f.goal) * 100)) : null;
  return (
    <div className="w-card p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="w-display text-2xl">{f.title}</h3>
          {f.description && <p className="w-muted mt-1 whitespace-pre-line">{f.description}</p>}
        </div>
        {!open && (
          <button type="button" className="w-btn shrink-0" onClick={() => setOpen(true)}>
            <Heart className="h-4 w-4" aria-hidden /> {w.occasion.kind === "funeral" ? "Contribute" : "Give a gift"}
          </button>
        )}
      </div>

      {f.raised !== null && (
        <div className="mt-6">
          {pct !== null && (
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--w-line)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of the goal`}>
              <div className="h-full rounded-full bg-[var(--w-accent)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="mt-2 text-sm">
            <strong>{formatMoney(f.raised, f.currency)}</strong>
            {f.goal ? <span className="w-muted"> of {formatMoney(f.goal, f.currency)}</span> : null}
            <span className="w-muted"> · {f.count} {f.count === 1 ? "gift" : "gifts"}</span>
          </p>
        </div>
      )}

      {f.momo && <MomoDetails momo={f.momo} />}
      {open && <GiveForm fund={f} w={w} inviteToken={inviteToken} onClose={() => setOpen(false)} />}
    </div>
  );
}

function MomoDetails({ momo }: { momo: NonNullable<FundView["momo"]> }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--w-line)] p-4">
      <Smartphone className="h-5 w-5 shrink-0 text-[var(--w-accent)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="w-eyebrow">{momo.network || "Mobile Money"}</p>
        <p className="text-lg font-semibold tracking-wide">{momo.number}</p>
        {momo.name && <p className="w-muted text-sm">{momo.name}</p>}
      </div>
      <button
        type="button"
        className="w-btn w-btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(momo.number.replace(/\s/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Copied" : "Copy number"}</span>
      </button>
    </div>
  );
}

function GiveForm({ fund: f, w, inviteToken, onClose }: { fund: FundView; w: CelebrationView; inviteToken: string | null; onClose: () => void }) {
  const sample = w.mode === "sample";
  const [state, action] = useActionState<GiftState, FormData>(
    sample ? async () => ({ ok: true, message: "This is a sample page, so nothing was sent. Your guests will see a confirmation like this." }) : giveGift.bind(null, w.slug, inviteToken),
    undefined,
  );
  const [amount, setAmount] = useState(state?.values?.amount ?? "");
  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo;
  }, [state?.redirectTo]);
  const e = state?.errors ?? {};
  const online = w.gifts.online;
  const methodRef = useRef<HTMLInputElement>(null);

  if (state?.ok && !state.redirectTo) {
    return (
      <div role="status" className="mt-6 rounded-xl bg-[var(--w-tint)] p-5 text-center">
        <p className="w-display text-xl">{state.message}</p>
        <button type="button" className="w-btn w-btn-ghost mt-4" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-5 border-t border-[var(--w-line)] pt-6" noValidate>
      {state?.message && <p role="alert" className="text-sm text-[#B42318]">{state.message}</p>}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Leave this empty <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <input type="hidden" name="fundId" value={f.id} />
      <input type="hidden" name="method" ref={methodRef} defaultValue={online ? "online" : "direct"} />
      <fieldset>
        <legend className="w-label">Amount (GH₵)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={amount === String(p)}
              onClick={() => setAmount(String(p))}
              className={`rounded-full border px-4 py-2 text-sm ${amount === String(p) ? "border-[var(--w-accent)] bg-[var(--w-accent)] text-[var(--w-on-accent,#fff)]" : "border-[var(--w-line)]"}`}
            >
              {p}
            </button>
          ))}
          <span className="w-32">
          <input
            name="amount"
            inputMode="decimal"
            aria-label="Amount in cedis"
            placeholder="Other"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            className="w-input"
            aria-invalid={e.amount ? true : undefined}
          />
          </span>
        </div>
        {e.amount && <p role="alert" className="mt-1.5 text-sm text-[#B42318]">{e.amount[0]}</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <GiftField name="name" label="Your name" autoComplete="name" errors={e.name} defaultValue={state?.values?.name} />
        <GiftField name="phone" label="Phone (optional)" type="tel" autoComplete="tel" errors={e.phone} defaultValue={state?.values?.phone} />
      </div>
      {online && <GiftField name="email" label="Email for your receipt" type="email" autoComplete="email" errors={e.email} defaultValue={state?.values?.email} />}
      <div>
        <label htmlFor="gift-message" className="w-label">A message (optional)</label>
        <textarea id="gift-message" name="message" rows={2} maxLength={500} className="w-input" defaultValue={state?.values?.message} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" className="h-4 w-4" /> Don&apos;t show my name to other guests
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {online && <GiveButton onPick={() => { if (methodRef.current) methodRef.current.value = "online"; }}>Pay with MoMo or card</GiveButton>}
        {f.momo && <GiveButton ghost={online} onPick={() => { if (methodRef.current) methodRef.current.value = "direct"; }}>{`I've sent it by ${f.momo.network || "MoMo"}`}</GiveButton>}
        <button type="button" className="w-btn w-btn-ghost" onClick={onClose}>Cancel</button>
      </div>
      <p className="w-muted text-xs">
        {online ? "Online payments are processed securely by Paystack. " : ""}
        {f.momo ? `Sending directly? Use the ${f.momo.network || "MoMo"} number above, then tell us here so the hosts can thank you.` : ""}
      </p>
    </form>
  );
}

/** Two ways to give share one form; the clicked button records which one in a hidden field. */
function GiveButton({ onPick, children, ghost = false }: { onPick: () => void; children: string; ghost?: boolean }) {
  const status = useFormStatus();
  return (
    <button type="submit" onClick={onPick} disabled={status.pending} aria-busy={status.pending} className={`w-btn ${ghost ? "w-btn-ghost" : ""}`}>
      {status.pending ? "Please wait…" : children}
    </button>
  );
}

function GiftField({ name, label, errors, defaultValue, type = "text", autoComplete }: { name: string; label: string; errors?: string[]; defaultValue?: string; type?: string; autoComplete?: string }) {
  const id = `gift-${name}`;
  return (
    <div>
      <label htmlFor={id} className="w-label">{label}</label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} className="w-input" aria-invalid={errors?.length ? true : undefined} aria-describedby={errors?.length ? `${id}-error` : undefined} />
      {errors?.length ? <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[#B42318]">{errors[0]}</p> : null}
    </div>
  );
}
