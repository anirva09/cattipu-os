/**
 * M20.5B (Diagnostics Contracts) — the shape of one honest observation of
 * CATTIPU's health.
 *
 * Plain serializable data only: strings, numbers, booleans, arrays and
 * plain objects. No React, DOM, Zustand, browser-storage or provider
 * types, no functions, no Map/Set, no Date. A snapshot has to survive
 * `JSON.stringify` unchanged, because the producer may one day be a
 * physically separate service (AI Gateway, Forge Worker, Live Runtime,
 * Launch Worker — see docs/architecture/BOUNDARY_AUDIT.md §4) rather than
 * a module in this process.
 *
 * A snapshot is an observation, not state. It is produced on request and
 * discarded; nothing here is persisted, and no store holds it. The
 * canonical owners it describes stay the only owners of their data.
 */

// ---------------------------------------------------------------------
// Contract version
// ---------------------------------------------------------------------

/** Bump when a snapshot's shape changes in a way an older consumer could
 *  not read. Adding an optional field is not such a change. */
export const DIAGNOSTICS_CONTRACT_VERSION = 1;

// ---------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------

/**
 * `not-implemented` is a status, not an error: Memory, Forge, Live and
 * Launch do not exist yet, and saying so is the correct report. Nothing
 * unfinished is ever `ready`. `unknown` means the producer could not
 * observe it — distinct from `offline`, which is an observed failure.
 */
export const DIAGNOSTIC_STATUSES = [
  "ready",
  "degraded",
  "offline",
  "not-implemented",
  "unknown",
] as const;

export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number];

// ---------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------

/**
 * Diagnostic groupings by domain — deliberately NOT an application
 * registry. The app ids (`AppId`, `CATTIPU_WINDOW_IDS`,
 * `CATTIPU_SIDEBAR_ITEMS`) are an unresolved three-way split recorded in
 * BOUNDARY_AUDIT.md §2.3; this list neither picks one nor adds a fourth.
 * Boot, sound and cursor report under `system`.
 */
export const DIAGNOSTIC_CATEGORIES = [
  "system",
  "project",
  "filesystem",
  "windows",
  "settings",
  "notifications",
  "architect",
  "ai",
  "memory",
  "forge",
  "live",
  "launch",
] as const;

export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];

// ---------------------------------------------------------------------
// Shared value shapes
// ---------------------------------------------------------------------

/** One value in a check's structured detail. Flat on purpose: detail
 *  explains a result, it is not a dump of another owner's state. */
export type DiagnosticValue = string | number | boolean | null | readonly string[];

export type DiagnosticDetail = Readonly<Record<string, DiagnosticValue>>;

/** A failure as data. Never a raw `Error` — those do not serialize and
 *  can carry stack traces or values that must not leave the process. */
export interface DiagnosticError {
  /** Stable machine-readable code, e.g. "BUILD_TYPESCRIPT". */
  code?: string;
  message: string;
  /** ISO timestamp of when the error was observed. */
  at?: string;
}

// ---------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------

export interface DiagnosticCheck {
  /** Stable across releases so a check can be compared over time, e.g.
   *  "filesystem.orphaned-shortcuts". Never derived from `label`. */
  id: string;
  label: string;
  category: DiagnosticCategory;
  status: DiagnosticStatus;
  /** One line, suitable for a status readout. */
  message: string;
  detail?: DiagnosticDetail;
  /** ISO timestamp of when this check was evaluated. */
  checkedAt?: string;
}

// ---------------------------------------------------------------------
// Service health
// ---------------------------------------------------------------------

export interface ServiceHealth {
  /** Stable domain/service id, e.g. "filesystem" or "ai-gateway". A
   *  diagnostics identifier, not an app or window id. */
  id: string;
  name: string;
  category: DiagnosticCategory;
  status: DiagnosticStatus;
  /** Only when the service genuinely reports one. The repository has no
   *  single canonical version yet (BOUNDARY_AUDIT.md §3.2); the producer
   *  decides the source, and absence is a valid answer. */
  version?: string;
  latencyMs?: number;
  lastError?: DiagnosticError;
  /** For a `not-implemented` service: the roadmap milestone that owns it,
   *  e.g. "M26", so the report can say PLANNED rather than just absent. */
  plannedMilestone?: string;
  checks?: readonly DiagnosticCheck[];
}

// ---------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------

/**
 * One coherent observation. There is deliberately no overall status
 * field: a roll-up is derived from `services` and `checks`, and storing
 * it would be a second answer that could disagree with the first.
 *
 * Correlation fields for future observability (requestId, jobId,
 * projectId, operation, durationMs) can be added as optional fields
 * without bumping DIAGNOSTICS_CONTRACT_VERSION.
 */
export interface DiagnosticsSnapshot {
  contractVersion: typeof DIAGNOSTICS_CONTRACT_VERSION;
  /** ISO timestamp of when the observation was taken. */
  observedAt: string;
  services: readonly ServiceHealth[];
  /** Checks not owned by a single service — environment readiness,
   *  architecture drift, build metadata that is safely available. */
  checks: readonly DiagnosticCheck[];
}
