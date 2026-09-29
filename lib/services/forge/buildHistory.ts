import { FORGE_LIMITS, type BuildResult } from "@/lib/contracts/forge";
import { MEMORY_LIMITS } from "@/lib/contracts/memory";
import type { CattipuProject, ForgeArtifacts, ForgeBuild, MemoryArtifacts, MemoryRecord } from "@/lib/project/types";

import { WEB_APP_TARGET } from "./webAppTarget";

/**
 * MVP-07 — what a project keeps of a build, as pure rules. The project
 * store applies them to the named project only.
 *
 *   forge.builds    the build history (bounded), in the project's own slot
 *   memory.records  ONE `build` record: a reference to the latest build
 *                   (id, target, result, time, artifact, summary) so the
 *                   AI and the Memory window know it — never the log
 */

/** The stored form of a result. Output is kept for failed builds only. */
export function toForgeBuild(result: BuildResult): ForgeBuild {
  return {
    id: result.buildId,
    status: result.status,
    startedAt: result.startedAt,
    projectId: result.projectId,
    target: result.target,
    configuration: result.configuration,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    summary: result.summary,
    diagnostics: result.diagnostics.slice(0, FORGE_LIMITS.maxDiagnostics),
    artifact: result.status === "success" ? result.artifact : null,
    executed: result.executed,
    sourceFiles: result.sourceFiles,
    ...(result.status === "failed" && result.output
      ? { output: result.output.slice(-FORGE_LIMITS.maxOutputChars) }
      : {}),
  };
}

/** Newest first, by start time. */
export function buildsNewestFirst(project: CattipuProject): ForgeBuild[] {
  return [...project.forge.builds].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** The history with one more build, keeping the newest `maxHistory`. A
 *  build already recorded (same id) is not recorded twice. */
export function withBuild(forge: ForgeArtifacts, build: ForgeBuild): ForgeArtifacts {
  if (forge.builds.some((b) => b.id === build.id)) return forge;
  const builds = [...forge.builds, build]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(-FORGE_LIMITS.maxHistory);
  return { ...forge, builds };
}

export const BUILD_MEMORY_RECORD_ID = "memory-latest-build";

function targetLabel(target: string): string {
  return target === WEB_APP_TARGET.id ? WEB_APP_TARGET.label : target.toUpperCase();
}

export function buildMemoryText(build: ForgeBuild): string {
  const parts = [
    `Latest Forge build ${build.id} (${targetLabel(build.target)}, ${build.configuration}) ${build.status === "success" ? "SUCCEEDED" : "FAILED"} at ${build.completedAt}.`,
    build.summary,
    build.artifact ? `Artifact: ${build.artifact.reference}.` : "No artifact.",
  ];
  return parts.join(" ").slice(0, MEMORY_LIMITS.maxRecordChars);
}

/** Memory with its one `build` record pointing at `build`: replaced in
 *  place, so memory never fills with a record per build. */
export function withLatestBuildMemory(memory: MemoryArtifacts, build: ForgeBuild, at: string): MemoryArtifacts {
  const existing = memory.records.find((r) => r.id === BUILD_MEMORY_RECORD_ID);
  const record: MemoryRecord = {
    id: BUILD_MEMORY_RECORD_ID,
    kind: "build",
    text: buildMemoryText(build),
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    refs: [{ kind: "forge-build", id: build.id }],
  };
  return {
    ...memory,
    records: existing
      ? memory.records.map((r) => (r.id === BUILD_MEMORY_RECORD_ID ? record : r))
      : [...memory.records, record],
  };
}
