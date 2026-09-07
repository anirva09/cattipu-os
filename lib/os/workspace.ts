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

/** Below this a window is not worth arranging — two tiles of 100px would
 *  be two unusable windows rather than one usable one. */
export const MIN_WINDOW_WIDTH = 240;
export const MIN_WINDOW_HEIGHT = 160;

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
 * Tile: fill the workspace with `count` windows, row by row.
 *
 * Columns are `ceil(sqrt(count))`, which keeps tiles closer to the shape
 * of a window than a single row or column would. The last row is short
 * when the count is not a rectangle, and its tiles share the full width
 * rather than leaving a hole — a gap where a window should be reads as a
 * bug, not as a layout.
 *
 * Every edge is an integer and the leftover pixels from the division are
 * handed out one per tile, so the tiles exactly fill the box with no
 * seam and no overlap.
 */
export function tileLayout(count: number, box: WorkspaceBox): WindowRect[] {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ x: 0, y: 0, width: box.width, height: box.height }];
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const usableH = box.height - TILE_GAP * (rows - 1);
  const baseH = Math.floor(usableH / rows);
  const extraH = usableH - baseH * rows;

  const rects: WindowRect[] = [];
  let placed = 0;
  let y = 0;

  for (let row = 0; row < rows; row += 1) {
    const height = baseH + (row < extraH ? 1 : 0);
    // The last row takes whatever is left over, so a short row spreads
    // across the full width instead of leaving a hole on the right.
    const inRow = Math.min(cols, count - placed);
    const usableW = box.width - TILE_GAP * (inRow - 1);
    const baseW = Math.floor(usableW / inRow);
    const extraW = usableW - baseW * inRow;

    let x = 0;
    for (let col = 0; col < inRow; col += 1) {
      const width = baseW + (col < extraW ? 1 : 0);
      rects.push({ x, y, width, height });
      x += width + TILE_GAP;
      placed += 1;
    }
    y += height + TILE_GAP;
  }

  return rects;
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

/** Sizes below this are not windows any more. Used by tile so a crowded
 *  workspace refuses rather than producing unusable slivers. */
export function isUsableSize(size: {
  width: number;
  height: number;
}): boolean {
  return size.width >= MIN_WINDOW_WIDTH && size.height >= MIN_WINDOW_HEIGHT;
}
