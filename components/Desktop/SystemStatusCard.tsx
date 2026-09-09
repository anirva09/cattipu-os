"use client";

/**
 * Milestone 1 (Home Screen Refinement) — "System Status: convert cards
 * into embossed status rows." Didn't exist before this milestone (see
 * docs/HOME_SPEC.md). Rather than fabricate fake uptime/metrics, each row
 * reflects real state already in the app (Settings store), so nothing
 * here is invented data — it's a real status readout, just a small one.
 */

import { useSettingsStore } from "@/store/useSettingsStore";

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    // px-3.5 (14px, a one-off value matching nothing else in the app) →
    // px-4 (16px), the same chrome-header padding standard as this
    // card's own navy strip above it.
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <span className="cattipu-emboss-text font-pixel-ui text-[0.4rem] tracking-wide text-ink-dim">
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: ok ? "var(--color-success)" : "var(--color-ink-faint)" }}
          aria-hidden
        />
        <span className="font-code text-[13px] tabular-nums text-ink">{value}</span>
      </span>
    </div>
  );
}

export function SystemStatusCard() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const cursorEnabled = useSettingsStore((s) => s.cursorEnabled);
  const dockMode = useSettingsStore((s) => s.dockMode);

  return (
    <div className="cattipu-raised flex w-full flex-col overflow-hidden rounded-md">
      <div className="cattipu-raised-navy flex h-7 shrink-0 items-center bg-navy px-4">
        <span className="cattipu-emboss-text-inverted font-pixel-ui text-[0.42rem] tracking-wide text-white">
          SYSTEM STATUS
        </span>
      </div>
      <div className="cattipu-recessed flex flex-col divide-y divide-border bg-surface-solid">
        <StatusRow label="DESKTOP" ok value="READY" />
        <StatusRow label="SOUND" ok={soundEnabled} value={soundEnabled ? "ON" : "OFF"} />
        <StatusRow label="CURSOR" ok={cursorEnabled} value={cursorEnabled ? "ON" : "OFF"} />
        <StatusRow
          label="DOCK MODE"
          ok
          value={dockMode === "always" ? "PINNED" : "HOVER"}
        />
      </div>
    </div>
  );
}
