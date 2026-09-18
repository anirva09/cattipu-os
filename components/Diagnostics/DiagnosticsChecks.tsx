"use client";

/**
 * M20.5D (Developer Diagnostics) — the KNOWN ISSUES / ARCHITECTURE DRIFT
 * section: cross-cutting checks from `DiagnosticsSnapshot.checks`, not
 * owned by one service (see that field's doc comment in
 * lib/contracts/diagnostics/types.ts). Rendered straight from the
 * snapshot the panel fetched — nothing here is a second copy of the
 * boundary-audit findings.
 */

import type { DiagnosticCheck } from "@/lib/contracts/diagnostics/types";
import { StatusBadge } from "./ServiceHealthRow";

export function DiagnosticsChecks({ checks }: { checks: readonly DiagnosticCheck[] }) {
  if (checks.length === 0) {
    return <p className="cattipu-diagnostics__empty">NO ARCHITECTURE DRIFT RECORDED</p>;
  }

  return (
    <ul className="cattipu-diagnostics__checks">
      {checks.map((check) => (
        <li key={check.id} className="cattipu-diagnostics__check cattipu-bevel--inset">
          <div className="cattipu-diagnostics__check-head">
            <span className="cattipu-diagnostics__check-label">
              {check.label.toUpperCase()}
            </span>
            <StatusBadge status={check.status} />
          </div>
          <p className="cattipu-diagnostics__check-message">{check.message}</p>
        </li>
      ))}
    </ul>
  );
}
