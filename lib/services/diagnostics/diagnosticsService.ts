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
import { unreadCount, useNotificationStore } from "@/store/useNotificationStore";
import { useBootStore } from "@/store/useBootStore";
import { useBusyStore } from "@/store/useBusyStore";
import { useArchitectStore } from "@/store/useArchitectStore";
import { useLaunchStore } from "@/store/useLaunchStore";
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
  const unread = unreadCount(notifications);

  return {
    id: "notifications",
    name: registryEntry("notifications").name,
    category: "notifications",
    // M22 mounted the Notification Center behind the top-bar Bell, so a
    // push is now both stored and shown. The check id predates M22's
    // switch from a queue to a session history and is kept stable.
    status: "ready",
    checks: [
      {
        id: "notifications.queue-length",
        label: "Notification history",
        category: "notifications",
        status: "ready",
        message: `${notifications.length} notification${notifications.length === 1 ? "" : "s"} in history, ${unread} unread`,
        detail: { count: notifications.length, unread },
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
// launch — MVP-08
// ---------------------------------------------------------------------

/**
 * MVP-08 made local launch real: LaunchService runs a successful Forge
 * build's artifact on 127.0.0.1 (/api/launch). Whether anything is running
 * is a fact about processes on the server, so this reads only what the
 * server last reported to useLaunchStore (the Launch window asks it on
 * open and every few seconds while open) — never a project's stored
 * launch history, which cannot say "running". Nothing observed yet is
 * "unknown", exactly as the window manager reports an unobserved session.
 * Deployment (M28, One-Click Ship) is still not built and says so.
 */
function buildLaunchHealth(observedAt: string): ServiceHealth {
  const name = registryEntry("launch").name;
  const { server, sessions } = useLaunchStore.getState();
  const { projects } = useProjectStore.getState();
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  const deployment: DiagnosticCheck = {
    id: "launch.deployment",
    label: "Deployment",
    category: "launch",
    status: "not-implemented",
    message: "deployment (M28 One-Click Ship) is not built; MVP-08 runs builds on this machine only",
    checkedAt: observedAt,
  };

  let runtime: DiagnosticCheck;
  if (server.kind === "unknown") {
    runtime = {
      id: "launch.runtime",
      label: "Local runtime",
      category: "launch",
      status: "unknown",
      message: "LAUNCH: not observed — nothing has asked CATTIPU's server what is running in this session (open the Launch window)",
      checkedAt: observedAt,
    };
  } else if (server.kind === "unavailable") {
    runtime = {
      id: "launch.runtime",
      label: "Local runtime",
      category: "launch",
      status: "offline",
      message: `LAUNCH: unreachable — ${server.error.message}`,
      checkedAt: observedAt,
    };
  } else if (!server.status.enabled) {
    runtime = {
      id: "launch.runtime",
      label: "Local runtime",
      category: "launch",
      status: "degraded",
      message: `LAUNCH: unavailable — ${server.status.reason ?? "launching is switched off on this server"}`,
      checkedAt: observedAt,
    };
  } else {
    const reported = Object.values(sessions).flatMap((s) => (s.runtime ? [s.runtime] : []));
    const running = reported.filter((r) => r.status === "running");
    const failed = reported.filter((r) => r.status === "failed");
    runtime = {
      id: "launch.runtime",
      label: "Local runtime",
      category: "launch",
      status: running.length === 0 && failed.length > 0 ? "degraded" : "ready",
      message:
        running.length > 0
          ? `LAUNCH: RUNNING ${running.map((r) => `${projectName(r.projectId)} :${r.port}`).join(", ")}`
          : failed.length > 0
            ? `LAUNCH: FAILED — ${projectName(failed[0].projectId)}: ${failed[0].reason ?? "the application did not run"}`
            : "LAUNCH: STOPPED — no application running",
      detail: {
        running: running.map((r) => `${r.projectId} ${r.buildId} :${r.port}`),
        failed: failed.length,
        serverObservedAt: server.observedAt,
      },
      checkedAt: observedAt,
    };
  }

  return {
    id: "launch",
    name,
    category: "launch",
    status: runtime.status,
    checks: [runtime, deployment],
  };
}

// ---------------------------------------------------------------------
// ai / memory / forge / live — planned, not built
// ---------------------------------------------------------------------

const NOT_IMPLEMENTED_MESSAGES: Record<
  "ai" | "memory" | "forge" | "live",
  string
> = {
  // MVP-04 built the AI Gateway (/api/ai: registry + Claude and Ollama
  // adapters). This row stays not-implemented until Diagnostics probes it:
  // provider credentials and the local runtime are server-side facts the
  // browser-side snapshot cannot observe, and Architect generation is still
  // seeded rather than routed through the gateway.
  ai: "the AI Gateway exists (/api/ai, Claude and Ollama adapters) but Diagnostics does not observe it yet — provider readiness is reported by the AI Console; Architect generation remains seeded",
  // MVP-05 made CattipuProject.memory live (records, prompts and AI
  // conversations, written by the Memory window and the AI Console). The
  // row stays not-implemented: M24's Project Memory Core (decisions,
  // relationships, staleness, provider-shared memory) is still to come.
  memory:
    "project memory records, prompts and AI conversations are stored per project (CattipuProject.memory, MVP-05); the M24 Project Memory Core (decisions, relationships, staleness) is not built",
  // MVP-07 built a real Forge build (/api/forge: one web-application target,
  // bundled by esbuild on the server; builds recorded in
  // CattipuProject.forge.builds). The row stays not-implemented: toolchain
  // readiness is a server-side fact this browser snapshot cannot observe,
  // and M26's Forge (tests, generation, live build progress) is still to come.
  forge:
    "Forge builds the active project's workspace as a web application (/api/forge, MVP-07) and records builds per project; Diagnostics does not observe the build toolchain yet — the Forge window reports it",
  live: "no Live Runtime implementation exists, and no seam has been prepared for it yet",
};

function buildNotImplementedHealth(
  id: "ai" | "memory" | "forge" | "live",
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

const NOT_IMPLEMENTED_IDS = ["ai", "memory", "forge", "live"] as const;

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
      buildLaunchHealth(observedAt),
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
