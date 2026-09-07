import type { CattipuProject } from "@/lib/project/types";

/**
 * Milestone 16 (Living Desktop) — the desktop slice of the OS state layer.
 *
 * Desktop objects are real records, not decoration: they have identity,
 * a position, and — for shortcuts — a link to something else that owns the
 * truth. This file holds every rule about them that does not need a
 * browser, which is nearly all of them, so the behaviour can be tested
 * without rendering anything.
 *
 * The single most important rule here is that a shortcut stores a
 * `projectId` and NOT a name. "Renaming a project updates its shortcut"
 * is then not a feature that has to be implemented and kept working — it
 * is the only thing that can happen, because the shortcut never held a
 * copy of the name to go stale. The same reasoning makes "deleting a
 * shortcut must not delete the project" structural rather than careful:
 * the shortcut owns nothing.
 */

export type DesktopObjectKind = "folder" | "project-shortcut";

/** Grid cells, not pixels. Snapping is then not a rounding step applied
 *  after a drag — a position simply cannot be off-grid — and a layout
 *  saved on a 1920 screen still lands correctly on a 1366 one. */
export interface GridCell {
  col: number;
  row: number;
}

export interface DesktopObject {
  id: string;
  kind: DesktopObjectKind;
  /** Folders own their label. Shortcuts leave this empty and resolve it
   *  from the project they point at — see `objectLabel`. */
  label: string;
  /** Set on shortcuts only. The link, never a copy. */
  projectId?: string;
  position: GridCell;
  createdAt: string;
}

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
 * The first free cell, filling down a column before starting the next —
 * the order a person expects icons to arrive in.
 *
 * `rows` is a cap, not a guess: a new object placed past the bottom of the
 * screen would be invisible and would look like the action silently
 * failed, so the column wraps instead.
 */
export function nextFreeCell(
  taken: readonly DesktopObject[],
  rows = 6,
): GridCell {
  const occupied = new Set(taken.map((o) => `${o.position.col},${o.position.row}`));
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
 */
export function moveObject(
  objects: readonly DesktopObject[],
  id: string,
  to: GridCell,
): DesktopObject[] {
  const moving = objects.find((o) => o.id === id);
  if (!moving) return [...objects];
  const occupant = objects.find((o) => o.id !== id && sameCell(o.position, to));
  return objects.map((o) => {
    if (o.id === id) return { ...o, position: to };
    if (occupant && o.id === occupant.id) return { ...o, position: moving.position };
    return o;
  });
}

// ── links ───────────────────────────────────────────────────────────────

/** A shortcut shows its project's CURRENT name. Nothing copies it. */
export function objectLabel(
  object: DesktopObject,
  projects: readonly CattipuProject[],
): string {
  if (object.kind !== "project-shortcut") return object.label;
  const project = projects.find((p) => p.id === object.projectId);
  return project?.name ?? object.label;
}

/**
 * Shortcuts whose project no longer exists are dropped from what the
 * desktop renders.
 *
 * They are NOT deleted from the store here — this is a pure projection,
 * and a render pass is the wrong place to destroy data. Hiding is enough
 * for the desktop to stay honest, and it leaves the record recoverable if
 * a project ever comes back (an undo, a restored backup).
 */
export function visibleObjects(
  objects: readonly DesktopObject[],
  projects: readonly CattipuProject[],
): DesktopObject[] {
  return objects.filter(
    (o) =>
      o.kind !== "project-shortcut" ||
      projects.some((p) => p.id === o.projectId),
  );
}

/** Which projects do not have a shortcut yet — what the "New Project
 *  Shortcut" menu offers. Making a second shortcut for the same project
 *  is not useful and makes "remove shortcut" ambiguous. */
export function projectsWithoutShortcut(
  objects: readonly DesktopObject[],
  projects: readonly CattipuProject[],
): CattipuProject[] {
  const linked = new Set(
    objects.filter((o) => o.kind === "project-shortcut").map((o) => o.projectId),
  );
  return projects.filter((p) => !linked.has(p.id));
}

// ── naming ──────────────────────────────────────────────────────────────

/** "Untitled Folder", then "Untitled Folder 2", and so on. Two objects
 *  with the same name on one desktop are indistinguishable to the person
 *  looking at them. */
export function nextFolderName(objects: readonly DesktopObject[]): string {
  const base = "Untitled Folder";
  const names = new Set(
    objects.filter((o) => o.kind === "folder").map((o) => o.label),
  );
  if (!names.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base} ${n}`;
    if (!names.has(candidate)) return candidate;
  }
  return base;
}
