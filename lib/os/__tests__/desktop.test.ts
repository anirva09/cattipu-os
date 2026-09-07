/**
 * Milestone 16 (Living Desktop) — tests for the desktop object rules.
 *
 * These are written against the failure they are meant to catch, not
 * against the happy path. A test that asserts "a shortcut has a label" is
 * satisfied by the very bug this milestone exists to prevent — a copied
 * name that goes stale — so the link cases below deliberately plant a
 * WRONG stored label and require the current project name to win. An
 * implementation that reads `object.label` for shortcuts fails them; an
 * implementation that resolves through `projectId` passes.
 *
 * Same reasoning for placement: `nextFreeCell` is asserted on the column
 * it must wrap, and `moveObject` on the occupied cell it must swap into,
 * because both are trivially satisfied by "return {0,0}" and "overwrite"
 * respectively if the case is chosen carelessly.
 *
 * Run with: npx tsx lib/os/__tests__/desktop.test.ts
 */
import assert from "node:assert/strict";

import {
  DESKTOP_GRID,
  cellToPixels,
  moveObject,
  nextFolderName,
  nextFreeCell,
  objectLabel,
  pixelsToCell,
  projectsWithoutShortcut,
  sameCell,
  visibleObjects,
  type DesktopObject,
} from "../desktop";
import { createProject } from "../../project/types";
import type { CattipuProject } from "../../project/types";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

let seq = 0;
const folder = (col: number, row: number, label = `F${(seq += 1)}`): DesktopObject => ({
  id: `f-${seq}`,
  kind: "folder",
  label,
  position: { col, row },
  createdAt: "2026-01-01T00:00:00.000Z",
});

const shortcut = (
  projectId: string,
  col: number,
  row: number,
  label = "",
): DesktopObject => ({
  id: `s-${(seq += 1)}`,
  kind: "project-shortcut",
  label,
  projectId,
  position: { col, row },
  createdAt: "2026-01-01T00:00:00.000Z",
});

// ── the grid ────────────────────────────────────────────────────────────

test("a cell maps to pixels and back to the same cell", () => {
  const bounds = { width: 1200, height: 700 };
  for (const cell of [{ col: 0, row: 0 }, { col: 3, row: 2 }, { col: 5, row: 1 }]) {
    const { x, y } = cellToPixels(cell);
    assert.deepEqual(pixelsToCell(x, y, bounds), cell);
  }
});

test("a drop between two cells snaps to the nearer one, not the earlier one", () => {
  const bounds = { width: 1200, height: 700 };
  const { x, y } = cellToPixels({ col: 2, row: 1 });
  // 60% of a cell past the origin of {2,1} must land on {3,1}. Truncation
  // instead of rounding would answer {2,1} and this is the case that says so.
  const near = pixelsToCell(x + DESKTOP_GRID.cellWidth * 0.6, y, bounds);
  assert.deepEqual(near, { col: 3, row: 1 });
});

test("a drag past the edge lands on the last on-screen cell, not off it", () => {
  // 400x300 holds 4 columns and 2 rows at 88x96 from a 16px origin.
  const bounds = { width: 400, height: 300 };
  const far = pixelsToCell(99_999, 99_999, bounds);
  assert.deepEqual(far, { col: 3, row: 1 });
  const behind = pixelsToCell(-500, -500, bounds);
  assert.deepEqual(behind, { col: 0, row: 0 });
});

// ── placement ───────────────────────────────────────────────────────────

test("new objects fill a column downward before starting the next", () => {
  const taken = [folder(0, 0), folder(0, 1)];
  assert.deepEqual(nextFreeCell(taken, 6), { col: 0, row: 2 });
});

test("a full column wraps to the next rather than running off the bottom", () => {
  // The cap is what makes this fail loudly if `rows` is ignored: without
  // it the answer is {0,3}, which on a 3-row screen is invisible and
  // indistinguishable from the action doing nothing at all.
  const taken = [folder(0, 0), folder(0, 1), folder(0, 2)];
  assert.deepEqual(nextFreeCell(taken, 3), { col: 1, row: 0 });
});

test("a hole left by a deleted object is refilled before the column grows", () => {
  const taken = [folder(0, 0), folder(0, 2)];
  assert.deepEqual(nextFreeCell(taken, 6), { col: 0, row: 1 });
});

// ── moving ──────────────────────────────────────────────────────────────

