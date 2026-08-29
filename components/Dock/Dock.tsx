"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { APPS } from "@/lib/apps";
import { useWindowStore } from "@/store/useWindowStore";
import {
  useSettingsStore,
  DOCK_ICON_SIZE_PX,
  DOCK_RAIL_WIDTH_PX,
} from "@/store/useSettingsStore";
import { PixelLogo } from "../Boot/PixelLogo";
import { AppIcon } from "./AppIcon";

// Milestone 2 — "pixel tooltips after ~300ms" (was 400ms).
const TOOLTIP_DELAY_MS = 300;

// Milestone 2 — "animate expansion like classic OS software: 120-160ms,
// no spring, no bounce." Applied to the rail width AND the icon
// hover/press motion, for one consistent "mechanical" character rather
// than springy motion on some elements and not others.
const MECHANICAL_RAIL = { duration: 0.14, ease: [0.4, 0, 0.2, 1] as const };
const MECHANICAL_ICON = { duration: 0.1, ease: "easeOut" as const };

interface TooltipState {
  id: string;
  label: string;
  top: number;
  left: number;
}

export function Dock() {
  const [hovered, setHovered] = useState(false);
  // Milestone 2 — "Esc closes expanded state" implies the rail can also
  // expand from keyboard focus, not just mouse hover/"always" mode
  // (otherwise there'd be nothing for Esc to close). Tracks focus-within
  // on the toolbar; Escape (in onItemKeyDown below) clears it.
  const [keyboardExpanded, setKeyboardExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);
  const tooltipTimer = useRef<number | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // The dock rail clips its own contents (`overflow-hidden`, needed for a
  // clean width-collapse animation) — a tooltip positioned as a normal
  // descendant would be cropped at the rail's edge the instant it tried to
  // render outside it. Portal it to <body> instead, positioned in fixed
  // viewport coordinates read fresh off the button when the delay fires.
  useEffect(() => setMounted(true), []);

  const windows = useWindowStore((s) => s.windows);
  const openApp = useWindowStore((s) => s.openApp);
  const dockMode = useSettingsStore((s) => s.dockMode);
  const dockIconSize = useSettingsStore((s) => s.dockIconSize);

  const expanded = dockMode === "always" || hovered || keyboardExpanded;
  const iconPx = DOCK_ICON_SIZE_PX[dockIconSize];
  // Milestone 2 — "Icon wells should be 40x40" (at the default "md" size:
  // 24 + 16 = 40). Scales with the existing Settings > Dock icon-size
  // preference rather than removing that feature — see MILESTONE2_REPORT.md.
  const wellPx = iconPx + 16;

  const openAppIds = new Set(
    windows.filter((w) => !w.minimized).map((w) => w.appId)
  );

  // Delayed tooltip — shown on both hover and keyboard focus (WCAG 1.4.13:
  // anything revealed on hover must also be reachable on focus). Coexists
  // with the rail's own expand-on-hover labels rather than being suppressed
  // by them: the label only finishes fading in ~150ms after `expanded`
  // flips, and "Always expanded" mode shows labels permanently either way,
  // so gating the tooltip on `!expanded` would make it fire essentially
  // never in the default interaction mode.
  const scheduleTooltip = (id: string, label: string) => {
    if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
    tooltipTimer.current = window.setTimeout(() => {
      const el = itemRefs.current[id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTooltip({ id, label, top: rect.top + rect.height / 2, left: rect.right + 8 });
    }, TOOLTIP_DELAY_MS);
  };
  const clearTooltip = () => {
    if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  // Roving arrow-key focus (Up/Down), Enter activates natively (real
  // <button>s), Escape collapses a keyboard-expanded rail — Milestone 2.
  const onItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = e.key === "ArrowDown" ? index + 1 : index - 1;
      const nextApp = APPS[nextIndex];
      if (nextApp) itemRefs.current[nextApp.id]?.focus();
      return;
    }
    if (e.key === "Escape") {
      setKeyboardExpanded(false);
      clearTooltip();
      (e.currentTarget as HTMLButtonElement).blur();
    }
  };

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ width: expanded ? DOCK_RAIL_WIDTH_PX.expanded : DOCK_RAIL_WIDTH_PX.collapsed }}
      transition={MECHANICAL_RAIL}
      className="cattipu-raised relative z-20 flex h-full shrink-0 flex-col items-stretch gap-2 overflow-hidden bg-bg-dim py-4"
    >
      <div className="mb-2 flex items-center gap-2 px-4">
        <span className="cattipu-badge flex h-8 w-8 shrink-0 items-center justify-center">
          <PixelLogo mode="retro" variant="mark" className="h-6 w-auto" />
        </span>
        <motion.span
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="cattipu-emboss-text whitespace-nowrap font-pixel-ui text-[0.5rem] tracking-wide text-ink-dim"
        >
          v0.2.5
        </motion.span>
      </div>

      <div
        role="toolbar"
        aria-label="Dock"
        aria-orientation="vertical"
        className="flex flex-col gap-2 px-2"
        onFocus={() => setKeyboardExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setKeyboardExpanded(false);
          }
        }}
      >
        {APPS.map((app, index) => {
          const active = openAppIds.has(app.id);
          return (
            <div key={app.id} className="relative">
              <button
                ref={(el) => {
                  itemRefs.current[app.id] = el;
                }}
                onClick={() => openApp(app.id, app.label)}
                onKeyDown={(e) => onItemKeyDown(e, index)}
                onMouseEnter={() => scheduleTooltip(app.id, app.label)}
                onMouseLeave={clearTooltip}
                onFocus={() => scheduleTooltip(app.id, app.label)}
                onBlur={clearTooltip}
                aria-label={app.label}
                aria-current={active ? "true" : undefined}
                className="cattipu-cursor-hand cattipu-dock-item group relative flex w-full items-center gap-2 rounded-md px-2 py-2 text-left"
              >
                {/* Milestone 2 — every icon sits in an individual 40x40
                    (at default size) molded well at all times. Idle: flush.
                    Hover (only when not active — a pressed switch doesn't
                    "lift"): 1px up + stronger bevel via .cattipu-dock-well's
                    :hover rule, no glow. Active: sinks 1-2px inward, deepest
                    bevel, navy tint. All motion is a short mechanical tween,
                    no spring. */}
                <motion.span
                  animate={{ y: active ? 2 : 0 }}
                  whileHover={active ? undefined : { y: -1 }}
                  transition={MECHANICAL_ICON}
                  data-active={active ? "true" : undefined}
                  className={[
                    // Milestone 6 (Mechanical Surface Consistency) — square
                    // corners (was rounded-[5px]), a disclosed exception to
                    // "the dock is frozen" scoped to this one radius value —
                    // see the .cattipu-dock-well comment in globals.css.
                    "cattipu-dock-well flex shrink-0 items-center justify-center",
                    active ? "bg-navy/12" : "",
                  ].join(" ")}
                  style={{ height: wellPx, width: wellPx }}
                >
                  {/* Milestone 2 — "Normalize every dock icon: 24x24" (at
                      default size). The source PNGs have varying intrinsic
                      aspect ratios (see docs/COMPONENT_LIBRARY.md's AppIcon
                      DIMS table) — redrawing all 11 assets is out of scope
                      for a dock-only pass, so this contains each one inside
                      a true square box instead, letterboxing narrower/wider
                      icons rather than stretching them. */}
                  <span
                    className="flex items-center justify-center overflow-hidden"
                    style={{ height: iconPx, width: iconPx }}
                  >
                    <AppIcon
                      icon={app.icon}
                      style={{ maxHeight: iconPx, maxWidth: iconPx, width: "auto", height: "auto" }}
                    />
                  </span>
                </motion.span>
                {/*
                  Typography pass — this label was rendering in the
                  modern body font (text-[13px] font-medium) while every
                  other piece of dock/window/card chrome text in the app
                  uses the pixel font — an accidental modern-font leak,
                  and the single most visible instance of it anywhere in
                  the shell. Fixed to font-pixel-ui, matching the "v0.2.5"
                  badge label directly above it in the same rail.
                  leading-none tightens the pixel font's fairly loose
                  ~1.5 default line-height so the label sits centered
                  against the icon rather than visually low. Gap to the
                  icon also moved from gap-3 (12px) to gap-2 (8px, this
                  milestone's standard icon-to-label spacing) on the
                  parent button above — well/hover/press mechanics
                  (Milestone 2) and rail geometry (Milestone 2/3) are
                  otherwise untouched.
                */}
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                  transition={{ duration: 0.15 }}
                  className={[
                    "cattipu-emboss-text whitespace-nowrap rounded-[3px] px-1 py-0.5 font-pixel-ui text-[0.45rem] leading-none tracking-wide text-ink",
                    active ? "text-navy" : "",
                  ].join(" ")}
                >
                  {app.label}
                </motion.span>
                {active && (
                  <motion.span
                    layoutId={`dot-${app.id}`}
                    className="cattipu-led ml-auto shrink-0"
                    style={{ opacity: expanded ? 1 : 0 }}
                  />
                )}
                {active && !expanded && (
                  <span
                    className="cattipu-led absolute right-1.5 top-1.5"
                    aria-hidden
                  />
                )}
              </button>

            </div>
          );
        })}
      </div>

      {mounted &&
        tooltip &&
        createPortal(
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className="cattipu-tooltip fixed z-50 px-2 py-1 font-pixel-ui text-[0.45rem] leading-none tracking-wide"
            style={{ top: tooltip.top, left: tooltip.left, transform: "translateY(-50%)" }}
          >
            {tooltip.label}
          </motion.span>,
          document.body
        )}
    </motion.div>
  );
}
