import type { ProjectTemplateId } from "@/lib/os/templates";
import type { AppId } from "@/store/useWindowStore";
import type { ArtifactRef, CattipuProject } from "@/lib/project/types";

/**
 * The seams CATTIPU grows along.
 *
 * This file declares contracts and implements nothing. It exists because
 * the expensive mistake in a project this shape is not a missing feature
 * — it is two features that each invented their own place to put the same
 * fact. Every rule below is a restatement of the one the OS layer has
 * followed since M15: **nothing is stored that can be derived, and
 * nothing is stored twice.**
 *
 * It is deliberately not imported by anything. A contract that nothing
 * implements yet is not dead code — it is the shape the next milestone
 * has to fit, written down while the reasoning is still fresh, so the
 * decision is made once here rather than five times in five sprints.
 *
 * What already exists is named, not re-declared. Where a slot is live,
 * this file points at it; where it does not exist, this file says what it
 * must look like when someone builds it.
 */

// ---------------------------------------------------------------------
// 1. The five artifact slots — Architect, Canvas, Forge, Memory, Launch
// ---------------------------------------------------------------------

/**
 * These are NOT extension points to be designed later. They are live
 * fields on `CattipuProject` (lib/project/types.ts), one per application,
 * populated by M14A and read by the derived layer in lib/os/projects.ts.
 *
 * The rule for whoever fills them:
 *
 *   Write artifacts, never status. `projectProgress`, `projectStatus`
 *   and `buildStatus` are computed from these slots and have no setters.
 *   A Forge that records a build makes the project "Building" as a
 *   consequence; a Forge that sets `status = "Building"` creates a second
 *   truth that will eventually disagree with the builds.
 *
 *   Cross-reference by `ArtifactRef`, not by bare string. A Canvas screen
 *   pointing at an Architect feature says which KIND of thing it points
 *   at, so a dangling reference is detectable instead of mysterious.
 *
 *   A template's plan is intent, not content. `projectPlan()` derives the
 *   screens and services a template expects from the template id at read
 *   time. Do not seed the slots from it: a brand new project is 0% built
 *   because it is.
 */
export type ArtifactSlot = keyof Pick<
  CattipuProject,
  "architect" | "canvas" | "forge" | "memory" | "launch"
>;

export const ARTIFACT_SLOTS: readonly ArtifactSlot[] = [
  "architect",
  "canvas",
  "forge",
  "memory",
  "launch",
] as const;

/** What a generator must return to fill a slot: the artifacts themselves
 *  and the references it resolved, never a progress figure. */
export interface SlotContribution<S extends ArtifactSlot = ArtifactSlot> {
  slot: S;
  artifacts: CattipuProject[S];
  /** Artifacts in other slots this contribution was derived from — a
   *  Forge file's originating Architect service, say. */
  derivedFrom?: readonly ArtifactRef[];
}

// ---------------------------------------------------------------------
// 2. AI Workspace — the Architect → Canvas → Forge pipeline
// ---------------------------------------------------------------------

/**
 * The generation pipeline the templates were built to feed. A stage takes
 * a project and returns contributions; it does not mutate the project and
 * it does not decide whether the project is "done".
 *
 * Keeping stages pure is what makes them testable without a browser, and
 * what stops a half-finished generation from leaving a project claiming
 * artifacts it does not have — the store applies a contribution or it
 * does not.
 */
export type WorkspaceStage = "architect" | "canvas" | "forge" | "launch";

export interface GenerationRequest {
  projectId: string;
  stage: WorkspaceStage;
  /** The person's prompt. Empty when the stage runs from artifacts alone. */
  prompt?: string;
  template?: ProjectTemplateId | null;
}

export interface GenerationResult {
  request: GenerationRequest;
  contributions: readonly SlotContribution[];
  /** Human-readable account of what was produced, for Memory to index.
   *  Not a status, and not shown as progress. */
  summary?: string;
}

export interface WorkspaceGenerator {
  stage: WorkspaceStage;
  run(request: GenerationRequest): Promise<GenerationResult>;
}

// ---------------------------------------------------------------------
// 3. Deployment
// ---------------------------------------------------------------------

