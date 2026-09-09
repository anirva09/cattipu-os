"use client";

import { Layers } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import type { StackItem } from "@/lib/ai/types";

function StackRow({ s }: { s: StackItem }) {
  return (
    <tr>
      <td className="cattipu-emboss-text px-3 py-2 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
        {s.category}
      </td>
      <td className="px-3 py-2 font-mono text-[13px] font-semibold text-ink">{s.name}</td>
      <td className="px-3 py-2 text-[12px] text-ink-dim">{s.reason}</td>
      <td className="px-3 py-2 text-right">
        <span
          className={[
            "cattipu-status-pill px-1.5 py-0.5 font-pixel-ui text-[0.3rem] tracking-wide",
            s.tier === "core" ? "bg-navy text-white" : "bg-surface-solid text-ink-dim",
          ].join(" ")}
        >
          {s.tier === "core" ? "CORE" : "SUPPORT"}
        </span>
      </td>
    </tr>
  );
}

/**
 * Milestone 11 — "Recommended Stack" is a required top-level outline
 * section on its own now (was folded into the combined PlannerPanel as
 * of Milestone 10). Table markup carried over unchanged from that
 * milestone's "Suggested stack" section, just promoted to its own file
 * and renamed to match the brief's exact wording. `tier` stays an
 * authored editorial category (see lib/ai/types.ts), not a fabricated
 * score.
 */
export function StackPanel() {
  const data = useArchitectStore((s) => s.data);
  if (!data) return null;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Layers className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          Recommended stack
        </h3>
      </div>

      {data.stack.length === 0 ? (
        <p className="text-[13px] text-ink-dim">No stack recommendation for this architecture.</p>
      ) : (
        <div className="cattipu-recessed max-w-3xl overflow-hidden bg-surface-solid">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b-2 border-border-strong bg-bg-dim">
                <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                  LAYER
                </th>
                <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                  TECHNOLOGY
                </th>
                <th className="cattipu-emboss-text px-3 py-1.5 font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                  WHY
                </th>
                <th className="cattipu-emboss-text px-3 py-1.5 text-right font-pixel-ui text-[0.35rem] tracking-wide text-ink-faint">
                  TIER
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.stack.map((s) => (
                <StackRow key={s.id} s={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
