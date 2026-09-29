"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import {
  BUILD_CONFIGURATIONS,
  type ArtifactCheck,
  type BuildConfiguration,
  type ForgeError,
  type ForgeStatus,
} from "@/lib/contracts/forge";
import { workspaceForProject } from "@/lib/os/filesystem";
import { activeProject } from "@/lib/os/projects";
import type { ForgeBuild } from "@/lib/project/types";
import { buildsNewestFirst } from "@/lib/services/forge/buildHistory";
import { forgeClient } from "@/lib/services/forge/forgeClient";
import { WEB_APP_TARGET } from "@/lib/services/forge/webAppTarget";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { IDLE_FORGE_SESSION, useForgeStore, type ForgeSession } from "@/store/useForgeStore";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./ForgeApp.css";

/**
 * MVP-07 — Forge: the active project's files → a real build → an artifact.
 *
 * A workstation panel, the AI Console's build: a toolbar with the target,
 * configuration and BUILD key; an inset well with the build shown in full
 * (status, duration, summary, diagnostics, artifact) and the project's
 * history under it; an instrumentation strip. The window never starts a
 * process: it calls useForgeStore, which calls ForgeService through
 * /api/forge. Builds are read from the project, so a reload keeps them.
 */

export const CATTIPU_FORGE_REFERENCE = {
  toolbarHeight: 34,
  statusHeight: 24,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
} as const;

type ForgeStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

const BUTTON = "cattipu-forge__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical";

export type ForgeServerState =
  | { kind: "checking" }
  | { kind: "known"; status: ForgeStatus }
  | { kind: "unavailable"; error: ForgeError };

