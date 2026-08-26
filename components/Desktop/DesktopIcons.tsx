"use client";

import { useEffect, useRef, useState } from "react";
import { PixelLogo } from "../Boot/PixelLogo";
import { AppIcon } from "../Dock/AppIcon";
import { useWindowStore } from "@/store/useWindowStore";

interface IconDef {
  id: string;
  label: string;
  onOpen: (openApp: ReturnType<typeof useWindowStore.getState>["openApp"]) => void;
  render: () => React.ReactNode;
}

const ICONS: IconDef[] = [
  {
    id: "cattipu",
    label: "CATTIPU",
    onOpen: (openApp) => openApp("about", "About CATTIPU OS"),
    render: () => <PixelLogo mode="retro" variant="mark" className="h-9 w-auto" />,
  },
  {
    id: "my-projects",
    label: "My Projects",
    onOpen: (openApp) => openApp("projects", "Projects"),
    render: () => <AppIcon icon="projects" className="h-9 w-auto" />,
  },
  {
    id: "archive",
    label: "Archive",
    onOpen: (openApp) => openApp("explorer", "Explorer"),
    render: () => <AppIcon icon="archive" className="h-9 w-auto" />,
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
      className="pointer-events-auto absolute left-5 top-6 flex flex-col gap-1"
    >
      {ICONS.map((icon) => {
        const active = selected === icon.id;
        return (
          <button
            key={icon.id}
            aria-label={`Desktop icon: ${icon.label}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(icon.id);
            }}
            onDoubleClick={() => icon.onOpen(openApp)}
            className={[
              "cattipu-cursor-hand flex w-20 flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-center transition-colors",
              active
                ? "border-dashed border-navy bg-navy/10"
                : "border-transparent hover:bg-white/30",
            ].join(" ")}
          >
            {icon.render()}
            <span
              className={[
                "line-clamp-2 text-[11px] font-medium leading-tight",
                active ? "bg-navy text-white px-1 rounded-[2px]" : "text-ink",
              ].join(" ")}
            >
              {icon.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
