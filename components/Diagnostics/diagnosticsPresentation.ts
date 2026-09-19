/**
 * M20.5D (Developer Diagnostics) — pure presentation helpers for the
 * diagnostics panel.
 *
 * No React, no store reads, no service calls: these functions only
 * shape a `DiagnosticsSnapshot` (or a piece of one) into what the panel
 * displays, so the mapping can be verified without rendering anything.
 * `DeveloperDiagnostics.tsx` and `ServiceHealthRow.tsx` consume the panel
 * helpers; the shell consumes `systemStatusRows` for the desktop widget
 * and `memoryStatusLine` for the bottom status bar.
 */

import {
  DIAGNOSTIC_STATUSES,
  type DiagnosticStatus,
  type DiagnosticValue,
  type DiagnosticsSnapshot,
  type ServiceHealth,
} from "@/lib/contracts/diagnostics/types";

/**
 * The bracket-glyph vocabulary a 1998 workstation console would use for
 * a status lamp. The glyph is decoration — `label` is what actually
 * carries the meaning, and every consumer renders both together so
 * status is never communicated by color alone.
 */
export const STATUS_PRESENTATION: Readonly<
  Record<DiagnosticStatus, { glyph: string; label: string }>
> = {
  ready: { glyph: "●", label: "READY" },
  degraded: { glyph: "!", label: "DEGRADED" },
  offline: { glyph: "X", label: "OFFLINE" },
  "not-implemented": { glyph: "-", label: "NOT IMPLEMENTED" },
  unknown: { glyph: "?", label: "UNKNOWN" },
};

/** Count of services at each status, in the fixed status order — the
 *  SYSTEM SUMMARY counts row. Counts services, not their nested checks:
 *  the summary answers "how many of the twelve domains are ready," not
 *  "how many individual checks passed." */
export function summarizeServiceStatuses(
  services: readonly ServiceHealth[],
): Readonly<Record<DiagnosticStatus, number>> {
  const counts = Object.fromEntries(
    DIAGNOSTIC_STATUSES.map((status) => [status, 0]),
  ) as Record<DiagnosticStatus, number>;

  for (const service of services) {
    counts[service.status] += 1;
  }

  return counts;
}

/** A snapshot failure is data the panel can show, never a raw stack
 *  trace — the same discipline the contract requires of `DiagnosticError`. */
export function describeSnapshotError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

/** Period-correct local timestamp for a SYSTEM SUMMARY readout. Falls
 *  back to the raw ISO string rather than throwing if `observedAt` is
 *  ever malformed — a diagnostics panel must not itself crash. */
export function formatObservedAt(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

// ── bottom status bar ───────────────────────────────────────────────────

/**
 * The bottom status bar's memory segment: the memory service's status in
 * the diagnostics vocabulary. It replaced a fixed "MEMORY INDEXED" with a
 * 64% meter, shown while no Project Memory system exists. UNKNOWN until
 * the service answers.
 */
export function memoryStatusLine(snapshot: DiagnosticsSnapshot | null): string {
  const memory = snapshot?.services.find((s) => s.id === "memory");
  return `MEMORY: ${STATUS_PRESENTATION[memory?.status ?? "unknown"].label}`;
}

// ── SYSTEM STATUS widget ────────────────────────────────────────────────

/** One SYSTEM STATUS row. Structurally the widget's `SystemStatusRow`;
 *  declared here so this module stays free of component imports. */
export interface SystemStatusReadout {
  label: string;
  value: string;
}

const SYSTEM_STATUS_LABELS = [
  "DESKTOP:",
  "ARCHITECT:",
  "BUILD:",
  "PROJECTS:",
  "MEMORY:",
  "SOUND:",
  "CURSOR:",
] as const;

/**
 * The desktop's SYSTEM STATUS rows, read off a `DiagnosticsSnapshot`.
 *
 * These rows used to be seven hardcoded claims: BUILD: IDLE with no build
 * engine, MEMORY INDEXED: OK with no index, and SOUND: ON after sound was
 * muted. Each row now repeats what the diagnostics service observed and
 * decides nothing itself:
 *
 * - DESKTOP, BUILD, MEMORY: the status of the system, forge and memory
 *   services, in the same words the diagnostics panel uses.
 * - ARCHITECT: SEEDED while Architect works but its generator returns seed
 *   templates, because no AI provider is connected. It reads READY only
 *   once the ai service does.
 * - PROJECTS: the project count.
 * - SOUND, CURSOR: the Settings toggles as the service reported them.
 *
 * With no snapshot yet (the server render, and the client's first render
 * before the service answers), every row is UNKNOWN. That is honest, and
 * it is the same on both sides of hydration.
 */
export function systemStatusRows(
  snapshot: DiagnosticsSnapshot | null,
): SystemStatusReadout[] {
  const unknown = STATUS_PRESENTATION.unknown.label;
  if (!snapshot) {
    return SYSTEM_STATUS_LABELS.map((label) => ({ label, value: unknown }));
  }

  const service = (id: string) => snapshot.services.find((s) => s.id === id);
  const statusOf = (id: string) => {
    const found = service(id);
    return found ? STATUS_PRESENTATION[found.status].label : unknown;
  };
  const detail = (serviceId: string, checkId: string, key: string) =>
    service(serviceId)?.checks?.find((c) => c.id === checkId)?.detail?.[key];
  const toggle = (value: DiagnosticValue | undefined) =>
    typeof value === "boolean" ? (value ? "ON" : "OFF") : unknown;

  const architect = service("architect")?.status;
  const ai = service("ai")?.status;
  const projectCount = detail("project", "project.count", "count");

  return [
    { label: "DESKTOP:", value: statusOf("system") },
    {
      label: "ARCHITECT:",
      value: architect === "ready" && ai !== "ready" ? "SEEDED" : statusOf("architect"),
    },
    { label: "BUILD:", value: statusOf("forge") },
    {
      label: "PROJECTS:",
      value: typeof projectCount === "number" ? String(projectCount) : unknown,
    },
    { label: "MEMORY:", value: statusOf("memory") },
    { label: "SOUND:", value: toggle(detail("system", "system.sound", "soundEnabled")) },
    { label: "CURSOR:", value: toggle(detail("system", "system.cursor", "cursorEnabled")) },
  ];
}
