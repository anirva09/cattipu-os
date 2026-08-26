"use client";

import { motion } from "framer-motion";
import { CheckSquare, ChevronRight } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 28 } },
};

export function PlannerPanel() {
  const data = useArchitectStore((s) => s.data);
  const status = useArchitectStore((s) => s.status);

  if (!data) return null;

  const discovering = status === "playing" || status === "generating";

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          {discovering ? "Discovering features…" : "Feature breakdown"}
        </h3>
      </div>

      <p className="mb-4 max-w-lg text-[13px] text-ink-dim">{data.summary}</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {data.features.map((f) => (
          <motion.div
            key={f.id}
            variants={item}
            className="cattipu-raised flex items-start gap-2.5 rounded-md bg-surface-solid px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border-2 border-navy bg-navy/10">
              <CheckSquare className="h-3 w-3 text-navy" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{f.label}</p>
              <p className="text-[12px] text-ink-dim">{f.description}</p>
            </span>
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