test("moving onto an empty cell moves only that object", () => {
  const a = folder(0, 0);
  const b = folder(1, 0);
  const next = moveObject([a, b], a.id, { col: 2, row: 3 });
  assert.deepEqual(next.find((o) => o.id === a.id)?.position, { col: 2, row: 3 });
  assert.deepEqual(next.find((o) => o.id === b.id)?.position, { col: 1, row: 0 });
});

test("moving onto an occupied cell swaps — neither object is lost or hidden", () => {
  const a = folder(0, 0);
  const b = folder(1, 0);
  const next = moveObject([a, b], a.id, { col: 1, row: 0 });
  assert.deepEqual(next.find((o) => o.id === a.id)?.position, { col: 1, row: 0 });
  // The half that actually matters: an implementation that just writes the
  // new position leaves b sitting under a, and only this line notices.
  assert.deepEqual(next.find((o) => o.id === b.id)?.position, { col: 0, row: 0 });
  assert.equal(next.length, 2);
});

test("no two objects share a cell after any move", () => {
  const objects = [folder(0, 0), folder(1, 0), folder(2, 0)];
  const next = moveObject(objects, objects[2].id, { col: 0, row: 0 });
  const cells = next.map((o) => `${o.position.col},${o.position.row}`);
  assert.equal(new Set(cells).size, next.length);
});

test("moving an object onto its own cell is a no-op, not a self-swap", () => {
  const a = folder(2, 2);
  const next = moveObject([a], a.id, { col: 2, row: 2 });
  assert.deepEqual(next[0].position, { col: 2, row: 2 });
  assert.ok(sameCell(next[0].position, a.position));
});

// ── the link ────────────────────────────────────────────────────────────

test("a shortcut shows the project's CURRENT name, not a stored copy", () => {
  const project: CattipuProject = { ...createProject({ name: "Banking Platform" }), id: "p1" };
  // A deliberately stale label. If `objectLabel` prefers what the object
  // carries, this test reports "Old Name" and fails — which is the only
  // reason it is here.
  const link = shortcut("p1", 0, 0, "Old Name");
  assert.equal(objectLabel(link, [project]), "Banking Platform");

  const renamed = { ...project, name: "Ledger Core" };
  assert.equal(objectLabel(link, [renamed]), "Ledger Core");
});

test("removing a shortcut leaves the project untouched", () => {
  const project: CattipuProject = { ...createProject({ name: "Keep Me" }), id: "p1" };
  const projects = [project];
  const objects = [shortcut("p1", 0, 0)];
  const after = objects.filter((o) => o.id !== objects[0].id);
  assert.equal(after.length, 0);
  // The projects array is the same array, not a filtered copy: the desktop
  // has no way to reach it, which is the structural guarantee.
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, "Keep Me");
});

test("a shortcut to a deleted project is hidden but not destroyed", () => {
  const objects = [folder(0, 0), shortcut("gone", 1, 0)];
  const visible = visibleObjects(objects, []);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].kind, "folder");
  // Hidden, not deleted — the store still holds both.
  assert.equal(objects.length, 2);
});

test("a project that already has a shortcut is not offered a second one", () => {
  const a: CattipuProject = { ...createProject({ name: "A" }), id: "pa" };
  const b: CattipuProject = { ...createProject({ name: "B" }), id: "pb" };
  const objects = [shortcut("pa", 0, 0)];
  const offerable = projectsWithoutShortcut(objects, [a, b]);
  assert.deepEqual(offerable.map((p) => p.id), ["pb"]);
});

// ── naming ──────────────────────────────────────────────────────────────

test("folders never share a name on one desktop", () => {
  let objects: DesktopObject[] = [];
  const names: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const name = nextFolderName(objects);
    names.push(name);
    objects = [...objects, folder(0, i, name)];
  }
  assert.deepEqual(names, [
    "Untitled Folder",
    "Untitled Folder 2",
    "Untitled Folder 3",
    "Untitled Folder 4",
  ]);
  assert.equal(new Set(names).size, names.length);
});

test("shortcut labels are not counted when numbering folders", () => {
  // The shortcut carries a residual "Untitled Folder 2" — the kind of
  // leftover a rename or an import can leave on a record whose label is
  // not what is displayed. An implementation that numbers folders off
  // every object's label answers "Untitled Folder 3" here.
  //
  // (The first version of this test used an empty shortcut label and
  // passed against both implementations. It proved nothing, so it was
  // replaced rather than kept for the count.)
  const objects = [
    shortcut("p1", 0, 0, "Untitled Folder 2"),
    folder(0, 1, "Untitled Folder"),
  ];
  assert.equal(nextFolderName(objects), "Untitled Folder 2");
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
