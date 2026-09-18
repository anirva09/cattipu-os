"use client";

/**
 * M20.5D (Developer Diagnostics) — one SERVICES row: a service's status,
 * name, version/planned milestone if it has one, and its own checks.
 *
 * Pure presentation over the `ServiceHealth` the panel already fetched
 * from `DiagnosticsService.getSnapshot()` — no store reads, no
 * recomputation of status. `StatusBadge` is exported because
 * `DiagnosticsChecks.tsx` renders the same status vocabulary for
 * cross-cutting checks and must not draw a second one.
 */

import type { DiagnosticStatus, ServiceHealth } from "@/lib/contracts/diagnostics/types";
import { STATUS_PRESENTATION } from "./diagnosticsPresentation";

export function StatusBadge({ status }: { status: DiagnosticStatus }) {
  const { glyph, label } = STATUS_PRESENTATION[status];
  return (
    <span className="cattipu-diagnostics__status" data-status={status}>
      <span aria-hidden="true">[{glyph}]</span> {label}
    </span>
  );
}

export function ServiceHealthRow({ service }: { service: ServiceHealth }) {
  return (
    <div className="cattipu-diagnostics__service cattipu-bevel--raised">
      <div className="cattipu-diagnostics__service-header">
        <span className="cattipu-diagnostics__service-name">
          {service.name.toUpperCase()}
        </span>
        <StatusBadge status={service.status} />
      </div>

      {(service.version || service.plannedMilestone) && (
        <div className="cattipu-diagnostics__service-meta">
          {service.version && <span>VERSION {service.version}</span>}
          {service.plannedMilestone && <span>PLANNED {service.plannedMilestone}</span>}
        </div>
      )}

      {service.checks && service.checks.length > 0 && (
        <ul className="cattipu-diagnostics__service-checks">
          {service.checks.map((check) => (
            <li key={check.id} className="cattipu-diagnostics__service-check">
              <StatusBadge status={check.status} />
              <span className="cattipu-diagnostics__check-message">{check.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
