/**
 * MVP-03 (Architect → Canvas) — ownership and behaviour.
 *
 * Architect owns what a project's system IS (`project.architect.data`);
 * Canvas owns only where each node is DRAWN (`project.canvas.layout`).
 * The cases are written to fail on the wrong implementations:
 *
 *  - isolation fails if Architect keeps one global workspace, so an edit
 *    made in A is checked against B and A is re-entered after B;
 *  - "generation lands in the project that asked" fails if a result can
 *    outlive a project switch, so the switch happens mid-generation;
 *  - the projection fails if Canvas copies architecture, so a rename made
 *    in Architect must reach Canvas with no Canvas write;
 *  - the layout fails if it is random or clock-driven, so it is computed
 *    under two different clocks and random sources;
 *  - persistence fails if either slot is not stored, so the project store
 *    module is evaluated again over the same storage.
 *
 * Run with: npx tsx tests/architectCanvas.test.ts
 */
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { GeneratedArchitecture } from "@/lib/ai/types";
import { layoutAppNodes } from "@/lib/ai/layout";
import { pickTemplate } from "@/lib/ai/seedTemplates";
import { activeProject } from "@/lib/os/projects";
import { migrateProject } from "@/lib/project/migrate";
import { PROJECT_SCHEMA_VERSION, createProject, type CattipuProject } from "@/lib/project/types";
import {
  addArchitectNode,
  architectService,
  architectureEditor,
  createArchitectureEditor,
  createEmptyArchitecture,
  updateArchitectNode,
} from "@/lib/services/architect/architectService";
import { CANVAS_GRID, canvasService } from "@/lib/services/canvas/canvasService";
import {
  CATTIPU_WINDOW_IDS,
  CATTIPU_WINDOW_MIN_SIZE,
  createInitialWindowManagerState,
  parseWindowManagerState,
} from "@/components/WindowManager/windowManager.reducer";
import { useArchitectStore } from "@/store/useArchitectStore";
import { useProjectStore } from "@/store/useProjectStore";

(globalThis as Record<string, unknown>).React = React;
const loaders = require.extensions as unknown as Record<string, (m: { exports: unknown }) => void>;
loaders[".css"] = (m) => {
  m.exports = {};
};
loaders[".svg"] = (m) => {
  m.exports = { __esModule: true, default: () => null };
};

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

// ── fixtures ───────────────────────────────────────────────────────────

function architecture(prompt: string): GeneratedArchitecture {
  const raw = pickTemplate(prompt);
  return { ...raw, nodes: layoutAppNodes(raw.nodes) };
}

const ARCH_A = architecture("Build a banking platform with payments and fraud detection.");
/** B's own ids: the seed templates reuse node ids, and two projects that
 *  happen to share ids would hide a leak rather than expose it. */
const ARCH_B: GeneratedArchitecture = (() => {
  const raw = architecture("Build an AI SaaS starter with billing and teams.");
  const id = (value: string) => `b-${value}`;
  return {
    ...raw,
    nodes: raw.nodes.map((n) => ({ ...n, id: id(n.id) })),
    edges: raw.edges.map((e) => ({ ...e, id: id(e.id), source: id(e.source), target: id(e.target) })),
  };
})();

function project(id: string, name: string, opened: string | null, data: GeneratedArchitecture | null = null): CattipuProject {
  return { ...createProject({ name, architect: { data } }), id, lastOpenedAt: opened };
}

const EARLY = "2026-09-01T00:00:00.000Z";
const LATE = "2026-09-02T00:00:00.000Z";

/** A = has architecture, B = none. `active` decides which was opened last. */
function seed(active: "A" | "B" | null) {
  useProjectStore.setState({
    projects: [
      project("pa", "Alpha", active === "A" ? LATE : active === "B" ? EARLY : null, structuredClone(ARCH_A)),
      project("pb", "Beta", active === "B" ? LATE : active === "A" ? EARLY : null),
    ],
  });
  useArchitectStore.getState().reset();
  useArchitectStore.setState({ runId: useArchitectStore.getState().runId + 1 });
}

