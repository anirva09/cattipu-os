import type { OsObject } from "@/lib/os/filesystem";
import type { CattipuProject } from "@/lib/project/types";

/**
 * The Project → workspace relationship, as the filesystem reports it.
 *
 * The Project store decides WHICH project is active; the filesystem
 * decides WHAT exists for it. A workspace is an ordinary root folder that
 * names its project by id, so this contract carries references to both
 * owners' records and copies nothing from either.
 */
export type ProjectWorkspaceState =
  /** Nothing has been opened yet, so there is no project context. */
  | { kind: "no-project" }
  /** The active project has no workspace folder (it predates workspaces,
   *  was duplicated, or its workspace was deleted). Reported, not repaired:
   *  selecting a project never writes filesystem objects. */
  | { kind: "missing"; project: CattipuProject }
  | { kind: "ready"; project: CattipuProject; workspace: OsObject };

export interface ProvisionWorkspaceRequest {
  projectId: string;
  /** Kept on the folder only as a fallback; the live name is resolved
   *  from the project by `objectLabel`. */
  fallbackLabel: string;
  /** One empty sub-folder per template section. Empty for a freeform
   *  project: no placeholder folders are invented to fill the tree. */
  sections: readonly string[];
}

export interface ProvisionWorkspaceResult {
  objects: OsObject[];
  workspace: OsObject;
  /** False when the project already had a workspace and nothing changed. */
  created: boolean;
}

/** Identity, clock and placement are supplied by the store that owns
 *  persistence, so the rules below stay pure and deterministic. */
export interface WorkspaceRecordSource {
  id: string;
  createdAt: string;
  position: OsObject["position"];
}

export interface ProjectWorkspaceService {
  provision(
    objects: readonly OsObject[],
    request: ProvisionWorkspaceRequest,
    source: WorkspaceRecordSource,
  ): ProvisionWorkspaceResult;
  resolve(
    objects: readonly OsObject[],
    activeProject: CattipuProject | null,
  ): ProjectWorkspaceState;
  /** The filesystem selection to keep once `state` is the active project
   *  context: inside a ready workspace it is kept, anywhere else it moves
   *  to the workspace root; a project with no workspace moves it to the OS
   *  root, so no view shows another project's files as the active one's.
   *  With no project opened the selection is left alone. */
  reconcileSelection(
    objects: readonly OsObject[],
    selectedId: string | null,
    state: ProjectWorkspaceState,
  ): string | null;
}
