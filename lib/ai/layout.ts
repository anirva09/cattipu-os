import type { ArchitectNode, ArchitectNodeKind, InfraNode, InfraNodeKind, NodePosition } from "./types";

/**
 * Column-based auto-layout, shared by the store (which bakes a position
 * into every node once, at generation time) and the canvas (which needs a
 * sane default for a brand-new node that has no position yet). Positions
 * are data from here on — this function is never called on every render,
 * only when a node is missing one.
 */
const APP_COLUMN: Record<ArchitectNodeKind, number> = {
  client: 0,
  gateway: 1,
  service: 2,
  queue: 2,
  datastore: 3,
};
const APP_COLUMN_X = [40, 300, 560, 860];
const ROW_HEIGHT = 130;

export function layoutAppNodes(nodes: ArchitectNode[]): ArchitectNode[] {
  const columnCounts: Record<number, number> = {};
  return nodes.map((n) => {
    if (n.position) return n;
    const col = APP_COLUMN[n.kind] ?? 2;
    const row = columnCounts[col] ?? 0;
    columnCounts[col] = row + 1;
    return { ...n, position: { x: APP_COLUMN_X[col], y: 30 + row * ROW_HEIGHT } };
  });
}

/** Where a freshly-created node should land: bottom of the service column. */
export function nextAppNodePosition(nodes: ArchitectNode[], kind: ArchitectNodeKind): NodePosition {
  const col = APP_COLUMN[kind] ?? 2;
  const x = APP_COLUMN_X[col];
  const rowsInColumn = nodes.filter((n) => (APP_COLUMN[n.kind] ?? 2) === col).length;
  return { x, y: 30 + rowsInColumn * ROW_HEIGHT };
}

const INFRA_COLUMN: Record<InfraNodeKind, number> = {
  gateway: 0,
  orchestration: 1,
  compute: 1,
  database: 2,
  cache: 2,
  queue: 2,
  storage: 2,
};
const INFRA_COLUMN_X = [40, 320, 600];

export function layoutInfraNodes(nodes: InfraNode[]): InfraNode[] {
  const columnCounts: Record<number, number> = {};
  return nodes.map((n) => {
    if (n.position) return n;
    const col = INFRA_COLUMN[n.kind] ?? 2;
    const row = columnCounts[col] ?? 0;
    columnCounts[col] = row + 1;
    return { ...n, position: { x: INFRA_COLUMN_X[col], y: 30 + row * ROW_HEIGHT } };
  });
}
