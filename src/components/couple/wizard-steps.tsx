"use client";

import { useCallback, useTransition } from "react";
import { goToStep } from "@/app/actions/wedding";
import { Button } from "@/components/ui/button";
import { CoupleForm, WeddingInfoForm, type CoupleValues, type WeddingInfoValues } from "./detail-forms";

// Client wrappers that move the wizard forward once a step's form has saved successfully.

export function CoupleStep({ values }: { values?: CoupleValues }) {
  const next = useCallback(() => void goToStep(2), []);
  return <CoupleForm values={values} autosave={Boolean(values)} submitLabel="Save & continue" onSaved={next} />;
}

export function WeddingInfoStep({ values, zones }: { values: WeddingInfoValues; zones: string[] }) {
  const next = useCallback(() => void goToStep(3), []);
  return <WeddingInfoForm values={values} zones={zones} submitLabel="Save & continue" onSaved={next} />;
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
