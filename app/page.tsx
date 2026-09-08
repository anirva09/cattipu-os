"use client";

import { BootScreen } from "@/components/Boot/BootScreen";
import { CattipuShell } from "@/components/Shell/CattipuShell";
import { CursorProvider } from "@/components/System/CursorProvider";
import { useBootStore } from "@/store/useBootStore";

/**
 * Boot behaviour is unchanged: BootScreen still overlays the shell until
 * useBootStore reports "booted", and CursorProvider still mounts first.
 * The only difference is which shell sits underneath — CattipuShell (the
 * v0.9 InteractiveDesktop) instead of the legacy Desktop. The legacy
 * components/Desktop tree stays in the repository, unrendered, until the
 * new desktop is verified.
 *
 * ── Boot restoration ──────────────────────────────────────────────────
 *
 * That shell swap silently made the boot screen invisible, and this
 * wrapper is the whole fix.
 *
 * BootScreen is `fixed inset-0 z-50`, which was above everything the
 * legacy Desktop painted. InteractiveDesktop puts its own children far
 * higher — window layer 100, right widgets 8600, top bar and status bar
 * 8800, sidebar 9000 — and `.cattipu-interactive-desktop` is
 * `position: relative` with `z-index: auto`, so it creates NO stacking
 * context of its own. Its children therefore compete directly with the
 * boot overlay in the root stacking context, and every one of them wins.
 * The boot screen was still mounted, still animating, still ticking its
 * timers, and completely painted over: `elementFromPoint` at the centre
 * of the screen during boot returned a project card.
 *
 * The wrapper is `relative` with a z-index above the shell, which makes
 * it a stacking context; BootScreen's own `z-50` is then resolved INSIDE
 * it rather than against the shell. Nothing in components/Boot changes —
 * those files are byte-identical to the original production
 * implementation and stay that way.
 */
export default function Home() {
  const phase = useBootStore((s) => s.phase);

  return (
    <div className="relative h-screen w-screen">
      <CursorProvider />
      <CattipuShell />
      {phase === "booting" && (
        <div className="relative z-[10000]">
          <BootScreen />
        </div>
      )}
    </div>
  );
}
