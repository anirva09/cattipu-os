"use client";

import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 28 } },
};

export function RecommendationsPanel() {
  const data = useArchitectStore((s) => s.data);
  const viewRecommendation = useArchitectStore((s) => s.viewRecommendation);
  if (!data) return null;

  const nodeLabel = (id: string) => data.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-1 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          Smart recommendations
        </h3>
      </div>
      <p className="mb-4 max-w-lg text-[13px] text-ink-dim">
        CATTIPU&apos;s read on this architecture — proactive, not required.
      </p>

      {data.recommendations.length === 0 ? (
        <p className="text-[13px] text-ink-dim">No recommendations for this architecture.</p>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2">
          {data.recommendations.map((rec) => (
            <motion.button
              key={rec.id}
              variants={item}
              onClick={() => viewRecommendation(rec.targetNodeId)}
              className="cattipu-cursor-hand cattipu-raised group flex items-start gap-3 bg-surface-solid px-3.5 py-3 text-left"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-black/10 bg-gold/25 text-gold">
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{rec.text}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-navy group-hover:underline">
                  {nodeLabel(rec.targetNodeId)}
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
