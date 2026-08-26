"use client";

import { BootScreen } from "@/components/Boot/BootScreen";
import { Desktop } from "@/components/Desktop/Desktop";
import { CursorProvider } from "@/components/System/CursorProvider";
import { useBootStore } from "@/store/useBootStore";

export default function Home() {
  const phase = useBootStore((s) => s.phase);

  return (
    <div className="relative h-screen w-screen">
      <CursorProvider />
      <Desktop />
      {phase === "booting" && <BootScreen />}
    </div>
  );
}
