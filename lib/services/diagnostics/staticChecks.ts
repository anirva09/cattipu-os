/**
 * M20.5C (Diagnostics Service) — known architecture drift recorded in
 * docs/architecture/BOUNDARY_AUDIT.md.
 *
 * These are facts about the source tree (an unmounted store still
 * imported for its types, two icon
 * families), not anything a Zustand store can report. Nothing here reads
 * live state, so nothing here can go stale relative to a store — it can
 * only go stale relative to the repository itself, which is the audit's
 * job to keep current, not this service's.
 *
 * Each finding is cross-cutting rather than owned by one service, so the
 * caller places these on `DiagnosticsSnapshot.checks`, not inside a
 * single `ServiceHealth.checks` — see that field's own doc comment.
 * `checkedAt` is stamped by the caller so every check in a snapshot
 * shares the one observation time (see diagnosticsService.ts).
 */

import type { DiagnosticCheck } from "@/lib/contracts/diagnostics/types";

type StaticCheck = Omit<DiagnosticCheck, "checkedAt">;

export function staticDriftChecks(): readonly StaticCheck[] {
  return [
    {
      id: "windows.legacy-store-consumers",
      label: "Legacy window store",
      category: "windows",
      status: "degraded",
      message:
        "store/useWindowStore.ts is unmounted but lib/apps.ts and lib/os/extensions.ts still import its AppId type, and the unmounted CommandPalette still calls it at runtime",
      detail: {
        consumers: [
          "lib/apps.ts",
          "lib/os/extensions.ts",
          "components/CommandPalette/CommandPalette.tsx",
        ],
      },
    },
    {
      id: "system.icon-systems-duplicated",
      label: "Icon systems",
      category: "system",
      status: "degraded",
      message:
        "two icon systems exist: components/PixelIcon (canonical PixelForge, drives the live shell) and components/Icons (legacy M13 glyphs, still used by SettingsApp and PlaceholderApp) — both export a symbol named PixelIcon",
    },
    {
      id: "project.import-direction",
      label: "Project derived-layer import direction",
      category: "project",
      status: "degraded",
      message:
        "lib/os/projects.ts imports type-only view models from components/DetailsPanel, components/ProjectsWindow and components/FolderTree — the derived project layer is shaped by component prop types instead of the other way around; type-only, so no runtime cost",
    },
    {
      id: "ai.type-import-cycle",
      label: "AI/project type import cycle",
      category: "ai",
      status: "degraded",
      message:
        "lib/project/types -> lib/ai/types -> store/useProjectStore -> lib/project/types forms a type-only import cycle; harmless at runtime",
    },
    {
      id: "filesystem.explorer-hydration-mismatch",
      label: "Explorer hydration mismatch",
      category: "filesystem",
      status: "degraded",
      message:
        "components/Explorer/ExplorerApp.tsx has a known data-entry-id hydration mismatch, recorded in the boundary audit and not yet fixed",
    },
  ] as const;
}
