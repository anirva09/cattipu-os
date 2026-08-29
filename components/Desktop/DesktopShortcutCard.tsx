"use client";

/**
 * Milestone 1 (Home Screen Refinement) — "Desktop Shortcuts: replace simple
 * desktop buttons with reusable DesktopShortcutCard. 72x72 interaction area,
 * 24x24 icon, centered bitmap label." Replaces the inline <button> markup
 * that used to live directly in DesktopIcons.tsx. Interaction model
 * (click selects, double-click opens) is unchanged from before this
 * milestone — only the visual treatment and the extraction into a reusable
 * component are new.
 */

import { AppIcon } from "../Dock/AppIcon";

interface DesktopShortcutCardProps {
  label: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function DesktopShortcutCard({
  label,
  icon,
  selected,
  onSelect,
  onOpen,
}: DesktopShortcutCardProps) {
  return (
    <button
      aria-label={`Desktop shortcut: ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={onOpen}
      className={[
        // Milestone 6 (Mechanical Surface Consistency) — square corners
        // (was rounded-[5px]), matching every other control-tier element
        // (buttons, dock wells, project rows) this pass.
        "cattipu-cursor-hand flex flex-col items-center justify-center gap-1.5 transition-colors",
        "h-[72px] w-[72px]",
        selected ? "cattipu-recessed bg-navy/10" : "cattipu-raised bg-bg-dim/40 hover:bg-bg-dim/70",
      ].join(" ")}
    >
      <span className="flex h-6 w-6 items-center justify-center">
        <AppIcon icon={icon} style={{ height: 24 }} className="w-auto" />
      </span>
      <span
        className={[
          "cattipu-emboss-text line-clamp-2 px-1 text-center font-pixel-ui text-[0.4rem] leading-tight",
          selected ? "rounded-[2px] bg-navy text-white" : "text-ink",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
