"use client";

import { motion } from "framer-motion";
import { MoreHorizontal, Building2, Cpu, Globe2, Sparkles } from "lucide-react";
import { Wallpaper } from "./Wallpaper";
import { TopBar } from "./TopBar";
import { DesktopIcons } from "./DesktopIcons";
import { Dock } from "../Dock/Dock";
import { WindowManager } from "../Window/WindowManager";
import { CommandPalette } from "../CommandPalette/CommandPalette";
import { useProjectStore, type ProjectIcon } from "@/store/useProjectStore";
import { useWindowStore } from "@/store/useWindowStore";

const ICONS: Record<ProjectIcon, React.ComponentType<{ className?: string }>> = {
  banking: Building2,
  saas: Cpu,
  website: Globe2,
  generic: Sparkles,
};

export function Desktop() {
  const projects = useProjectStore((s) => s.projects);
  const openApp = useWindowStore((s) => s.openApp);

  return (
    <motion.div
      className="relative flex h-screen w-screen flex-col"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Wallpaper />
      <TopBar />

      <div className="relative z-10 flex min-h-0 flex-1">
        <Dock />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <DesktopIcons />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-8 top-8 w-[min(90vw,22rem)]"
          >
            <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(11,20,40,0.08)]">
              <h1 className="text-lg font-semibold text-ink">
                Welcome back, <span className="text-purple">Creator.</span>
              </h1>
              <p className="mt-1 text-sm text-ink-dim">What will we build today?</p>

              <div className="mt-5 rounded-lg border border-border bg-surface-solid">
                <div className="flex items-center justify-between px-3.5 pt-3">
                  <span className="text-[13px] font-semibold text-ink">
                    Recent Projects
                  </span>
                  <button
                    onClick={() => openApp("projects", "Projects")}
                    className="text-[12px] font-medium text-navy hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="mt-2 flex flex-col divide-y divide-border">
                  {projects.slice(0, 3).map((p) => {
                    const Icon = ICONS[p.icon];
                    return (
                      <button
                        key={p.id}
                        onClick={() => openApp("projects", "Projects")}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-bg"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2"
                          style={{ borderColor: p.color, color: p.color }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-ink-dim">{p.editedLabel}</p>
                        </span>
                        <MoreHorizontal className="h-4 w-4 shrink-0 text-ink-faint" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <WindowManager />
        </main>
      </div>

      <CommandPalette />
    </motion.div>
  );
}