const byId = (id: string) => useProjectStore.getState().projects.find((p) => p.id === id) as CattipuProject;
const active = () => activeProject(useProjectStore.getState().projects);
const architect = () => useArchitectStore.getState();

// ── A. Architect follows the active project ────────────────────────────

test("A: Architect shows A, then B's empty state, then restores A", () => {
  seed("A");
  architect().syncToProject(active());
  assert.equal(architect().linkedProjectId, "pa");
  assert.equal(architect().data?.projectName, ARCH_A.projectName);
  assert.equal(architect().status, "ready");

  useProjectStore.getState().openProject("pb");
  architect().syncToProject(active());
  assert.equal(architect().linkedProjectId, "pb");
  assert.equal(architect().data, null, "B must not show A's architecture");
  assert.deepEqual(architectService.resolve(active()).kind, "empty");

  useProjectStore.getState().openProject("pa");
  architect().syncToProject(active());
  assert.equal(architect().data?.projectName, ARCH_A.projectName);
});

test("A: an edit made in A is written to A and never to B", () => {
  seed("A");
  architect().syncToProject(active());
  const node = ARCH_A.nodes[0];
  architect().renameNode(node.id, "Renamed In A");
  assert.equal(byId("pa").architect.data?.nodes[0].label, "Renamed In A");
  assert.equal(byId("pb").architect.data, null);
});

test("A: staying on the same project does not reload the workspace", () => {
  seed("A");
  architect().syncToProject(active());
  architect().selectNode(ARCH_A.nodes[1].id);
  architect().syncToProject(active());
  assert.equal(architect().selectedNodeId, ARCH_A.nodes[1].id);
});

// ── B. Architect persistence ───────────────────────────────────────────

test("B: generating inside an empty project writes that project's architecture", async () => {
  seed("B");
  architect().syncToProject(active());
  await architect().generate("Build a CRM for small teams.");
  assert.equal(architect().linkedProjectId, "pb");
  assert.ok(byId("pb").architect.data, "B now has an architecture");
  assert.equal(byId("pb").architect.data?.prompt, "Build a CRM for small teams.");
  assert.equal(useProjectStore.getState().projects.length, 2, "no new project is created");
});

test("B: a generation cannot land in a project the user switched to", async () => {
  seed("B");
  architect().syncToProject(active());
  const pending = architect().generate("Build a CRM for small teams.");
  useProjectStore.getState().openProject("pa");
  architect().syncToProject(active());
  await pending;
  assert.equal(byId("pb").architect.data, null, "the abandoned result is dropped");
  assert.equal(architect().data?.projectName, ARCH_A.projectName, "A is untouched");
});

// ── C / E / F. Canvas projection ───────────────────────────────────────

test("C: Canvas shows each project's own architecture and none of the other's", () => {
  seed("A");
  const a = canvasService.view(active());
  assert.equal(a.kind, "ready");
  assert.deepEqual(a.kind === "ready" && a.nodes.map((n) => n.nodeId), ARCH_A.nodes.map((n) => n.id));
  useProjectStore.getState().openProject("pb");
  assert.equal(canvasService.view(active()).kind, "no-architecture");
});

test("C: a placement in A leaves B's canvas untouched", () => {
  useProjectStore.setState({
    projects: [
      project("pa", "Alpha", LATE, structuredClone(ARCH_A)),
      project("pb", "Beta", EARLY, structuredClone(ARCH_B)),
    ],
  });
  assert.equal(useProjectStore.getState().placeCanvasNode("pa", { nodeId: ARCH_A.nodes[0].id, x: 400, y: 200 }), true);
  assert.equal(byId("pa").canvas.layout.length, 1);
  assert.deepEqual(byId("pb").canvas.layout, []);
  // A's node id is not a node of B, so it cannot be placed there.
  assert.equal(useProjectStore.getState().placeCanvasNode("pb", { nodeId: ARCH_A.nodes[0].id, x: 8, y: 8 }), false);
});

