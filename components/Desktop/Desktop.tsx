"use client";

import { motion } from "framer-motion";
import { MoreHorizontal, Building2, Cpu, Globe2, Sparkles } from "lucide-react";
import { Wallpaper } from "./Wallpaper";
import { TopBar } from "./TopBar";
import { DesktopIcons } from "./DesktopIcons";
import { DeskScene } from "./DeskScene";
import { ArchitectPreviewCard } from "./ArchitectPreviewCard";
import { SystemStatusCard } from "./SystemStatusCard";
import { Toolbox } from "./Toolbox";
import { CattipuButton } from "@/components/UI/Button";
import { Dock } from "../Dock/Dock";
import { WindowManager } from "../Window/WindowManager";
import { CommandPalette } from "../CommandPalette/CommandPalette";
import { NotificationCenter } from "../System/NotificationCenter";
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

          {/* Milestone 1 (Home Screen Refinement) — this region grows from a
              single small card to include Architect Preview / System Status
              / Toolbox (none of which existed before this milestone; see
              docs/HOME_SPEC.md), per the explicit per-section instructions.
              The dock, top bar, and desktop-icon positions are unchanged —
              this is the one place the instruction to add those sections
              necessarily widens the existing floating region rather than
              leaving it at its old 22rem width. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-8 top-8 w-[min(90vw,26rem)]"
          >
            <div className="cattipu-raised flex flex-col gap-4 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-ink">
                    Welcome back, <span className="text-purple">Creator.</span>
                  </h1>
                  <p className="mt-1 text-sm text-ink-dim">What will we build today?</p>
                </div>
                <DeskScene className="h-16 w-20 shrink-0" />
              </div>

              <div className="cattipu-recessed flex flex-col overflow-hidden rounded-md bg-surface-solid">
                <div className="flex items-center justify-between px-4 pt-3">
                  <span className="font-pixel-ui text-[0.42rem] tracking-wide text-ink-dim">
                    RECENT PROJECTS
                  </span>
                  <CattipuButton size="sm" onClick={() => openApp("projects", "Projects")}>
                    View all
                  </CattipuButton>
                </div>
                <div className="mt-2 flex flex-col gap-1.5 p-2">
                  {projects.slice(0, 3).map((p) => {
                    const Icon = ICONS[p.icon];
                    // No progress field exists on Project (see
                    // docs/DESIGN_TOKENS.json / DESIGN_CONSTITUTION.md) — a
                    // real, non-fabricated two-state signal instead of an
                    // invented percentage: full bar once Architect has
                    // generated something, a starter sliver otherwise.
                    const fill = p.architect.data ? 100 : 20;
                    return (
                      <button
                        key={p.id}
                        onClick={() => openApp("projects", "Projects")}
                        // Milestone 6 (Mechanical Surface Consistency) —
                        // square corners (was rounded-[5px]), unified with
                        // ProjectsApp.tsx's project rows (previously
                        // rounded-lg) — same "project row" role, two
                        // different radii; see ProjectsApp.tsx.
                        className="cattipu-recessed flex flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-bg"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center border-2"
                            style={{ borderColor: p.color, color: p.color }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {p.name}
                            </p>
                            <p className="font-code text-[11px] text-ink-dim">
                              {p.editedLabel}
                            </p>
                          </span>
                          <MoreHorizontal className="h-4 w-4 shrink-0 text-ink-faint" />
                        </span>
                        <span className="cattipu-pixel-bar rounded-[1px]">
                          <span style={{ width: `${fill}%` }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ArchitectPreviewCard />
              <SystemStatusCard />
              <Toolbox />
            </div>
          </motion.div>

          <WindowManager />
        </main>
      </div>

      <CommandPalette />
      {/* Milestone 12 (Constitutional Foundation Retrofit) — mounted once,
          high in the tree, same pattern as CommandPalette above: it reads
          its own queue from useNotificationStore and renders nothing when
          the queue is empty. */}
      <NotificationCenter />
    </motion.div>
  );
}
