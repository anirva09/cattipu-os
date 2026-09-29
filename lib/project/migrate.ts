import type { GeneratedArchitecture } from "@/lib/ai/types";
import {
  DEFAULT_PROJECT_OWNER,
  PROJECT_SCHEMA_VERSION,
  PROJECT_TYPE_BY_ICON,
  createEmptyCanvasArtifacts,
  createEmptyForgeArtifacts,
  createEmptyLaunchArtifacts,
  createEmptyMemoryArtifacts,
  type CattipuProject,
  type ForgeArtifacts,
  type ForgeBuild,
  type LaunchArtifacts,
  type LaunchRun,
  type MemoryArtifacts,
  type MemoryRecord,
  type ProjectConversation,
  type ProjectIcon,
  type ProjectPrompt,
} from "./types";
import { isMemoryRecordKind } from "@/lib/contracts/memory";

/**
 * Milestone 14A — deterministic, pure migration from whatever shape a
 * persisted project record is in to the current `CattipuProject`. No I/O,
 * no randomness beyond a fresh id if one is somehow missing — same input
 * always produces the same output, so this is directly unit-testable
 * (see __tests__/migrate.test.ts).
 *
 * The pre-M14A shape (store/useProjectStore.ts's old `Project` interface,
 * persisted under the "cattipu-projects" localStorage key):
 *
 *   { id, name, icon, color, editedLabel, architecture?: GeneratedArchitecture }
 *
 * "Existing persisted projects must continue loading... do not discard
 * user projects" — every field on that old shape maps onto a field here;
 * nothing is dropped. `architecture` (if present) becomes the migrated
 * project's `architect.data` verbatim — the single most important
 * guarantee this file makes.
 */

