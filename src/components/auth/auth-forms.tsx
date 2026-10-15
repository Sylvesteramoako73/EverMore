"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Errors = Record<string, string | undefined>;

function useSubmit() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: ReactNode } | null>(null);
  return { pending, setPending, message, setMessage };
}

function Alert({ message }: { message: { ok: boolean; text: ReactNode } | null }) {
  if (!message) return null;
  return (
    <div
      role={message.ok ? "status" : "alert"}
      className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`}
    >
      {message.text}
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

/** Same-origin path from ?next=, so sign-in can't be used to redirect people off-site. */
function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signIn.social({ provider: "google", callbackURL: next });
        setPending(false);
      }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

// ───────────────────────────── Sign up

export function SignUpForm({ googleEnabled, verifyEmail = true }: { googleEnabled: boolean; verifyEmail?: boolean }) {
  const router = useRouter();
  // e.g. an invitation to co-host: come back to it after confirming the email.
  const returnTo = safeNext(useSearchParams().get("next"), "/onboarding");
  const { pending, setPending, message, setMessage } = useSubmit();
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const next: Errors = {};
    if (!name) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 10) next.password = "Use at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setMessage(null);
    const { error } = await authClient.signUp.email({ name, email, password, callbackURL: returnTo });
    setPending(false);
    if (error) {
      // Don't reveal whether an address is registered beyond what the provider returns.
      setMessage({ ok: false, text: error.status === 429 ? "Too many attempts. Please wait a few minutes." : (error.message ?? "We couldn't create your account.") });
      return;
    }
    if (!verifyEmail) {
      // No confirmation step on this site: the new account is already signed in.
      router.push(returnTo);
      router.refresh();
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="space-y-6">
      {googleEnabled && (
        <>
          <GoogleButton next={returnTo} />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Alert message={message} />
        <Field label="Your name" errors={errors.name ? [errors.name] : undefined}>
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" errors={errors.email ? [errors.email] : undefined}>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 10 characters. A short phrase is easy to remember." errors={errors.password ? [errors.password] : undefined}>
          <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Submit pending={pending}>Create account</Submit>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our <Link href="/policies#terms" className="underline">terms</Link> and{" "}
          <Link href="/policies#privacy" className="underline">privacy summary</Link>.
        </p>
      </form>
    </div>
  );
}

// ───────────────────────────── Sign in

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/dashboard");
  const { pending, setPending, message, setMessage } = useSubmit();
  const [unverified, setUnverified] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    if (!email || !password) {
      setMessage({ ok: false, text: "Enter your email and password." });
      return;
    }
    setPending(true);
    setMessage(null);
    setUnverified(null);
    const { error } = await authClient.signIn.email({ email, password, callbackURL: next });
    setPending(false);
    if (!error) {
      router.push(next);
      router.refresh();
      return;
    }
    if (error.status === 403) {
      setUnverified(email);
      setMessage({ ok: false, text: "Please confirm your email address first. Check your inbox for the link." });
    } else if (error.status === 429) {
      setMessage({ ok: false, text: "Too many attempts. Please wait a minute and try again." });
    } else {
      setMessage({ ok: false, text: "That email and password don't match. Please try again." });
    }
  }

  return (
    <div className="space-y-6">
      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Alert message={message} />
        {unverified && <ResendVerification email={unverified} />}
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={<span className="flex w-full justify-between">Password <Link href="/forgot-password" className="font-normal text-champagne-deep underline-offset-4 hover:underline">Forgot it?</Link></span>}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Submit pending={pending}>Sign in</Submit>
      </form>
    </div>
  );
}

export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <p className="text-sm text-muted-foreground">
      Didn&apos;t get it?{" "}
      <button
        type="button"
        className="font-medium text-navy underline underline-offset-4 disabled:opacity-60"
        disabled={state === "sending" || state === "sent"}
        onClick={async () => {
          setState("sending");
          const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/onboarding" });
          setState(error ? "error" : "sent");
        }}
      >
        {state === "sent" ? "Sent. Check your inbox" : state === "sending" ? "Sending…" : "Send the link again"}
      </button>
      {state === "error" && <span role="alert" className="ml-1 text-destructive">Please wait a few minutes before trying again.</span>}
    </p>
  );
}

// ───────────────────────────── Check email

export function CheckEmail() {
  const email = useSearchParams().get("email") ?? "";
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-navy">
        <MailCheck aria-hidden />
      </span>
      <p className="text-muted-foreground">
        We&apos;ve sent a confirmation link to {email ? <strong className="text-navy">{email}</strong> : "your email"}. Open it to finish
        creating your account; you&apos;ll go straight to setting up your page.
      </p>
      {email && <ResendVerification email={email} />}
      <p className="text-sm">
        <Link href="/sign-in" className="text-navy underline underline-offset-4">Back to sign in</Link>
      </p>
    </div>
  );
}

// ───────────────────────────── Forgot / reset password

export function ForgotPasswordForm() {
  const { pending, setPending, message, setMessage } = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!email) return setMessage({ ok: false, text: "Enter your email address." });
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    // Same message whether or not the account exists, so this can't be used to discover accounts.
    setMessage(
      error?.status === 429
        ? { ok: false, text: "Too many requests. Please wait a few minutes." }
        : { ok: true, text: "If there's an account for that address, we've sent a link to reset your password." },
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Alert message={message} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Submit pending={pending}>Send reset link</Submit>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="text-navy underline underline-offset-4">Back to sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN";
  const { pending, setPending, message, setMessage } = useSubmit();

  if (!token || invalid) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">This reset link is invalid or has expired.</p>
        <Button asChild><Link href="/forgot-password">Request a new link</Link></Button>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password.length < 10) return setMessage({ ok: false, text: "Use at least 10 characters." });
    if (password !== data.get("confirm")) return setMessage({ ok: false, text: "The passwords don't match." });
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setPending(false);
    if (error) return setMessage({ ok: false, text: "This reset link is invalid or has expired. Please request a new one." });
    router.push("/sign-in?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Alert message={message} />
      <Field label="New password" hint="At least 10 characters.">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Submit pending={pending}>Save new password</Submit>
    </form>
  );
}
