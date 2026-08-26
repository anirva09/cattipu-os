"use client";

import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import { Minus, Layers, X } from "lucide-react";
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

export function Window({ win, children }: WindowProps) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const setRect = useWindowStore((s) => s.setRect);

  const app = APP_MAP[win.appId];
  // Derived, not stored: "focused" is just "has the highest zIndex among
  // visible windows" — no changes to the window store needed for this.
  const isFocused = useWindowStore((s) =>
    s.windows.filter((w) => !w.minimized).every((w) => w.id === win.id || w.zIndex <= win.zIndex)
  );

  return (
    <Rnd
      size={
        win.maximized
          ? { width: "100%", height: "100%" }
          : { width: win.rect.width, height: win.rect.height }
      }
      position={win.maximized ? { x: 0, y: 0 } : { x: win.rect.x, y: win.rect.y }}
      minWidth={360}
      minHeight={260}
      bounds="parent"
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      dragHandleClassName="cattipu-window-titlebar"
      resizeHandleClasses={RESIZE_HANDLE_CLASSES}
      style={{ zIndex: win.zIndex }}
      onDragStop={(_, d) => setRect(win.id, { ...win.rect, x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setRect(win.id, {
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
      onMouseDown={() => focusWindow(win.id)}
      className="pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className={[
          "cattipu-raised flex h-full w-full flex-col overflow-hidden rounded-md bg-bg-dim p-[3px]",
          "shadow-[0_16px_40px_rgba(11,20,40,0.22)]",
          isFocused ? "cattipu-window-glow" : "",
        ].join(" ")}
      >
        <div className="cattipu-raised-navy cattipu-window-titlebar cattipu-cursor-hand relative flex h-11 shrink-0 items-center justify-between gap-3 rounded-t-[3px] bg-navy px-3 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-2">
            {app && <AppIcon icon={app.icon} className="h-4 w-auto shrink-0 opacity-90" />}
            <span className="cattipu-emboss-text-inverted truncate font-pixel-ui text-[0.55rem] tracking-wide text-white">
              {win.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => minimizeWindow(win.id)}
              className="cattipu-press flex h-6 w-7 items-center justify-center rounded-[3px] border-2 border-black/25 bg-gold text-black/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(0,0,0,0.18),0_1px_0_rgba(0,0,0,0.25)] hover:brightness-105"
              aria-label="Minimize"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
            <button
              onClick={() => toggleMaximize(win.id)}
              className="cattipu-press flex h-6 w-7 items-center justify-center rounded-[3px] border-2 border-black/25 bg-blue text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_0_rgba(0,0,0,0.18),0_1px_0_rgba(0,0,0,0.25)] hover:brightness-105"
              aria-label="Stack"
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => closeWindow(win.id)}
              className="cattipu-press flex h-6 w-7 items-center justify-center rounded-[3px] border-2 border-black/25 bg-red text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_0_rgba(0,0,0,0.18),0_1px_0_rgba(0,0,0,0.25)] hover:brightness-105"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          </div>
        </div>
        <div className="cattipu-recessed min-h-0 flex-1 overflow-auto rounded-b-[3px] bg-surface-solid">
          {children}
        </div>
      </motion.div>
    </Rnd>
  );
}
