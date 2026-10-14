"use client";

import { Check, ChevronLeft, ChevronRight, Copy, Download, Flag, Mail, Menu, MessageCircle, Printer, Share2, X } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { reportMessage, signGuestbook, submitRsvp } from "@/app/actions/public";
import { formatLongDate, formatPlainDate } from "@/lib/dates";
import type { FormState } from "@/lib/validation";
import { rsvpField } from "@/lib/celebration-rules";
import type { ImageView, CelebrationView } from "./types";

/* eslint-disable @next/next/no-img-element -- images come from our own media route */

function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function Submit({ children, pending }: { children: string; pending: string }) {
  const status = useFormStatus();
  return (
    <button type="submit" className="w-btn w-full sm:w-auto" disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-[#B42318]">
      {errors[0]}
    </p>
  );
}

function TextField({
  name, label, errors, defaultValue, type = "text", autoComplete, required = false, hint,
}: {
  name: string; label: string; errors?: string[]; defaultValue?: string; type?: string; autoComplete?: string; required?: boolean; hint?: string;
}) {
  const id = `rsvp-${name}`;
  return (
    <div>
      <label htmlFor={id} className="w-label">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="w-input"
      />
      {hint && !errors?.length && <p id={`${id}-hint`} className="w-muted mt-1.5 text-sm">{hint}</p>}
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  );
}

// ───────────────────────────── RSVP

export function RsvpForm({ w }: { w: CelebrationView }) {
  const { rsvp } = w;
  const token = rsvp.invitation?.token ?? null;
  const sample = w.mode === "sample";
  const [state, action] = useActionState<FormState, FormData>(
    sample ? async () => ({ ok: true, message: "This is a sample page, so nothing was sent. Your guests will see a confirmation like this." }) : submitRsvp.bind(null, w.slug, token),
    undefined,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(rsvp.events.map((e) => [e.id, state?.values?.[rsvpField(e.id)] ?? ""])),
  );
  const errors = state?.errors ?? {};
  const single = rsvp.events.length === 1;
  const attending = Object.values(answers).includes("yes");
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.ok) statusRef.current?.focus();
  }, [state?.ok]);

  if (state?.ok) {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="py-8 text-center outline-none">
        <span aria-hidden className="w-accent mx-auto grid h-14 w-14 place-items-center rounded-full border border-current">
          <Check className="h-6 w-6" />
        </span>
        <p className="w-display mt-6 text-3xl">{state.message}</p>
        <p className="w-muted mt-3 text-sm">
          {token ? "You can change your answer any time using this same link." : "Need to change your answer? Submit again with the same email address."}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-7" noValidate>
      <Honeypot />
      {rsvp.invitation && (
        <p className="text-center">
          Dear <strong>{rsvp.invitation.guestName}</strong>,{" "}
          {rsvp.invitation.existing ? "you've already replied; any changes will update your answer." : "we'd love to know if you can join us."}
        </p>
      )}
      {state?.message && !state.ok && (
        <p role="alert" className="rounded-[var(--w-radius)] border border-[#B42318]/30 bg-[#B42318]/10 px-4 py-3 text-sm text-[#B42318]">
          {state.message}
        </p>
      )}

      {rsvp.events.map((e) => {
        const field = rsvpField(e.id);
        return (
          <fieldset key={e.id} aria-describedby={errors[field] ? `${field}-error` : undefined}>
            <legend className="mb-3 w-full text-center">
              {single ? (
                <span className="w-display text-2xl">Will you join us?</span>
              ) : (
                <>
                  <span className="w-display block text-2xl">{e.name}</span>
                  <span className="w-muted mt-1 block text-sm">{formatLongDate(new Date(e.startsAt), e.timezone)}</span>
                </>
              )}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(["yes", "no"] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={field}
                    value={value}
                    checked={answers[e.id] === value}
                    onChange={() => setAnswers((a) => ({ ...a, [e.id]: value }))}
                    className="peer sr-only"
                  />
                  <span className="w-choice">
                    {value === "yes" ? (single ? "Joyfully accepts" : "Will attend") : single ? "Regretfully declines" : "Can't attend"}
                  </span>
                </label>
              ))}
            </div>
            <FieldError id={`${field}-error`} errors={errors[field]} />
          </fieldset>
        );
      })}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" autoComplete="name" required errors={errors.name} defaultValue={state?.values?.name ?? rsvp.invitation?.guestName} />
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          errors={errors.email}
          defaultValue={state?.values?.email}
          hint="Only the couple sees this."
        />
      </div>

      {attending && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="rsvp-partySize" className="w-label">Number attending</label>
            <select id="rsvp-partySize" name="partySize" className="w-input" defaultValue={state?.values?.partySize ?? "1"} aria-describedby="rsvp-partySize-hint">
              {Array.from({ length: rsvp.maxPartySize }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p id="rsvp-partySize-hint" className="w-muted mt-1.5 text-sm">
              Including you{rsvp.maxPartySize > 1 ? ` (up to ${rsvp.maxPartySize})` : ""}.
            </p>
            <FieldError id="rsvp-partySize-error" errors={errors.partySize} />
          </div>
          {rsvp.mealOptions.length > 0 && (
            <div>
              <label htmlFor="rsvp-meal" className="w-label">Meal preference</label>
              <select id="rsvp-meal" name="mealChoice" className="w-input" defaultValue={state?.values?.mealChoice ?? ""}>
                <option value="">No preference</option>
                {rsvp.mealOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <FieldError id="rsvp-meal-error" errors={errors.mealChoice} />
            </div>
          )}
          {rsvp.askDietary && (
            <div className="sm:col-span-2">
              <TextField name="dietary" label="Dietary requirements (optional)" errors={errors.dietary} defaultValue={state?.values?.dietary} />
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="rsvp-message" className="w-label">A note for the couple (optional)</label>
        <textarea id="rsvp-message" name="message" rows={3} className="w-input" defaultValue={state?.values?.message} />
      </div>

      <div className="text-center">
        <Submit pending="Sending…">Send RSVP</Submit>
      </div>
    </form>
  );
}

// ───────────────────────────── Guestbook

export function GuestbookPanel({ w, inviteToken }: { w: CelebrationView; inviteToken: string | null }) {
  const sample = w.mode === "sample";
  const [state, action] = useActionState<FormState, FormData>(
    sample ? async () => ({ ok: true, message: "This is a sample page, so the message wasn't saved." }) : signGuestbook.bind(null, w.slug, inviteToken),
    undefined,
  );
  const [reported, setReported] = useState<Set<string>>(new Set());
  const errors = state?.errors ?? {};

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
      <form action={action} key={state?.ok ? "sent" : "form"} className="w-surface relative h-fit space-y-5 p-6 sm:p-8 lg:sticky lg:top-24" noValidate>
        <Honeypot />
        <p className="w-muted">{w.occasion.copy.guestbookPrompt}</p>
        <TextField name="name" label="Your name" autoComplete="name" required errors={errors.name} defaultValue={state?.ok ? "" : state?.values?.name} />
        <div>
          <label htmlFor="gb-message" className="w-label">Your message</label>
          <textarea
            id="gb-message"
            name="message"
            rows={4}
            maxLength={1000}
            required
            className="w-input"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? "gb-message-error" : undefined}
            defaultValue={state?.ok ? "" : state?.values?.message}
          />
          <FieldError id="gb-message-error" errors={errors.message} />
        </div>
        <Submit pending="Sending…">{w.occasion.kind === "funeral" ? "Share tribute" : "Leave a message"}</Submit>
        {state?.message && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "w-accent text-sm" : "text-sm text-[#B42318]"}>
            {state.message}
          </p>
        )}
      </form>
      <div>
        {w.guestbook.entries.length === 0 ? (
          <p className="w-display w-muted py-10 text-center text-2xl italic">Be the first to leave a message.</p>
        ) : (
          <ul className="columns-1 gap-4 sm:columns-2">
            {w.guestbook.entries.map((e) => (
              <li key={e.id} className="w-surface mb-4 break-inside-avoid p-6">
                <blockquote className="whitespace-pre-line">{e.message}</blockquote>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="w-display w-accent text-xl italic">— {e.name}</p>
                  {!sample && (
                    <button
                      type="button"
                      className="w-muted inline-flex items-center gap-1 text-xs hover:underline disabled:opacity-60"
                      disabled={reported.has(e.id)}
                      onClick={async () => {
                        if (!confirm("Report this message as inappropriate? The couple will review it.")) return;
                        const res = await reportMessage(w.slug, e.id, "");
                        if (res.ok) setReported((s) => new Set(s).add(e.id));
                      }}
                    >
                      <Flag className="h-3 w-3" aria-hidden />
                      {reported.has(e.id) ? "Reported" : "Report"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Gallery with lightbox

export function Gallery({ images }: { images: ImageView[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open === null ? null : images[open];
  return (
    <>
      <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3">
        {images.map((img, i) => (
          <li key={img.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              className="w-photo group block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--w-accent)]"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setOpen(i);
              }}
              aria-label={`Open photo ${i + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ""}`}
            >
              <img
                src={img.thumb}
                alt={img.alt}
                width={img.width ?? undefined}
                height={img.height ?? undefined}
                loading="lazy"
                decoding="async"
                className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                style={img.placeholder ? { backgroundImage: `url(${img.placeholder})`, backgroundSize: "cover" } : undefined}
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        onClose={close}
        aria-label="Photo viewer"
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-3 text-sm">
              <span aria-live="polite">{open! + 1} / {images.length}</span>
              <button type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label="Close photo viewer">
                <X />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
              <img src={current.src} alt={current.alt} className="max-h-full max-w-full object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 grid h-12 w-12 place-items-center rounded-full bg-black/40 hover:bg-black/60">
                    <ChevronLeft />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 grid h-12 w-12 place-items-center rounded-full bg-black/40 hover:bg-black/60">
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>
            <p className="min-h-12 p-4 text-center text-sm opacity-90">{current.caption}</p>
          </div>
        )}
      </dialog>
    </>
  );
}

// ───────────────────────────── Share & QR

const noopSubscribe = () => () => {};

export function ShareSection({ w }: { w: CelebrationView }) {
  const [copied, setCopied] = useState(false);
  // The native share sheet exists only in some browsers; false during server rendering.
  const canShare = useSyncExternalStore(noopSubscribe, () => "share" in navigator, () => false);
  const title = w.title;
  const primary = w.events.find((e) => e.id === w.primaryEventId) ?? w.events[0];
  const when = primary ? ` on ${formatLongDate(new Date(primary.startsAt), primary.timezone)}` : w.keyDate ? ` · ${formatPlainDate(w.keyDate)}` : "";
  const message =
    w.occasion.after === "remembrance"
      ? `${title}${when}. Details: ${w.shareUrl}`
      : `You're invited: ${title}${when}. Details and RSVP: ${w.shareUrl}`;
  const qr = w.links.qr;

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="mx-auto text-center">
        <img src={`${qr}?format=svg`} alt={`QR code that opens ${w.shareUrl}`} width={180} height={180} className="w-surface h-44 w-44 bg-white p-3" loading="lazy" />
        <a href={`${qr}?format=png&download=1`} className="w-muted mt-3 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
          <Download className="h-4 w-4" aria-hidden /> Download QR code
        </a>
      </div>
      <div className="min-w-0 space-y-4 text-center md:text-left">
        <p className="w-muted">Scan or share this page so everyone has the details in one place.</p>
        <p className="w-surface truncate px-4 py-3 font-mono text-sm">{w.shareUrl}</p>
        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
          <button
            type="button"
            className="w-btn"
            onClick={async () => {
              await navigator.clipboard.writeText(w.shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
          </button>
          {canShare && (
            <button type="button" className="w-btn w-btn-ghost" onClick={() => navigator.share({ title, text: message, url: w.shareUrl }).catch(() => {})}>
              <Share2 className="h-4 w-4" aria-hidden /> Share
            </button>
          )}
          <a className="w-btn w-btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
          </a>
          <a className="w-btn w-btn-ghost" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}>
            <Mail className="h-4 w-4" aria-hidden /> Email
          </a>
          {w.links.card && (
            <a className="w-btn w-btn-ghost" href={w.links.card} target="_blank" rel="noopener noreferrer">
              <Printer className="h-4 w-4" aria-hidden /> Printable card
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Navigation

/** `darkHero`: the hero has a photo behind the menu, so the unscrolled menu is white. */
export function SiteNav({ monogram, items, darkHero = true }: { monogram: string; items: { id: string; label: string }[]; darkHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const solid = scrolled || open;
  return (
    <nav
      aria-label="Celebration page"
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid
          ? "border-b border-[var(--w-line)] bg-[var(--w-bg)]/95 text-[var(--w-ink)] backdrop-blur"
          : darkHero
            ? "text-white [text-shadow:0_1px_8px_rgba(0,0,0,.35)]"
            : "text-[var(--w-ink)]"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="w-display text-2xl tracking-wide">{monogram}</a>
        <ul className="hidden gap-6 text-[0.72rem] font-semibold tracking-[0.18em] uppercase md:flex">
          {items.map((i) => (
            <li key={i.id}><a href={`#${i.id}`} className="py-2 hover:opacity-70">{i.label}</a></li>
          ))}
        </ul>
        <button type="button" className="grid h-11 w-11 place-items-center md:hidden" aria-expanded={open} aria-controls="w-mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <ul id="w-mobile-nav" className="border-t border-[var(--w-line)] px-4 pb-4 md:hidden">
          {items.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} onClick={() => setOpen(false)} className="block py-3 text-sm font-semibold tracking-[0.16em] uppercase">
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
