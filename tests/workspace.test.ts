/**
 * Milestone 18 (Workspace Intelligence) — tests for window layout and the
 * restore contract.
 *
 * Written against the specific wrong implementations:
 *
 *  - halves are checked for ADDING BACK UP, because `round(n/2)` twice on
 *    an odd width is the bug that leaves a 1px seam down the screen;
 *  - tiles are checked for exact coverage and zero overlap, not just for
 *    "there are N of them";
 *  - restore is checked on all THREE of position, size and z-order, and
 *    the z-order case is set up so the restored window ends up back
 *    UNDER another one — an implementation that keeps the raised z-index
 *    passes a naive test and fails this;
 *  - the snap round trip re-snaps before restoring, because recording a
 *    new restore point on every snap is the defect that makes "restore"
 *    mean "go back to the previous snap".
 *
 * Run with: npx tsx lib/os/__tests__/workspace.test.ts
 */
import assert from "node:assert/strict";

import {
  CASCADE_ORIGIN,
  CASCADE_RUN_OFFSET,
  CASCADE_STEP,
  SNAP_EDGE_THRESHOLD,
  TILE_GAP,
  cascadeLayout,
  keepOnScreen,
  snapRect,
  snapRegionForPointer,
  tileLayout,
  titleBarReachable,
  unsnapPosition,
  type WindowRect,
  type WorkspaceBox,
} from "@/lib/os/workspace";
import {
  CATTIPU_DEFAULT_WINDOW_SIZE,
  createInitialWindowManagerState,
  parseWindowManagerState,
  serializeWindowManagerState,
  windowManagerReducer,
  windowRect,
  type WindowManagerState,
} from "@/components/WindowManager/windowManager.reducer";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

/** The real workspace at 1600x900: 1600 - 98 rail - 248 widgets, and
 *  900 - 74 top bar - 50 status. Odd on purpose is not needed here, so
 *  the odd cases below use their own boxes. */
const BOX: WorkspaceBox = { width: 1254, height: 776 };
const TITLE_BAR = 38;

function overlaps(a: WindowRect, b: WindowRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function reduce(
  state: WindowManagerState,
  ...actions: Parameters<typeof windowManagerReducer>[1][]
): WindowManagerState {
  return actions.reduce(windowManagerReducer, state);
}

/** Every window open, so arrangements have something to arrange. */
function allOpen(): WindowManagerState {
  return reduce(
    createInitialWindowManagerState(),
    { type: "launch", id: "architect" },
    { type: "launch", id: "memory" },
    { type: "launch", id: "explorer" },
    { type: "launch", id: "settings" },
  );
}

// ── snapping ────────────────────────────────────────────────────────────

test("left and right halves tile the width exactly, with no seam", () => {
  // An odd width is the case that catches round(n/2) used twice.
  const odd: WorkspaceBox = { width: 1255, height: 776 };
  const left = snapRect("left", odd);
  const right = snapRect("right", odd);
  assert.equal(left.width + right.width, odd.width);
  assert.equal(left.x + left.width, right.x);
  assert.equal(left.height, odd.height);
  assert.equal(right.height, odd.height);
});

test("top and bottom halves tile the height exactly", () => {
  const odd: WorkspaceBox = { width: 1254, height: 777 };
  const top = snapRect("top", odd);
  const bottom = snapRect("bottom", odd);
  assert.equal(top.height + bottom.height, odd.height);
  assert.equal(top.y + top.height, bottom.y);
});

test("every snap rectangle is integer-aligned", () => {
  for (const box of [BOX, { width: 1255, height: 777 }]) {
    for (const region of ["left", "right", "top", "bottom"] as const) {
      const r = snapRect(region, box);
      for (const v of [r.x, r.y, r.width, r.height]) {
        assert.equal(v, Math.round(v), `${region} ${JSON.stringify(r)}`);
      }
    }
  }
});

test("a snap is a region, so it follows the workspace when it changes", () => {
  // The point of storing "left" rather than a rectangle: the same state
  // is a correct half of a different-sized workspace.
  const wide = snapRect("left", { width: 1920, height: 900 });
  const narrow = snapRect("left", { width: 1366, height: 768 });
  assert.equal(wide.width, 960);
  assert.equal(narrow.width, 683);
});

test("the pointer arms a region only near an edge", () => {
  assert.equal(snapRegionForPointer(2, 400, BOX), "left");
  assert.equal(snapRegionForPointer(BOX.width - 2, 400, BOX), "right");
  assert.equal(snapRegionForPointer(600, 2, BOX), "top");
  assert.equal(snapRegionForPointer(600, BOX.height - 2, BOX), "bottom");
  // The middle of the workspace must arm nothing, or every drag snaps.
  assert.equal(snapRegionForPointer(600, 400, BOX), null);
  assert.equal(
    snapRegionForPointer(SNAP_EDGE_THRESHOLD + 1, 400, BOX),
    null,
  );
});

test("a corner resolves to the horizontal half, not to both", () => {
  assert.equal(snapRegionForPointer(2, 2, BOX), "left");
  assert.equal(snapRegionForPointer(BOX.width - 2, 2, BOX), "right");
});

test("a pointer well outside the workspace arms nothing", () => {
  // Dragging over the sidebar is not aiming at the workspace's left edge.
  assert.equal(snapRegionForPointer(-200, 400, BOX), null);
  assert.equal(snapRegionForPointer(600, BOX.height + 200, BOX), null);
});

// ── tiling ──────────────────────────────────────────────────────────────

test("tiles never overlap, at every count from 1 to 5", () => {
  for (let n = 1; n <= 5; n += 1) {
    const rects = tileLayout(n, BOX);
    assert.equal(rects.length, n, `count ${n}`);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        assert.ok(!overlaps(rects[i], rects[j]), `n=${n} ${i}x${j}`);
      }
    }
  }
});

