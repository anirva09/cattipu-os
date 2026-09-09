import type { GeneratedArchitecture } from "@/lib/ai/types";
import type { ProjectTemplateId } from "@/lib/os/templates";

/**
 * Milestone 14A (Universal Project Artifact Foundation) — the shared
 * "software being built" model every future CATTIPU application will read
 * and write. Replaces the old `Project = metadata + optional
 * GeneratedArchitecture` shape (still readable — see migrate.ts) with a
 * versioned workspace that has one slot per application.
 *
 * Architecture-only milestone: only `architect` has a real, populated
 * shape (GeneratedArchitecture, unchanged, adapted rather than
 * duplicated — see ArchitectArtifacts below). canvas/forge/memory/launch
 * are intentionally minimal typed placeholders — YAGNI — for Canvas/
 * Forge/Memory/Launch to fill in when those milestones build real UI.
 * None of those apps are built here.
 */

// ---------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------

/** Bump this — and add a branch in migrate.ts — whenever CattipuProject's
 * shape changes in a way old persisted projects can't just be read as. */
export const PROJECT_SCHEMA_VERSION = 4;

/** Shown as the owner of anything created locally. A single constant so
 *  the Projects list, the details panel and Explorer cannot disagree. */
export const DEFAULT_PROJECT_OWNER = "node";

// ---------------------------------------------------------------------
// Shared artifact identity — "stable string IDs, not a graph database."
// Every future app's records that need to point at another app's
// artifact (a Canvas screen referencing an Architect feature, a Forge
// module referencing a service, a Memory record referencing anything)
// use one of these instead of an untyped bare string, so a reference at
// least states what kind of thing it's pointing at.
// ---------------------------------------------------------------------

export type ArtifactKind =
  | "architect-node"
  | "architect-feature"
  | "architect-api"
  | "architect-table"
  | "canvas-screen"
  | "canvas-component"
  | "forge-file"
  | "forge-build"
  | "launch-release"
  | "launch-environment";

export interface ArtifactRef {
  kind: ArtifactKind;
  /** The referenced artifact's own `id` field — ids are stable strings
   * assigned once at creation (Architect already does this; future apps
   * should follow the same convention), never recomputed from a label. */
  id: string;
}

// ---------------------------------------------------------------------
// Project identity / source idea
// ---------------------------------------------------------------------

export type ProjectIcon = "banking" | "saas" | "website" | "generic";

/**
 * Milestone 15 (Living Projects).
 *
 * Status is NOT stored. It is derived from what the project actually
 * contains (see lib/os/projects.ts `projectStatus`), so it cannot drift
 * from reality the way a hand-set field does: a project with an Architect
 * graph and no builds IS "Designing", and there is no way to persist a
 * claim otherwise. The single exception is `archived`, which is a real
 * user decision no artifact can imply.
 */
export type ProjectStatus =
  | "New"
  | "Designing"
  | "Building"
  | "Shipped"
  | "Archived";

/** What kind of thing is being built. Unlike status this is a genuine
 *  choice - nothing in the artifacts can tell an API from a library - so
 *  it is stored, defaulted from the icon at creation and editable after. */
export type ProjectType = "Web" | "API" | "AI" | "Platform" | "Library";

export const PROJECT_TYPE_BY_ICON: Record<ProjectIcon, ProjectType> = {
  banking: "Platform",
  saas: "Web",
  website: "Web",
  generic: "AI",
};

/** The idea that started this project — deliberately just the raw
 * prompt. Architect's own `summary` (in ArchitectArtifacts below) is the
 * ELABORATED result of that idea; duplicating it here would be exactly
 * the "two competing copies" the brief rules out. Empty prompt = a
 * project created manually (Projects app "New Project"), not yet run
 * through Architect. */
export interface ProjectIdea {
  prompt: string;
}

// ---------------------------------------------------------------------
// Architect — the one authoritative representation
// ---------------------------------------------------------------------

/** A thin wrapper, not a reshaping: `GeneratedArchitecture` (lib/ai/types.ts)
 * is already Architect's complete, real, actively-edited data model
 * (summary, features, nodes/edges, data model, API catalog,
 * recommendations, roadmap, editable graph state — everything
 * useArchitectStore's mutators already operate on). Wrapping it in
 * `{ data }` — rather than inlining its fields directly onto
 * CattipuProject — is what makes it a distinct, addressable "artifacts"
 * slot alongside canvas/forge/memory/launch, consistent with how those
 * are shaped, without introducing a second architecture type. `data` is
 * null until Architect has generated something — a project can exist
 * (manually created) before Architect ever touches it. */
export interface ArchitectArtifacts {
  data: GeneratedArchitecture | null;
}

// ---------------------------------------------------------------------
// Canvas — future: screens, components, assets, UI states
// ---------------------------------------------------------------------

export interface CanvasScreen {
  id: string;
  name: string;
  /** e.g. an ArchitectFeature this screen is meant to realize. */
  featureRef?: ArtifactRef;
}