test("E: Canvas reads identity from Architect and stores only positions", () => {
  seed("A");
  const view = canvasService.view(active());
  assert.equal(view.kind, "ready");
  if (view.kind !== "ready") return;
  assert.deepEqual(
    view.nodes.map((n) => [n.nodeId, n.label, n.kind]),
    ARCH_A.nodes.map((n) => [n.id, n.label, n.kind]),
  );
  assert.equal(view.edges.length, ARCH_A.edges.length);
  // A rename in Architect reaches Canvas with no Canvas write at all.
  useArchitectStore.getState().syncToProject(active());
  useArchitectStore.getState().renameNode(ARCH_A.nodes[0].id, "Live Rename");
  const after = canvasService.view(active());
  assert.equal(after.kind === "ready" && after.nodes[0].label, "Live Rename");
  assert.deepEqual(byId("pa").canvas.layout, []);
  // The stored placement is position only.
  useProjectStore.getState().placeCanvasNode("pa", { nodeId: ARCH_A.nodes[0].id, x: 40, y: 40 });
  assert.deepEqual(Object.keys(byId("pa").canvas.layout[0]).sort(), ["nodeId", "x", "y"]);
});

test("E: a node deleted in Architect leaves Canvas, and its placement is dropped", () => {
  seed("A");
  const gone = ARCH_A.nodes[0].id;
  const keep = ARCH_A.nodes[1].id;
  useProjectStore.getState().placeCanvasNode("pa", { nodeId: gone, x: 80, y: 80 });
  architect().syncToProject(active());
  architect().deleteNode(gone);
  const view = canvasService.view(active());
  assert.ok(view.kind === "ready" && !view.nodes.some((n) => n.nodeId === gone));
  useProjectStore.getState().placeCanvasNode("pa", { nodeId: keep, x: 96, y: 96 });
  assert.deepEqual(byId("pa").canvas.layout.map((p) => p.nodeId), [keep]);
});

test("F: the initial layout is deterministic, on the 8px grid, and never overlaps", () => {
  const run = (clock: number, random: number) => {
    const realNow = Date.now;
    const realRandom = Math.random;
    Date.now = () => clock;
    Math.random = () => random;
    try {
      return [...canvasService.defaultLayout(ARCH_A)];
    } finally {
      Date.now = realNow;
      Math.random = realRandom;
    }
  };
  const first = run(1, 0.1);
  assert.deepEqual(run(9_999_999_999, 0.9), first);
  assert.equal(first.length, ARCH_A.nodes.length);
  for (const [, p] of first) {
    assert.equal(p.x % CANVAS_GRID, 0);
    assert.equal(p.y % CANVAS_GRID, 0);
  }
  assert.equal(new Set(first.map(([, p]) => `${p.x},${p.y}`)).size, first.length);
});

test("F: a placement snaps to the grid and stays on the sheet", () => {
  const id = ARCH_A.nodes[0].id;
  const canvas = createProject({ name: "x" }).canvas;
  const placed = canvasService.place(canvas, ARCH_A, { nodeId: id, x: 13.7, y: -40 });
  assert.deepEqual(placed?.layout, [{ nodeId: id, x: 16, y: 0 }]);
  assert.equal(canvasService.place(canvas, ARCH_A, { nodeId: "not-a-node", x: 8, y: 8 }), null);
  assert.deepEqual(canvasService.resetLayout(placed!).layout, []);
});

// ── G / H. switching and reload ────────────────────────────────────────

