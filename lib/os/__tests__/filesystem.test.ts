/**
 * Milestone 17 (Real File Explorer) — tests for the shared filesystem.
 *
 * The sprint's hard requirements are all statements about ONE array being
 * read two ways, so the cases below are written to fail on the specific
 * wrong implementations:
 *
 *  - "the desktop shows what belongs there" fails if the desktop filter
 *    is missing, so the fixture puts a folder inside a folder and
 *    requires it NOT to appear on the desktop.
 *  - "breadcrumbs always match the location" fails if the trail is
 *    accumulated rather than derived, so the case renames an ancestor
 *    after navigating and requires the crumb to have moved.
 *  - "search filters folders, projects and shortcuts" fails if it only
 *    looks in the current folder, so the match is planted three levels
 *    down.
 *  - the cycle guard fails if it only checks the immediate parent, so
 *    the case moves a grandparent into its own grandchild.
 *
 * Run with: npx tsx lib/os/__tests__/filesystem.test.ts
 */
import assert from "node:assert/strict";

import {
  canMoveInto,
  childrenOf,
  descendantIds,
  explorerEntries,
  folderPath,
  locationLabel,
  nextFolderName,
  removeSubtree,
  resolveLocation,
  searchEverything,
  type OsObject,
} from "../filesystem";
import { desktopObjects, nextFreeCell } from "../desktop";
import { createProject } from "../../project/types";
import type { CattipuProject } from "../../project/types";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

const folder = (
  id: string,
  label: string,
  parentId: string | null = null,
  col = 0,
  row = 0,
): OsObject => ({
  id,
  kind: "folder",
  label,
  parentId,
  position: { col, row },
  createdAt: "2026-01-01T00:00:00.000Z",
});

const shortcut = (
  id: string,
  projectId: string,
  parentId: string | null = null,
): OsObject => ({
  id,
  kind: "project-shortcut",
  label: "",
  projectId,
  parentId,
  position: { col: 0, row: 0 },
  createdAt: "2026-01-01T00:00:00.000Z",
});

const project = (id: string, name: string): CattipuProject => ({
  ...createProject({ name }),
  id,
});

/**  root
 *    ├ Work            (w)
 *    │   └ Clients     (c)
 *    │       └ Acme    (a)
 *    ├ Archive         (ar)
 *    └ → Banking Platform  (s1 -> p1)
 */
const tree = (): OsObject[] => [
  folder("w", "Work", null, 0, 0),
  folder("c", "Clients", "w"),
  folder("a", "Acme", "c"),
  folder("ar", "Archive", null, 0, 1),
  shortcut("s1", "p1", null),
];

const projects = () => [
  project("p1", "Banking Platform"),
  project("p2", "AI SaaS Starter"),
];

// ── one array, two views ────────────────────────────────────────────────

test("the desktop shows only root objects, Explorer shows the folder you are in", () => {
  const objects = tree();
  const desk = desktopObjects(objects, projects()).map((o) => o.id);
  // "Clients" and "Acme" are nested. A missing root filter would put them
  // on the desktop, which is the exact defect this asserts against.
  assert.deepEqual(desk.sort(), ["ar", "s1", "w"]);

  const insideWork = childrenOf(objects, "w").map((o) => o.id);
  assert.deepEqual(insideWork, ["c"]);
});

test("a folder created at the root is on the desktop; one created inside is not", () => {
  const objects = tree();
  const atRoot = folder("new1", "Reports", null, 1, 0);
  const nested = folder("new2", "Reports", "w");
  const withBoth = [...objects, atRoot, nested];

  const desk = desktopObjects(withBoth, projects()).map((o) => o.id);
  assert.ok(desk.includes("new1"));
  assert.ok(!desk.includes("new2"));
  // Both are in Explorer, each in its own place — one array, two listings.
  assert.ok(childrenOf(withBoth, null).some((o) => o.id === "new1"));
  assert.ok(childrenOf(withBoth, "w").some((o) => o.id === "new2"));
});

