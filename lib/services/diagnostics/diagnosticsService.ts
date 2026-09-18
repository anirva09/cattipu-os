/**
 * M20.5C (Diagnostics Service) — the first real diagnostics APPLICATION
 * SERVICE, implementing the `DiagnosticsService` contract from M20.5B
 * (lib/contracts/diagnostics/service.ts).
 *
 * This module aggregates. It does not own anything: every value below is
 * read from the canonical owner named in docs/architecture/
 * BOUNDARY_AUDIT.md §7 ("what M20.5B–E can safely rely on") and never
 * written. There is no new store here and no cache — `getSnapshot()`
 * builds a fresh `DiagnosticsSnapshot` from current state on every call
 * and returns it; nothing is retained between calls.
 *
 * Reading a Zustand store's `getState()` from outside React is the same
 * pattern the audit itself sanctions for this purpose (§7) — it is not a
 * React dependency, just the store's own public API, and it is the only
 * way a plain service module (no hooks, no component tree) can observe
 * store-owned state at all.
 *
 * `DIAGNOSTIC_CATEGORIES` names exactly the domains this snapshot must
 * report on, and this file produces exactly one `ServiceHealth` per
 * category — never more, never fewer. Findings that are not about a
 * single service's current health (architecture drift recorded in the
 * boundary audit) go on `DiagnosticsSnapshot.checks` instead; see
 * staticChecks.ts and that field's own doc comment in the contract.
 */

import {
  DIAGNOSTICS_CONTRACT_VERSION,
  type DiagnosticCheck,
  type DiagnosticStatus,
  type DiagnosticsSnapshot,
  type ServiceHealth,
} from "@/lib/contracts/diagnostics/types";
import type { DiagnosticsService } from "@/lib/contracts/diagnostics/service";
import { registryEntry } from "./healthRegistry";
import { staticDriftChecks } from "./staticChecks";

import { useProjectStore } from "@/store/useProjectStore";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useBootStore } from "@/store/useBootStore";
import { useBusyStore } from "@/store/useBusyStore";
import { useArchitectStore } from "@/store/useArchitectStore";
import { PROJECT_SCHEMA_VERSION } from "@/lib/project/types";
import { visibleObjects } from "@/lib/os/filesystem";
import {
  CATTIPU_WINDOW_IDS,
  parseWindowManagerState,
} from "@/components/WindowManager/windowManager.reducer";

// ---------------------------------------------------------------------
// system
// ---------------------------------------------------------------------

function buildSystemHealth(observedAt: string): ServiceHealth {
  const { phase } = useBootStore.getState();
  const settings = useSettingsStore.getState();
  const busyReasons = Array.from(useBusyStore.getState().reasons);

  // Boot, sound and cursor report under "system" — see the DiagnosticCheck
  // comment in lib/contracts/diagnostics/types.ts. Boot phase is the
  // domain's own health signal: sound/cursor are user toggles, always
  // "ready" as a mechanism regardless of which way they are set.
  const bootStatus: DiagnosticStatus = phase === "booted" ? "ready" : "degraded";

  const checks: DiagnosticCheck[] = [
    {
      id: "system.boot",
      label: "Boot phase",
      category: "system",
      status: bootStatus,
      message:
        phase === "booted"
          ? "boot sequence complete"
          : "boot sequence has not completed",
      detail: { phase },
      checkedAt: observedAt,
    },
    {
      id: "system.sound",
      label: "Sound",
      category: "system",
      status: "ready",
      message: settings.soundEnabled ? "sound enabled" : "sound muted",
      detail: {
        soundEnabled: settings.soundEnabled,
        soundVolume: settings.soundVolume,
      },
      checkedAt: observedAt,
    },
    {
      id: "system.cursor",
      label: "Cursor",
      category: "system",
      status: "ready",
      message: settings.cursorEnabled
        ? "custom CATTIPU cursor enabled"
        : "system cursor in use",
      detail: { cursorEnabled: settings.cursorEnabled },
      checkedAt: observedAt,
    },
    {
      id: "system.busy-signal",
      label: "Busy signal",
      category: "system",
      status: "ready",
      message:
        busyReasons.length === 0
          ? "idle — no reported busy reasons"
          : `busy: ${busyReasons.join(", ")}`,
      detail: { reasons: busyReasons },
      checkedAt: observedAt,
    },
  ];

  return {
    id: "system",
    name: registryEntry("system").name,
    category: "system",
    status: bootStatus,
    checks,
  };
}

