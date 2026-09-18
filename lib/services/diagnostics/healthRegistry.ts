/**
 * M20.5C (Diagnostics Service) — the canonical list of CATTIPU domains a
 * diagnostics snapshot reports on, one entry per `DiagnosticCategory`
 * (lib/contracts/diagnostics/types.ts).
 *
 * This is descriptive data, not control flow: `diagnosticsService.ts`
 * reads live store state to decide each domain's actual status, and only
 * consults this file for the domain's display name and — for a domain
 * that is not built yet — the one roadmap milestone that owns it. A
 * roadmap milestone is repository-wide fact (docs/architecture/
 * BOUNDARY_AUDIT.md §4, PROJECT_CONSTITUTION.md §92), so it is named here
 * exactly once rather than copied into every place that reports it.
 */

import type { DiagnosticCategory } from "@/lib/contracts/diagnostics/types";

export interface HealthRegistryEntry {
  id: DiagnosticCategory;
  name: string;
  /** Only set for a domain with no live implementation yet — the
   *  milestone from PROJECT_CONSTITUTION.md §92 that owns building it. */
  plannedMilestone?: string;
}

export const HEALTH_REGISTRY: readonly HealthRegistryEntry[] = [
  { id: "system", name: "System" },
  { id: "project", name: "Project" },
  { id: "filesystem", name: "Filesystem" },
  { id: "windows", name: "Windows" },
  { id: "settings", name: "Settings" },
  { id: "notifications", name: "Notifications" },
  { id: "architect", name: "Architect" },
  { id: "ai", name: "AI", plannedMilestone: "M23" },
  { id: "memory", name: "Memory", plannedMilestone: "M24" },
  { id: "forge", name: "Forge", plannedMilestone: "M26" },
  { id: "live", name: "Live", plannedMilestone: "M27" },
  { id: "launch", name: "Launch", plannedMilestone: "M28" },
] as const;

export function registryEntry(id: DiagnosticCategory): HealthRegistryEntry {
  const entry = HEALTH_REGISTRY.find((candidate) => candidate.id === id);
  if (!entry) {
    // Every DiagnosticCategory must have exactly one registry entry — a
    // missing one is a bug in this file, not a runtime condition to
    // report gracefully.
    throw new Error(`healthRegistry: no entry registered for "${id}"`);
  }
  return entry;
}
