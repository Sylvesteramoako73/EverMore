"use client";

import { Check, CloudOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FormState } from "@/lib/validation";

type Status = "idle" | "saving" | "saved" | "invalid" | "error";

/**
 * Saves a form a moment after the couple stops typing. Saving runs the same server action as the
 * Continue button; incomplete forms simply wait (shown as "Not saved yet") until they validate.
 */
export function useAutosave(
  formRef: RefObject<HTMLFormElement | null>,
  action: (prev: FormState, data: FormData) => Promise<FormState>,
  delay = 1200,
) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  const save = useCallback(async () => {
    const form = formRef.current;
    if (!form) return;
    const run = ++latest.current;
    setStatus("saving");
    try {
      const result = await action(undefined, new FormData(form));
      if (run !== latest.current) return; // a newer save superseded this one
      setStatus(result?.ok ? "saved" : "invalid");
    } catch {
      if (run === latest.current) setStatus("error");
    }
  }, [action, formRef]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(save, delay);
  }, [save, delay]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { status, schedule, flush: save };
}

export function AutosaveStatus({ status }: { status: Status }) {
  const map: Record<Status, { icon: React.ReactNode; text: string } | null> = {
    idle: null,
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Saving…" },
    saved: { icon: <Check className="h-3.5 w-3.5 text-success" />, text: "All changes saved" },
    invalid: { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Not saved yet: complete the required fields" },
    error: { icon: <CloudOff className="h-3.5 w-3.5 text-destructive" />, text: "Couldn't save. Check your connection." },
  };
  const s = map[status];
  return (
    <p aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
      {s && (
        <>
          <span aria-hidden>{s.icon}</span>
          {s.text}
        </>
      )}
    </p>
  );
}