test("tiles stay inside the workspace and are integer-aligned", () => {
  for (let n = 1; n <= 5; n += 1) {
    for (const r of tileLayout(n, BOX)) {
      assert.ok(r.x >= 0 && r.y >= 0, `n=${n} ${JSON.stringify(r)}`);
      assert.ok(r.x + r.width <= BOX.width, `n=${n} ${JSON.stringify(r)}`);
      assert.ok(r.y + r.height <= BOX.height, `n=${n} ${JSON.stringify(r)}`);
      for (const v of [r.x, r.y, r.width, r.height]) {
        assert.equal(v, Math.round(v));
      }
    }
  }
});

test("tiles fill the workspace edge to edge, gaps included", () => {
  // The assertion that a lazy layout fails: not "they fit" but "they
  // account for every pixel". 4 windows on an odd box is where integer
  // division loses one if the remainder is dropped.
  const box: WorkspaceBox = { width: 1255, height: 777 };
  const rects = tileLayout(4, box);
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  assert.equal(right, box.width);
  assert.equal(bottom, box.height);
  const area = rects.reduce((sum, r) => sum + r.width * r.height, 0);
  const gaps = box.width * TILE_GAP + box.height * TILE_GAP - TILE_GAP * TILE_GAP;
  assert.equal(area, box.width * box.height - gaps);
});

test("a short last row spreads across the full width", () => {
  // 5 windows is 3 columns then 2. If the short row kept the column
  // width there would be a window-sized hole on the right.
  const rects = tileLayout(5, BOX);
  const lastRow = rects.slice(3);
  assert.equal(lastRow.length, 2);
  assert.equal(
    Math.max(...lastRow.map((r) => r.x + r.width)),
    BOX.width,
  );
  assert.ok(lastRow[0].width > rects[0].width, "short row tiles are wider");
});

test("one window tiled is the whole workspace", () => {
  assert.deepEqual(tileLayout(1, BOX), [
    { x: 0, y: 0, width: BOX.width, height: BOX.height },
  ] as WindowRect[]);
});

// ── cascade ─────────────────────────────────────────────────────────────

test("cascade offsets every window by the same step", () => {
  const rects = cascadeLayout(4, BOX, CATTIPU_DEFAULT_WINDOW_SIZE);
  for (let i = 1; i < rects.length; i += 1) {
    assert.equal(rects[i].x - rects[i - 1].x, CASCADE_STEP, `x step ${i}`);
    assert.equal(rects[i].y - rects[i - 1].y, CASCADE_STEP, `y step ${i}`);
  }
});

