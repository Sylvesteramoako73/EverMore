"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy link", className, variant = "outline" }: { text: string; label?: string; className?: string; variant?: "outline" | "default" | "ghost" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}

/** A small button that runs a server action, with a pending state and an optional confirmation. */
export function ActionButton({
  action,
  children,
  confirm,
  className,
  variant = "ghost",
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  confirm?: string;
  className?: string;
  variant?: "ghost" | "outline" | "default" | "destructive";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      className={cn(pending && "opacity-60", className)}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          await action();
        });
      }}
    >
      {children}
    </Button>
  );
}
