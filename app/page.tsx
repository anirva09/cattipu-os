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
 */
export default function Home() {
  const phase = useBootStore((s) => s.phase);

  return (
    <div className="relative h-screen w-screen">
      <CursorProvider />
      <CattipuShell />
      {phase === "booting" && <BootScreen />}
    </div>
  );
}
