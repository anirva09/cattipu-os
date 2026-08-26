"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Waypoints, Database, Milestone, Network, Lightbulb, Boxes, Download } from "lucide-react";
import { useArchitectStore, type ArchitectTab } from "@/store/useArchitectStore";
import { CattipuSpinner } from "../System/CattipuSpinner";
import { PromptBar } from "./PromptBar";
import { BuildPlayback } from "./BuildPlayback";
import { PlannerPanel } from "./PlannerPanel";
import { ArchitectureCanvas } from "./ArchitectureCanvas";
import { DatabasePanel } from "./DatabasePanel";
import { ApiCatalogPanel } from "./ApiCatalogPanel";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { RoadmapPanel } from "./RoadmapPanel";
import { NodeInspector } from "./NodeInspector";
import { ExportCenter } from "./ExportCenter";

const TABS: {
  id: ArchitectTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: "planner", label: "Planner", icon: CheckSquare },
  { id: "architecture", label: "Architecture", icon: Waypoints },
  { id: "database", label: "Database", icon: Database },
  { id: "apis", label: "APIs", icon: Network },
  { id: "recommendations", label: "Ideas", icon: Lightbulb },
  { id: "roadmap", label: "Roadmap", icon: Milestone },
];

export function ArchitectApp() {
  const status = useArchitectStore((s) => s.status);
  const data = useArchitectStore((s) => s.data);
  const activeTab = useArchitectStore((s) => s.activeTab);
  const setActiveTab = useArchitectStore((s) => s.setActiveTab);
  const error = useArchitectStore((s) => s.error);
  const playbackStage = useArchitectStore((s) => s.playbackStage);
  const setExportPanelOpen = useArchitectStore((s) => s.setExportPanelOpen);

  const tabsLocked = status === "playing"; // BuildPlayback drives the tab during the reveal
  const hasWorkspace = !!data && status !== "generating";
  const systemReady = status === "playing" && playbackStage === "ready";

  return (
    <div className="relative flex h-full flex-col bg-surface-solid">
      <span className="cattipu-screw z-20" style={{ top: 6, left: 6 }} aria-hidden />
      <span className="cattipu-screw z-20" style={{ top: 6, right: 6 }} aria-hidden />
      <BuildPlayback />
      <PromptBar />

      {status === "generating" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-ink-dim">
          <CattipuSpinner size={8} />
          <p className="cattipu-emboss-text font-pixel-ui text-[0.55rem] tracking-wide text-navy">
            CATTIPU IS THINKING…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-ink-dim">
          <p className="text-sm font-medium text-red">Generation failed</p>
          <p className="max-w-xs text-[12px]">{error}</p>
        </div>
      )}

      {status === "idle" && !data && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-ink-dim">
          <Boxes className="h-8 w-8 text-ink-faint" strokeWidth={1.5} />
          <p className="max-w-xs text-[13px]">
            Describe the software you want, press Generate, and watch CATTIPU build the plan —
            features, architecture, schema, and roadmap.
          </p>
        </div>
      )}

      {hasWorkspace && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-end gap-1 border-b-2 border-border-strong bg-bg-dim px-3 pt-2">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tabsLocked && setActiveTab(tab.id)}
                  disabled={tabsLocked}
                  className={[
                    "cattipu-cursor-hand cattipu-press flex items-center gap-1.5 px-3 py-1.5 font-pixel-ui text-[0.5rem] tracking-wide",
                    active
                      ? "cattipu-folder-tab-active cattipu-folder-tab text-navy"
                      : "cattipu-folder-tab text-ink-dim hover:text-navy",
                    tabsLocked && !active ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {tab.label}
                </button>
              );
            })}

            {!tabsLocked && (
              <button
                onClick={() => setExportPanelOpen(true)}
                className="cattipu-cursor-hand cattipu-press ml-auto mb-2 flex shrink-0 items-center gap-1.5 rounded-[4px] border-2 border-black/20 bg-navy px-2.5 py-1 font-pixel-ui text-[0.42rem] text-white"
              >
                <Download className="h-3 w-3" strokeWidth={2.5} />
                Export Project
              </button>
            )}
            {tabsLocked && (
              <span className="ml-auto flex items-center gap-2 pb-2.5 pr-1 text-[11px] text-ink-faint">
                <CattipuSpinner size={3.5} />
                Building…
              </span>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {activeTab === "planner" && <PlannerPanel />}
                {activeTab === "architecture" && <ArchitectureCanvas />}
                {activeTab === "database" && <DatabasePanel />}
                {activeTab === "apis" && <ApiCatalogPanel />}
                {activeTab === "recommendations" && <RecommendationsPanel />}
                {activeTab === "roadmap" && <RoadmapPanel />}
              </motion.div>
            </AnimatePresence>
            <NodeInspector />

            <AnimatePresence>
              {systemReady && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/25"
                >
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="cattipu-raised flex flex-col items-center gap-2 rounded-md bg-surface-solid px-8 py-6"
                  >
                    <div className="flex gap-1.5">
                      {["var(--color-gold)", "var(--color-red)", "var(--color-blue)", "var(--color-green)"].map(
                        (c) => (
                          <span key={c} className="h-2 w-2 rounded-[1px]" style={{ background: c }} />
                        )
                      )}
                    </div>
                    <p className="cattipu-emboss-text font-pixel-ui text-[0.7rem] tracking-wide text-navy">
                      SYSTEM READY.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <ExportCenter />
    </div>
  );
}
