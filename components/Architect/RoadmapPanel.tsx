"use client";

import { motion } from "framer-motion";
import { Milestone, Circle, ChevronDown } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

export function RoadmapPanel() {
  const data = useArchitectStore((s) => s.data);
  const roadmapCollapsed = useArchitectStore((s) => s.roadmapCollapsed);
  const togglePhase = useArchitectStore((s) => s.toggleRoadmapPhase);
  if (!data) return null;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Milestone className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          Implementation roadmap
        </h3>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="relative pl-4">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong" aria-hidden />
        <div className="flex flex-col gap-3.5">
          {data.roadmap.map((p) => {
            const collapsed = !!roadmapCollapsed[p.id];
            return (
              <motion.div key={p.id} variants={item} className="relative">
                <span className="cattipu-badge absolute -left-[21px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full">
                  <Circle className="h-1.5 w-1.5 fill-navy text-navy" />
                </span>
                <div className="cattipu-raised overflow-hidden rounded-md bg-surface-solid">
                  <button
                    onClick={() => togglePhase(p.id)}
                    className="cattipu-cursor-hand flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <p className="cattipu-emboss-text font-pixel-ui text-[0.4rem] tracking-wider text-navy">
                        Phase {p.phase}
                      </p>
                      <p className="mt-1 text-[13.5px] font-semibold text-ink">{p.title}</p>
                    </span>
                    <ChevronDown
                      className={["h-4 w-4 shrink-0 text-ink-faint transition-transform", collapsed ? "-rotate-90" : ""].join(" ")}
                      strokeWidth={2.5}
                    />
                  </button>
                  {!collapsed && (
                    <ul className="flex flex-wrap gap-1.5 border-t border-border px-3.5 pb-3 pt-2.5">
                      {p.items.map((it) => (
                        <li
                          key={it}
                          className="cattipu-recessed rounded-[3px] bg-bg px-1.5 py-0.5 text-[11px] text-ink-dim"
                        >
                          {it}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
