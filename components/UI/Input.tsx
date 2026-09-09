"use client";

/**
 * Milestone 3 (Window Chrome Retrofit) — shared single-line "workstation
 * field" primitive. Square corners, inset bevel, embossed border (the
 * `.cattipu-field` class in globals.css — a dedicated field class, not a
 * reuse of `.cattipu-recessed`, so field-specific tuning like the outer
 * highlight line doesn't ripple into every other recessed surface).
 *
 * Adopted this milestone at one real in-window call site:
 * components/Window/ProjectsApp.tsx's "New Project" name field. Other
 * existing custom inputs (SettingsApp's toggles/wallpaper picker/volume
 * slider) are a different control shape entirely (not text fields) and
 * were left alone — out of scope for a chrome-retrofit pass, see
 * MILESTONE3_REPORT.md.
 */

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        "cattipu-field w-full px-3 py-1.5 font-body text-sm text-ink outline-none placeholder:font-code placeholder:text-[15px] placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...rest}
    />
  );
}