test("a cascade on a shallow workspace starts a new run, not a pile-up", () => {
  // A workspace barely taller than a window. "Every window is on screen"
  // proves NOTHING here — cascadeLayout clamps its own output, so a
  // cascade that walks off the bottom comes back squashed against the
  // edge and passes that test while every window after the first sits at
  // the same y, 24px apart, effectively on top of each other.
  //
  // The property that distinguishes them is the STRUCTURE: consecutive
  // windows either continue a run (offset by one step in both axes) or
  // begin a new one (back at the origin y, a run's width further
  // across). Neither is true of a clamped pile.
  const shallow: WorkspaceBox = { width: 1254, height: 640 };
  const rects = cascadeLayout(5, shallow, CATTIPU_DEFAULT_WINDOW_SIZE);

  for (let i = 1; i < rects.length; i += 1) {
    const prev = rects[i - 1];
    const here = rects[i];
    const sameRun =
      here.x - prev.x === CASCADE_STEP && here.y - prev.y === CASCADE_STEP;
    const newRun =
      here.y === CASCADE_ORIGIN && here.x - prev.x >= CASCADE_RUN_OFFSET - CASCADE_STEP;
    assert.ok(
      sameRun || newRun,
      `window ${i} at ${JSON.stringify(here)} follows ${JSON.stringify(prev)}`,
    );
    assert.ok(titleBarReachable(here, shallow, TITLE_BAR), JSON.stringify(here));
  }
});

test("no two cascaded windows land in exactly the same place", () => {
  const rects = cascadeLayout(5, BOX, CATTIPU_DEFAULT_WINDOW_SIZE);
  const spots = new Set(rects.map((r) => `${r.x},${r.y}`));
  assert.equal(spots.size, rects.length);
});

// ── boundary safety ─────────────────────────────────────────────────────

test("a window dragged past an edge is pulled back on screen", () => {
  const size = CATTIPU_DEFAULT_WINDOW_SIZE;
  const far = keepOnScreen({ x: 99_999, y: 99_999, ...size }, BOX);
  assert.deepEqual(far, {
    x: BOX.width - size.width,
    y: BOX.height - size.height,
  });
  assert.deepEqual(keepOnScreen({ x: -900, y: -900, ...size }, BOX), {
    x: 0,
    y: 0,
  });
});

test("a window bigger than the workspace still has a reachable title bar", () => {
  const tiny: WorkspaceBox = { width: 600, height: 300 };
  const size = CATTIPU_DEFAULT_WINDOW_SIZE;
  const at = keepOnScreen({ x: 400, y: 400, ...size }, tiny);
  assert.deepEqual(at, { x: 0, y: 0 });
  assert.ok(titleBarReachable({ ...at, ...size }, tiny, TITLE_BAR));
});

test("titleBarReachable rejects a window pushed off the bottom", () => {
  // Proof the guarantee above is not vacuous: this is what failing
  // looks like.
  const off: WindowRect = { x: 0, y: BOX.height - 10, width: 920, height: 612 };
  assert.equal(titleBarReachable(off, BOX, TITLE_BAR), false);
});

test("unsnapping keeps the cursor at the same point along the title bar", () => {
  const snapped = snapRect("left", BOX);
  // Grabbed three-quarters along a half-width window. The restored size
  // is small enough that the result does not need clamping — with the
  // 920px reference size in a 1254px workspace almost every grab hits an
  // edge, and the test would be measuring the clamp instead.
  const grabX = snapped.x + snapped.width * 0.75;
  const size = { width: 400, height: 300 };
  const at = unsnapPosition(grabX, 20, snapped, size, BOX);
  const ratioAfter = (grabX - at.x) / size.width;
  assert.ok(
    Math.abs(ratioAfter - 0.75) < 0.02,
    `cursor at ${ratioAfter.toFixed(3)} of the restored window`,
  );
});

test("boundary safety beats the cursor ratio when the two conflict", () => {
  // Grabbing near the left edge would put a 920px window at x = -220.
  // Staying on screen is the stronger promise, so the window arrives at
  // the edge and the cursor sits further along it than it did.
  const snapped = snapRect("left", BOX);
  const grabX = snapped.x + snapped.width * 0.75;
  const at = unsnapPosition(grabX, 20, snapped, CATTIPU_DEFAULT_WINDOW_SIZE, BOX);
  assert.equal(at.x, 0);
  assert.ok(
    titleBarReachable(
      { ...at, ...CATTIPU_DEFAULT_WINDOW_SIZE },
      BOX,
      TITLE_BAR,
    ),
  );
});

// ── the reducer's restore contract ──────────────────────────────────────