// ---------------------------------------------------------------------
// project
// ---------------------------------------------------------------------

function buildProjectHealth(observedAt: string): ServiceHealth {
  const { projects } = useProjectStore.getState();

  const checks: DiagnosticCheck[] = [
    {
      id: "project.schema-version",
      label: "Project schema version",
      category: "project",
      status: "ready",
      message: `persisted schema version ${PROJECT_SCHEMA_VERSION}`,
      detail: { version: PROJECT_SCHEMA_VERSION },
      checkedAt: observedAt,
    },
    {
      id: "project.count",
      label: "Project count",
      category: "project",
      status: "ready",
      message: `${projects.length} project${projects.length === 1 ? "" : "s"} tracked`,
      detail: { count: projects.length },
      checkedAt: observedAt,
    },
  ];

  return {
    id: "project",
    name: registryEntry("project").name,
    category: "project",
    status: "ready",
    checks,
  };
}

// ---------------------------------------------------------------------
// filesystem
// ---------------------------------------------------------------------

function buildFilesystemHealth(observedAt: string): ServiceHealth {
  const { objects } = useFilesystemStore.getState();
  const { projects } = useProjectStore.getState();

  // Reuses the same hiding logic Explorer/Desktop apply at render time
  // (lib/os/filesystem.ts) rather than re-deriving "orphaned" by hand —
  // an orphaned shortcut is exactly one `visibleObjects` already hides.
  const orphanedCount = objects.length - visibleObjects(objects, projects).length;

  const checks: DiagnosticCheck[] = [
    {
      id: "filesystem.object-count",
      label: "Filesystem object count",
      category: "filesystem",
      status: "ready",
      message: `${objects.length} object${objects.length === 1 ? "" : "s"} in the shared filesystem`,
      detail: { count: objects.length },
      checkedAt: observedAt,
    },
    {
      id: "filesystem.orphaned-shortcuts",
      label: "Orphaned project shortcuts",
      category: "filesystem",
      status: orphanedCount === 0 ? "ready" : "degraded",
      message:
        orphanedCount === 0
          ? "no project shortcut points at a missing project"
          : `${orphanedCount} project shortcut${orphanedCount === 1 ? "" : "s"} point at a missing project`,
      detail: { count: orphanedCount },
      checkedAt: observedAt,
    },
  ];

  return {
    id: "filesystem",
    name: registryEntry("filesystem").name,
    category: "filesystem",
    status: "ready",
    checks,
  };
}

// ---------------------------------------------------------------------
// windows
// ---------------------------------------------------------------------

// Mirrors components/WindowManager/useWindowManager.ts's
// CATTIPU_WINDOW_SESSION_KEY — the only writer of this sessionStorage
// key. Not imported from there directly: that module is a "use client"
// React hook (dispatch, sound effects, refs), and pulling it into a
// plain service module for one string constant would be exactly the
// React coupling this service must avoid. windowManager.reducer.ts,
// which IS imported below, has no React dependency at all.
const WINDOW_SESSION_KEY = "cattipu-os:window-manager:v1";

function buildWindowsHealth(observedAt: string): ServiceHealth {
  const name = registryEntry("windows").name;

  // Live window state lives in a React reducer inside InteractiveDesktop,
  // not in a store (BOUNDARY_AUDIT.md §2.3) — the sessionStorage snapshot
  // is the only truthful thing a non-React service can read. No browser,
  // or no session recorded yet, is "unknown", not "offline": the window
  // manager has not failed, it simply has not been observed yet.
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return {
      id: "windows",
      name,
      category: "windows",
      status: "unknown",
      checks: [
        {
          id: "windows.session-snapshot",
          label: "Window session snapshot",
          category: "windows",
          status: "unknown",
          message: "no browser session available to observe window state",
          checkedAt: observedAt,
        },
      ],
    };
  }

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(WINDOW_SESSION_KEY);
  } catch {
    raw = null;
  }

  const state = parseWindowManagerState(raw);

  if (!state) {
    return {
      id: "windows",
      name,
      category: "windows",
      status: "unknown",
      checks: [
        {
          id: "windows.session-snapshot",
          label: "Window session snapshot",
          category: "windows",
          status: "unknown",
          message: "no window session has been recorded yet in this browser",
          checkedAt: observedAt,
        },
      ],
    };
  }

  const openCount = CATTIPU_WINDOW_IDS.filter((id) => state.windows[id].open).length;

  return {
    id: "windows",
    name,
    category: "windows",
    status: "ready",
    checks: [
      {
        id: "windows.session-snapshot",
        label: "Window session snapshot",
        category: "windows",
        status: "ready",
        message: `${openCount} of ${CATTIPU_WINDOW_IDS.length} managed windows open`,
        detail: { openCount, totalWindows: CATTIPU_WINDOW_IDS.length },
        checkedAt: observedAt,
      },
    ],
  };
}

