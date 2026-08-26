"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { APPS } from "@/lib/apps";
import { useWindowStore } from "@/store/useWindowStore";
import { useSettingsStore, DOCK_ICON_SIZE_PX } from "@/store/useSettingsStore";
import { PixelLogo } from "../Boot/PixelLogo";
import { AppIcon } from "./AppIcon";

export function Dock() {
  const [hovered, setHovered] = useState(false);
  const windows = useWindowStore((s) => s.windows);
  const openApp = useWindowStore((s) => s.openApp);
  const dockMode = useSettingsStore((s) => s.dockMode);
  const dockIconSize = useSettingsStore((s) => s.dockIconSize);

  // behavior is unchanged from v0.1 — hover still expands/collapses the
  // rail exactly as before. "Always expanded" (Settings > Dock) simply
  // pins it open; it doesn't touch the hover mechanic itself.
  const expanded = dockMode === "always" || hovered;
  const iconPx = DOCK_ICON_SIZE_PX[dockIconSize];

  const openAppIds = new Set(
    windows.filter((w) => !w.minimized).map((w) => w.appId)
  );

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ width: expanded ? 196 : 64 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="cattipu-raised relative z-20 flex h-full shrink-0 flex-col items-stretch gap-1 overflow-hidden bg-bg-dim py-3"
    >
      <div className="mb-2 flex items-center gap-2.5 px-3.5">
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

      <div className="flex flex-col gap-1.5 px-2.5">
        {APPS.map((app) => {
          const active = openAppIds.has(app.id);
          return (
            <button
              key={app.id}
              onClick={() => openApp(app.id, app.label)}
              title={app.label}
              className="cattipu-cursor-hand group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-left"
            >
              <motion.span
                animate={{ y: active ? -2 : 0 }}
                whileHover={{ y: -2, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 400, damping: 14 }}
                className={[
                  "flex shrink-0 items-center justify-center rounded-[5px]",
                  active ? "cattipu-recessed" : "border-2 border-transparent",
                ].join(" ")}
                style={{ height: iconPx + 10, width: iconPx + 10 }}
              >
                <AppIcon icon={app.icon} style={{ height: iconPx }} className="w-auto" />
              </motion.span>
              <motion.span
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                transition={{ duration: 0.15 }}
                className={[
                  "cattipu-emboss-text whitespace-nowrap rounded-[3px] px-1 py-0.5 text-[13px] font-medium text-ink",
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
          );
        })}
      </div>
    </motion.div>
  );
}