/**
 * `launch` already models releases, environments, preflight checks and
 * deployments. A deployment target is the missing half: where a release
 * goes. `projectIdentity().deploymentTarget` already names one per
 * project, defaulted from the template and overridable — a provider
 * should read that rather than storing its own copy.
 */
export interface DeploymentTarget {
  id: string;
  label: string;
  /** Matches `ProjectIdentity.deploymentTarget` for the projects it serves. */
  matches(project: CattipuProject): boolean;
}

export interface DeploymentProvider {
  target: DeploymentTarget;
  deploy(projectId: string, releaseId: string): Promise<{ url?: string }>;
}

// ---------------------------------------------------------------------
// 4. Plugins
// ---------------------------------------------------------------------

/**
 * The only genuinely new surface here. A plugin contributes to the shell
 * without the shell knowing about it at build time.
 *
 * Two constraints, both learned the hard way in this codebase:
 *
 *   A plugin may register an app, a menu item, or a generator. It may not
 *   register STATE. Everything a plugin needs to persist belongs in an
 *   existing store or in its own project artifacts; a plugin with a store
 *   is a plugin whose data no other surface can see, which is how the
 *   RECENT PROJECTS widget ended up rendering three hardcoded names.
 *
 *   A plugin's contributions are read at render time, not copied into a
 *   registry at install time. Copied registrations go stale exactly the
 *   way a copied project name does.
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
}

export interface PluginContributions {
  apps?: readonly { id: AppId; label: string }[];
  generators?: readonly WorkspaceGenerator[];
  deployment?: readonly DeploymentProvider[];
  wallpapers?: readonly WallpaperDefinition[];
  cursorThemes?: readonly CursorTheme[];
}

export interface CattipuPlugin {
  manifest: PluginManifest;
  contribute(): PluginContributions;
}

// ---------------------------------------------------------------------
// 5. Wallpapers
// ---------------------------------------------------------------------

/**
 * `useSettingsStore.wallpaper` is the owner and the only owner. A second
 * `wallpaper` field lived on `useFilesystemStore` from M16 until this
 * release with zero readers and two authors; it was removed rather than
 * given a manager, and this note is here so it is not reintroduced on the
 * same reasoning ("the wallpaper is a property of the desktop surface").
 *
 * It is a property of the desktop surface. The desktop surface reads it
 * from settings.
 *
 * A wallpaper renders from CSS the shell already ships, or from one asset
 * under `public/textures/`. It never carries per-project state.
 */
export interface WallpaperDefinition {
  id: string;
  label: string;
  /** A swatch for the picker — a CSS colour or gradient, not an image. */
  swatch: string;
  /** How the surface paints. Either is valid; both is not. */
  css?: Readonly<Record<string, string>>;
  texture?: `/textures/${string}`;
}

// ---------------------------------------------------------------------
// 6. Cursor themes
// ---------------------------------------------------------------------

/**
 * The cursors are declared in `app/globals.css` as `url("/cursors/*.png")`
 * with explicit hotspots, and `CursorProvider` mounts them. A theme is a
 * complete set — every role below — because a partial set falls back to
 * the system cursor mid-gesture, which reads as a rendering bug rather
 * than as a theme that did not cover that case.
 */
export type CursorRole =
  | "arrow"
  | "hand"
  | "text"
  | "move"
  | "resize"
  | "wait";

export interface CursorTheme {
  id: string;
  label: string;
  /** Every role, and the hotspot in image pixels. */
  cursors: Readonly<Record<CursorRole, { src: string; hotspot: [number, number] }>>;
}

// ---------------------------------------------------------------------
// 7. Notification Center
// ---------------------------------------------------------------------

/**
 * `useNotificationStore` is live and `components/System/NotificationCenter.tsx`
 * is implemented; what is missing is a mount point in the v0.9 shell, not
 * a design.
 *
 * The rule for whoever mounts it: a notification REFERS to work, it does
 * not describe it. Carry an `ArtifactRef` or a project id and let the
 * panel resolve the name at render time. A notification that stores
 * "Banking Platform" is a copy of a name, and renaming the project leaves
 * it lying.
 */
export interface NotificationSource {
  id: string;
  /** What this notification is about — resolved for display, never copied. */
  subject?: ArtifactRef | { projectId: string };
}
