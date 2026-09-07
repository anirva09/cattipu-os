import type { CattipuProject } from "@/lib/project/types";
import {
  childrenOf,
  visibleObjects,
  type GridCell,
  type OsObject,
} from "./filesystem";

/**
 * Milestone 16 (Living Desktop) / Milestone 17 (Real File Explorer) —
 * the DESKTOP SURFACE.
 *
 * What an OS object is, where it lives and what it links to now belongs
 * to lib/os/filesystem.ts, because Explorer needs all of that too and a
 * second definition would be a second answer. What is left here is the
 * one thing only the desktop has: a grid.
 *
 * The desktop is not a separate place from Explorer's root — it is a
 * different VIEW of it. `desktopObjects` is the whole difference, and it
 * is one comparison.
 */

export type {
  DesktopObject,
  GridCell,
  OsObject,
  OsObjectKind,
  OsObjectKind as DesktopObjectKind,
} from "./filesystem";

export {
  nextFolderName,
  objectLabel,
  projectsWithoutShortcut,
  visibleObjects,
} from "./filesystem";

/** Cell size and origin, in multiples of the engineering paper's 8px tile
 *  so an icon always lands on the grid the background is drawn from. */
export const DESKTOP_GRID = {
  cellWidth: 88,
  cellHeight: 96,
  originX: 16,
  originY: 16,
  /** Kept clear of the right widget column. */
  rightReserve: 248,
} as const;

export function cellToPixels(cell: GridCell): { x: number; y: number } {
  return {
    x: DESKTOP_GRID.originX + cell.col * DESKTOP_GRID.cellWidth,
    y: DESKTOP_GRID.originY + cell.row * DESKTOP_GRID.cellHeight,
  };
}

/** The inverse, with clamping — a drag that ends past an edge lands on the
 *  last cell that is actually on screen rather than somewhere unreachable. */
export function pixelsToCell(
  x: number,
  y: number,
  bounds: { width: number; height: number },
): GridCell {
  const cols = Math.max(
    1,
    Math.floor((bounds.width - DESKTOP_GRID.originX) / DESKTOP_GRID.cellWidth),
  );
  const rows = Math.max(
    1,
    Math.floor((bounds.height - DESKTOP_GRID.originY) / DESKTOP_GRID.cellHeight),
  );
  const col = Math.round((x - DESKTOP_GRID.originX) / DESKTOP_GRID.cellWidth);
  const row = Math.round((y - DESKTOP_GRID.originY) / DESKTOP_GRID.cellHeight);
  return {
    col: Math.min(Math.max(col, 0), cols - 1),
    row: Math.min(Math.max(row, 0), rows - 1),
  };
}

export function sameCell(a: GridCell, b: GridCell): boolean {
  return a.col === b.col && a.row === b.row;
}

/**
 * What the desktop draws: the objects at the OS root.
 *
 * An object inside a folder is not on the desktop — that is the whole of
 * "should immediately appear on the desktop IF IT BELONGS THERE". There
 * is no copy, no sync and nothing to keep in step; the desktop is this
 * filter applied to the same array Explorer reads.
 */
export function desktopObjects(
  objects: readonly OsObject[],
  projects: readonly CattipuProject[],
): OsObject[] {
  return childrenOf(visibleObjects(objects, projects), null, projects);
}

/**
 * The first free cell, filling down a column before starting the next —
 * the order a person expects icons to arrive in.
 *
 * Only ROOT objects are considered, because only root objects are on the
 * desktop. A folder five levels deep still carries a position; counting
 * it here would leave a hole on the desktop that nothing occupies.
 *
 * `rows` is a cap, not a guess: a new object placed past the bottom of the
 * screen would be invisible and would look like the action silently
 * failed, so the column wraps instead.
 */
export function nextFreeCell(
  taken: readonly OsObject[],
  rows = 6,
): GridCell {
  const occupied = new Set(
    taken
      .filter((o) => o.parentId === null)
      .map((o) => `${o.position.col},${o.position.row}`),
  );
  for (let col = 0; col < 64; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      if (!occupied.has(`${col},${row}`)) return { col, row };
    }
  }
  return { col: 0, row: 0 };
}

/**
 * Moving an object onto an occupied cell SWAPS the two rather than
 * stacking them. Refusing the drop would leave the icon snapping back with
 * no explanation; letting them overlap would hide one behind the other.
 * A swap is the only outcome where nothing is lost and nothing is hidden.
 *
 * Only root objects can collide, for the same reason `nextFreeCell` only
 * counts root objects: a position inside a folder is not on any grid.
 */
export function moveObject(
  objects: readonly OsObject[],
  id: string,
  to: GridCell,
): OsObject[] {
  const moving = objects.find((o) => o.id === id);
  if (!moving) return [...objects];
  const occupant = objects.find(
    (o) =>
      o.id !== id &&
      o.parentId === moving.parentId &&
      sameCell(o.position, to),
  );
  return objects.map((o) => {
    if (o.id === id) return { ...o, position: to };
    if (occupant && o.id === occupant.id) return { ...o, position: moving.position };
    return o;
  });
}
