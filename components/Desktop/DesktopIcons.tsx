"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowStore } from "@/store/useWindowStore";
import { DesktopShortcutCard } from "./DesktopShortcutCard";

// Milestone 1 (Home Screen Refinement) — "Default shortcuts: My Projects,
// Archive, Templates." This replaces the previous 3-item list (CATTIPU,
// My Projects, Archive): the CATTIPU/About shortcut is dropped per this
// explicit list — the logo stays reachable via the top bar badge instead.
// Flagged in MILESTONE1_REPORT.md.
interface ShortcutDef {
  id: string;
  label: string;
  icon: string;
  onOpen: (openApp: ReturnType<typeof useWindowStore.getState>["openApp"]) => void;
}

const SHORTCUTS: ShortcutDef[] = [
  {
    id: "my-projects",
    label: "My Projects",
    icon: "projects",
    onOpen: (openApp) => openApp("projects", "Projects"),
  },
  {
    id: "archive",
    label: "Archive",
    icon: "archive",
    onOpen: (openApp) => openApp("explorer", "Explorer"),
  },
  {
    id: "templates",
    label: "Templates",
    icon: "templates",
    onOpen: (openApp) => openApp("templates", "Templates"),
  },
];

export function DesktopIcons() {
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openApp = useWindowStore((s) => s.openApp);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute left-5 top-6 flex flex-col gap-2"
    >
      {SHORTCUTS.map((s) => (
        <DesktopShortcutCard
          key={s.id}
          label={s.label}
          icon={s.icon}
          selected={selected === s.id}
          onSelect={() => setSelected(s.id)}
          onOpen={() => s.onOpen(openApp)}
        />
      ))}
    </div>
  );
}