// ---------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------

function buildSettingsHealth(observedAt: string): ServiceHealth {
  const settings = useSettingsStore.getState();

  const checks: DiagnosticCheck[] = [
    {
      id: "settings.wallpaper",
      label: "Wallpaper",
      category: "settings",
      status: "ready",
      message: `wallpaper: ${settings.wallpaper}`,
      detail: { wallpaper: settings.wallpaper },
      checkedAt: observedAt,
    },
    {
      id: "settings.dock-fields-unread",
      label: "Dock settings",
      category: "settings",
      status: "degraded",
      message:
        "dockMode and dockIconSize are written by Settings but no live consumer in the v0.9 shell reads them",
      detail: { dockMode: settings.dockMode, dockIconSize: settings.dockIconSize },
      checkedAt: observedAt,
    },
  ];

  return {
    id: "settings",
    name: registryEntry("settings").name,
    category: "settings",
    status: "ready",
    checks,
  };
}

// ---------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------

function buildNotificationsHealth(observedAt: string): ServiceHealth {
  const { notifications } = useNotificationStore.getState();

  return {
    id: "notifications",
    name: registryEntry("notifications").name,
    category: "notifications",
    // The queue itself works (see the check below); what CATTIPU cannot
    // honestly call "ready" is the user-visible integration — nothing
    // renders a push. See the "notifications.center-unmounted" entry on
    // DiagnosticsSnapshot.checks for why.
    status: "degraded",
    checks: [
      {
        id: "notifications.queue-length",
        label: "Notification queue",
        category: "notifications",
        status: "ready",
        message: `${notifications.length} notification${notifications.length === 1 ? "" : "s"} queued`,
        detail: { count: notifications.length },
        checkedAt: observedAt,
      },
    ],
  };
}

// ---------------------------------------------------------------------
// architect
// ---------------------------------------------------------------------

function buildArchitectHealth(observedAt: string): ServiceHealth {
  const { data, linkedProjectId } = useArchitectStore.getState();

  return {
    id: "architect",
    name: registryEntry("architect").name,
    category: "architect",
    // The Architect domain itself — graph editing, ER diagrams, playback,
    // project linking — is fully implemented and live; that is what this
    // status reports. That its generation seam is seeded, not a
    // connected model, is a fact about the "ai" service, recorded below
    // as its own check so it does not stand in for Architect's own
    // health.
    status: "ready",
    checks: [
      {
        id: "architect.generation-source",
        label: "Generation source",
        category: "architect",
        status: "degraded",
        message:
          "architecture generation returns seed templates (lib/ai/seedTemplates.ts), not a connected AI provider",
        checkedAt: observedAt,
      },
      {
        id: "architect.workspace",
        label: "Active workspace",
        category: "architect",
        status: "ready",
        message: !data
          ? "no architecture generated in this session"
          : linkedProjectId
            ? "linked to a project — edits write straight through"
            : "unsaved workspace has data",
        detail: { hasData: data !== null, linkedProjectId: linkedProjectId ?? null },
        checkedAt: observedAt,
      },
    ],
  };
}

// ---------------------------------------------------------------------
// ai / memory / forge / live / launch — planned, not built
// ---------------------------------------------------------------------

const NOT_IMPLEMENTED_MESSAGES: Record<
  "ai" | "memory" | "forge" | "live" | "launch",
  string
