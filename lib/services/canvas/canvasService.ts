import type { ArchitectNodeKind } from "@/lib/ai/types";
import type {
  CanvasEdgeView,
  CanvasNodeView,
  CanvasService,
  CanvasView,
} from "@/lib/contracts/canvas";

/**
 * Canvas geometry. Every value is a multiple of the 8px engineering grid,
 * so a default position and a snapped placement land on the same lines
 * the surface draws.
 */
export const CANVAS_GRID = 8;
export const CANVAS_NODE = { width: 144, height: 48 } as const;
export const CANVAS_ORIGIN = 16;
export const CANVAS_COLUMN_PITCH = 176;
export const CANVAS_ROW_PITCH = 72;
/** Far enough for any real architecture; stops a drag from writing a
 *  coordinate nobody can scroll back to. */
export const CANVAS_EXTENT = 4096;

/** Left to right, the way a request travels. */
const COLUMN: Record<ArchitectNodeKind, number> = {
  client: 0,
  gateway: 1,
  service: 2,
  queue: 3,
  datastore: 4,
};

/** Clamped to the sheet and rounded to the nearest grid line. */
export function snapToCanvasGrid(value: number): number {
  const clamped = Math.min(Math.max(value, 0), CANVAS_EXTENT);
  return Math.round(clamped / CANVAS_GRID) * CANVAS_GRID;
}

export const canvasService: CanvasService = {
  defaultLayout(architecture) {
    // Rows are counted per column in the architecture's own node order.
    // No randomness, no clock and no viewport: the same architecture
    // always produces the same arrangement.
    const rows = new Map<number, number>();
    const out = new Map<string, { x: number; y: number }>();
    for (const node of architecture.nodes) {
      const col = COLUMN[node.kind] ?? COLUMN.service;
      const row = rows.get(col) ?? 0;
      rows.set(col, row + 1);
      out.set(node.id, {
        x: CANVAS_ORIGIN + col * CANVAS_COLUMN_PITCH,
        y: CANVAS_ORIGIN + row * CANVAS_ROW_PITCH,
      });
    }
    return out;
  },

  view(activeProject): CanvasView {
    if (!activeProject) return { kind: "no-project" };
    const architecture = activeProject.architect.data;
    if (!architecture) return { kind: "no-architecture", project: activeProject };

    const defaults = canvasService.defaultLayout(architecture);
    const placed = new Map(
      (activeProject.canvas.layout ?? []).map((p) => [p.nodeId, p] as const),
    );
    const nodes: CanvasNodeView[] = architecture.nodes.map((node) => {
      const placement = placed.get(node.id);
      const position = placement ?? defaults.get(node.id) ?? { x: CANVAS_ORIGIN, y: CANVAS_ORIGIN };
      return {
        nodeId: node.id,
        label: node.label,
        kind: node.kind,
        description: node.description ?? "",
        x: position.x,
        y: position.y,
        placed: Boolean(placement),
      };
    });
    const ids = new Set(architecture.nodes.map((node) => node.id));
    const edges: CanvasEdgeView[] = architecture.edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label }));
    return { kind: "ready", project: activeProject, nodes, edges };
  },

  place(canvas, architecture, placement) {
    const ids = new Set(architecture.nodes.map((node) => node.id));
    if (!ids.has(placement.nodeId)) return null;
    const next = {
      nodeId: placement.nodeId,
      x: snapToCanvasGrid(placement.x),
      y: snapToCanvasGrid(placement.y),
    };
    const kept = (canvas.layout ?? []).filter(
      (p) => p.nodeId !== placement.nodeId && ids.has(p.nodeId),
    );
    return { ...canvas, layout: [...kept, next] };
  },

  resetLayout(canvas) {
    return { ...canvas, layout: [] };
  },
};