test("a nested object never takes a desktop cell", () => {
  // "Work" holds (0,0) and "Archive" holds (0,1) at the root; "Clients"
  // also carries (0,0) but is nested, so the next free ROOT cell is
  // (0,2). Counting every object would answer (0,2) as well by accident,
  // so the fixture gives the nested folder a cell the root has not used:
  const objects = [
    folder("w", "Work", null, 0, 0),
    folder("c", "Clients", "w", 0, 1),
  ];
  assert.deepEqual(nextFreeCell(objects, 6), { col: 0, row: 1 });
});

// ── breadcrumbs ─────────────────────────────────────────────────────────

test("the breadcrumb trail is the chain of parents, root first", () => {
  assert.deepEqual(
    folderPath(tree(), "a").map((f) => f.label),
    ["Work", "Clients", "Acme"],
  );
  assert.deepEqual(folderPath(tree(), null), []);
});

test("renaming an ancestor changes the breadcrumb immediately", () => {
  // The case that fails against an accumulated trail: navigate first,
  // rename after. A stored array of labels still says "Work".
  const objects = tree().map((o) =>
    o.id === "w" ? { ...o, label: "Consulting" } : o,
  );
  assert.deepEqual(
    folderPath(objects, "a").map((f) => f.label),
    ["Consulting", "Clients", "Acme"],
  );
});

test("a location that no longer exists falls back to the root", () => {
  const objects = removeSubtree(tree(), "w");
  assert.equal(resolveLocation(objects, "a"), null);
  assert.equal(resolveLocation(tree(), "a"), "a");
});

test("a cycle in stored data does not hang the breadcrumb walk", () => {
  // Not reachable through the UI, but reachable through hand-edited
  // localStorage. A naive parent walk loops here forever.
  const objects = [folder("x", "X", "y"), folder("y", "Y", "x")];
  assert.deepEqual(folderPath(objects, "x").map((f) => f.id).sort(), ["x", "y"]);
});

// ── moving ──────────────────────────────────────────────────────────────

test("a folder cannot be moved into its own descendant", () => {
  const objects = tree();
  // Immediate child — a guard that only checks the parent catches this.
  assert.equal(canMoveInto(objects, "w", "c"), false);
  // GRANDCHILD — the case a parent-only guard lets through, detaching
  // Work, Clients and Acme from the root in one move.
  assert.equal(canMoveInto(objects, "w", "a"), false);
  assert.equal(canMoveInto(objects, "w", "w"), false);
});

test("legitimate moves are allowed", () => {
  const objects = tree();
  assert.equal(canMoveInto(objects, "ar", "w"), true);
  assert.equal(canMoveInto(objects, "a", null), true);
  assert.equal(canMoveInto(objects, "s1", "w"), true);
});

test("a move that changes nothing is refused rather than performed", () => {
  const objects = tree();
  assert.equal(canMoveInto(objects, "c", "w"), false, "already in Work");
  assert.equal(canMoveInto(objects, "w", null), false, "already at the root");
  assert.equal(canMoveInto(objects, "w", "missing"), false, "no such folder");
});

test("deleting a folder deletes what is inside it, and nothing else", () => {
  const after = removeSubtree(tree(), "w");
  assert.deepEqual(after.map((o) => o.id).sort(), ["ar", "s1"]);
  // The shortcut and the sibling folder survive; only the subtree goes.
  assert.equal(descendantIds(tree(), "w").sort().join(), ["a", "c"].sort().join());
});

test("deleting a shortcut removes exactly one object", () => {
  const after = removeSubtree(tree(), "s1");
  assert.equal(after.length, tree().length - 1);
  assert.ok(!after.some((o) => o.id === "s1"));
});

// ── listings ────────────────────────────────────────────────────────────

test("the root lists folders, shortcuts and projects", () => {
  const entries = explorerEntries(tree(), projects(), null);
  const kinds = new Set(entries.map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ["folder", "project", "project-shortcut"]);
  assert.equal(entries.filter((e) => e.kind === "project").length, 2);
});

