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

// ── MVP-06: project files ──────────────────────────────────────────────

/**
 * One file written into a project, addressed by its path inside the
 * project's workspace ("src/tasks.ts"). The AI proposes these; Explorer's
 * editor saves them; the filesystem is the only thing that stores them.
 */
export interface FileWrite {
  path: string;
  content: string;
}

/** Bounds shared by the AI gateway (server) and the filesystem (client), so
 *  what the AI may propose is exactly what the filesystem accepts. */
export const FILE_LIMITS = {
  maxWrites: 20,
  maxPathChars: 200,
  maxDepth: 8,
  maxSegmentChars: 64,
  maxFileChars: 50_000,
  /** What one AI request may carry about the project's existing files. */
  maxContextFiles: 40,
  maxContextChars: 40_000,
} as const;

/** What applying a write would do to the file at its path, derived from
 *  the filesystem as it is now. */
export type FileWriteStatus = "create" | "update" | "unchanged";

export interface FileWritePreview {
  path: string;
  status: FileWriteStatus;
}

export type FileWriteFailure =
  /** The project has no workspace folder to write into. */
  | "no-workspace"
  | "invalid-path"
  | "too-many"
  | "too-long"
  /** A path runs through a file as if it were a folder, or names a folder
   *  as if it were a file. */
  | "path-conflict"
  /** The proposal being applied no longer exists (its conversation was
   *  cleared). */
  | "not-found";

export type ApplyFileWritesResult =
  | { ok: true; objects: OsObject[]; written: FileWritePreview[]; fileIds: string[] }
  | { ok: false; reason: FileWriteFailure; path?: string };

/** Identity and time for the records a write creates, supplied by the store
 *  so the rules stay pure. */
export interface FileRecordSource {
  nextId: () => string;
  at: string;
}

/**
 * A project's files as AI request data: paths relative to the workspace,
 * with content when it fits the request's budget. Names its project, so a
 * payload sent with the wrong project is refused by the gateway.
 */
export interface ProjectFilesContext {
  projectId: string;
  files: ReadonlyArray<{ path: string; content: string; omitted?: boolean }>;
}

export interface ProjectFileService {
  /** A safe workspace-relative path, or null. No absolute paths, no `.` or
   *  `..` segments, no characters a folder label could not carry. */
  normalizePath(path: string): string | null;
  /** The path of a file inside a workspace, or null when it is not in it. */
  pathOf(objects: readonly OsObject[], fileId: string, workspaceId: string): string | null;
  /** The file at a workspace path, or null. */
  fileAt(objects: readonly OsObject[], workspaceId: string, path: string): OsObject | null;
  /** What each write would do, without doing it. Null when a path is
   *  invalid or conflicts with what is already there. */
  preview(objects: readonly OsObject[], workspaceId: string, writes: readonly FileWrite[]): FileWritePreview[] | null;
  /** All writes, or none: missing folders are created, existing files are
   *  updated in place (their id survives), nothing else is touched. */
  apply(
    objects: readonly OsObject[],
    workspaceId: string,
    writes: readonly FileWrite[],
    source: FileRecordSource,
  ): ApplyFileWritesResult;
  /** MVP-07. Every file in the workspace with its full text, sorted by
   *  path — what a Forge build carries. Unbounded here; Forge enforces its
   *  own limits. */
  snapshot(objects: readonly OsObject[], workspaceId: string): FileWrite[];
  /** The workspace's files, sorted by path, bounded for one AI request. */
  contextFor(objects: readonly OsObject[], workspaceId: string, projectId: string): ProjectFilesContext;
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