test("G: switching projects switches Canvas, and switching back restores A's placements", () => {
  useProjectStore.setState({
    projects: [
      project("pa", "Alpha", LATE, structuredClone(ARCH_A)),
      project("pb", "Beta", EARLY, structuredClone(ARCH_B)),
    ],
  });
  const nodeA = ARCH_A.nodes[0].id;
  useProjectStore.getState().placeCanvasNode("pa", { nodeId: nodeA, x: 480, y: 320 });
  useProjectStore.getState().openProject("pb");
  const b = canvasService.view(active());
  assert.ok(b.kind === "ready" && b.nodes.every((n) => !n.placed));
  assert.ok(b.kind === "ready" && !b.nodes.some((n) => n.nodeId === nodeA));
  useProjectStore.getState().openProject("pa");
  const a = canvasService.view(active());
  const restored = a.kind === "ready" ? a.nodes.find((n) => n.nodeId === nodeA) : undefined;
  assert.deepEqual([restored?.x, restored?.y, restored?.placed], [480, 320, true]);
});

type ProjectStoreModule = typeof import("@/store/useProjectStore");

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

/** A fresh project store over `data`, which is what a page reload is. */
function withFreshProjectStore(data: Map<string, string>, run: (store: ProjectStoreModule["useProjectStore"]) => void) {
  const g = globalThis as Record<string, unknown>;
  const had = {
    localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"),
    window: Object.getOwnPropertyDescriptor(g, "window"),
  };
  Object.defineProperty(g, "localStorage", { value: memoryStorage(data), configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  const cached = Object.keys(require.cache).filter((key) => /[\\/]store[\\/]useProjectStore\.ts$/.test(key));
  const saved = cached.map((key) => [key, require.cache[key]] as const);
  try {
    for (const key of cached) delete require.cache[key];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    run((require("@/store/useProjectStore") as ProjectStoreModule).useProjectStore);
  } finally {
    for (const [key, mod] of saved) require.cache[key] = mod;
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
}

test("H: architecture and Canvas placements survive a reload, per project", () => {
  const data = new Map<string, string>();
  const nodeA = ARCH_A.nodes[2].id;
  withFreshProjectStore(data, (store) => {
    store.setState({
      projects: [
        project("pa", "Alpha", LATE, structuredClone(ARCH_A)),
        project("pb", "Beta", EARLY, structuredClone(ARCH_B)),
      ],
    });
    assert.equal(store.getState().placeCanvasNode("pa", { nodeId: nodeA, x: 520, y: 360 }), true);
  });
  withFreshProjectStore(data, (store) => {
    const projects = store.getState().projects;
    assert.equal(architectService.resolve(activeProject(projects)).kind, "ready");
    const view = canvasService.view(activeProject(projects));
    const node = view.kind === "ready" ? view.nodes.find((n) => n.nodeId === nodeA) : undefined;
    assert.deepEqual([node?.x, node?.y, node?.placed], [520, 360, true]);
    const beta = projects.find((p) => p.id === "pb") as CattipuProject;
    assert.deepEqual(beta.canvas.layout, []);
  });
});

test("H: a v4 project record loads with an empty Canvas layout", () => {
  const v4 = { ...project("pa", "Alpha", LATE, structuredClone(ARCH_A)), version: 4 } as Record<string, unknown>;
  const canvas = { ...(v4.canvas as Record<string, unknown>) };
  delete canvas.layout;
  v4.canvas = canvas;
  assert.deepEqual(migrateProject(v4).canvas.layout, []);
  const data = new Map([["cattipu-projects", JSON.stringify({ state: { projects: [v4] }, version: 4 })]]);
  withFreshProjectStore(data, (store) => {
    const loaded = store.getState().projects[0];
    assert.deepEqual(loaded.canvas.layout, []);
    assert.deepEqual(loaded.architect.data?.nodes.map((n) => n.id), ARCH_A.nodes.map((n) => n.id));
  });
  assert.equal(PROJECT_SCHEMA_VERSION, 5);
});

// ── I / J. empty states ────────────────────────────────────────────────

test("I: a project without architecture is stated, not filled", () => {
  seed("B");
  const view = canvasService.view(active());
  assert.equal(view.kind, "no-architecture");
  assert.equal(view.kind === "no-architecture" && view.project.id, "pb");
  architect().syncToProject(active());
  assert.equal(architect().data, null);
  assert.equal(architect().status, "idle");
  assert.deepEqual(byId("pb").canvas.layout, []);
});

test("I: an architecture with no nodes is ready and empty", () => {
  const empty = { ...structuredClone(ARCH_A), nodes: [], edges: [] };
  const view = canvasService.view(project("pe", "Empty", LATE, empty));
  assert.ok(view.kind === "ready" && view.nodes.length === 0 && view.edges.length === 0);
});

test("J: with no active project, Architect and Canvas both say so", () => {
  seed(null);
  assert.equal(active(), null);
  assert.equal(canvasService.view(active()).kind, "no-project");
  assert.equal(architectService.resolve(active()).kind, "no-project");
  architect().syncToProject(active());
  assert.equal(architect().linkedProjectId, null);
  assert.equal(architect().data, null);
});

test("J: the Canvas window renders its no-project state", () => {
  type CanvasModule = typeof import("@/components/Canvas/CanvasApp");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CanvasApp } = require("@/components/Canvas/CanvasApp") as CanvasModule;
  // Static markup reads the store's initial state: the seed projects,
  // none of which has been opened.
  const html = renderToStaticMarkup(React.createElement(CanvasApp));
  assert.match(html, /data-canvas-state="no-project"/);
  assert.match(html, /No project is open\./);
});

// ── MVP-03 foundation: create, edit, move by hand ──────────────────────

type ProjectStore = ProjectStoreModule["useProjectStore"];

/** The same repository the app uses, over a given store instance. */
function editorOver(store: ProjectStore) {
  return createArchitectureEditor(
    {
      load: (id) => store.getState().projects.find((p) => p.id === id)?.architect.data ?? null,
      save: (id, architecture) => {
        if (!store.getState().projects.some((p) => p.id === id)) return false;
        store.getState().updateProjectArchitecture(id, architecture);
        return true;
      },
    },
    (id) => store.getState().projects.find((p) => p.id === id) ?? null,
  );
}

test("contract: a node carries id, type, name and description; Canvas reads them and stores position only", () => {
  seed("B");
  const created = architectureEditor.addNode("pb", { kind: "gateway", label: "API", description: "Public REST edge" });
  assert.ok(created.ok);
  if (!created.ok) return;
  assert.deepEqual(
    [typeof created.node.id, created.node.kind, created.node.label, created.node.description],
    ["string", "gateway", "API", "Public REST edge"],
  );
  const view = canvasService.view(byId("pb"));
  const node = view.kind === "ready" ? view.nodes[0] : undefined;
  assert.deepEqual([node?.nodeId, node?.label, node?.kind, node?.description], [created.node.id, "API", "gateway", "Public REST edge"]);
  assert.deepEqual(byId("pb").canvas.layout, [], "creating a node writes no Canvas state");
});

test("creation: the first node on an empty project makes its architecture — no generation", () => {
  seed("B");
  assert.equal(byId("pb").architect.data, null);
  const result = architectureEditor.addNode("pb", { kind: "service" });
  assert.ok(result.ok);
  const arch = byId("pb").architect.data;
  assert.equal(arch?.prompt, "", "nobody wrote a prompt, so none is invented");
  assert.equal(arch?.projectName, "Beta");
  assert.deepEqual(arch?.nodes.map((n) => [n.kind, n.label]), [["service", "New Service"]]);
  assert.deepEqual([arch?.features, arch?.tables, arch?.roadmap, arch?.edges], [[], [], [], []]);
  assert.equal(canvasService.view(byId("pb")).kind, "ready");
  assert.equal(architectureEditor.addNode("missing", { kind: "service" }).ok, false);
});

test("editing: name, type and description change in the one architecture; bad edits change nothing", () => {
  seed("B");
  const made = architectureEditor.addNode("pb", { kind: "service" });
  assert.ok(made.ok);
  if (!made.ok) return;
  const id = made.node.id;
  assert.ok(architectureEditor.updateNode("pb", id, { label: "  Worker  ", kind: "queue", description: "Runs jobs" }).ok);
  const node = byId("pb").architect.data?.nodes[0];
  assert.deepEqual([node?.label, node?.kind, node?.description], ["Worker", "queue", "Runs jobs"]);
  const before = byId("pb").architect.data;
  assert.deepEqual(architectureEditor.updateNode("pb", id, { label: "   " }), { ok: false, reason: "empty-name" });
  assert.deepEqual(architectureEditor.updateNode("pb", id, { kind: "blob" as never }), { ok: false, reason: "invalid-kind" });
  assert.deepEqual(architectureEditor.updateNode("pb", "nope", { label: "X" }), { ok: false, reason: "unknown-node" });
  assert.equal(byId("pb").architect.data, before, "a refused edit writes nothing");
});

test("movement: a hand-made node moves on the grid and keeps its Architect data", () => {
  seed("B");
  const made = architectureEditor.addNode("pb", { kind: "datastore", label: "Database" });
  assert.ok(made.ok);
  if (!made.ok) return;
  assert.equal(useProjectStore.getState().placeCanvasNode("pb", { nodeId: made.node.id, x: 322, y: 181 }), true);
  const view = canvasService.view(byId("pb"));
  const node = view.kind === "ready" ? view.nodes[0] : undefined;
  assert.deepEqual([node?.x, node?.y, node?.placed, node?.label], [320, 184, true, "Database"]);
});

test("isolation: A (UI, API) and B (Database, Worker) stay apart across repeated switches", () => {
  useProjectStore.setState({ projects: [project("pa", "Alpha", LATE), project("pb", "Beta", EARLY)] });
  const add = (pid: string, kind: "client" | "gateway" | "datastore" | "queue", label: string) => {
    const r = architectureEditor.addNode(pid, { kind, label });
    assert.ok(r.ok);
    return r.ok ? r.node.id : "";
  };
  const ui = add("pa", "client", "UI");
  add("pa", "gateway", "API");
  add("pb", "datastore", "Database");
  const worker = add("pb", "queue", "Worker");
  useProjectStore.getState().placeCanvasNode("pa", { nodeId: ui, x: 400, y: 48 });
  useProjectStore.getState().placeCanvasNode("pb", { nodeId: worker, x: 88, y: 240 });
  const labels = () => {
    const v = canvasService.view(active());
    return v.kind === "ready" ? v.nodes.map((n) => `${n.label}@${n.x},${n.y}`) : [];
  };
  // Each switch is its own moment, as a click is: the active project is the
  // latest opened, so two opens stamped in the same millisecond would tie.
  const RealDate = Date;
  let tick = RealDate.parse(LATE);
  const open = (id: string) => {
    tick += 1000;
    globalThis.Date = class extends RealDate {
      constructor(...args: []) {
        super(...(args.length ? args : [tick]) as []);
      }
    } as DateConstructor;
    try {
      useProjectStore.getState().openProject(id);
    } finally {
      globalThis.Date = RealDate;
    }
  };
  for (let round = 0; round < 3; round += 1) {
    open("pa");
    assert.deepEqual(labels(), ["UI@400,48", "API@192,16"]);
    open("pb");
    assert.deepEqual(labels(), ["Database@720,16", "Worker@88,240"]);
  }
});

test("persistence and reload: hand-made nodes, edits and positions come back per project", () => {
  const data = new Map<string, string>();
  let apiId = "";
  withFreshProjectStore(data, (store) => {
    store.setState({ projects: [project("pa", "Alpha", LATE), project("pb", "Beta", EARLY)] });
    const editor = editorOver(store);
    const api = editor.addNode("pa", { kind: "gateway" });
    assert.ok(api.ok);
    if (!api.ok) return;
    apiId = api.node.id;
    assert.ok(editor.updateNode("pa", apiId, { label: "API", description: "Edge" }).ok);
    assert.equal(store.getState().placeCanvasNode("pa", { nodeId: apiId, x: 256, y: 128 }), true);
    assert.ok(editor.addNode("pb", { kind: "queue", label: "Worker" }).ok);
  });
  withFreshProjectStore(data, (store) => {
    const projects = store.getState().projects;
    const a = canvasService.view(projects.find((p) => p.id === "pa") ?? null);
    const b = canvasService.view(projects.find((p) => p.id === "pb") ?? null);
    const node = a.kind === "ready" ? a.nodes.find((n) => n.nodeId === apiId) : undefined;
    assert.deepEqual([node?.label, node?.description, node?.x, node?.y], ["API", "Edge", 256, 128]);
    assert.deepEqual(b.kind === "ready" && b.nodes.map((n) => n.label), ["Worker"]);
  });
});

test("integration: Architect adopts a Canvas edit, and its own next edit does not undo it", () => {
  seed("A");
  architect().syncToProject(active());
  architect().selectNode(ARCH_A.nodes[1].id);
  const target = ARCH_A.nodes[0].id;
  assert.ok(architectureEditor.updateNode("pa", target, { label: "Edited In Canvas" }).ok);
  architect().syncToProject(active()); // what ArchitectApp does on every project-store change
  assert.equal(architect().data?.nodes[0].label, "Edited In Canvas");
  assert.equal(architect().selectedNodeId, ARCH_A.nodes[1].id, "Architect keeps its selection");
  architect().renameNode(ARCH_A.nodes[1].id, "Edited In Architect");
  const saved = byId("pa").architect.data?.nodes;
  assert.deepEqual([saved?.[0].label, saved?.[1].label], ["Edited In Canvas", "Edited In Architect"]);
  const view = canvasService.view(active());
  assert.equal(view.kind === "ready" && view.nodes[1].label, "Edited In Architect");
});

test("pure rules: add and update are deterministic given an id", () => {
  const base = createEmptyArchitecture({ name: "P", icon: "generic" });
  const a = addArchitectNode(base, { kind: "client", label: "UI" }, "n1");
  const b = addArchitectNode(base, { kind: "client", label: "UI" }, "n1");
  assert.deepEqual(a, b);
  assert.deepEqual(base.nodes, [], "the input architecture is not mutated");
  assert.ok(a.ok && updateArchitectNode(a.architecture, "n1", { description: "d" }).ok);
});

// ── window integration ─────────────────────────────────────────────────

test("Canvas is a WindowManager window with its own floor, closed at start", () => {
  assert.ok(CATTIPU_WINDOW_IDS.includes("canvas"));
  assert.deepEqual(CATTIPU_WINDOW_MIN_SIZE.canvas, { width: 400, height: 240 });
  const initial = createInitialWindowManagerState();
  assert.equal(initial.windows.canvas.open, false);
  assert.equal(initial.activeWindowId, "projects");
});

test("a session saved before Canvas existed still loads, with Canvas closed", () => {
  const saved = createInitialWindowManagerState();
  saved.windows.explorer = { ...saved.windows.explorer, open: true, position: { x: 300, y: 200 } };
  const legacy = JSON.parse(JSON.stringify(saved));
  delete legacy.windows.canvas;
  const parsed = parseWindowManagerState(JSON.stringify(legacy));
  assert.ok(parsed, "the old session is not discarded");
  assert.deepEqual(parsed?.windows.explorer.position, { x: 300, y: 200 });
  assert.equal(parsed?.windows.canvas.open, false);
  // A present-but-malformed window still rejects the session, as before.
  legacy.windows.canvas = "broken";
  assert.equal(parseWindowManagerState(JSON.stringify(legacy)), null);
});

// ── runner ─────────────────────────────────────────────────────────────

async function main() {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error(err instanceof Error ? (err.stack ?? err.message) : err);
    }
  }
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

void main();
