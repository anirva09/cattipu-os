"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import type { LaunchStatus } from "@/lib/contracts/launch";
import { activeProject } from "@/lib/os/projects";
import type { ForgeBuild, LaunchRun } from "@/lib/project/types";
import { buildsNewestFirst } from "@/lib/services/forge/buildHistory";
import { forgeClient } from "@/lib/services/forge/forgeClient";
import { runsNewestFirst } from "@/lib/services/launch/launchHistory";
import { IDLE_LAUNCH_SESSION, useLaunchStore, type LaunchServerView, type LaunchSession } from "@/store/useLaunchStore";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./LaunchApp.css";

/**
 * MVP-08 — Launch: a successful Forge build → a running local application.
 *
 * Forge's panel, one step down the line: a toolbar with the runtime and
 * the LAUNCH key; an inset well with the application (status, build,
 * address, OPEN and STOP), the project's builds to pick from, and its
 * launch history; an instrumentation strip. The window never starts a
 * process: it calls useLaunchStore, which calls LaunchService through
 * /api/launch. What it says about a runtime is what the server last said —
 * never what the project stored.
 */

export const CATTIPU_LAUNCH_REFERENCE = {
  toolbarHeight: 34,
  statusHeight: 24,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
  /** How often an open Launch window asks the server what is running. */
  pollMs: 3_000,
} as const;

type LaunchStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

const BUTTON = "cattipu-launch__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical";

