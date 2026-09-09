"use client";

import { motion } from "framer-motion";
import type { AppDef } from "@/lib/apps";
import { AppIcon } from "@/components/Icons/AppIcon";

export function PlaceholderApp({ app }: { app: AppDef }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface-solid px-8 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <AppIcon icon={app.icon} className="h-16 w-auto" />
      </motion.div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold text-ink">{app.label}</h2>
        <p className="max-w-xs text-sm text-ink-dim">{app.tagline}</p>
      </div>
      <span className="mt-2 rounded-full border border-border bg-bg px-3 py-1 text-[11px] font-medium tracking-wide text-ink-dim">
        On the CATTIPU OS roadmap — not in v0.1
      </span>
    </div>
  );
}