interface LegacyProjectV0 {
  id: string;
  name: string;
  icon: ProjectIcon;
  color: string;
  editedLabel: string;
  architecture?: GeneratedArchitecture;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** True once a record already has the current schema's shape — detected
 * by the two fields no pre-M14A project ever had (`version`, `architect`),
 * rather than by trusting a `version` number alone (a corrupt or
 * hand-edited record could claim a version it doesn't actually match). */
function isCurrentShape(value: Record<string, unknown>): value is Record<string, unknown> & CattipuProject {
  return typeof value.version === "number" && isRecord(value.architect);
}

/**
 * MVP-05 (v6) memory. A v5 record has records with no kind or updatedAt and
 * none of prompts, activePromptId or conversations. Every existing record is
 * kept: its kind becomes "context" (the only kind anything could have meant
 * before kinds existed) and its updatedAt its createdAt. Prompts and
 * conversations are re-stamped with the project that contains them, so a
 * stored entry can never claim another project. Entries too malformed to
 * show are dropped rather than rendered as blanks.
 */
function migrateMemory(raw: unknown, projectId: string): MemoryArtifacts {
  const empty = createEmptyMemoryArtifacts();
  if (!isRecord(raw)) return empty;
  const list = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter(isRecord) : [];
  const text = (value: unknown): value is string => typeof value === "string";

  const records = list(raw.records).flatMap((r): MemoryRecord[] => {
    if (!text(r.id) || !text(r.text)) return [];
    const createdAt = text(r.createdAt) ? r.createdAt : "";
    return [{
      ...(r as unknown as MemoryRecord),
      kind: isMemoryRecordKind(r.kind) ? r.kind : "context",
      createdAt,
      updatedAt: text(r.updatedAt) ? r.updatedAt : createdAt,
      refs: Array.isArray(r.refs) ? (r.refs as MemoryRecord["refs"]) : [],
    }];
  });
  const prompts = list(raw.prompts).flatMap((p): ProjectPrompt[] =>
    text(p.id) && text(p.name) && text(p.content)
      ? [{
          id: p.id,
          projectId,
          name: p.name,
          content: p.content,
          createdAt: text(p.createdAt) ? p.createdAt : "",
          updatedAt: text(p.updatedAt) ? p.updatedAt : text(p.createdAt) ? p.createdAt : "",
        }]
      : [],
  );
  const conversations = list(raw.conversations).flatMap((c): ProjectConversation[] =>
    text(c.id)
      ? [{
          id: c.id,
          projectId,
          messages: list(c.messages).filter(
            (m) => text(m.id) && text(m.text) && (m.role === "user" || m.role === "assistant"),
          ) as unknown as ProjectConversation["messages"],
          createdAt: text(c.createdAt) ? c.createdAt : "",
          updatedAt: text(c.updatedAt) ? c.updatedAt : text(c.createdAt) ? c.createdAt : "",
        }]
      : [],
  );
  const activePromptId =
    text(raw.activePromptId) && prompts.some((p) => p.id === raw.activePromptId) ? raw.activePromptId : null;

  return {
    ...empty,
    ...(raw as Partial<MemoryArtifacts>),
    decisions: Array.isArray(raw.decisions) ? (raw.decisions as MemoryArtifacts["decisions"]) : [],
    relationships: Array.isArray(raw.relationships) ? (raw.relationships as MemoryArtifacts["relationships"]) : [],
    conflicts: Array.isArray(raw.conflicts) ? (raw.conflicts as MemoryArtifacts["conflicts"]) : [],
    records,
    prompts,
    activePromptId,
    conversations,
  };
}

/**
 * MVP-07 (v7) Forge builds. Nothing wrote a build before v7, so a v6 record
 * has none; an entry without an id, a known status and a start time is
 * dropped rather than shown as a build that never happened. Every build is
 * re-stamped with the project that contains it, and the other v7 fields
 * are filled from what the entry carries, never invented as a success.
 */
function migrateForge(raw: unknown, projectId: string): ForgeArtifacts {
  const empty = createEmptyForgeArtifacts();
  if (!isRecord(raw)) return empty;
  const text = (value: unknown): value is string => typeof value === "string";
  const builds = (Array.isArray(raw.builds) ? raw.builds.filter(isRecord) : []).flatMap((b): ForgeBuild[] => {
    if (!text(b.id) || !text(b.startedAt) || (b.status !== "pending" && b.status !== "success" && b.status !== "failed")) {
      return [];
    }
    const artifact = b.status === "success" && isRecord(b.artifact) ? (b.artifact as unknown as ForgeBuild["artifact"]) : null;
    return [{
      id: b.id,
      // A build still "pending" in storage was interrupted: nothing will
      // ever finish it, so it is recorded as the failure it is.
      status: b.status === "pending" ? "failed" : b.status,
      startedAt: b.startedAt,
      projectId,
      target: text(b.target) ? b.target : "unknown",
      configuration: text(b.configuration) ? b.configuration : "production",
      completedAt: text(b.completedAt) ? b.completedAt : b.startedAt,
      durationMs: typeof b.durationMs === "number" ? b.durationMs : 0,
      summary: text(b.summary) ? b.summary : b.status === "pending" ? "Interrupted before it finished." : "",
      diagnostics: Array.isArray(b.diagnostics) ? (b.diagnostics as ForgeBuild["diagnostics"]) : [],
      artifact: b.status === "success" ? artifact : null,
      executed: b.executed === true,
      sourceFiles: typeof b.sourceFiles === "number" ? b.sourceFiles : 0,
      ...(text(b.output) ? { output: b.output } : {}),
    }];
  });
  return {
    ...empty,
    ...(raw as Partial<ForgeArtifacts>),
    sourceFiles: Array.isArray(raw.sourceFiles) ? (raw.sourceFiles as ForgeArtifacts["sourceFiles"]) : [],
    tests: Array.isArray(raw.tests) ? (raw.tests as ForgeArtifacts["tests"]) : [],
    diagnostics: Array.isArray(raw.diagnostics) ? (raw.diagnostics as ForgeArtifacts["diagnostics"]) : [],
    builds,
  };
}

/**
 * MVP-08 (v8) launch history. Nothing wrote a launch before v8, so a v7
 * record has none. An entry without an id, a build and a start time is
 * dropped; every entry is re-stamped with the project that contains it.
 * Nothing here can make an entry "running" — a stored launch has no such
 * state — and an entry whose `result` is unknown is kept as not-yet-seen
 * to end, for the Launch window to reconcile with the server.
 */
function migrateLaunch(raw: unknown, projectId: string): LaunchArtifacts {
  const empty = createEmptyLaunchArtifacts();
  if (!isRecord(raw)) return empty;
  const text = (value: unknown): value is string => typeof value === "string";
  const runs = (Array.isArray(raw.runs) ? raw.runs.filter(isRecord) : []).flatMap((r): LaunchRun[] => {
    if (!text(r.id) || !text(r.buildId) || !text(r.startedAt)) return [];
    const result = r.result === "stopped" || r.result === "failed" ? r.result : null;
    return [{
      id: r.id,
      projectId,
      buildId: r.buildId,
      artifact: text(r.artifact) ? r.artifact : `forge://${projectId}/${r.buildId}`,
      runtime: text(r.runtime) ? r.runtime : "local-web",
      startedAt: r.startedAt,
      endpoint: text(r.endpoint) ? r.endpoint : null,
      endedAt: result && text(r.endedAt) ? r.endedAt : null,
      result,
      reason: text(r.reason) ? r.reason : null,
    }];
  });
  return {
    ...empty,
    ...(raw as Partial<LaunchArtifacts>),
    releases: Array.isArray(raw.releases) ? (raw.releases as LaunchArtifacts["releases"]) : [],
    environments: Array.isArray(raw.environments) ? (raw.environments as LaunchArtifacts["environments"]) : [],
    preflightChecks: Array.isArray(raw.preflightChecks) ? (raw.preflightChecks as LaunchArtifacts["preflightChecks"]) : [],
    deployments: Array.isArray(raw.deployments) ? (raw.deployments as LaunchArtifacts["deployments"]) : [],
    runs,
  };
}

/** Fills in any artifact slot a not-quite-current record is missing
 * (e.g. a record written by a future version bump this file doesn't
 * know about yet, or a hand-built fixture) — defensive, not a silent
 * data-loss path: every field that IS present is kept as-is. */
function backfillMissingArtifacts(project: CattipuProject): CattipuProject {
  return {
    ...project,
    idea: project.idea ?? { prompt: project.architect.data?.prompt ?? "" },
    // MVP-03 (v5) adds `canvas.layout`. A v4 canvas keeps every slot it
    // has and starts with no placements, which Canvas draws at their
    // deterministic defaults.
    canvas: isRecord(project.canvas)
      ? {
          ...createEmptyCanvasArtifacts(),
          ...project.canvas,
          layout: Array.isArray(project.canvas.layout) ? project.canvas.layout : [],
        }
      : createEmptyCanvasArtifacts(),
    forge: migrateForge(project.forge, project.id),
    memory: migrateMemory(project.memory, project.id),
    launch: migrateLaunch(project.launch, project.id),
    // Milestone 15 fields. A v1 record predates all of them, so every one
    // is filled from something the record already carries rather than
    // invented: the type from the icon it was saved with, the owner from
    // the same constant new projects use. `lastOpenedAt` stays null - the
    // record genuinely does not know when it was last opened, and null
    // says that honestly where a fabricated timestamp would not.
    type: project.type ?? PROJECT_TYPE_BY_ICON[project.icon ?? "generic"],
    owner: project.owner ?? DEFAULT_PROJECT_OWNER,
    lastOpenedAt: project.lastOpenedAt ?? null,
    pinned: project.pinned ?? false,
    favorite: project.favorite ?? false,
    archived: project.archived ?? false,
    // Milestone 19. A record written before templates existed was not
    // made from one, and `null` says that. Guessing a template from the
    // icon would put a plan on a project whose author never chose one.
    template: project.template ?? null,
    // Milestone 19 (Part D). Both override the template's default, so
    // `null` is the correct migration for every existing record: it
    // means "whatever the template says", and a project written before
    // these fields existed never disagreed with anything.
    stackPreference: project.stackPreference ?? null,
    deploymentTarget: project.deploymentTarget ?? null,
  };
}

function migrateLegacy(legacy: LegacyProjectV0): CattipuProject {
  const now = new Date().toISOString();
  const architecture = legacy.architecture ?? null;
  return {
    version: PROJECT_SCHEMA_VERSION,
    id: legacy.id,
    name: legacy.name,
    icon: legacy.icon,
    color: legacy.color,
    editedLabel: legacy.editedLabel,
    // No original creation timestamp exists on the legacy shape — "now"
    // (the moment of migration) is the most honest value available,
    // used for both fields rather than fabricating a fake history.
    createdAt: now,
    updatedAt: now,
    type: PROJECT_TYPE_BY_ICON[legacy.icon ?? "generic"],
    owner: DEFAULT_PROJECT_OWNER,
    lastOpenedAt: null,
    pinned: false,
    favorite: false,
    archived: false,
    template: null,
    stackPreference: null,
    deploymentTarget: null,
    idea: { prompt: architecture?.prompt ?? "" },
    architect: { data: architecture },
    canvas: createEmptyCanvasArtifacts(),
    forge: createEmptyForgeArtifacts(),
    memory: createEmptyMemoryArtifacts(),
    launch: createEmptyLaunchArtifacts(),
  };
}

/** Migrate one persisted record, whatever shape it's actually in. */
export function migrateProject(raw: unknown): CattipuProject {
  if (!isRecord(raw)) {
    // Nothing usable to preserve — return a blank, valid project rather
    // than throwing, so one corrupt entry can't take down the whole list.
    return { ...migrateLegacy({ id: "", name: "Untitled Project", icon: "generic", color: "var(--color-green)", editedLabel: "Edited just now" }) };
  }
  if (isCurrentShape(raw)) {
    return backfillMissingArtifacts(raw);
  }
  return migrateLegacy(raw as unknown as LegacyProjectV0);
}

export function migrateProjects(raw: unknown): CattipuProject[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateProject);
}
