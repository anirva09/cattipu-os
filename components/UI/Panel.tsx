"use client";

/**
 * Milestone 3 (Window Chrome Retrofit) — a chamfered/raised panel wrapper
 * with an optional navy title-bar-strip header, for the "Panel" item in
 * "Retrofit: Button, Input, Textarea, Panel, Window, Scrollbar."
 *
 * Scope note (disclosed in MILESTONE3_REPORT.md): this component is built
 * and available, but the Milestone-1 Home Screen cards that already have
 * their own shipped, approved ad hoc panel markup — DesktopShortcutCard,
 * ArchitectPreviewCard, SystemStatusCard, Toolbox, and Desktop.tsx's
 * Welcome card — are NOT retrofitted onto it this milestone. Home Screen
 * is out of Milestone 3's scope ("Refine every existing window
 * component... Only retrofit the chrome and shared window behavior"),
 * and those cards already match the approved Milestone 1 spec; swapping
 * their markup for this component would be a risk-for-no-gain rewrite of
 * already-approved UI. This Panel is available for future window-scoped
 * work (Architect sub-panels, etc.) and is not force-adopted anywhere
 * this milestone beyond what's listed in the report.
 */

import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

export function Panel({ title, icon, children, className, bodyClassName, ...rest }: PanelProps) {
  return (
    <div
      className={cn("cattipu-window-frame cattipu-raised flex flex-col overflow-hidden bg-bg-dim", className)}
      {...rest}
    >
      {title && (
        // Milestone 12 (Constitutional Foundation Retrofit) — bg-navy ->
        // bg-app-titlebar: any future window built on this shared Panel
        // primitive picks up the frozen "application windows are oxblood"
        // chrome rule for free, same as Window.tsx's real title bar.
        <div className="cattipu-titlebar cattipu-emboss-text-inverted flex h-8 shrink-0 items-center gap-2 bg-app-titlebar px-3 font-window-title text-[0.5rem] tracking-wide text-white">
          {icon}
          <span className="truncate">{title}</span>
        </div>
      )}
      <div className={cn("cattipu-recessed min-h-0 flex-1 bg-surface-solid", bodyClassName)}>{children}</div>
    </div>
  );
}