export interface CanvasComponent {
  id: string;
  name: string;
  screenId?: string;
}

export interface CanvasAsset {
  id: string;
  name: string;
  kind: string; // "image" | "icon" | "font" | ... — open-ended, not enumerated yet
}

export interface CanvasUiState {
  id: string;
  name: string; // e.g. "loading", "empty", "error"
  screenId?: string;
}

export interface CanvasArtifacts {
  screens: CanvasScreen[];
  components: CanvasComponent[];
  assets: CanvasAsset[];
  uiStates: CanvasUiState[];
}

// ---------------------------------------------------------------------
// Forge — future: source files, builds, tests, diagnostics
// ---------------------------------------------------------------------

export interface ForgeSourceFile {
  id: string;
  path: string;
  /** e.g. the ArchitectNode (service) this file implements. */
  serviceRef?: ArtifactRef;
}

export type ForgeBuildStatus = "pending" | "success" | "failed";

export interface ForgeBuild {
  id: string;
  status: ForgeBuildStatus;
  startedAt: string;
}

export type ForgeTestStatus = "pending" | "passed" | "failed";

export interface ForgeTestRun {
  id: string;
  status: ForgeTestStatus;
}

export type ForgeDiagnosticSeverity = "info" | "warning" | "error";

export interface ForgeDiagnostic {
  id: string;
  severity: ForgeDiagnosticSeverity;
  message: string;
}

export interface ForgeArtifacts {
  sourceFiles: ForgeSourceFile[];
  builds: ForgeBuild[];
  tests: ForgeTestRun[];
  diagnostics: ForgeDiagnostic[];
}

// ---------------------------------------------------------------------
// Memory — future: records, decisions, relationships, conflicts/staleness
// ---------------------------------------------------------------------

export interface MemoryRecord {
  id: string;
  text: string;
  createdAt: string;
  refs: ArtifactRef[];
}

export interface MemoryDecision {
  id: string;
  text: string;
  createdAt: string;
  refs: ArtifactRef[];
}

export interface MemoryRelationship {
  id: string;
  from: ArtifactRef;
  to: ArtifactRef;
  label: string;
}

export type MemoryConflictStatus = "open" | "resolved";

export interface MemoryConflict {
  id: string;
  description: string;
  status: MemoryConflictStatus;
  /** ISO timestamp — when the referenced artifact changed underneath
   * this memory, making it possibly stale. Absent = not stale. */
  staleSince?: string;
  refs: ArtifactRef[];
}

export interface MemoryArtifacts {
  records: MemoryRecord[];
  decisions: MemoryDecision[];
  relationships: MemoryRelationship[];
  conflicts: MemoryConflict[];
}

// ---------------------------------------------------------------------
// Launch — future: releases, environments, preflight checks, deployments
// ---------------------------------------------------------------------

export interface LaunchRelease {
  id: string;
  version: string;
  createdAt: string;
}

export interface LaunchEnvironment {
  id: string;
  name: string; // "production" | "staging" | ...
}

export type LaunchPreflightStatus = "pending" | "pass" | "fail";

export interface LaunchPreflightCheck {
  id: string;
  label: string;
  status: LaunchPreflightStatus;
}

export type LaunchDeploymentStatus = "pending" | "success" | "failed";

export interface LaunchDeployment {
  id: string;
  releaseId: string;
  environmentId: string;
  status: LaunchDeploymentStatus;
  /** A Forge build this deployment shipped — the cross-app reference
   * example named explicitly in the brief. */
  forgeBuildRef?: ArtifactRef;
  deployedAt?: string;
}

export interface LaunchArtifacts {
  releases: LaunchRelease[];
  environments: LaunchEnvironment[];
  preflightChecks: LaunchPreflightCheck[];
  deployments: LaunchDeployment[];
}

// ---------------------------------------------------------------------
// The project workspace
// ---------------------------------------------------------------------

export interface CattipuProject {
  version: number;
  id: string;
  name: string;
  /** Presentational — Projects/Explorer/Home icon + accent color. Kept
   * at the top level (not inside `idea`) since it's product identity,
   * not source material. */
  icon: ProjectIcon;
  color: string;
  /** Pre-existing display convenience (e.g. "Edited 5m ago", "Built by
   * Architect · just now") — kept verbatim from before M14A rather than
   * derived from `updatedAt` at render time, since reworking how
   * Projects/Home display this text would be a Home/Projects redesign,
   * out of this milestone's scope. `updatedAt` below is the new
   * authoritative timestamp future apps should actually compute from. */
  editedLabel: string;
  createdAt: string;
  updatedAt: string;

  // ── Milestone 15 (Living Projects) ────────────────────────────────
  /** Editable. Defaults from `icon` at creation. */
  type: ProjectType;
  /** Whose project this is. Shown in the Projects list and details panel. */
  owner: string;
  /** Set every time the project is opened. `null` until it first is -
   *  which is meaningfully different from "opened at creation time", and
   *  is why this is nullable rather than defaulting to createdAt. */
  lastOpenedAt: string | null;
  /** Kept at the top of the list. */
  pinned: boolean;
  /** Starred. Independent of `pinned` - a favourite need not be pinned. */
  favorite: boolean;
  /** The one piece of status a user sets rather than the artifacts imply. */
  archived: boolean;

