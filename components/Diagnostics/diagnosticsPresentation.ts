/**
 * M20.5D (Developer Diagnostics) — pure presentation helpers for the
 * diagnostics panel.
 *
 * No React, no store reads, no service calls: these functions only
 * shape a `DiagnosticsSnapshot` (or a piece of one) into what the panel
 * displays, so the mapping can be verified without rendering anything.
 * `DeveloperDiagnostics.tsx` and `ServiceHealthRow.tsx` are the only
 * consumers.
 */

import {
  DIAGNOSTIC_STATUSES,
  type DiagnosticStatus,
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
