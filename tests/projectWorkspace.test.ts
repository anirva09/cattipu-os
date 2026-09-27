/**
 * MVP-02 (Project Filesystem + Tree) — the Project → workspace link.
 *
 * The Project store decides WHICH project is active; the filesystem
 * decides WHAT its workspace holds. These cases are written to fail on
 * the wrong implementations:
 *
 *  - "one workspace per project" fails if creation is not idempotent, so
 *    the case provisions the same project twice.
 *  - "the tree follows the active project" fails if Explorer still lists
 *    the whole OS root, so the fixture holds two workspaces and a plain
 *    desktop folder and requires only the active one's folders.
 *  - "a missing workspace is reported" fails if selection silently creates
 *    folders or falls back to demo content, so the project has none.
 *  - "survives a reload" fails if the link or the selection is not
 *    persisted, so the store module is evaluated twice over one storage.
 *
 * Run with: npx tsx tests/projectWorkspace.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";

import type { OsObject } from "@/lib/os/filesystem";
import { objectLabel } from "@/lib/os/filesystem";
import { activeProject } from "@/lib/os/projects";
import { createProject, type CattipuProject } from "@/lib/project/types";
import { projectWorkspaceService } from "@/lib/services/filesystem/projectWorkspaceService";

// The repository compiles JSX with the classic runtime; stylesheets and
// PixelForge SVG imports cannot load under Node and are stubbed.
(globalThis as Record<string, unknown>).React = React;
const loaders = require.extensions as unknown as Record<string, (m: { exports: unknown }) => void>;
loaders[".css"] = (m) => {
  m.exports = {};
};
loaders[".svg"] = (m) => {
  m.exports = { __esModule: true, default: () => null };
};

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

const AT = "2026-09-01T00:00:00.000Z";

const project = (id: string, name: string, lastOpenedAt: string | null = null): CattipuProject => ({
  ...createProject({ name }),
  id,
  lastOpenedAt,
});

const provision = (
  objects: readonly OsObject[],
  projectId: string,
  sections: readonly string[] = [],
  id = `ws-${projectId}`,
) =>
  projectWorkspaceService.provision(
    objects,
    { projectId, fallbackLabel: `${projectId} fallback`, sections },
    { id, createdAt: AT, position: { col: 0, row: 0 } },
  );

// ── service rules ──────────────────────────────────────────────────────

test("a workspace is one root folder linked to its project by id", () => {
  const { objects, workspace, created } = provision([], "p1", ["Screens", "API"]);
  assert.equal(created, true);
  assert.equal(workspace.kind, "folder");
  assert.equal(workspace.parentId, null);
  assert.equal(workspace.projectId, "p1");
  const children = objects.filter((o) => o.parentId === workspace.id);
  assert.deepEqual(
    children.map((o) => [o.kind, o.label]),
    [["folder", "Screens"], ["folder", "API"], ["project-shortcut", ""]],
  );
});

test("the workspace takes the project's live name, not a stored copy", () => {
  const { workspace } = provision([], "p1");
  assert.equal(objectLabel(workspace, [project("p1", "Renamed Live")]), "Renamed Live");
});

test("a freeform project gets an empty workspace — no invented folders", () => {
  const { objects, workspace } = provision([], "p1");
  const folders = objects.filter((o) => o.parentId === workspace.id && o.kind === "folder");
  assert.equal(folders.length, 0);
});

test("provisioning is idempotent: one workspace per project", () => {
  const first = provision([], "p1", ["Screens"]);
  const second = provision(first.objects, "p1", ["Other"], "ws-second");
  assert.equal(second.created, false);
  assert.equal(second.workspace.id, first.workspace.id);
  assert.deepEqual(second.objects, first.objects);
});

test("a shortcut to a project elsewhere is not mistaken for its workspace", () => {
  const shortcut: OsObject = {
    id: "sc", kind: "project-shortcut", label: "", projectId: "p1",
    parentId: null, position: { col: 0, row: 0 }, createdAt: AT,
  };
  const { created } = provision([shortcut], "p1");
  assert.equal(created, true);
});

test("resolve reports no-project, missing and ready — and creates nothing", () => {
  const { objects } = provision([], "p1");
  assert.deepEqual(projectWorkspaceService.resolve(objects, null), { kind: "no-project" });
  const orphan = project("p2", "No Workspace");
  const missing = projectWorkspaceService.resolve(objects, orphan);
  assert.equal(missing.kind, "missing");
  const ready = projectWorkspaceService.resolve(objects, project("p1", "One"));
  assert.equal(ready.kind, "ready");
  assert.equal(ready.kind === "ready" && ready.workspace.projectId, "p1");
  assert.equal(objects.length, 2, "resolving must not write objects");
});

test("switching the active project switches the resolved workspace", () => {
  const a = provision([], "pa", ["A-only"]);
  const b = provision(a.objects, "pb", ["B-only"]);
  const projects = [project("pa", "A", "2026-09-02T00:00:00.000Z"), project("pb", "B", "2026-09-01T00:00:00.000Z")];
  const first = projectWorkspaceService.resolve(b.objects, activeProject(projects));
  assert.equal(first.kind === "ready" && first.workspace.id, a.workspace.id);
  projects[1] = { ...projects[1], lastOpenedAt: "2026-09-03T00:00:00.000Z" };
  const second = projectWorkspaceService.resolve(b.objects, activeProject(projects));
  assert.equal(second.kind === "ready" && second.workspace.id, b.workspace.id);
});

test("selection inside the workspace is kept; outside it snaps to the workspace root", () => {
  const a = provision([], "pa", ["Screens"]);
  const b = provision(a.objects, "pb");
  const screens = `${a.workspace.id}-s0`;
  const readyA = projectWorkspaceService.resolve(b.objects, project("pa", "A", AT));
  const readyB = projectWorkspaceService.resolve(b.objects, project("pb", "B", AT));
  assert.equal(projectWorkspaceService.reconcileSelection(b.objects, screens, readyA), screens);
  assert.equal(projectWorkspaceService.reconcileSelection(b.objects, screens, readyB), b.workspace.id);
  assert.equal(projectWorkspaceService.reconcileSelection(b.objects, null, readyA), a.workspace.id);
});

test("a project with no workspace never shows another project's files", () => {
  const a = provision([], "pa", ["Screens"]);
  const missing = projectWorkspaceService.resolve(a.objects, project("pz", "Orphan", AT));
  assert.equal(projectWorkspaceService.reconcileSelection(a.objects, `${a.workspace.id}-s0`, missing), null);
});

test("with no project opened the selection is left where it is", () => {
  const a = provision([], "pa", ["Screens"]);
  const none = projectWorkspaceService.resolve(a.objects, null);
  assert.equal(projectWorkspaceService.reconcileSelection(a.objects, `${a.workspace.id}-s0`, none), `${a.workspace.id}-s0`);
});

// ── store: persistence and reload ─────────────────────────────────────

type FilesystemStoreModule = typeof import("@/store/useFilesystemStore");

function memoryStorage(data: Map<string, string>): Storage {
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
  };
}

/** A fresh store module over `data`, which is what a page reload is. */
function withFreshStore(data: Map<string, string>, run: (store: FilesystemStoreModule["useFilesystemStore"]) => void) {
  const g = globalThis as Record<string, unknown>;
  const had = {
    localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"),
    window: Object.getOwnPropertyDescriptor(g, "window"),
  };
  Object.defineProperty(g, "localStorage", { value: memoryStorage(data), configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  try {
    for (const key of Object.keys(require.cache)) {
      if (/[\\/]store[\\/]useFilesystemStore\.ts$/.test(key)) delete require.cache[key];
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    run((require("@/store/useFilesystemStore") as FilesystemStoreModule).useFilesystemStore);
  } finally {
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
}

test("the store creates one workspace per project and persists it", () => {
  const data = new Map<string, string>();
  withFreshStore(data, (store) => {
    const first = store.getState().createProjectWorkspace("p1", "One", ["Screens"]);
    const again = store.getState().createProjectWorkspace("p1", "One", ["Screens"]);
    assert.equal(again.id, first.id);
    assert.equal(store.getState().objects.filter((o) => o.parentId === null).length, 1);
    assert.match(data.get("cattipu-desktop") ?? "", /"projectId":"p1"/);
  });
});

test("the project → workspace link and the tree selection survive a reload", () => {
  const data = new Map<string, string>();
  let workspaceId = "";
  let screensId = "";
  withFreshStore(data, (store) => {
    workspaceId = store.getState().createProjectWorkspace("p1", "One", ["Screens"]).id;
    screensId = `${workspaceId}-s0`;
    store.getState().selectObject(screensId);
  });
  withFreshStore(data, (store) => {
    const state = store.getState();
    const restored = projectWorkspaceService.resolve(state.objects, project("p1", "One", AT));
    assert.equal(restored.kind === "ready" && restored.workspace.id, workspaceId);
    assert.equal(state.selectedObjectId, screensId);
  });
});

test("selection is filesystem-owned: unknown ids are refused, removed ones are cleared", () => {
  withFreshStore(new Map(), (store) => {
    const ws = store.getState().createProjectWorkspace("p1", "One", ["Screens"]);
    store.getState().selectObject("does-not-exist");
    assert.equal(store.getState().selectedObjectId, null);
    store.getState().selectObject(`${ws.id}-s0`);
    store.getState().removeObject(ws.id);
    assert.equal(store.getState().selectedObjectId, null);
  });
});

test("a v3 record migrates with its objects and no selection; a dangling selection is dropped", () => {
  const folder: OsObject = {
    id: "f1", kind: "folder", label: "Kept", parentId: null,
    position: { col: 0, row: 0 }, createdAt: AT,
  };
  const v3 = new Map([["cattipu-desktop", JSON.stringify({ state: { objects: [folder] }, version: 3 })]]);
  withFreshStore(v3, (store) => {
    assert.deepEqual(store.getState().objects, [folder]);
    assert.equal(store.getState().selectedObjectId, null);
  });
  const dangling = new Map([[
    "cattipu-desktop",
    JSON.stringify({ state: { objects: [folder], selectedObjectId: "gone" }, version: 3 }),
  ]]);
  withFreshStore(dangling, (store) => assert.equal(store.getState().selectedObjectId, null));
});

// ── Explorer: the tree follows the active project ─────────────────────
//
// Zustand serves a store's initial state as the server snapshot, so a
// static render cannot show seeded state. The tree is derived by the pure
// functions Explorer renders from, and those are exercised here against
// state produced by the real service.

type ExplorerModule = typeof import("@/components/Explorer/ExplorerApp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { explorerTreeNodes, explorerTreeSelection } = require("@/components/Explorer/ExplorerApp") as ExplorerModule;

type Node = ReturnType<typeof explorerTreeNodes>[number];
const labels = (nodes: readonly Node[]): string[] =>
  nodes.flatMap((n) => [n.label, ...labels(n.children ?? [])]);

function fixture() {
  const a = provision([], "pa", ["Alpha Screens"]);
  const b = provision(a.objects, "pb", ["Beta API"]);
  const loose: OsObject = {
    id: "loose", kind: "folder", label: "Loose Desktop Folder", parentId: null,
    position: { col: 3, row: 0 }, createdAt: AT,
  };
  return { objects: [...b.objects, loose], a: a.workspace.id, b: b.workspace.id };
}

const treeFor = (objects: readonly OsObject[], projects: CattipuProject[]) =>
  explorerTreeNodes(
    projectWorkspaceService.resolve(objects, activeProject(projects)),
    objects,
    projects,
    new Set(),
  );

test("the tree shows only the active project's workspace, under its live name", () => {
  const { objects, a } = fixture();
  const tree = treeFor(objects, [
    project("pa", "Alpha", "2026-09-02T00:00:00.000Z"),
    project("pb", "Beta", "2026-09-01T00:00:00.000Z"),
  ]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].id, a);
  assert.deepEqual(labels(tree), ["Alpha", "Alpha Screens"]);
});

test("switching projects switches the tree", () => {
  const { objects, b } = fixture();
  const tree = treeFor(objects, [
    project("pa", "Alpha", "2026-09-01T00:00:00.000Z"),
    project("pb", "Beta", "2026-09-02T00:00:00.000Z"),
  ]);
  assert.equal(tree[0].id, b);
  assert.deepEqual(labels(tree), ["Beta", "Beta API"]);
});

test("an empty workspace renders its root alone", () => {
  const { objects } = provision([], "pe");
  const tree = treeFor(objects, [project("pe", "Empty One", AT)]);
  assert.deepEqual(labels(tree), ["Empty One"]);
  assert.equal(tree[0].children, undefined);
});

test("a project without a workspace gets no borrowed folders, and Explorer says so", () => {
  const { objects } = fixture();
  assert.deepEqual(treeFor(objects, [project("pz", "Orphan", AT)]), []);
  const source = readFileSync(join(process.cwd(), "components/Explorer/ExplorerApp.tsx"), "utf8");
  assert.match(source, /workspace\.kind === "missing" \? \(/);
  assert.match(source, /has no workspace\./);
});

test("with nothing opened the tree is the whole OS, as before MVP-02", () => {
  const { objects } = fixture();
  const tree = treeFor(objects, [project("pa", "Alpha"), project("pb", "Beta")]);
  assert.equal(tree[0].label, "CATTIPU OS");
  assert.ok(labels(tree).includes("Loose Desktop Folder"));
});

test("the tree highlights the selection only inside the active workspace", () => {
  const { objects, a } = fixture();
  const ready = projectWorkspaceService.resolve(objects, project("pa", "Alpha", AT));
  assert.equal(explorerTreeSelection(ready, objects, `${a}-s0`), `${a}-s0`);
  assert.equal(explorerTreeSelection(ready, objects, "loose"), undefined);
  assert.equal(explorerTreeSelection(ready, objects, null), undefined);
  const none = projectWorkspaceService.resolve(objects, null);
  assert.equal(explorerTreeSelection(none, objects, null), "__root__");
});

// ── runner ─────────────────────────────────────────────────────────────

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  }
}
console.log(`${tests.length - failed}/${tests.length} passed`);
if (failed > 0) process.exit(1);
