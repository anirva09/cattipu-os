"use client";

import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import type { ArchitectFeature } from "@/lib/ai/types";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function FeatureRow({ f, index }: { f: ArchitectFeature; index: number }) {
  return (
    <motion.tr variants={item}>
      <td className="cattipu-emboss-text w-10 px-3 py-2 font-mono text-[12px] text-ink-faint">
        {pad2(index + 1)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-ink">{f.label}</td>
      <td className="px-3 py-2 text-[12.5px] text-ink-dim">{f.description}</td>
    </motion.tr>
  );
}

/**
 * Milestone 11 — split out of the old combined PlannerPanel; "Features"
 * is now its own outline section, per the brief. Was a two-column grid
 * of rounded checkbox cards (Milestone 10) — replaced with a real
 * `<table>` so feature/description reads as columnar spec data, the
 * same "spreadsheet-like... table-like rows" treatment as the
 * Recommended Stack table below it in the outline.
 */
export function FeaturesPanel() {
  const data = useArchitectStore((s) => s.data);
  if (!data) return null;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          Feature breakdown
        </h3>
      </div>

      <div className="cattipu-recessed max-w-3xl overflow-hidden bg-surface-solid">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b-2 border-border-strong bg-bg-dim">
              <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                #
              </th>
              <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                FEATURE
              </th>
              <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                DESCRIPTION
              </th>
            </tr>
          </thead>
          <motion.tbody variants={container} initial="hidden" animate="show" className="divide-y divide-border">
            {data.features.map((f, i) => (
              <FeatureRow key={f.id} f={f} index={i} />
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