test("maximize then restore returns position, size AND z-order exactly", () => {
  let state = allOpen();
  // Put Projects deliberately UNDER Settings, then maximize it. An
  // implementation that keeps the raised z-index passes on position and
  // size and fails here.
  state = reduce(state, { type: "focus", id: "settings" });
  const before = state.windows.projects;
  const settingsZ = state.windows.settings.zIndex;
  assert.ok(before.zIndex < settingsZ, "fixture: projects starts underneath");

  state = reduce(
    state,
    { type: "maximize", id: "projects" },
    { type: "maximize", id: "projects" },
  );
  const after = state.windows.projects;

  assert.equal(after.mode, "normal");
  assert.deepEqual(after.position, before.position);
  assert.deepEqual(after.size ?? CATTIPU_DEFAULT_WINDOW_SIZE, {
    ...CATTIPU_DEFAULT_WINDOW_SIZE,
  });
  assert.equal(after.zIndex, before.zIndex);
  assert.ok(after.zIndex < state.windows.settings.zIndex, "back underneath");
});

test("snapping records where the window was, and restore puts it back", () => {
  let state = allOpen();
  const before = state.windows.explorer;
  state = reduce(state, { type: "snap", id: "explorer", region: "left" });
  assert.equal(state.windows.explorer.snap, "left");
  assert.deepEqual(
    windowRect(state.windows.explorer, BOX),
    snapRect("left", BOX),
  );

  state = reduce(state, { type: "restore", id: "explorer" });
  assert.equal(state.windows.explorer.snap, null);
  assert.deepEqual(state.windows.explorer.position, before.position);
  assert.equal(state.windows.explorer.zIndex, before.zIndex);
});

test("snapping twice still restores to before the FIRST snap", () => {
  let state = allOpen();
  const before = { ...state.windows.memory };
  state = reduce(
    state,
    { type: "snap", id: "memory", region: "left" },
    { type: "snap", id: "memory", region: "right" },
    { type: "restore", id: "memory" },
  );
  assert.equal(state.windows.memory.snap, null);
  assert.deepEqual(state.windows.memory.position, before.position);
  // Snapping does not move a window's stored POSITION — the rectangle
  // comes from the region — so position alone cannot tell a correct
  // implementation from one that re-records on every snap. Each snap
  // raises the window, so the z-order it came from is the discriminator.
  assert.equal(
    state.windows.memory.zIndex,
    before.zIndex,
    "restored to the z-order before the FIRST snap",
  );
});

test("restore with nothing to restore changes nothing", () => {
  const state = allOpen();
  assert.equal(
    windowManagerReducer(state, { type: "restore", id: "memory" }),
    state,
  );
});

test("tiling gives every visible window a distinct, non-overlapping place", () => {
  const state = reduce(allOpen(), {
    type: "arrange",
    layout: "tile",
    bounds: BOX,
  });
  const rects = (["projects", "architect", "memory", "explorer", "settings"] as const)
    .map((id) => windowRect(state.windows[id], BOX));
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      assert.ok(!overlaps(rects[i], rects[j]), `${i}x${j}`);
    }
  }
});

test("arranging leaves z-order alone", () => {
  const before = allOpen();
  const order = (s: WindowManagerState) =>
    (["projects", "architect", "memory", "explorer", "settings"] as const)
      .slice()
      .sort((a, b) => s.windows[a].zIndex - s.windows[b].zIndex)
      .join();
  for (const layout of ["cascade", "tile"] as const) {
    const after = reduce(before, { type: "arrange", layout, bounds: BOX });
    assert.equal(order(after), order(before), layout);
    assert.equal(after.activeWindowId, before.activeWindowId, layout);
    // Relative order survives raising every window back-to-front, so the
    // order string alone does not prove an arrangement left the stack
    // alone. The z VALUES and the counter do.
    for (const id of ["projects", "architect", "memory", "explorer", "settings"] as const) {
      assert.equal(after.windows[id].zIndex, before.windows[id].zIndex, `${layout} ${id}`);
    }
    assert.equal(after.nextZIndex, before.nextZIndex, layout);
  }
});

test("arranging skips minimized and closed windows", () => {
  const state = reduce(
    allOpen(),
    { type: "minimize", id: "memory" },
    { type: "close", id: "settings" },
    { type: "arrange", layout: "tile", bounds: BOX },
  );
  // Three visible windows must tile as three, not as five with two of
  // the slots wasted on windows nobody can see.
  const visible = (["projects", "architect", "explorer"] as const).map((id) =>
    windowRect(state.windows[id], BOX),
  );
  assert.equal(
    Math.max(...visible.map((r) => r.x + r.width)),
    BOX.width,
  );
  assert.equal(state.windows.memory.mode, "minimized");
  assert.equal(state.windows.settings.open, false);
});

test("arranging takes a window out of maximize and out of a snap", () => {
  const state = reduce(
    allOpen(),
    { type: "maximize", id: "projects" },
    { type: "snap", id: "explorer", region: "left" },
    { type: "arrange", layout: "tile", bounds: BOX },
  );
  assert.equal(state.windows.projects.mode, "normal");
  assert.equal(state.windows.explorer.snap, null);
});

