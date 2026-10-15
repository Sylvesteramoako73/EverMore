"use client";

import { useActionState, useState } from "react";
import { saveFund } from "@/app/actions/dashboard";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOMO_NETWORKS } from "@/lib/money";
import type { FormState } from "@/lib/validation";

export type FundValues = {
  id: string;
  title: string;
  description: string;
  goal: string;
  showProgress: boolean;
  momoNumber: string;
  momoName: string;
  momoNetwork: string;
};

export function FundForm({ fund, suggestedTitle, onDone }: { fund?: FundValues; suggestedTitle?: string; onDone?: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await saveFund(fund?.id ?? null, prev, fd);
    if (r?.ok) onDone?.();
    return r;
  }, undefined);
  const e = state?.errors ?? {};
  const v = state?.ok ? {} : (state?.values ?? {});
  return (
    <form action={action} className="space-y-4" noValidate key={state?.ok && !fund ? "done" : "form"}>
      <FormAlert state={state} />
      <Field label="Name" hint='e.g. "Wedding gift", "Trip fund", "Funeral contributions"' errors={e.title}>
        <Input name="title" defaultValue={v.title ?? fund?.title ?? suggestedTitle ?? ""} />
      </Field>
      <Field label="A short note" optional hint="What it is for, or how much each person should contribute." errors={e.description}>
        <Textarea name="description" rows={2} defaultValue={v.description ?? fund?.description ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Goal (GH₵)" optional hint="Shows a progress bar." errors={e.goal}>
          <Input name="goal" inputMode="decimal" defaultValue={v.goal ?? fund?.goal ?? ""} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-navy">
          <input type="checkbox" name="showProgress" defaultChecked={fund?.showProgress ?? true} className="h-4 w-4 accent-[var(--navy)]" />
          Show the amount raised to guests
        </label>
      </div>
      <fieldset className="space-y-4 rounded-xl bg-muted/50 p-4">
        <legend className="px-1 text-sm font-medium text-navy">Mobile Money for direct gifts</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="MoMo number" errors={e.momoNumber}>
            <Input name="momoNumber" type="tel" defaultValue={v.momoNumber ?? fund?.momoNumber ?? ""} />
          </Field>
          <Field label="Network" errors={e.momoNetwork}>
            <select name="momoNetwork" defaultValue={v.momoNetwork ?? fund?.momoNetwork ?? "MTN MoMo"} className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm">
              {MOMO_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Name on the account" hint="Guests see this so they know they are sending to the right person." errors={e.momoName}>
          <Input name="momoName" defaultValue={v.momoName ?? fund?.momoName ?? ""} />
        </Field>
      </fieldset>
      <SubmitButton pending="Saving…">{fund ? "Save fund" : "Add fund"}</SubmitButton>
    </form>
  );
}

export function EditFund({ fund }: { fund: FundValues }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="mt-4 w-full rounded-xl border border-border p-4">
      <FundForm fund={fund} onDone={() => setOpen(false)} />
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Edit</Button>
  );
}
