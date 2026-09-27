import type { ArchitectNodeKind, GeneratedArchitecture } from "@/lib/ai/types";
import type {
  CanvasArtifacts,
  CanvasNodePlacement,
  CattipuProject,
} from "@/lib/project/types";

/**
 * MVP-03 — Canvas as a projection of Architect.
 *
 * SOURCE: the active project's architecture (`project.architect.data`),
 * owned by Architect. Canvas reads node identity, label, kind and edges
 * from it and stores none of them.
 *
 * VISUAL STATE: where each node sits (`project.canvas.layout`), owned by
 * Canvas. A placement names a node by id and holds only x and y.
 */

/** One architecture node as Canvas draws it. */
export interface CanvasNodeView {
  nodeId: string;
  label: string;
  kind: ArchitectNodeKind;
  /** Read from the architecture like the label; "" when it has none. */
  description: string;
  x: number;
  y: number;
  /** True when the person placed it; false when drawn at the default. */
  placed: boolean;
}

export interface CanvasEdgeView {
  id: string;
  source: string;
  target: string;
  label: string;
}

export type CanvasView =
  | { kind: "no-project" }
  /** The active project exists but Architect has not produced anything. */
  | { kind: "no-architecture"; project: CattipuProject }
  | {
      kind: "ready";
      project: CattipuProject;
      nodes: CanvasNodeView[];
      edges: CanvasEdgeView[];
    };

export interface CanvasService {
  view(activeProject: CattipuProject | null): CanvasView;
  /** The default position of every node, keyed by node id. The same
   *  architecture always yields the same arrangement. */
  defaultLayout(architecture: GeneratedArchitecture): Map<string, { x: number; y: number }>;
  /** Moves one node, snapped to the grid. Placements for nodes the
   *  architecture no longer has are dropped. `null` when `nodeId` is not
   *  a node of the architecture: nothing is written. */
  place(
    canvas: CanvasArtifacts,
    architecture: GeneratedArchitecture,
    placement: CanvasNodePlacement,
  ): CanvasArtifacts | null;
  /** Forgets every placement, so the default arrangement returns. */
  resetLayout(canvas: CanvasArtifacts): CanvasArtifacts;
}
