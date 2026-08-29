"use client";

/**
 * Milestone 1 (Home Screen Refinement) — "Toolbox: normalize every button
 * using one shared button component." Didn't exist before this milestone
 * (see docs/HOME_SPEC.md). Every action here reuses an existing store
 * action (openApp) rather than new functionality; every button is a
 * CattipuButton — see components/UI/Button.tsx (relocated there in
 * Milestone 3's shared-component consolidation).
 */

import { FolderPlus, Network, FolderOpen, Settings2 } from "lucide-react";
import { useWindowStore } from "@/store/useWindowStore";
import { CattipuButton } from "@/components/UI/Button";

export function Toolbox() {
  const openApp = useWindowStore((s) => s.openApp);

  return (
    <div className="cattipu-raised flex w-full flex-col overflow-hidden rounded-md">
      <div className="cattipu-raised-navy flex h-7 shrink-0 items-center bg-navy px-4">
        <span className="cattipu-emboss-text-inverted font-pixel-ui text-[0.42rem] tracking-wide text-white">
          TOOLBOX
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-surface-solid p-3">
        <CattipuButton
          variant="primary"
          icon={<FolderPlus className="h-3 w-3" strokeWidth={2.5} />}
          onClick={() => openApp("projects", "Projects")}
        >
          New Project
        </CattipuButton>
        <CattipuButton
          icon={<Network className="h-3 w-3" strokeWidth={2.5} />}
          onClick={() => openApp("architect", "Architect")}
        >
          Architect
        </CattipuButton>
        <CattipuButton
          icon={<FolderOpen className="h-3 w-3" strokeWidth={2.5} />}
          onClick={() => openApp("explorer", "Explorer")}
        >
          Explorer
        </CattipuButton>
        <CattipuButton
          icon={<Settings2 className="h-3 w-3" strokeWidth={2.5} />}
          onClick={() => openApp("settings", "Settings")}
        >
          Settings
        </CattipuButton>
      </div>
    </div>
  );
}
