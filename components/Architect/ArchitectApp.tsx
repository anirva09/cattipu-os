"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckSquare,
  Waypoints,
  Database,
  Layers,
  Network,
  Lightbulb,
  Milestone,
  Boxes,
  Download,
  Server,
  Table2,
  Route,
  GitBranch,
} from "lucide-react";
import { useArchitectStore, type ArchitectTab } from "@/store/useArchitectStore";
import { CattipuSpinner } from "../System/CattipuSpinner";
import { PromptBar } from "./PromptBar";
import { BuildPlayback } from "./BuildPlayback";
import { SummaryPanel } from "./SummaryPanel";
import { FeaturesPanel } from "./FeaturesPanel";
import { StackPanel } from "./StackPanel";
import { ArchitectureCanvas } from "./ArchitectureCanvas";
import { DatabasePanel } from "./DatabasePanel";
import { ApiCatalogPanel } from "./ApiCatalogPanel";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { RoadmapPanel } from "./RoadmapPanel";
import { NodeInspector } from "./NodeInspector";
import { ExportCenter } from "./ExportCenter";

// Milestone 11 (Architect Retro Workstation Identity) — replaces the
// Milestone 10 top folder-tab row with a left "outline" list, per the
// brief's generated-state shell: left navigation / central workspace /
// right inspector / bottom status strip. Order follows the brief's
// required list (Product Summary, Features, Architecture, Data Model,
// Recommended Stack, Build Roadmap) with the two bonus sections from
// the earlier uncommitted sprint (APIs, Ideas) folded in between Stack
// and Roadmap rather than dropped — nothing already built is removed.
const SECTIONS: {
  id: ArchitectTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "features", label: "Features", icon: CheckSquare },
  { id: "architecture", label: "Architecture", icon: Waypoints },
  { id: "database", label: "Data Model", icon: Database },
  { id: "stack", label: "Stack", icon: Layers },
  { id: "apis", label: "APIs", icon: Network },
  { id: "recommendations", label: "Ideas", icon: Lightbulb },
  { id: "roadmap", label: "Roadmap", icon: Milestone },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ArchitectApp() {
  const status = useArchitectStore((s) => s.status);
  const data = useArchitectStore((s) => s.data);
  const activeTab = useArchitectStore((s) => s.activeTab);
  const setActiveTab = useArchitectStore((s) => s.setActiveTab);
  const error = useArchitectStore((s) => s.error);
  const playbackStage = useArchitectStore((s) => s.playbackStage);
  const setExportPanelOpen = useArchitectStore((s) => s.setExportPanelOpen);

  const tabsLocked = status === "playing"; // BuildPlayback drives the section during the reveal
  const hasWorkspace = !!data && status !== "generating";
  const systemReady = status === "playing" && playbackStage === "ready";
  const building = status === "playing";

  const serviceCount = data ? data.nodes.filter((n) => n.kind === "service").length : 0;

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
        /* Milestone 11 — further empty-state polish on top of Milestone
           9: the panel now sits on the same faint drafting-paper grid
           used by the Home Screen's Architect preview card, a small
           "technical planning software" cue reused rather than
           reinvented. Icon housing, copy spacing, and layout are
           otherwise untouched from Milestone 9's pass. */
        <div className="cattipu-drafting-paper flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center text-ink-dim">
          <span className="cattipu-recessed flex h-14 w-14 items-center justify-center bg-surface-solid">
            <Boxes className="h-7 w-7 text-ink-faint" strokeWidth={1.5} />
          </span>
          <p className="max-w-xs text-[13px] leading-relaxed">
            Describe the software you want, press Generate, and watch CATTIPU build the plan —
            summary, features, architecture, data model, stack, and roadmap.
          </p>
        </div>
      )}

      {hasWorkspace && data && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Toolbar — project record + Export, replacing the old
              tab-row's trailing Export button now that section
              switching lives in the left outline below. */}
          <div className="flex shrink-0 items-center gap-2 border-b-2 border-border-strong bg-bg-dim px-3.5 py-2">
            <GitBranch className="h-3.5 w-3.5 text-navy" strokeWidth={2.5} />
            <p className="cattipu-emboss-text truncate font-pixel-ui text-[0.42rem] tracking-wide text-navy">
              {data.projectName.toUpperCase()}
            </p>
            {!tabsLocked && (
              <button
                onClick={() => setExportPanelOpen(true)}
                className="cattipu-cursor-hand cattipu-press ml-auto flex shrink-0 items-center gap-1.5 border-2 border-black/20 bg-navy px-2.5 py-1 font-pixel-ui text-[0.42rem] text-white"
              >
                <Download className="h-3 w-3" strokeWidth={2.5} />
                Export
              </button>
            )}
            {tabsLocked && (
              <span className="ml-auto flex items-center gap-2 text-[11px] text-ink-faint">
                <CattipuSpinner size={3.5} />
                Building…
              </span>
            )}
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Left outline — the generated workspace's section list. */}
            <nav className="flex w-[152px] shrink-0 flex-col overflow-y-auto border-r-2 border-border-strong bg-bg-dim">
              {SECTIONS.map((s) => {
                const active = s.id === activeTab;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => !tabsLocked && setActiveTab(s.id)}
                    disabled={tabsLocked}
                    data-active={active || undefined}
                    className="cattipu-cursor-hand cattipu-outline-item font-pixel-ui text-[0.4rem] tracking-wide text-ink-dim"
                  >
                    <span className="cattipu-icon-tile">
                      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    {s.label.toUpperCase()}
                  </button>
                );
              })}
            </nav>

            {/* Center workspace. */}
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
                  {activeTab === "summary" && <SummaryPanel />}
                  {activeTab === "features" && <FeaturesPanel />}
                  {activeTab === "architecture" && <ArchitectureCanvas />}
                  {activeTab === "database" && <DatabasePanel />}
                  {activeTab === "stack" && <StackPanel />}
                  {activeTab === "apis" && <ApiCatalogPanel />}
                  {activeTab === "recommendations" && <RecommendationsPanel />}
                  {activeTab === "roadmap" && <RoadmapPanel />}
                </motion.div>
              </AnimatePresence>

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
                      className="cattipu-raised flex flex-col items-center gap-2 bg-surface-solid px-8 py-6"
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

            {/* Right inspector — only meaningful for the Architecture
                section (click a node to inspect it); other sections
                already carry their own internal structure (e.g. Data
                Model's SQL + ER split) and have no per-item selection
                concept, so they use the full center width instead. */}
            {activeTab === "architecture" && <NodeInspector />}
          </div>

          {/* Bottom status strip — persistent project metadata, visible
              regardless of which outline section is open. */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t-2 border-border-strong bg-surface-solid px-3.5 py-1.5">
            <StatusField icon={Server} label="SERVICES" value={pad2(serviceCount)} />
            <StatusField icon={Table2} label="TABLES" value={pad2(data.tables.length)} />
            <StatusField icon={Route} label="ENDPOINTS" value={pad2(data.apis.length)} />
            <StatusField icon={Milestone} label="PHASES" value={pad2(data.roadmap.length)} />
            <span className="ml-auto flex items-center gap-1.5">
              <span className="cattipu-led" aria-hidden />
              <span className="cattipu-emboss-text font-pixel-ui text-[0.35rem] tracking-wide text-navy">
                {building ? "BUILDING" : "PLAN READY"}
              </span>
            </span>
          </div>
        </div>
      )}

      <ExportCenter />
    </div>
  );
}

function StatusField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-ink-faint" strokeWidth={2.5} />
      <span className="font-mono text-[12px] font-semibold tabular-nums text-ink">{value}</span>
      <span className="cattipu-emboss-text font-pixel-ui text-[0.32rem] tracking-wide text-ink-faint">
        {label}
      </span>
    </span>
  );
}
