"use client";

import { Loader2 } from "lucide-react";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Label + control + hint + errors, wired for assistive tech: the control gets an id, and the hint and
 * errors are linked through aria-describedby.
 */
export function Field({
  label,
  hint,
  errors,
  optional,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  className?: string;
  children: ReactElement<ControlProps>;
}) {
  const id = useId();
  const controlId = (isValidElement(children) && children.props.id) || id;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = errors?.length ? `${controlId}-error` : undefined;
  const control = cloneElement(children, {
    id: controlId,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": errors?.length ? true : undefined,
  });
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={controlId} className="text-sm font-medium text-navy">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {control}
      {hint && !errors?.length && (
        <p id={hintId} className="text-[0.8rem] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={errorId} className="text-[0.8rem] text-destructive" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pending: pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}

export function FormAlert({ state }: { state?: { ok?: boolean; message?: string } }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        state.ok ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      {state.message}
    </p>
  );
}

/** Spam trap: hidden from people and assistive tech; bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
