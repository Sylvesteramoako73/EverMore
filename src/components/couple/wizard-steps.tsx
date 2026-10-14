"use client";

import { useCallback, useTransition } from "react";
import { goToStep } from "@/app/actions/celebration";
import { Button } from "@/components/ui/button";
import { BasicsForm, DetailsForm, type BasicsValues, type CelebrationInfoValues } from "./detail-forms";
import type { OccasionKind } from "@/lib/occasions";

// Client wrappers that move the wizard forward once a step's form has saved successfully.

export function BasicsStep({ values }: { values?: BasicsValues }) {
  const next = useCallback(() => void goToStep(2), []);
  return <BasicsForm values={values} autosave={Boolean(values)} submitLabel="Save & continue" onSaved={next} />;
}

export function DetailsStep({ kind, values, zones }: { kind: OccasionKind; values: CelebrationInfoValues; zones: string[] }) {
  const next = useCallback(() => void goToStep(3), []);
  return <DetailsForm kind={kind} values={values} zones={zones} submitLabel="Save & continue" onSaved={next} />;
}

export function ContinueButton({ step, disabled, label = "Continue", hint }: { step: number; disabled?: boolean; label?: string; hint?: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="lg" disabled={disabled || pending} onClick={() => start(() => goToStep(step))}>
        {pending ? "One moment…" : label}
      </Button>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
