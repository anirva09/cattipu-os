"use client";

/**
 * Milestone 3 (Window Chrome Retrofit) — shared multi-line "workstation
 * field" primitive, same `.cattipu-field` construction as Input.tsx.
 * Built specifically for the Architect prompt field (the "Most Important"
 * item this milestone) but kept generic/reusable rather than
 * Architect-specific.
 */

import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        // Milestone 9 (Architect Input State Polish) — "Placeholder
        // styling." The pixel-monospace placeholder itself was already a
        // deliberate, previously-disclosed decision (Milestone 5); added
        // tracking-wide so it reads more like an etched instruction
        // plate on the field and less like a normal sentence sitting in
        // an empty box — a small refinement, not a reversal.
        "cattipu-field w-full resize-none px-3 py-2.5 font-body text-sm text-ink outline-none placeholder:font-code placeholder:text-[15px] placeholder:tracking-wide placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...rest}
    />
  );
}
