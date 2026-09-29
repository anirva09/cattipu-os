import { LAUNCH_LIMITS, type LaunchRuntime } from "@/lib/contracts/launch";
import { MEMORY_LIMITS } from "@/lib/contracts/memory";
import type { CattipuProject, LaunchArtifacts, LaunchRun, MemoryArtifacts, MemoryRecord } from "@/lib/project/types";

/**
 * MVP-08 — what a project keeps of its launches, as pure rules. The
 * project store applies them to the named project only.
 *
 *   launch.runs     launch history (bounded): which build, when, where it
 *                   was served, how it ended — never "running"
 *   memory.records  ONE `launch` record referencing the latest launch, so
 *                   the AI and the Memory window know it — never a log,
 *                   a process id or anything from the runtime's internals
 *
 * Forge still owns the build; a run refers to it by id.
 */

/** A server runtime, as history. Only an ended runtime has a result. */
export function toLaunchRun(runtime: LaunchRuntime): LaunchRun {
  const ended = runtime.status === "stopped" || runtime.status === "failed";
  return {
    id: runtime.launchId,
    projectId: runtime.projectId,
    buildId: runtime.buildId,
    artifact: runtime.artifact,
    runtime: runtime.runtime,
    startedAt: runtime.startedAt,
    endpoint: runtime.endpoint,
    endedAt: ended ? runtime.endedAt ?? runtime.startedAt : null,
    result: ended ? (runtime.status as "stopped" | "failed") : null,
    reason: ended ? runtime.reason : null,
  };
}

const sameRun = (a: LaunchRun, b: LaunchRun) => JSON.stringify(a) === JSON.stringify(b);

/** The history with this run added or brought up to date, newest
 *  `maxHistory` kept. Unchanged history is returned as the same object,
 *  so a poll that learns nothing new writes nothing. */
export function withLaunchRun(launch: LaunchArtifacts, run: LaunchRun): LaunchArtifacts {
  const existing = launch.runs.find((r) => r.id === run.id);
  if (existing && sameRun(existing, run)) return launch;
  // An ended run is never reopened by a late or stale report.
  if (existing && existing.result !== null && run.result === null) return launch;
  const runs = existing
    ? launch.runs.map((r) => (r.id === run.id ? run : r))
    : [...launch.runs, run].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-LAUNCH_LIMITS.maxHistory);
  return { ...launch, runs };
}

/**
 * Closes every run the server does not vouch for. `live` is the project's
 * runtime as the server reports it now (or null when it has none). A run
 * not seen to end that is not the live one is over: the server has no
 * process for it — after a reload of CATTIPU's server, for instance — so
 * it is recorded as stopped, never left looking alive.
 */
export function reconcileRuns(launch: LaunchArtifacts, live: LaunchRuntime | null, at: string): LaunchArtifacts {
  let next = launch;
  if (live) next = withLaunchRun(next, toLaunchRun(live));
  const alive = live && (live.status === "running" || live.status === "starting" || live.status === "stopping") ? live.launchId : null;
  for (const run of next.runs) {
    if (run.result !== null || run.id === alive) continue;
    next = withLaunchRun(next, {
      ...run,
      endedAt: at,
      result: "stopped",
      reason: "Not running: CATTIPU's server has no process for this launch.",
    });
  }
  return next;
}

/** Newest first, by start time. */
export function runsNewestFirst(project: CattipuProject): LaunchRun[] {
  return [...project.launch.runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export const LAUNCH_MEMORY_RECORD_ID = "memory-latest-launch";

export function launchMemoryText(run: LaunchRun): string {
  const how =
    run.result === null
      ? `started at ${run.startedAt}${run.endpoint ? ` on ${run.endpoint}` : ""} (runtime state is not stored; the Launch window shows whether it still runs)`
      : `${run.result === "failed" ? "FAILED" : "stopped"} at ${run.endedAt}${run.reason ? `: ${run.reason.replace(/\.$/, "")}` : ""}`;
  return `Latest local launch ${run.id} of Forge build ${run.buildId} (${run.artifact}) ${how}.`.slice(0, MEMORY_LIMITS.maxRecordChars);
}

/** Memory with its one `launch` record pointing at `run`, replaced in
 *  place. Unchanged memory is returned as the same object. */
export function withLatestLaunchMemory(memory: MemoryArtifacts, run: LaunchRun, at: string): MemoryArtifacts {
  const existing = memory.records.find((r) => r.id === LAUNCH_MEMORY_RECORD_ID);
  const text = launchMemoryText(run);
  const refs: MemoryRecord["refs"] = [
    { kind: "launch-run", id: run.id },
    { kind: "forge-build", id: run.buildId },
  ];
  if (existing && existing.text === text && JSON.stringify(existing.refs) === JSON.stringify(refs)) return memory;
  const record: MemoryRecord = {
    id: LAUNCH_MEMORY_RECORD_ID,
    kind: "launch",
    text,
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    refs,
  };
  return {
    ...memory,
    records: existing
      ? memory.records.map((r) => (r.id === LAUNCH_MEMORY_RECORD_ID ? record : r))
      : [...memory.records, record],
  };
}
