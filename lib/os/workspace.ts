/**
 * Milestone 18 (Workspace Intelligence) — window layout arithmetic.
 *
 * Everything here is a pure function of the workspace box and a window
 * count, which is the point: a snap is stored as a REGION ("left"), never
 * as a pixel rectangle, so a window snapped on a 1920 screen is still
 * exactly half of a 1366 one. That is the same reasoning the desktop grid
 * uses for cells instead of coordinates, and it is why resizing the
 * browser cannot leave a snapped window a few pixels wrong.
 *
 * Every rectangle this module returns is integer-aligned. The RC2 fit
 * audit exists because fractional geometry on a pixel-art shell puts
 * bevels on half-pixels and blurs a 2px border into 3px of grey, so
 * "divide the workspace in two" has to mean floor and remainder, not
 * width/2.
 */

export interface WorkspaceBox {
  width: number;
  height: number;
}

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SnapRegion = "left" | "right" | "top" | "bottom";

export const SNAP_REGIONS: readonly SnapRegion[] = [
  "left",
  "right",
  "top",
  "bottom",
];

/** How close to an edge the POINTER must be for a drag to arm a snap.
 *  Wide enough to hit without aiming, narrow enough that a window parked
 *  near the edge on purpose does not snap by accident. */
export const SNAP_EDGE_THRESHOLD = 24;

/** Cascade step, on the shell's 8px tile so a cascaded stack lands on the
 *  same grid the engineering paper is drawn from. */
export const CASCADE_STEP = 24;
export const CASCADE_ORIGIN = 16;
/** How far across a new run starts when the previous one runs out of
 *  room. Three steps, so a wrapped run is obviously a new stack rather
 *  than one more window in the old one. */
export const CASCADE_RUN_OFFSET = CASCADE_STEP * 3;

/** Gutter between tiles. 8 is the shell's spacing unit; anything larger
 *  starts to read as a gap in a layout rather than a seam between
 *  windows. */
export const TILE_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Split a length in two so the halves add back up to the whole.
 *
 * `Math.round(n / 2)` twice gives 2×round for odd n, which is one pixel
 * too many and leaves a 1px seam or overlap down the middle of the
 * screen. The remainder goes to the second half.
 */
function halve(total: number): [number, number] {
  const first = Math.floor(total / 2);
  return [first, total - first];
}

// ── snapping ────────────────────────────────────────────────────────────

/**
 * The rectangle a region means in this workspace.
 *
 * Left and right are halves of the width at full height; top and bottom
 * are halves of the height at full width. Note that "top" is a HALF, not
 * a maximize: maximize already exists on the title bar, and giving one
 * behaviour two triggers would leave the top half unreachable while
 * teaching that the top edge and the maximize button are different
 * things when they are not.
 */
export function snapRect(region: SnapRegion, box: WorkspaceBox): WindowRect {
  const [leftW, rightW] = halve(box.width);
  const [topH, bottomH] = halve(box.height);

  switch (region) {
    case "left":
      return { x: 0, y: 0, width: leftW, height: box.height };
    case "right":
      return { x: leftW, y: 0, width: rightW, height: box.height };
    case "top":
      return { x: 0, y: 0, width: box.width, height: topH };
    case "bottom":
      return { x: 0, y: topH, width: box.width, height: bottomH };
  }
}

/**
 * Which region a pointer at (x, y) inside the workspace is arming, or
 * null.
 *
 * Left and right win over top and bottom in the corners. A corner is
 * ambiguous by construction and something has to break the tie; the
 * horizontal halves are the ones people reach for, and picking silently
 * is better than a third "corner" region the preview would have to
 * explain.
 */
export function snapRegionForPointer(
  x: number,
  y: number,
  box: WorkspaceBox,
  threshold = SNAP_EDGE_THRESHOLD,
): SnapRegion | null {
  // A pointer that has left the workspace entirely is not aiming at an
  // edge of it — it is over the sidebar or another window.
  if (x < -threshold || y < -threshold) return null;
  if (x > box.width + threshold || y > box.height + threshold) return null;

  if (x <= threshold) return "left";
  if (x >= box.width - threshold) return "right";
  if (y <= threshold) return "top";
  if (y >= box.height - threshold) return "bottom";
  return null;
}

// ── arranging ───────────────────────────────────────────────────────────

/**
 * Cascade: one consistent offset per window, front to back.
 *
 * When the next step would push a window past the bottom or right of the
 * workspace the cascade starts again at the origin, shifted by one step
 * across. Without that, the eighth window on a short viewport would be
 * placed off-screen and the arrangement would look like it had lost it.
 */
