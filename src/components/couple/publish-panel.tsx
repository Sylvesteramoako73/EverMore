"use client";

import { AlertTriangle, Check, Copy, ExternalLink, Globe, Link2, Lock } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { publish, savePublishSettings, unpublish } from "@/app/actions/celebration";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/validation";

type Visibility = "public" | "unlisted" | "private";

const VISIBILITY: { value: Visibility; title: string; text: string; icon: typeof Globe }[] = [
  { value: "unlisted", title: "Anyone with the link", text: "Guests open your link or QR code. Kept out of search engines.", icon: Link2 },
  { value: "private", title: "Invited guests only", text: "Only opens through each guest's personal invitation link.", icon: Lock },
  { value: "public", title: "Public", text: "Anyone can find it. You can also allow search engines.", icon: Globe },
];

export function PublishSettingsForm({
  slug,
  visibility,
  allowIndexing,
  origin,
}: {
  slug: string;
  visibility: Visibility;
  allowIndexing: boolean;
  origin: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(savePublishSettings, undefined);
  const [vis, setVis] = useState<Visibility>((state?.values?.visibility as Visibility) ?? visibility);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormAlert state={state} />
      <Field
        label="Your page address"
        hint="Lowercase letters, numbers and dashes. If you change it later, the old address keeps working."
        errors={e.slug}
      >
        <div className="flex items-stretch overflow-hidden rounded-lg border border-input bg-white focus-within:ring-3 focus-within:ring-ring/50">
          <span className="hidden items-center bg-muted px-3 text-sm text-muted-foreground sm:flex">{origin.replace(/^https?:\/\//, "")}/</span>
          <Input name="slug" defaultValue={state?.values?.slug ?? slug} className="rounded-none border-0 focus-visible:ring-0" />
        </div>
      </Field>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-navy">Who can see your page</legend>
        {VISIBILITY.map(({ value, title, text, icon: Icon }) => (
          <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${vis === value ? "border-navy bg-white" : "border-border bg-white/60"}`}>
            <input type="radio" name="visibility" value={value} checked={vis === value} onChange={() => setVis(value)} className="mt-1 accent-[var(--navy)]" />
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
            <span>
              <span className="block text-sm font-medium text-navy">{title}</span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </label>
        ))}
        {vis === "public" && (
          <label className="flex items-center gap-2 pl-1 text-sm">
            <input type="checkbox" name="allowIndexing" defaultChecked={allowIndexing} className="h-4 w-4 accent-[var(--navy)]" />
            Allow search engines like Google to show our page
          </label>
        )}
        {vis === "unlisted" && (
          <p className="text-xs text-muted-foreground">Unlisted isn&apos;t secret: anyone who has the link can open it. Choose &ldquo;Invited guests only&rdquo; for real privacy.</p>
        )}
      </fieldset>
      <SubmitButton pending="Saving…">Save settings</SubmitButton>
    </form>
  );
}

export function PublishControls({ status, url, problems }: { status: "draft" | "published" | "archived"; url: string; problems: string[] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const blocking = result ?? problems;

  if (status === "published") {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-success"><Check className="h-4 w-4" aria-hidden /> Your page is live</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-lg border border-border bg-white px-3 py-2.5 text-sm">{url}</code>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
          </Button>
          <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden /> Open</a></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/dashboard/share">Share & QR code</Link></Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => confirm("Unpublish your page? Guests won't be able to open it until you publish again.") && start(() => unpublish())}
          >
            Unpublish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blocking.length > 0 && (
        <div role="alert" className="rounded-xl border border-champagne/40 bg-champagne/10 p-4 text-sm text-navy">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden /> Before you publish</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {blocking.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await publish();
              setResult(res.ok ? [] : res.problems);
            })
          }
        >
          {pending ? "Publishing…" : "Publish my page"}
        </Button>
        <Button asChild size="lg" variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Preview</a></Button>
      </div>
      <p className="text-sm text-muted-foreground">Not ready? Everything is saved as a draft. Only you can see it until you publish.</p>
    </div>
  );
}
