import type { DiagnosticsSnapshot } from "./types";

/**
 * M20.5B (Diagnostics Contracts) — what a diagnostics producer offers.
 *
 * Read-only: it observes the canonical owners and never writes to them.
 *
 * Asynchronous even though every check available today is in-process
 * and synchronous. A producer that later asks a physically separate
 * service for its health cannot answer synchronously, and callers
 * written against a Promise do not change when that happens. The same
 * convention as `WorkspaceGenerator.run` and `DeploymentProvider.deploy`
 * in lib/os/extensions.ts.
 *
 * Implemented in M20.5C, not here.
 */
export interface DiagnosticsService {
  getSnapshot(): Promise<DiagnosticsSnapshot>;
}