> = {
  ai: "no connected AI provider exists — no provider SDK, fetch call, or API route is present anywhere in the tree",
  memory:
    "no Project Memory system exists yet; CattipuProject.memory.records is the only storage today, written by nothing live",
  forge:
    "no Forge implementation exists; CattipuProject.forge and the WorkspaceGenerator contract (lib/os/extensions.ts) are the prepared seam",
  live: "no Live Runtime implementation exists, and no seam has been prepared for it yet",
  launch:
    "no Launch implementation exists; CattipuProject.launch and the DeploymentProvider contract (lib/os/extensions.ts) are the prepared seam",
};

function buildNotImplementedHealth(
  id: "ai" | "memory" | "forge" | "live" | "launch",
  observedAt: string,
): ServiceHealth {
  const entry = registryEntry(id);
  return {
    id,
    name: entry.name,
    category: id,
    status: "not-implemented",
    plannedMilestone: entry.plannedMilestone,
    checks: [
      {
        id: `${id}.status`,
        label: `${entry.name} status`,
        category: id,
        status: "not-implemented",
        message: NOT_IMPLEMENTED_MESSAGES[id],
        checkedAt: observedAt,
      },
    ],
  };
}

// ---------------------------------------------------------------------
// Overall status — a PURE helper, never stored
// ---------------------------------------------------------------------

const STATUS_ROLLUP_PRECEDENCE: readonly Exclude<DiagnosticStatus, "not-implemented">[] = [
  "offline",
  "degraded",
  "unknown",
  "ready",
];

/**
 * A derived rollup of CURRENT system health — deliberately distinct from
 * ROADMAP COMPLETENESS (see M20.5B's own note that a snapshot has no
 * overall-status field, and CATTIPU_OS instruction §12).
 *
 * `not-implemented` entries are excluded from the rollup population
 * entirely before precedence is applied: Memory, Forge, Live and Launch
 * being unbuilt is a roadmap fact, not a failure of what exists today,
 * so a healthy MVP must not be reported "degraded" just because five
 * future services are still planned. If literally nothing observable
 * exists (every service and check is `not-implemented`), the result is
 * `not-implemented` — there is nothing else honest to say.
 *
 * Among what DOES exist today, precedence is offline > degraded >
 * unknown > ready — an observed failure outweighs a known limitation,
 * which outweighs "could not observe", which outweighs everything being
 * fine.
 */
export function deriveDiagnosticsStatus(
  snapshot: DiagnosticsSnapshot,
): DiagnosticStatus {
  const statuses = [
    ...snapshot.services.map((service) => service.status),
    ...snapshot.services.flatMap((service) => service.checks?.map((c) => c.status) ?? []),
    ...snapshot.checks.map((check) => check.status),
  ].filter((status) => status !== "not-implemented");

  if (statuses.length === 0) return "not-implemented";

  for (const candidate of STATUS_ROLLUP_PRECEDENCE) {
    if (statuses.includes(candidate)) return candidate;
  }
  return "ready";
}

// ---------------------------------------------------------------------
// Snapshot aggregation
// ---------------------------------------------------------------------

const NOT_IMPLEMENTED_IDS = ["ai", "memory", "forge", "live", "launch"] as const;

export const diagnosticsService: DiagnosticsService = {
  async getSnapshot(): Promise<DiagnosticsSnapshot> {
    // One clock reading for the whole snapshot — every check below is
    // stamped with this same value, so the snapshot is coherent even
    // though it observes several independent stores.
    const observedAt = new Date().toISOString();

    const services: ServiceHealth[] = [
      buildSystemHealth(observedAt),
      buildProjectHealth(observedAt),
      buildFilesystemHealth(observedAt),
      buildWindowsHealth(observedAt),
      buildSettingsHealth(observedAt),
      buildNotificationsHealth(observedAt),
      buildArchitectHealth(observedAt),
      ...NOT_IMPLEMENTED_IDS.map((id) => buildNotImplementedHealth(id, observedAt)),
    ];

    const checks: DiagnosticCheck[] = staticDriftChecks().map((check) => ({
      ...check,
      checkedAt: observedAt,
    }));

    return {
      contractVersion: DIAGNOSTICS_CONTRACT_VERSION,
      observedAt,
      services,
      checks,
    };
  },
};