test("un-maximizing a snapped window returns it to its half", () => {
  // The intuitive case, and the one a single-level restore point gets
  // wrong: it would send the window home and lose the snap entirely.
  let state = allOpen();
  const home = { ...state.windows.explorer.position };
  state = reduce(
    state,
    { type: "snap", id: "explorer", region: "left" },
    { type: "maximize", id: "explorer" },
  );
  assert.equal(state.windows.explorer.mode, "maximized");

  state = reduce(state, { type: "maximize", id: "explorer" });
  assert.equal(state.windows.explorer.snap, "left", "back on its half");
  assert.equal(state.windows.explorer.mode, "normal");

  // And the window still knows where home is — a snap must not become
  // permanent just because it was maximized once.
  state = reduce(state, { type: "restore", id: "explorer" });
  assert.equal(state.windows.explorer.snap, null);
  assert.deepEqual(state.windows.explorer.position, home);
});

test("Restore All undoes a Tile — the case that reaches for it most", () => {
  // Arranging used to clear every restore point, so after a tile there
  // was nothing to restore and the command silently did nothing.
  let state = allOpen();
  const before = Object.fromEntries(
    (["projects", "architect", "memory", "explorer", "settings"] as const).map(
      (id) => [id, { ...state.windows[id].position }],
    ),
  );

  state = reduce(state, { type: "arrange", layout: "tile", bounds: BOX });
  assert.notDeepEqual(state.windows.projects.position, before.projects,
    "fixture: tiling actually moved things");

  state = reduce(state, { type: "restoreAll" });
  for (const id of ["projects", "architect", "memory", "explorer", "settings"] as const) {
    assert.deepEqual(state.windows[id].position, before[id], id);
    // The resolved rectangle, not the `size` field. Restore writes an
    // explicit {920,612} where the window previously had `null`, and
    // those two mean the same thing — asserting the field would be
    // asserting a representation rather than a behaviour.
    const rect = windowRect(state.windows[id], BOX);
    assert.equal(rect.width, CATTIPU_DEFAULT_WINDOW_SIZE.width, `${id} width`);
    assert.equal(rect.height, CATTIPU_DEFAULT_WINDOW_SIZE.height, `${id} height`);
  }
});

test("Restore All puts every changed window back at once", () => {
  let state = allOpen();
  const before = {
    projects: { ...state.windows.projects.position },
    explorer: { ...state.windows.explorer.position },
  };
  state = reduce(
    state,
    { type: "maximize", id: "projects" },
    { type: "snap", id: "explorer", region: "right" },
    { type: "restoreAll" },
  );
  assert.deepEqual(state.windows.projects.position, before.projects);
  assert.deepEqual(state.windows.explorer.position, before.explorer);
  assert.equal(state.windows.projects.mode, "normal");
  assert.equal(state.windows.explorer.snap, null);
});

// ── session compatibility ───────────────────────────────────────────────

test("a session saved before M18 still loads", () => {
  // The exact shape M17 wrote: no size, no snap, no restore. Rejecting
  // it would close every window on the first load after an upgrade.
  const legacy = JSON.stringify({
    windows: Object.fromEntries(
      (["projects", "architect", "memory", "explorer", "settings"] as const).map(
        (id, i) => [
          id,
          { id, open: true, mode: "normal", position: { x: 10 * i, y: 5 * i }, zIndex: i + 1 },
        ],
      ),
    ),
    activeWindowId: "projects",
    nextZIndex: 9,
  });
  const parsed = parseWindowManagerState(legacy);
  assert.ok(parsed, "legacy session was rejected");
  assert.equal(parsed.windows.explorer.size, null);
  assert.equal(parsed.windows.explorer.snap, null);
  assert.equal(parsed.windows.explorer.restore, null);
  assert.deepEqual(parsed.windows.memory.position, { x: 20, y: 10 });
});

test("a snapped, tiled session survives a round trip", () => {
  const state = reduce(
    allOpen(),
    { type: "snap", id: "explorer", region: "bottom" },
    { type: "arrange", layout: "tile", bounds: BOX },
    { type: "maximize", id: "memory" },
  );
  const restored = parseWindowManagerState(serializeWindowManagerState(state));
  assert.ok(restored);
  assert.deepEqual(restored.windows, state.windows);
});

// ── run ─────────────────────────────────────────────────────────────────

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(error as Error).message.split("\n")[0]}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