export function cascadeLayout(
  count: number,
  box: WorkspaceBox,
  size: { width: number; height: number },
): WindowRect[] {
  const width = Math.min(size.width, box.width);
  const height = Math.min(size.height, box.height);
  const maxX = Math.max(0, box.width - width);
  const maxY = Math.max(0, box.height - height);

  const rects: WindowRect[] = [];
  let runOrigin = CASCADE_ORIGIN;
  let step = 0;

  for (let i = 0; i < count; i += 1) {
    let x = runOrigin + step * CASCADE_STEP;
    let y = CASCADE_ORIGIN + step * CASCADE_STEP;

    // Start a new run rather than letting the clamp pile windows up at
    // the edge. Relying on the clamp would still keep them on screen —
    // and would silently collapse the cascade into a straight line the
    // moment the workspace was shorter than a window plus a few steps.
    if (x > maxX || y > maxY) {
      runOrigin = Math.min(runOrigin + CASCADE_RUN_OFFSET, maxX);
      step = 0;
      x = runOrigin;
      y = CASCADE_ORIGIN;
    }

    rects.push({
      x: clamp(Math.round(x), 0, maxX),
      y: clamp(Math.round(y), 0, maxY),
      width,
      height,
    });
    step += 1;
  }

  return rects;
}

/**
 * Cascade for these windows, sized so the whole stepped run fits.
 *
 * `cascadeLayout` alone gives every window `preferred` (the reference
 * 920×612) and clamps any position that would push a window past the
 * workspace edge. In a small workspace that clamp swallows the step: at
 * 1366×768, five windows leave 100×32px of travel, so windows 3–5 landed
 * on the same (100,16) and two title bars were hidden completely.
 *
 * Here the shared size is chosen BEFORE placing anything:
 *
 *   width  = max(largest min width,  min(preferred width,  box width  − run))
 *   height = max(largest min height, min(preferred height, box height − run))
 *
 * where run = CASCADE_ORIGIN + CASCADE_STEP × (n − 1) is how far the last
 * window sits from the corner. When `preferred` already fits, nothing
 * changes. When it does not, the windows get just small enough that
 * `size + run` fits, so no position is ever clamped and every window keeps
 * its full step. The size never goes below the largest minimum, so no
 * window drops under its own floor. At every supported viewport the floor
 * plus the run fits, so the step is always kept (tests/workspace.test.ts).
 */
export function fittedCascadeLayout(
  mins: readonly MinSize[],
  box: WorkspaceBox,
  preferred: MinSize,
): WindowRect[] {
  if (mins.length === 0) return [];
  const run = CASCADE_ORIGIN + CASCADE_STEP * (mins.length - 1);
  const floor = {
    width: Math.max(...mins.map((m) => m.width)),
    height: Math.max(...mins.map((m) => m.height)),
  };
  const size = {
    width: Math.max(floor.width, Math.min(preferred.width, Math.floor(box.width - run))),
    height: Math.max(floor.height, Math.min(preferred.height, Math.floor(box.height - run))),
  };
  return cascadeLayout(mins.length, box, size);
}

/** A window's floor, in the shape the layouts need. The values come from
 *  the window manager's `CATTIPU_WINDOW_MIN_SIZE`; nothing here names one. */
export interface MinSize {
  width: number;
  height: number;
}

/**
 * Split `total` into `needs.length` integer shares separated by nothing
 * (callers subtract their own gaps), or null when the needs cannot all be
 * met.
 *
 * Equal shares are the Tile look, with the remainder handed out one pixel
 * per share from the front, so when an equal split satisfies every need
 * it is returned unchanged. Only when it does not does each share start
 * from its own need and the room left over get split evenly on top.
 */
function distribute(total: number, needs: readonly number[]): number[] | null {
  const n = needs.length;
  const base = Math.floor(total / n);
  const extra = total - base * n;
  const equal = needs.map((_, i) => base + (i < extra ? 1 : 0));
  if (equal.every((share, i) => share >= needs[i])) return equal;

  const required = needs.reduce((sum, need) => sum + need, 0);
  if (required > total) return null;
  const spare = total - required;
  const each = Math.floor(spare / n);
  const rest = spare - each * n;
  return needs.map((need, i) => need + each + (i < rest ? 1 : 0));
}

/** The grid shapes Tile tries, in order: `ceil(sqrt(count))` columns
 *  first because that is the established Tile look, then fewer columns
 *  down to one, then more up to `count`. Deterministic, so the same
 *  windows in the same workspace always tile the same way. */
function columnCandidates(count: number): number[] {
  const preferred = Math.ceil(Math.sqrt(count));
  const out = [preferred];
  for (let c = preferred - 1; c >= 1; c -= 1) out.push(c);
  for (let c = preferred + 1; c <= count; c += 1) out.push(c);
  return out;
}

/** One grid shape, or null when it cannot honour every minimum. */
function tileGrid(
  mins: readonly MinSize[],
  cols: number,
  box: WorkspaceBox,
): WindowRect[] | null {
  const count = mins.length;
  const rows = Math.ceil(count / cols);

  // Windows fill the grid row by row in the order given; the last row is
  // short when the count is not a rectangle.
  const rowMembers: MinSize[][] = [];
  for (let row = 0; row < rows; row += 1) {
    rowMembers.push(mins.slice(row * cols, Math.min(count, (row + 1) * cols)));
  }

  const heights = distribute(
    box.height - TILE_GAP * (rows - 1),
    rowMembers.map((members) => Math.max(...members.map((m) => m.height))),
  );
  if (!heights) return null;

  const rects: WindowRect[] = [];
  let y = 0;
  for (let row = 0; row < rows; row += 1) {
    const members = rowMembers[row];
    // The short last row spreads across the full width instead of leaving
    // a hole on the right.
    const widths = distribute(
      box.width - TILE_GAP * (members.length - 1),
      members.map((m) => m.width),
    );
    if (!widths) return null;
    let x = 0;
    for (const width of widths) {
      rects.push({ x, y, width, height: heights[row] });
      x += width + TILE_GAP;
    }
    y += heights[row] + TILE_GAP;
  }
  return rects;
}