function clock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** The address without its scheme, the way the window prints it. */
function address(endpoint: string | null): string {
  return endpoint ? endpoint.replace(/^https?:\/\//, "") : "—";
}

export type LaunchState = LaunchStatus | "checking";

/** What the window says the application is doing: the request in flight,
 *  else the server's last word, else — until the server has answered —
 *  that it is checking. Never a stored run. */
export function launchState(server: LaunchServerView, session: LaunchSession): LaunchState {
  if (session.pending) return session.pending;
  if (session.runtime) return session.runtime.status;
  return server.kind === "unknown" ? "checking" : "stopped";
}

const STATE_LABEL: Record<LaunchState, string> = {
  checking: "CHECKING…",
  stopped: "STOPPED",
  starting: "STARTING…",
  running: "RUNNING",
  stopping: "STOPPING…",
  failed: "FAILED",
};

export interface LaunchViewProps {
  project: { id: string; name: string } | null;
  server: LaunchServerView;
  session: LaunchSession;
  /** The project's Forge builds, newest first. */
  builds: ForgeBuild[];
  /** Whether each successful build's artifact is on disk; absent = not yet known. */
  presence: Record<string, boolean>;
  selectedBuildId: string | null;
  runs: LaunchRun[];
  onSelectBuild: (buildId: string) => void;
  onLaunch: () => void;
  onStop: () => void;
}

/** Why a build cannot be launched, or null when it can. */
export function unlaunchable(build: ForgeBuild, presence: Record<string, boolean>): string | null {
  if (build.status !== "success" || !build.artifact) return "FAILED BUILD";
  if (presence[build.id] === false) return "NOT ON DISK";
  if (presence[build.id] === undefined) return "CHECKING DISK…";
  return null;
}

/** Pure presentation: every state is a function of these props. */
export function LaunchView(props: LaunchViewProps) {
  const { project, server, session, builds, presence, runs } = props;
  const style: LaunchStyle = {
    ...cattipuCssVariables,
    "--cattipu-launch-toolbar-height": `${CATTIPU_LAUNCH_REFERENCE.toolbarHeight}px`,
    "--cattipu-launch-status-height": `${CATTIPU_LAUNCH_REFERENCE.statusHeight}px`,
    "--cattipu-launch-pad": `${CATTIPU_LAUNCH_REFERENCE.padding}px`,
    "--cattipu-launch-gap": `${CATTIPU_LAUNCH_REFERENCE.gap}px`,
  };

  if (!project) {
    return (
      <div className="cattipu-launch cattipu-launch--empty" style={style} data-testid="launch" data-launch-state="no-project">
        <p className="cattipu-launch__notice">No project is open. Select or create a project to launch it.</p>
      </div>
    );
  }

  const state = launchState(server, session);
  const runtime = session.runtime;
  const running = state === "running" && runtime !== null && runtime.endpoint !== null;
  const busy = state === "starting" || state === "stopping" || state === "checking";
  const selected = builds.find((b) => b.id === props.selectedBuildId) ?? null;
  const blocked =
    server.kind === "unavailable"
      ? server.error.message
      : server.kind === "known" && !server.status.enabled
        ? server.status.reason
        : null;
  const launchable = selected !== null && unlaunchable(selected, presence) === null;
  const shownBuild = runtime && (state === "running" || state === "stopping" || state === "failed") ? runtime.buildId : selected?.id ?? null;
  const hasSuccess = builds.some((b) => b.status === "success");

  return (
    <div className="cattipu-launch" style={style} data-testid="launch" data-launch-state={state}>
      <div className="cattipu-launch__toolbar">
        <span className="cattipu-launch__source" data-testid="launch-source">
          {`${project.name} · RUNTIME ${server.kind === "known" ? server.status.runtime.label : "LOCAL WEB"}`}
        </span>
        <button
          type="button"
          className={`${BUTTON} cattipu-launch__launch`}
          data-testid="launch-launch"
          disabled={busy || running || blocked !== null || !launchable}
          onClick={props.onLaunch}
        >
          {state === "starting" ? "Starting…" : "Launch"}
        </button>
      </div>

      <div className="cattipu-launch__well cattipu-bevel--inset" data-testid="launch-well">
        {blocked && (
          <p className="cattipu-launch__notice" role="status" data-testid="launch-blocked">{blocked}</p>
        )}
        {session.error && !busy && (
          <article className="cattipu-launch__block" data-testid="launch-error" role="alert">
            <p className="cattipu-launch__label">{`LAUNCH NOT STARTED · ${session.error.code.toUpperCase()}`}</p>
            <p className="cattipu-launch__text">{session.error.message}</p>
          </article>
        )}

        <article className="cattipu-launch__block" data-testid="launch-application" data-status={state} aria-live="polite">
          <p className="cattipu-launch__label">APPLICATION</p>
          <dl className="cattipu-launch__facts">
            <dt>STATUS</dt>
            <dd data-testid="launch-status">{STATE_LABEL[state]}</dd>
            <dt>BUILD</dt>
            <dd data-testid="launch-build">{shownBuild ?? "—"}</dd>
            <dt>ADDRESS</dt>
            <dd data-testid="launch-address">{running ? address(runtime.endpoint) : "—"}</dd>
            {runtime && (state === "running" || state === "stopping") && (
              <>
                <dt>SINCE</dt>
                <dd>{clock(runtime.readyAt ?? runtime.startedAt)}</dd>
              </>
            )}
            {runtime?.reason && (state === "failed" || state === "stopped") && (
              <>
                <dt>REASON</dt>
                <dd data-testid="launch-reason">{runtime.reason}</dd>
              </>
            )}
          </dl>
          {(running || state === "stopping") && runtime && (
            <div className="cattipu-launch__actions">
              {running ? (
                <a
                  className={`${BUTTON} cattipu-launch__open`}
                  data-testid="launch-open"
                  href={runtime.endpoint ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open
                </a>
              ) : null}
              <button
                type="button"
                className={BUTTON}
                data-testid="launch-stop"
                disabled={state !== "running"}
                onClick={props.onStop}
              >
                {state === "stopping" ? "Stopping…" : "Stop"}
              </button>
            </div>
          )}
        </article>

        {builds.length === 0 ? (
          <p className="cattipu-launch__notice" data-testid="launch-no-builds">
            {`${project.name} has no builds. Build it in Forge first; Launch runs a successful build's artifact.`}
          </p>
        ) : (
          <section className="cattipu-launch__block" data-testid="launch-builds" aria-label="Builds">
            <p className="cattipu-launch__label">{`SELECT BUILD · ${String(builds.length).padStart(2, "0")}`}</p>
            {!hasSuccess && (
              <p className="cattipu-launch__text">No build has succeeded yet. Only a successful build can launch.</p>
            )}
            <ul className="cattipu-launch__list">
              {builds.map((build) => {
                const why = unlaunchable(build, presence);
                return (
                  <li key={build.id}>
                    <button
                      type="button"
                      className="cattipu-launch__row cattipu-focus--mechanical"
                      data-testid="launch-build-row"
                      data-build-id={build.id}
                      data-status={build.status}
                      data-selected={selected?.id === build.id ? "true" : undefined}
                      disabled={why !== null || busy || running}
                      aria-pressed={selected?.id === build.id}
                      onClick={() => props.onSelectBuild(build.id)}
                    >
                      <span className="cattipu-launch__row-status">{build.status === "success" ? "OK" : "FAIL"}</span>
                      <span className="cattipu-launch__row-time">{clock(build.startedAt)}</span>
                      <span className="cattipu-launch__row-text">{build.id}</span>
                      <span className="cattipu-launch__row-note" data-testid="launch-build-note">{why ?? "ON DISK"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {runs.length > 0 && (
          <section className="cattipu-launch__block" data-testid="launch-history" aria-label="Launch history">
            <p className="cattipu-launch__label">{`HISTORY · ${String(runs.length).padStart(2, "0")}`}</p>
            <ul className="cattipu-launch__list">
              {runs.map((run) => {
                // Only the server can say a run is live; a stored run that
                // has not been seen to end says just that.
                const live = runtime?.launchId === run.id && state === "running";
                const word = run.result === "failed" ? "FAIL" : run.result === "stopped" ? "STOP" : live ? "RUN" : "?";
                return (
                  <li key={run.id} className="cattipu-launch__history-row" data-testid="launch-history-row" data-result={run.result ?? "open"}>
                    <span className="cattipu-launch__row-status">{word}</span>
                    <span className="cattipu-launch__row-time">{clock(run.startedAt)}</span>
                    <span className="cattipu-launch__row-text">
                      {`${run.buildId}${run.endpoint ? ` · ${address(run.endpoint)}` : ""}${run.reason ? ` · ${run.reason}` : ""}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="cattipu-launch__status" data-testid="launch-strip">
        <span>{`LAUNCHES ${String(runs.length).padStart(2, "0")}`}</span>
        <span>{running ? `PORT ${runtime.port}` : "PORT —"}</span>
        <span className="cattipu-launch__status-state">{blocked ? "UNAVAILABLE" : STATE_LABEL[state].replace("…", "")}</span>
      </div>
    </div>
  );
}

/** The window body: the active project's builds and runtime, through the stores. */
export function LaunchApp() {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(() => activeProject(projects), [projects]);
  const server = useLaunchStore((s) => s.server);
  const session = useLaunchStore((s) => (project ? s.sessions[project.id] : undefined)) ?? IDLE_LAUNCH_SESSION;
  const refresh = useLaunchStore((s) => s.refresh);
  const launch = useLaunchStore((s) => s.launch);
  const stop = useLaunchStore((s) => s.stop);
  const builds = useMemo(() => (project ? buildsNewestFirst(project) : []), [project]);
  const runs = useMemo(() => (project ? runsNewestFirst(project) : []), [project]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});

  // What is running is asked of the server when the window opens and
  // while it stays open, so an application that exits on its own is seen.
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), CATTIPU_LAUNCH_REFERENCE.pollMs);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Whether each successful build's artifact is still on disk — asked of
  // Forge, which owns artifacts, never assumed from the record.
  const successIds = useMemo(
    () => builds.filter((b) => b.status === "success" && b.artifact).map((b) => b.id).join(","),
    [builds],
  );
  useEffect(() => {
    if (!project || !successIds) return;
    let live = true;
    for (const buildId of successIds.split(",")) {
      forgeClient.artifact(project.id, buildId).then((check) => {
        if (live && !("code" in check)) setPresence((p) => ({ ...p, [buildId]: check.exists }));
      });
    }
    return () => {
      live = false;
    };
  }, [project, successIds]);

  const firstLaunchable = builds.find((b) => unlaunchable(b, presence) === null)?.id ?? null;
  const selectedId = project ? selected[project.id] ?? firstLaunchable : null;

  return (
    <LaunchView
      project={project ? { id: project.id, name: project.name } : null}
      server={server}
      session={session}
      builds={builds}
      presence={presence}
      selectedBuildId={selectedId}
      runs={runs}
      onSelectBuild={(buildId) => project && setSelected((s) => ({ ...s, [project.id]: buildId }))}
      onLaunch={() => {
        if (project && selectedId) void launch(project.id, selectedId);
      }}
      onStop={() => {
        if (project) void stop(project.id);
      }}
    />
  );
}
