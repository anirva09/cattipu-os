"use client";

import { Rnd } from "react-rnd";
import { Minus, Square, X } from "lucide-react";
import type { WindowInstance } from "@/store/useWindowStore";
import { useWindowStore } from "@/store/useWindowStore";
import { APP_MAP } from "@/lib/apps";
import { AppIcon } from "../Dock/AppIcon";

interface WindowProps {
  win: WindowInstance;
  children: React.ReactNode;
}

const RESIZE_HANDLE_CLASSES = {
  top: "cattipu-resize-handle",
  right: "cattipu-resize-handle",
  bottom: "cattipu-resize-handle",
  left: "cattipu-resize-handle",
  topRight: "cattipu-resize-handle",
  bottomRight: "cattipu-resize-handle",
  bottomLeft: "cattipu-resize-handle",
  topLeft: "cattipu-resize-handle",
};

// Milestone 3 (Window Chrome Retrofit) — three window-control buttons,
// Minimize / Maximize-Restore / Close. "No colored filled buttons": every
// control shares one neutral molded-key treatment (.cattipu-window-control)
// and is told apart only by its icon glyph, not a bg-gold/bg-blue/bg-red
// fill. Milestone 4 (Window Interaction Polish) dropped the extra
// `.cattipu-press` class that used to sit alongside `.cattipu-window-
// control` here — the two classes' `:active` rules disagreed (a
// translateY(1px)+spring easing from `.cattipu-press` vs.
// `.cattipu-window-control`'s own, higher-specificity
// translateY(1.5px)+instant snap), and `.cattipu-window-control`'s own
// pressed state already fully covers this control, so the extra class was
// dead weight rather than a real second effect.
//
// Milestone 12 (Constitutional Foundation Retrofit) — "Standardize window
// controls to 24×24 molded buttons using [_] [□] [X]." Sizing was already
// exactly --window-control (24px) via .cattipu-window-control; the only
// real change is the middle glyph: Lucide's `Layers` (a stack icon, no
// real "maximize" reading and explicitly named in the brief as forbidden)
// is replaced with `Square` — a hollow square, the plain "[□]" restore/
// maximize glyph the constitution calls for. Minimize (`Minus`, already
// reading as "[_]") and Close (`X`, already "[X]") are unchanged. This is
// a glyph swap only — toggleMaximize's behavior is untouched, and the
// button still shows the same glyph in both directions (maximize and
// restore), matching the brief's three-glyph vocabulary rather than
// inventing a fourth "restore" icon.
function WindowControl({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="cattipu-window-control" aria-label={label}>
      {children}
    </button>
  );
}

export function Window({ win, children }: WindowProps) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const setRect = useWindowStore((s) => s.setRect);

  const app = APP_MAP[win.appId];
  const isFocused = useWindowStore((s) =>
    s.windows.filter((w) => !w.minimized).every((w) => w.id === win.id || w.zIndex <= win.zIndex)
  );

  return (
    <Rnd
      size={win.maximized ? { width: "100%", height: "100%" } : { width: win.rect.width, height: win.rect.height }}
      position={win.maximized ? { x: 0, y: 0 } : { x: win.rect.x, y: win.rect.y }}
      minWidth={360}
      minHeight={260}
      bounds="parent"
      // Milestone 4 — "dragging feels stable and mechanical": snap drag
      // moves to a 2px grid instead of following raw (often fractional)
      // pointer deltas 1:1. Resizing is untouched — only drag is in this
      // milestone's scope, and snapping resize could shift an app's
      // content by a stray pixel in ways that read as a layout change.
      dragGrid={[2, 2]}
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      dragHandleClassName="cattipu-window-titlebar"
      resizeHandleClasses={RESIZE_HANDLE_CLASSES}
      style={{ zIndex: win.zIndex }}
      onDragStop={(_, d) => setRect(win.id, { ...win.rect, x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setRect(win.id, { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight })
      }
      onMouseDown={() => focusWindow(win.id)}
      className="pointer-events-auto"
    >
      {/*
        Milestone 4 (Window Interaction Polish) — the old mount animation
        (Framer Motion opacity/scale/y spring) and the frame's separate
        blurred `shadow-[0_16px_40px_...]` are both gone: "no spring
        motion... floating shadows... easing-heavy transitions." Windows
        now just appear (Mac OS 8 / BeOS windows don't pop in), and the
        frame's only depth cue is `.cattipu-raised`'s existing hard,
        zero-blur bevel shadow — no second, softer shadow layered on top.
        Focus is no longer shown with a glow ring either; see the title
        bar's `data-focused` below for the new, title-bar-only contrast
        cue.
      */}
      <div
        data-accent={app?.chromeAccent}
        className={[
          "cattipu-raised cattipu-window-frame flex h-full w-full flex-col overflow-hidden bg-bg-dim p-[3px]",
        ].join(" ")}
      >
        <div
          data-focused={isFocused}
          className="cattipu-titlebar cattipu-window-titlebar relative flex shrink-0 select-none items-center justify-between gap-4 bg-app-titlebar px-4"
          style={{ height: "var(--window-title-bar)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {app && <AppIcon icon={app.icon} className="h-4 w-auto shrink-0 opacity-90" />}
            <span className="cattipu-emboss-text-inverted cattipu-titlebar-label truncate font-window-title text-[0.55rem] tracking-wide text-white">
              {win.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WindowControl onClick={() => minimizeWindow(win.id)} label="Minimize">
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </WindowControl>
            <WindowControl
              onClick={() => toggleMaximize(win.id)}
              label={win.maximized ? "Restore" : "Maximize"}
            >
              <Square className="h-3.5 w-3.5" strokeWidth={2.5} />
            </WindowControl>
            <WindowControl onClick={() => closeWindow(win.id)} label="Close">
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </WindowControl>
          </div>
        </div>
        <div className="cattipu-recessed min-h-0 flex-1 overflow-auto bg-surface-solid">
          {children}
        </div>
      </div>
    </Rnd>
  );
}