/** Local wall-clock time, drawn the same way everywhere in the window. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function kilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const STATE_LABEL = { running: "BUILDING…", success: "BUILD COMPLETE", failed: "BUILD FAILED" } as const;

export interface ForgeViewProps {
  project: { id: string; name: string } | null;
  hasWorkspace: boolean;
  server: ForgeServerState;
  session: ForgeSession;
  builds: ForgeBuild[];
  selectedBuildId: string | null;
  artifactCheck?: ArtifactCheck | null;
  configuration: BuildConfiguration;
  onConfiguration: (value: BuildConfiguration) => void;
  onBuild: () => void;
  onSelectBuild: (buildId: string) => void;
}

/** Pure presentation: every state is a function of these props. */
export function ForgeView(props: ForgeViewProps) {
  const { project, server, session, builds, configuration } = props;
  const style: ForgeStyle = {
    ...cattipuCssVariables,
    "--cattipu-forge-toolbar-height": `${CATTIPU_FORGE_REFERENCE.toolbarHeight}px`,
    "--cattipu-forge-status-height": `${CATTIPU_FORGE_REFERENCE.statusHeight}px`,
    "--cattipu-forge-pad": `${CATTIPU_FORGE_REFERENCE.padding}px`,
    "--cattipu-forge-gap": `${CATTIPU_FORGE_REFERENCE.gap}px`,
  };

  if (!project) {
    return (
      <div className="cattipu-forge cattipu-forge--empty" style={style} data-testid="forge" data-forge-state="no-project">
        <p className="cattipu-forge__notice">No project is open. Select or create a project to build it.</p>
      </div>
    );
  }

  const running = session.status === "running";
  const selected = builds.find((b) => b.id === props.selectedBuildId) ?? builds[0] ?? null;
  const blocked =
    server.kind === "unavailable"
      ? server.error.message
      : server.kind === "known" && !server.status.enabled
        ? server.status.reason
        : !props.hasWorkspace
          ? `${project.name} has no workspace folder, so there are no files to build.`
          : null;
  const state = running ? "running" : selected ? selected.status : "ready";

  return (
    <div className="cattipu-forge" style={style} data-testid="forge" data-forge-state={state}>
      <div className="cattipu-forge__toolbar">
        <span className="cattipu-forge__source" data-testid="forge-source">
          {`${project.name} · TARGET ${WEB_APP_TARGET.label}`}
        </span>
        <span className="cattipu-forge__configs" role="group" aria-label="Configuration">
          {BUILD_CONFIGURATIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={configuration === value}
              className={`cattipu-forge__config cattipu-focus--mechanical ${
                configuration === value ? "cattipu-bevel--inset" : "cattipu-bevel--raised cattipu-bevel--pressable"
              }`}
              disabled={running}
              onClick={() => props.onConfiguration(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={`${BUTTON} cattipu-forge__build`}
          data-testid="forge-build"
          disabled={running || blocked !== null || server.kind === "checking"}
          onClick={props.onBuild}
        >
          {running ? "Building…" : "Build"}
        </button>
      </div>

      <div className="cattipu-forge__well cattipu-bevel--inset" data-testid="forge-well">
        {blocked && (
          <p className="cattipu-forge__notice" role="status" data-testid="forge-blocked">{blocked}</p>
        )}
        {session.error && !running && (
          <article className="cattipu-forge__block" data-testid="forge-error" role="alert">
            <p className="cattipu-forge__label">{`BUILD NOT STARTED · ${session.error.code.toUpperCase()}`}</p>
            <p className="cattipu-forge__text">{session.error.message}</p>
          </article>
        )}

        {running && (
          <article className="cattipu-forge__block" data-testid="forge-running" aria-live="polite">
            <p className="cattipu-forge__label">{STATE_LABEL.running}</p>
            <p className="cattipu-forge__text">
              {`Building ${project.name}'s workspace on the server${session.startedAt ? ` since ${clock(session.startedAt)}` : ""}.`}
            </p>
          </article>
        )}

        {!running && !selected && !blocked && (
          <p className="cattipu-forge__notice">
            {`Nothing built yet. BUILD bundles ${project.name}'s workspace as a web application. Needs ${WEB_APP_TARGET.requirement}.`}
          </p>
        )}

        {selected && <BuildDetail build={selected} check={props.artifactCheck ?? null} />}

        {builds.length > 0 && (
          <section className="cattipu-forge__block" data-testid="forge-history" aria-label="Build history">
            <p className="cattipu-forge__label">{`HISTORY · ${String(builds.length).padStart(2, "0")}`}</p>
            <ul className="cattipu-forge__history">
              {builds.map((build) => (
                <li key={build.id}>
                  <button
                    type="button"
                    className="cattipu-forge__row cattipu-focus--mechanical"
                    data-testid="forge-history-row"
                    data-status={build.status}
                    data-selected={selected?.id === build.id ? "true" : undefined}
                    onClick={() => props.onSelectBuild(build.id)}
                  >
                    <span className="cattipu-forge__row-status">{build.status === "success" ? "OK" : "FAIL"}</span>
                    <span className="cattipu-forge__row-time">{clock(build.startedAt)}</span>
                    <span className="cattipu-forge__row-summary">{build.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="cattipu-forge__status" data-testid="forge-status">
        <span>{`BUILDS ${String(builds.length).padStart(2, "0")}`}</span>
        <span className="cattipu-forge__status-tool">
          {server.kind === "known" ? `TOOL ${server.status.toolchain?.toUpperCase() ?? "NONE"}` : "TOOL —"}
        </span>
        <span className="cattipu-forge__status-state">{running ? "BUILDING" : blocked ? "UNAVAILABLE" : "READY"}</span>
      </div>
    </div>
  );
}

function BuildDetail({ build, check }: { build: ForgeBuild; check: ArtifactCheck | null }) {
  const artifact = build.artifact;
  const present = check && artifact && check.reference === artifact.reference ? check.exists : null;
  return (
    <article className="cattipu-forge__block" data-testid="forge-result" data-status={build.status}>
      <p className="cattipu-forge__label">{`${STATE_LABEL[build.status === "success" ? "success" : "failed"]} · ${build.id}`}</p>
      <dl className="cattipu-forge__facts">
        <dt>TARGET</dt>
        <dd>{`${build.target === WEB_APP_TARGET.id ? WEB_APP_TARGET.label : build.target} · ${build.configuration.toUpperCase()}`}</dd>
        <dt>STARTED</dt>
        <dd>{clock(build.startedAt)}</dd>
        <dt>DURATION</dt>
        <dd>{seconds(build.durationMs)}</dd>
        <dt>SOURCE</dt>
        <dd>{`${build.sourceFiles} ${build.sourceFiles === 1 ? "file" : "files"}${build.executed ? "" : " · no build process ran"}`}</dd>
        <dt>SUMMARY</dt>
        <dd data-testid="forge-summary">{build.summary}</dd>
        <dt>ARTIFACT</dt>
        <dd data-testid="forge-artifact">
          {artifact ? (
            <>
              <span className="cattipu-forge__ref">{artifact.reference}</span>
              <span className="cattipu-forge__path" title={artifact.location}>{artifact.location}</span>
              <span className="cattipu-forge__presence" data-testid="forge-artifact-presence">
                {present === null ? "CHECKING DISK…" : present ? "ON DISK" : "NO LONGER ON DISK"}
              </span>
            </>
          ) : (
            "NONE"
          )}
        </dd>
      </dl>
      {artifact && (
        <ul className="cattipu-forge__files" data-testid="forge-artifact-files">
          {artifact.files.map((file) => (
            <li key={file.path}>
              <span>{file.path}</span>
              <span>{kilobytes(file.bytes)}</span>
            </li>
          ))}
        </ul>
      )}
      {build.diagnostics.length > 0 && (
        <ul className="cattipu-forge__diagnostics" data-testid="forge-diagnostics">
          {build.diagnostics.map((d, i) => (
            <li key={i} data-severity={d.severity}>
              <span className="cattipu-forge__severity">{d.severity === "error" ? "ERROR" : "WARN"}</span>
              <span>
                {d.file ? `${d.file}${d.line ? `:${d.line}:${d.column ?? 0}` : ""} ` : ""}
                {d.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      {build.output && (
        <details className="cattipu-forge__output">
          <summary>OUTPUT</summary>
          <pre data-testid="forge-output">{build.output}</pre>
        </details>
      )}
    </article>
  );
}

/** The window body: the active project's builds, through the stores. */
export function ForgeApp() {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(() => activeProject(projects), [projects]);
  const objects = useFilesystemStore((s) => s.objects);
  const session = useForgeStore((s) => (project ? s.sessions[project.id] : undefined)) ?? IDLE_FORGE_SESSION;
  const build = useForgeStore((s) => s.build);
  const builds = useMemo(() => (project ? buildsNewestFirst(project) : []), [project]);
  const [server, setServer] = useState<ForgeServerState>({ kind: "checking" });
  const [configuration, setConfiguration] = useState<BuildConfiguration>("production");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [check, setCheck] = useState<ArtifactCheck | null>(null);

  const selectedId = project ? selected[project.id] ?? builds[0]?.id ?? null : null;
  const shown = builds.find((b) => b.id === selectedId) ?? null;
  const artifactRef = shown?.artifact?.reference ?? null;

  useEffect(() => {
    let live = true;
    forgeClient.status().then((status) => {
      if (live) setServer("code" in status ? { kind: "unavailable", error: status } : { kind: "known", status });
    });
    return () => {
      live = false;
    };
  }, []);

  // Whether the shown build's artifact is still on disk — asked of the
  // server, never assumed from the record.
  useEffect(() => {
    if (!shown || !artifactRef) return;
    let live = true;
    forgeClient.artifact(shown.projectId, shown.id).then((result) => {
      if (live && !("code" in result)) setCheck(result);
    });
    return () => {
      live = false;
    };
  }, [shown, artifactRef]);

  return (
    <ForgeView
      project={project ? { id: project.id, name: project.name } : null}
      hasWorkspace={project ? workspaceForProject(objects, project.id) !== null : false}
      server={server}
      session={session}
      builds={builds}
      selectedBuildId={selectedId}
      artifactCheck={check}
      configuration={configuration}
      onConfiguration={setConfiguration}
      onBuild={() => {
        if (!project) return;
        setSelected((s) => {
          const next = { ...s };
          delete next[project.id];
          return next;
        });
        void build(project.id, WEB_APP_TARGET.id, configuration);
      }}
      onSelectBuild={(buildId) => project && setSelected((s) => ({ ...s, [project.id]: buildId }))}
    />
  );
}
