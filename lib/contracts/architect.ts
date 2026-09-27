import type { ArchitectNode, ArchitectNodeKind, GeneratedArchitecture } from "@/lib/ai/types";
import type { CattipuProject } from "@/lib/project/types";

/**
 * MVP-03 — what Architect is working on, derived from the active Project.
 *
 * The Project store decides WHICH project is active; Architect owns what
 * that project's architecture is. The architecture is persisted in the
 * project's `architect` artifact slot, so there is one copy of it.
 */
export type ArchitectWorkspaceState =
  /** Nothing has been opened. Generating creates a project. */
  | { kind: "no-project" }
  /** The active project has no architecture yet. Generating writes it. */
  | { kind: "empty"; project: CattipuProject }
  | { kind: "ready"; project: CattipuProject; architecture: GeneratedArchitecture };

/**
 * Where Architect reads and writes a project's architecture.
 *
 * Architect's editing store depends on this and never on the project
 * store directly, so the storage behind a project (today the persisted
 * project store, later a server) can change without touching Architect.
 */
export interface ArchitectureRepository {
  load(projectId: string): GeneratedArchitecture | null;
  /** False when no project has that id: nothing is written. */
  save(projectId: string, architecture: GeneratedArchitecture): boolean;
}

export interface ArchitectService {
  resolve(activeProject: CattipuProject | null): ArchitectWorkspaceState;
}

export const ARCHITECT_NODE_KINDS: readonly ArchitectNodeKind[] = [
  "client",
  "gateway",
  "service",
  "queue",
  "datastore",
];

export interface NewArchitectNode {
  kind: ArchitectNodeKind;
  /** Defaults to "New <Kind>". */
  label?: string;
  description?: string;
}

export interface ArchitectNodePatch {
  label?: string;
  kind?: ArchitectNodeKind;
  description?: string;
}

export type ArchitectEditFailure = "no-project" | "unknown-node" | "empty-name" | "invalid-kind";

export type ArchitectEditResult =
  | { ok: true; architecture: GeneratedArchitecture; node: ArchitectNode }
  | { ok: false; reason: ArchitectEditFailure };

/**
 * MVP-03 — manual architecture editing, for any surface (Canvas today).
 *
 * Every edit is applied to the project's ONE architecture through the
 * repository. A surface that edits a node never keeps its own copy of it.
 * No generation is involved: a project with no architecture yet gets an
 * empty one the first time a node is added.
 */
export interface ArchitectureEditor {
  addNode(projectId: string, node: NewArchitectNode): ArchitectEditResult;
  updateNode(projectId: string, nodeId: string, patch: ArchitectNodePatch): ArchitectEditResult;
}