/**
 * Tile: fill the workspace with one tile per window, in the order given,
 * without putting any window below its own minimum. Or null, when no grid
 * can.
 *
 * Every candidate grid is checked BEFORE any geometry is used. Clamping an
 * invalid grid would only move the problem: widening one tile past its
 * share pushes it into its neighbour. A null tells the caller to use an
 * arrangement that can hold these windows (the window manager falls back
 * to Cascade).
 *
 * Every edge is an integer, tiles never overlap, and together with the
 * gaps they fill the box exactly.
 */
export function tileLayoutWithin(
  mins: readonly MinSize[],
  box: WorkspaceBox,
): WindowRect[] | null {
  if (mins.length === 0) return [];
  for (const cols of columnCandidates(mins.length)) {
    const rects = tileGrid(mins, cols, box);
    if (rects) return rects;
  }
  return null;
}

/**
 * Tile with no minimums: the plain geometry. Columns are
 * `ceil(sqrt(count))`, rows fill in order, the short last row spreads
 * across the full width, and the tiles and gaps exactly fill the box.
 */
export function tileLayout(count: number, box: WorkspaceBox): WindowRect[] {
  if (count <= 0) return [];
  return tileLayoutWithin(
    Array.from({ length: count }, () => ({ width: 0, height: 0 })),
    box,
  ) as WindowRect[];
}

// ── boundary safety ─────────────────────────────────────────────────────

/**
 * Keep a window where it can still be grabbed.
 *
 * The shell contains windows fully inside the workspace, which is
 * stronger than "the title bar stays reachable" and is the behaviour the
 * Golden Master was signed off with — so that is what this preserves. The
 * one case containment alone does not cover is a window LARGER than the
 * workspace, where the maximum is negative; pinning to the origin there
 * keeps the title bar's left end, and its drag handle, on screen.
 */
export function keepOnScreen(
  rect: WindowRect,
  box: WorkspaceBox,
): { x: number; y: number } {
  return {
    x: clamp(rect.x, 0, Math.max(0, box.width - rect.width)),
    y: clamp(rect.y, 0, Math.max(0, box.height - rect.height)),
  };
}

/** Is the whole title bar inside the workspace? The question boundary
 *  safety actually has to answer. */
export function titleBarReachable(
  rect: WindowRect,
  box: WorkspaceBox,
  titleBarHeight: number,
): boolean {
  const y = rect.y;
  return (
    rect.x + rect.width > 0 &&
    rect.x < box.width &&
    y >= 0 &&
    y + Math.min(titleBarHeight, rect.height) <= box.height
  );
}

/**
 * A window is dragged off a snap by pulling its title bar away from the
 * edge, and it has to end up under the cursor rather than jumping.
 *
 * The grab point is kept PROPORTIONALLY: grab a half-width window
 * three-quarters along its title bar, and the restored window arrives
 * with the cursor three-quarters along its title bar. Restoring to the
 * stored x instead makes the window leap sideways out from under the
 * pointer, which reads as a glitch rather than an unsnap.
 */
export function unsnapPosition(
  pointerX: number,
  pointerY: number,
  snapped: WindowRect,
  restoredSize: { width: number; height: number },
  box: WorkspaceBox,
): { x: number; y: number } {
  const ratio =
    snapped.width > 0 ? (pointerX - snapped.x) / snapped.width : 0.5;
  const rect: WindowRect = {
    x: Math.round(pointerX - ratio * restoredSize.width),
    y: Math.round(pointerY - Math.min(16, snapped.height / 2)),
    ...restoredSize,
  };
  return keepOnScreen(rect, box);
}

// ── resizing ────────────────────────────────────────────────────────────

/**
 * The size a bottom-right resize grip produces after the pointer has moved
 * (dx, dy) from where the grip was taken.
 *
 * Only the size is returned. The top-left corner is not the grip's to move,
 * which is what keeps the title bar and its controls exactly where they
 * were: a window made shorter cannot push its own title bar away. The far
 * edges stop at the workspace so the grip stays on screen, and never go
 * below the window's own minimum however far the pointer travels. Whole
 * pixels only, like every other rectangle in this module.
 */
export function resizeSize(
  start: WindowRect,
  dx: number,
  dy: number,
  box: WorkspaceBox,
  min: { width: number; height: number },
): { width: number; height: number } {
  const maxWidth = Math.max(min.width, Math.floor(box.width - start.x));
  const maxHeight = Math.max(min.height, Math.floor(box.height - start.y));
  return {
    width: clamp(Math.round(start.width + dx), min.width, maxWidth),
    height: clamp(Math.round(start.height + dy), min.height, maxHeight),
  };
}
