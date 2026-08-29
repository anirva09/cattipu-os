"use client";

/**
 * Milestone 3 (Window Chrome Retrofit) — relocated from
 * components/Desktop/CattipuButton.tsx into the shared components/UI/
 * directory as part of "Update reusable components only. Retrofit:
 * Button, Input, Textarea, Panel, Window, Scrollbar." Export name kept as
 * `CattipuButton` (not renamed to `Button`) to avoid churning every call
 * site's JSX for a rename with no behavioral purpose — only the import
 * path changes. No visual changes in this move; still the same
 * `.cattipu-btn` bevel primitive used since Milestone 1's Toolbox pass.
 * (See components/UI/Panel.tsx's header for why the Milestone-1 Home
 * Screen cards that also use `.cattipu-btn`-adjacent markup were not
 * swept onto these new primitives this milestone.)
 */

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CattipuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  icon?: ReactNode;
  children: ReactNode;
}

export function CattipuButton({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className,
  ...rest
}: CattipuButtonProps) {
  return (
    <button
      className={cn(
        // Typography/spacing pass — gap-1.5 (6px, off the 8px grid) → gap-2
        // (8px), matching the grid-aligned icon-to-label gap now used
        // everywhere else an icon sits next to a text label (dock items,
        // the top bar).
        // Milestone 6 (Mechanical Surface Consistency) — square corners
        // (was rounded-[5px]): every control-tier surface (buttons,
        // fields, window controls, the switch, project rows, dock wells)
        // is now hard 0-radius, one tier below the card-tier rounded-md
        // used by raised panels.
        "cattipu-cursor-hand cattipu-btn flex items-center justify-center gap-2 font-pixel-ui uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-[0.42rem]" : "px-3 py-2 text-[0.5rem]",
        variant === "primary"
          ? "bg-navy text-white hover:bg-navy/90"
          : "bg-surface-solid text-ink hover:bg-bg",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
