"use client";

import { useActionState, useState } from "react";
import { saveMemory, saveReminders } from "@/app/actions/dashboard";
import { Field, FormAlert, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/validation";

export type MemoryValues = { id: string; title: string; body: string; happenedOn: string; location: string; isPublic: boolean };

export function MemoryForm({ memory, onDone }: { memory?: MemoryValues; onDone?: () => void }) {
  // Bumped after each successful add so the fields clear.
  const [round, setRound] = useState(0);
  const [state, action] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await saveMemory(memory?.id ?? null, prev, fd);
    if (r?.ok) {
      onDone?.();
      if (!memory) setRound((n) => n + 1);
    }
    return r;
  }, undefined);
  const e = state?.errors ?? {};
  const v = state?.ok ? {} : (state?.values ?? {});
  return (
    <form action={action} className="space-y-4" noValidate key={round}>
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="What happened" errors={e.title}>
          <Input name="title" defaultValue={v.title ?? memory?.title ?? ""} placeholder="Our first home, Baby Ama arrives, 10 years together…" />
        </Field>
        <Field label="When" errors={e.happenedOn}>
          <Input name="happenedOn" type="date" defaultValue={v.happenedOn ?? memory?.happenedOn ?? ""} />
        </Field>
      </div>
      <Field label="Where" optional errors={e.location}>
        <Input name="location" defaultValue={v.location ?? memory?.location ?? ""} />
      </Field>
      <Field label="The story" optional errors={e.body}>
        <Textarea name="body" rows={3} defaultValue={v.body ?? memory?.body ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" name="isPublic" defaultChecked={memory?.isPublic ?? true} className="h-4 w-4 accent-[var(--navy)]" />
        Show on our page (untick to keep it private, just for you)
      </label>
      <SubmitButton pending="Saving…">{memory ? "Save memory" : "Add memory"}</SubmitButton>
    </form>
  );
}

export function EditMemory({ memory }: { memory: MemoryValues }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="mt-4 w-full rounded-xl border border-border p-4">
      <MemoryForm memory={memory} onDone={() => setOpen(false)} />
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Edit</Button>
  );
}

const DAYS: [number, string][] = [
  [0, "On the day"],
  [1, "The day before"],
  [7, "A week before"],
  [30, "A month before"],
];

export function RemindersForm({ values, what }: { values: { emailEnabled: boolean; remindDaysBefore: number[] }; what: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveReminders, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
        <input type="checkbox" name="emailEnabled" defaultChecked={values.emailEnabled} className="mt-1 h-4 w-4 accent-[var(--navy)]" />
        <span>
          <span className="block text-sm font-medium text-navy">Email me before {what}</span>
          <span className="block text-sm text-muted-foreground">With a nudge to add a memory from the year.</span>
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-navy">When</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(([n, label]) => (
            <label key={n} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy">
              <input type="checkbox" name="remindDaysBefore" value={n} defaultChecked={values.remindDaysBefore.includes(n)} className="accent-[var(--navy)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="includeMemoryPrompt" value="on" />
      <SubmitButton pending="Saving…">Save reminders</SubmitButton>
    </form>
  );
}
