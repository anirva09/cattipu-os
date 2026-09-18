"use client";

/**
 * M20.5D (Developer Diagnostics) — the user-visible panel on top of the
 * M20.5B/C contracts and service.
 *
 * Flow, exactly as the milestone brief requires:
 *
 *   Diagnostics UI -> DiagnosticsService.getSnapshot() -> DiagnosticsSnapshot
 *
 * This component and its two children (`ServiceHealthRow`,
 * `DiagnosticsChecks`) read nothing from a Zustand store, compute no
 * service's status themselves, and hold no diagnostics data beyond one
 * `DiagnosticsSnapshot` in local component state. The service remains
 * the single diagnostics aggregation owner (lib/services/diagnostics/
 * diagnosticsService.ts); this file only asks it for a snapshot and
 * renders what comes back.
 *
 * Initial load happens on mount. Refresh is a manual button — no
 * polling timer. `getSnapshot()` reads already-in-memory store state
 * synchronously under the hood, so there is nothing here worth gating
 * behind the shared busy-cursor mechanism (M20C2); a plain "LOADING
 * DIAGNOSTICS..." text state covers the async contract honestly without
 * adding a second busy signal for an operation that is not actually slow.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import {
  DIAGNOSTIC_STATUSES,
  type DiagnosticsSnapshot,
} from "@/lib/contracts/diagnostics/types";
import {
  deriveDiagnosticsStatus,
  diagnosticsService,
} from "@/lib/services/diagnostics/diagnosticsService";

import { cattipuCssVariables, cattipuTokens } from "@/design-system/tokens";
import "@/design-system/bevel.css";
import "./Diagnostics.css";

import { ServiceHealthRow, StatusBadge } from "./ServiceHealthRow";
import { DiagnosticsChecks } from "./DiagnosticsChecks";
import {
  describeSnapshotError,
  formatObservedAt,
  summarizeServiceStatuses,
} from "./diagnosticsPresentation";

type DiagnosticsPanelStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; snapshot: DiagnosticsSnapshot };

export function DeveloperDiagnostics() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  const load = useCallback(() => {
    setState({ phase: "loading" });
    diagnosticsService
      .getSnapshot()
      .then((snapshot) => setState({ phase: "ready", snapshot }))
      .catch((error: unknown) =>
        setState({ phase: "error", message: describeSnapshotError(error) }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const panelStyle: DiagnosticsPanelStyle = {
    ...cattipuCssVariables,
    // The four locked semantic colors (Constitution §24) reused for
    // status readouts — no new hues introduced. "not-implemented" and
    // "unknown" stay on the neutral outer-frame ink: they are not
    // failures, so they get no alarm color.
    "--cattipu-diagnostics-ready": cattipuTokens.colors.status,
    "--cattipu-diagnostics-degraded": cattipuTokens.colors.welcome,
    "--cattipu-diagnostics-offline": cattipuTokens.colors.projects,
  };

  return (
    <div className="cattipu-diagnostics" style={panelStyle}>
      <div className="cattipu-diagnostics__toolbar">
        <span className="cattipu-diagnostics__title">DEVELOPER DIAGNOSTICS</span>
        <button
          type="button"
          className="cattipu-diagnostics__refresh cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={load}
          disabled={state.phase === "loading"}
        >
          {state.phase === "loading" ? "REFRESHING..." : "REFRESH / RECHECK"}
        </button>
      </div>

      {state.phase === "loading" && (
        <p className="cattipu-diagnostics__status-line" role="status">
          LOADING DIAGNOSTICS...
        </p>
      )}

      {state.phase === "error" && (
        <p
          className="cattipu-diagnostics__status-line cattipu-diagnostics__status-line--error"
          role="alert"
        >
          DIAGNOSTICS UNAVAILABLE — {state.message}
        </p>
      )}

      {state.phase === "ready" && <DiagnosticsSnapshotView snapshot={state.snapshot} />}
    </div>
  );
}

function DiagnosticsSnapshotView({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const overall = deriveDiagnosticsStatus(snapshot);
  const counts = summarizeServiceStatuses(snapshot.services);

  return (
    <>
      <p className="cattipu-diagnostics__status-line">
        LAST OBSERVATION: {formatObservedAt(snapshot.observedAt)}
      </p>

      <section className="cattipu-diagnostics__panel cattipu-bevel--inset" aria-label="System summary">
        <h3 className="cattipu-diagnostics__panel-title">SYSTEM SUMMARY</h3>

        <dl className="cattipu-diagnostics__summary">
          <div className="cattipu-diagnostics__summary-row">
            <dt>CONTRACT VERSION</dt>
            <dd>{snapshot.contractVersion}</dd>
          </div>
          <div className="cattipu-diagnostics__summary-row">
            <dt>OVERALL</dt>
            <dd>
              <StatusBadge status={overall} />
            </dd>
          </div>
        </dl>

        <ul className="cattipu-diagnostics__summary-counts">
          {DIAGNOSTIC_STATUSES.map((status) => (
            <li key={status} className="cattipu-diagnostics__summary-count">
              <StatusBadge status={status} />
              <strong>{counts[status]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="cattipu-diagnostics__panel" aria-label="Services">
        <h3 className="cattipu-diagnostics__panel-title">SERVICES</h3>
        <div className="cattipu-diagnostics__services">
          {snapshot.services.map((service) => (
            <ServiceHealthRow key={service.id} service={service} />
          ))}
        </div>
      </section>

      <section
        className="cattipu-diagnostics__panel"
        aria-label="Known issues and architecture drift"
      >
        <h3 className="cattipu-diagnostics__panel-title">KNOWN ISSUES / ARCHITECTURE DRIFT</h3>
        <DiagnosticsChecks checks={snapshot.checks} />
      </section>
    </>
  );
}
