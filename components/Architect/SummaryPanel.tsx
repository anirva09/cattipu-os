"use client";

import { FileText } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

/**
 * Milestone 11 (Architect Retro Workstation Identity) — one of three
 * panels this milestone splits out of the old combined PlannerPanel
 * (summary + features + stack in one scroll), so "Product Summary" can
 * be its own named outline section per the brief's required list. A
 * project-record plaque (name + verbatim prompt) plus the summary
 * paragraph — dense and boxed, no card, no chat-bubble framing.
 */
export function SummaryPanel() {
  const data = useArchitectStore((s) => s.data);
  if (!data) return null;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          Product summary
        </h3>
      </div>

      <div className="cattipu-recessed mb-4 max-w-xl bg-surface-solid px-4 py-3.5">
        <p className="cattipu-emboss-text font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
          PROJECT
        </p>
        <p className="mt-1 text-[15px] font-semibold text-ink">{data.projectName}</p>

        <p className="cattipu-emboss-text mt-3 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
          PROMPT
        </p>
        <p className="mt-1 font-code text-[14px] leading-snug text-ink-dim">“{data.prompt}”</p>
      </div>

      <div className="cattipu-hgroove my-4 max-w-xl" aria-hidden />

      <p className="cattipu-emboss-text mb-2 font-pixel-ui text-[0.4rem] tracking-wide text-ink-faint">
        SUMMARY
      </p>
      <p className="max-w-xl text-[13px] leading-relaxed text-ink-dim">{data.summary}</p>
    </div>
  );
}