  /**
   * Milestone 19 (Project Templates). What KIND of thing this is, chosen
   * once at creation. `null` for every project that predates templates
   * and for anything Architect generates from a prompt.
   *
   * Only the id is stored. The structure a template implies is derived
   * from it (lib/os/templates.ts `projectPlan`), so a template can be
   * corrected in one place and cannot leave a stale copy of its plan
   * sitting inside a project that was made a month ago.
   */
  template: ProjectTemplateId | null;

  /**
   * Milestone 19 (Part D). The two pieces of the project identity that
   * can legitimately disagree with the template, and so are the only two
   * that are stored.
   *
   * `null` does not mean "unknown" — it means "whatever the template
   * says", which is why correcting `DEFAULT_STACK` for `web-app` still
   * reaches every Web App whose author never overrode it. A project that
   * predates templates, or has none, resolves both to null.
   *
   * The other six fields of `ProjectIdentity` (lib/os/templates.ts) are
   * derived, not stored: `targetPlatform` belongs to the kind of thing,
   * and `artifactState` and `buildStatus` are readings of what the
   * project actually contains. Storing those could only ever let them
   * be wrong.
   */
  stackPreference: string | null;
  deploymentTarget: string | null;

  idea: ProjectIdea;
  architect: ArchitectArtifacts;
  canvas: CanvasArtifacts;
  forge: ForgeArtifacts;
  memory: MemoryArtifacts;
  launch: LaunchArtifacts;
}

// ---------------------------------------------------------------------
// Factories — every empty-artifact shape and a full blank project, in
// one place, so migrate.ts and useProjectStore.ts never hand-roll the
// "what does an empty Canvas/Forge/Memory/Launch look like" shape twice.
// ---------------------------------------------------------------------

export function createEmptyCanvasArtifacts(): CanvasArtifacts {
  return { screens: [], components: [], assets: [], uiStates: [] };
}

export function createEmptyForgeArtifacts(): ForgeArtifacts {
  return { sourceFiles: [], builds: [], tests: [], diagnostics: [] };
}

export function createEmptyMemoryArtifacts(): MemoryArtifacts {
  return { records: [], decisions: [], relationships: [], conflicts: [] };
}

export function createEmptyLaunchArtifacts(): LaunchArtifacts {
  return { releases: [], environments: [], preflightChecks: [], deployments: [] };
}

let idSeq = 0;
/** Collision-safe across reloads, same reasoning useProjectStore's old
 * `nextId` already used: time + random, not an in-memory counter that
 * would reset to 0 and collide with ids restored from persisted state. */
export function nextProjectId(): string {
  idSeq += 1;
  return `project-${Date.now().toString(36)}-${idSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateProjectOptions {
  name: string;
  icon?: ProjectIcon;
  color?: string;
  editedLabel?: string;
  idea?: ProjectIdea;
  architect?: ArchitectArtifacts;
  type?: ProjectType;
  owner?: string;
  /** Milestone 19. Sets type and icon unless they are given explicitly. */
  template?: ProjectTemplateId | null;
  /** Milestone 19. Overrides of the template's defaults. Omit for
   *  "whatever the template says". */
  stackPreference?: string | null;
  deploymentTarget?: string | null;
}

/** The one place a brand-new, schema-current CattipuProject gets built —
 * used for both the "New Project" flow and Architect's own
 * generate-to-project flow, so neither one can drift from the other or
 * from what migrate.ts produces for an old project. */
export function createProject(opts: CreateProjectOptions): CattipuProject {
  const now = new Date().toISOString();
  return {
    version: PROJECT_SCHEMA_VERSION,
    id: nextProjectId(),
    name: opts.name.trim() || "Untitled Project",
    icon: opts.icon ?? "generic",
    color: opts.color ?? "var(--color-green)",
    editedLabel: opts.editedLabel ?? "Edited just now",
    createdAt: now,
    updatedAt: now,
    type: opts.type ?? PROJECT_TYPE_BY_ICON[opts.icon ?? "generic"],
    template: opts.template ?? null,
    stackPreference: opts.stackPreference ?? null,
    deploymentTarget: opts.deploymentTarget ?? null,
    owner: opts.owner ?? DEFAULT_PROJECT_OWNER,
    lastOpenedAt: null,
    pinned: false,
    favorite: false,
    archived: false,
    idea: opts.idea ?? { prompt: "" },
    architect: opts.architect ?? { data: null },
    canvas: createEmptyCanvasArtifacts(),
    forge: createEmptyForgeArtifacts(),
    memory: createEmptyMemoryArtifacts(),
    launch: createEmptyLaunchArtifacts(),
  };
}
