import type { FileWrite } from "./filesystem";

/**
 * MVP-07 — Forge: a real build of a project's files.
 *
 *   Forge window ─→ useForgeStore ─→ ForgeClient ─→ /api/forge
 *                                                     ↓
 *                                                ForgeService (server)
 *                                                     ↓
 *                              materializer ─→ temp workspace (this project only)
 *                                                     ↓
 *                              BuildToolchain ─→ allowlisted executable + args
 *                                                     ↓
 *                                               artifact directory
 *
 * The browser's filesystem is localStorage; a native build process cannot
 * see it. So a build request CARRIES the workspace's files (read from the
 * filesystem, their owner), and the server writes them into a temporary
 * workspace that exists only for that build. Nothing here is a second
 * filesystem: the temporary copy is deleted when the build ends, and the
 * only thing that outlives it is the artifact.
 *
 * Framework-free: no React, no Next, no child_process. Commands are never
 * part of a request — a request names a target from `BUILD_TARGETS`, and
 * the server alone decides what that target runs.
 */

/** The one supported target: a static web application — `index.html` plus
 *  a TypeScript or JavaScript entry, bundled for the browser. */
export const BUILD_TARGETS = ["web-app"] as const;
export type BuildTargetId = (typeof BUILD_TARGETS)[number];

export const BUILD_CONFIGURATIONS = ["production", "development"] as const;
export type BuildConfiguration = (typeof BUILD_CONFIGURATIONS)[number];

export function isBuildTarget(value: unknown): value is BuildTargetId {
  return typeof value === "string" && (BUILD_TARGETS as readonly string[]).includes(value);
}

export function isBuildConfiguration(value: unknown): value is BuildConfiguration {
  return typeof value === "string" && (BUILD_CONFIGURATIONS as readonly string[]).includes(value);
}

export const FORGE_LIMITS = {
  maxFiles: 200,
  maxTotalChars: 2_000_000,
  timeoutMs: 60_000,
  /** Raw output kept with a result: the tail, after redaction. */
  maxOutputChars: 4_000,
  maxDiagnostics: 20,
  maxDiagnosticChars: 300,
  /** Builds kept in a project's history. */
  maxHistory: 20,
  /** Artifact directories kept on disk per project, newest first. */
  keepArtifacts: 5,
} as const;

/** What a caller sends. `files` is the workspace as the filesystem holds
 *  it; everything else is an id the server resolves. */
export interface BuildRequest {
  projectId: string;
  target: BuildTargetId;
  configuration: BuildConfiguration;
  files: FileWrite[];
}

/** Persisted statuses use the project model's existing vocabulary
 *  (lib/project/types.ts `ForgeBuildStatus`). "running" exists only while
 *  a request is in flight and is never stored. */
export type BuildOutcome = "success" | "failed";

export interface BuildDiagnostic {
  severity: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface BuildArtifactFile {
  path: string;
  bytes: number;
}

/** Where a successful build's output lives. `reference` is the stable name
 *  the OS uses; `location` is the directory on the build machine. */
export interface BuildArtifact {
  reference: string;
  location: string;
  entry: string;
  files: BuildArtifactFile[];
  bytes: number;
}

export interface BuildResult {
  buildId: string;
  projectId: string;
  target: BuildTargetId;
  configuration: BuildConfiguration;
  status: BuildOutcome;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  /** One line a person can read: what happened. */
  summary: string;
  diagnostics: BuildDiagnostic[];
  /** Bounded, redacted tail of the build's own output. */
  output: string;
  /** Present only when the build succeeded and the files exist. */
  artifact: BuildArtifact | null;
  /** Whether a build process actually ran (false when the project could
   *  not be built at all, e.g. no index.html). */
  executed: boolean;
  sourceFiles: number;
}

export type ForgeErrorCode =
  /** The request is malformed: no project, unknown target, bad files. */
  | "invalid-request"
  /** Building is switched off on this server. */
  | "disabled"
  /** The build toolchain is not installed where the server runs. */
  | "toolchain-unavailable"
  /** This project already has a build running. */
  | "busy"
  /** The request never reached Forge. */
  | "network"
  | "internal";

export interface ForgeError {
  code: ForgeErrorCode;
  message: string;
}

/** A failed build is a result, not an error: `ok: true` with
 *  `result.status === "failed"`. Errors are for builds that never started. */
export type ForgeResponse = { ok: true; result: BuildResult } | { ok: false; error: ForgeError };

export interface ForgeStatus {
  enabled: boolean;
  toolchain: string | null;
  targets: ReadonlyArray<{ id: BuildTargetId; label: string; requirement: string }>;
  /** Why building is unavailable, in plain words; null when it is. */
  reason: string | null;
}

export interface ArtifactCheck {
  reference: string;
  exists: boolean;
  files: BuildArtifactFile[];
}

/** The client-facing service. React depends on this, never on a process. */
export interface ForgeClient {
  status(): Promise<ForgeStatus | ForgeError>;
  build(request: BuildRequest): Promise<ForgeResponse>;
  artifact(projectId: string, buildId: string): Promise<ArtifactCheck | ForgeError>;
}

// ── the process boundary ───────────────────────────────────────────────

/** One process invocation: an executable path and an argument array. No
 *  shell, no command string, no inherited environment. */
export interface ProcessSpec {
  executable: string;
  args: readonly string[];
  cwd: string;
  timeoutMs: number;
}

export interface ProcessOutcome {
  exitCode: number | null;
  /** stdout and stderr interleaved, bounded. */
  output: string;
  timedOut: boolean;
  /** The executable could not be started at all. */
  spawnError: string | null;
}

export type ProcessRunner = (spec: ProcessSpec) => Promise<ProcessOutcome>;

/** A resolved build tool: its name and the one command it will run. The
 *  arguments are built from Forge's own plan, never from request text. */
export interface BuildToolchain {
  name: string;
  command(plan: { entry: string; outdir: string; metafile: string; configuration: BuildConfiguration }): {
    executable: string;
    args: string[];
  };
}