test("a folder lists its own children and no projects", () => {
  const entries = explorerEntries(tree(), projects(), "w");
  assert.deepEqual(entries.map((e) => e.label), ["Clients"]);
  assert.ok(!entries.some((e) => e.kind === "project"));
});

test("a shortcut in a listing carries the project's current name", () => {
  const renamed = [project("p1", "Ledger Core"), projects()[1]];
  const entry = explorerEntries(tree(), renamed, null).find((e) => e.id === "s1");
  assert.equal(entry?.label, "Ledger Core");
});

test("a shortcut to a deleted project is not listed", () => {
  const entries = explorerEntries(tree(), [projects()[1]], null);
  assert.ok(!entries.some((e) => e.id === "s1"));
});

test("folders sort before shortcuts, each alphabetically", () => {
  const objects = [
    folder("f2", "Zulu"),
    folder("f1", "Alpha"),
    shortcut("s1", "p1"),
  ];
  const listed = childrenOf(objects, null, projects()).map((o) => o.id);
  assert.deepEqual(listed, ["f1", "f2", "s1"]);
});

// ── search ──────────────────────────────────────────────────────────────

test("search finds a folder nested three levels down", () => {
  // The whole point: standing at the root, "Acme" is not in the current
  // listing. A search scoped to the current folder answers "no results",
  // which is worse than no search — it says something false.
  const hits = searchEverything(tree(), projects(), "acme");
  assert.deepEqual(hits.map((h) => h.label), ["Acme"]);
  assert.equal(hits[0].location, "CATTIPU OS / Work / Clients");
});

test("search covers all three kinds", () => {
  const objects = [...tree(), folder("bk", "Banking Notes", "w")];
  const hits = searchEverything(objects, projects(), "bank");
  const kinds = hits.map((h) => h.kind).sort();
  assert.deepEqual(kinds, ["folder", "project", "project-shortcut"]);
});

test("search is case-insensitive and matches substrings", () => {
  assert.equal(searchEverything(tree(), projects(), "WORK").length, 1);
  assert.equal(searchEverything(tree(), projects(), "lient").length, 1);
});

test("a prefix match outranks a mid-word match", () => {
  // The two labels are chosen so ALPHABETICAL order contradicts the
  // answer: "Archive Backup" sorts first but matches at index 8, while
  // "Backup" matches at 0. A flat ranking that falls back to the label
  // returns them the other way round.
  //
  // (The first version of this test used "Database Archive" and "Banking
  // Notes", where alphabetical order happened to agree with rank — it
  // passed against a flat ranking and proved nothing.)
  const objects = [folder("f1", "Archive Backup"), folder("f2", "Backup")];
  const hits = searchEverything(objects, [], "ba");
  assert.deepEqual(hits.map((h) => h.label), ["Backup", "Archive Backup"]);
});

test("an empty query returns nothing, not everything", () => {
  // Returning the whole filesystem for "" is how a search box that has
  // been cleared silently replaces the folder you were looking at.
  assert.deepEqual(searchEverything(tree(), projects(), ""), []);
  assert.deepEqual(searchEverything(tree(), projects(), "   "), []);
});

test("search reports where each hit lives", () => {
  const hits = searchEverything(tree(), projects(), "clients");
  assert.equal(hits[0].location, "CATTIPU OS / Work");
  assert.equal(locationLabel(tree(), null), "CATTIPU OS");
});

// ── naming ──────────────────────────────────────────────────────────────

test("folder numbering is per-parent, not global", () => {
  // "Untitled Folder" already exists at the root. Inside Work there is
  // none, so the new one there must NOT be numbered — global uniqueness
  // would name it "Untitled Folder 2" for a reason no one can see.
  const objects = [folder("u1", "Untitled Folder", null)];
  assert.equal(nextFolderName(objects, "w"), "Untitled Folder");
  assert.equal(nextFolderName(objects, null), "Untitled Folder 2");
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
