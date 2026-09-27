/**
 * Milestone 14A — focused tests for the shared project artifact model.
 *
 * No test framework exists in this repo yet, and the brief is explicit:
 * "do not install a massive testing stack solely for this milestone; use
 * the lightest established verification approach available in the repo."
 * `npx tsx` (confirmed already available, no package.json change needed)
 * runs this file directly. Plain `node:assert` + a tiny manual runner
 * below stand in for a framework. Imports are relative, not `@/...` —
 * tsx doesn't resolve Next's tsconfig path aliases without extra config,
 * and editing tsconfig.json (itself part of the pre-existing dirty file
 * pool) is out of scope for this milestone.
 *
 * Run with: npx tsx lib/project/__tests__/project.test.ts
 */

import assert from "node:assert/strict";
import {
  PROJECT_SCHEMA_VERSION,
  createProject,
  nextProjectId,
  type CattipuProject,
} from "@/lib/project/types";
import { migrateProject, migrateProjects } from "@/lib/project/migrate";
import type { GeneratedArchitecture } from "@/lib/ai/types";
import { projectLifecycleService } from "@/lib/services/projects/projectLifecycleService";
import { activeProject, toWindowProject } from "@/lib/os/projects";

type Test = { name: string; run: () => void };
const tests: Test[] = [];
function test(name: string, run: () => void) {
  tests.push({ name, run });
}

// A realistic, fully-populated GeneratedArchitecture fixture — exercises
// every sub-array, not just the top-level scalar fields, so the
// "Architect data survives migration" test is a real deep-equal, not a
// shallow one that would pass even if nested arrays got dropped.
function sampleArchitecture(): GeneratedArchitecture {
  return {
    prompt: "a banking app with fraud alerts",
    projectName: "Fraud Shield",
    projectIcon: "banking",
    summary: "A banking platform with real-time fraud detection.",
    features: [{ id: "feat-1", label: "Fraud Alerts", description: "Real-time alerts on suspicious activity." }],
    stack: [{ id: "stack-1", category: "Backend", name: "Node.js", reason: "Team familiarity.", tier: "core" }],
    nodes: [
      {
        id: "node-1",
        label: "API Gateway",
        kind: "gateway",
        responsibilities: ["Route requests"],
        endpoints: ["/api"],
        dependencies: [],
        events: [],
        tables: [],
        position: { x: 0, y: 0 },
      },
    ],
    edges: [{ id: "edge-1", source: "node-1", target: "node-1", label: "HTTP" }],
    tables: [{ name: "accounts", sql: "CREATE TABLE accounts (\n  id TEXT\n);", columns: [{ name: "id", type: "TEXT" }] }],
    relationships: [{ from: "accounts", to: "accounts", label: "1 — ∞" }],
    roadmap: [{ id: "phase-1", phase: 1, title: "MVP", items: ["Ship auth"] }],
    apis: [
      {
        id: "api-1",
        method: "GET",
        route: "/accounts",
        request: "-",
        response: "Account[]",
        authentication: "Bearer token",
        dependencies: [],
        nodeId: "node-1",
      },
    ],
    infraNodes: [
      { id: "infra-1", label: "Postgres", kind: "database", responsibilities: ["Store accounts"], usedBy: ["node-1"], position: { x: 0, y: 0 } },
    ],
    infraEdges: [{ id: "infra-edge-1", source: "infra-1", target: "infra-1", label: "reads" }],
    recommendations: [{ id: "rec-1", text: "Add rate limiting.", targetNodeId: "node-1" }],
  };
}

// The exact pre-M14A shape (store/useProjectStore.ts's old `Project`
// interface), hand-constructed — this is what's actually sitting in
// real users' localStorage today under the "cattipu-projects" key.
function sampleLegacyProject(withArchitecture: boolean) {
  return {
    id: "legacy-1",
    name: "Legacy Project",
    icon: "saas" as const,
    color: "var(--color-blue)",
    editedLabel: "Edited 2d ago",
    architecture: withArchitecture ? sampleArchitecture() : undefined,
  };
}

// ── 1. Creating a new project produces a valid current-schema project ──
test("createProject() produces a valid current-schema CattipuProject", () => {
  const project = createProject({ name: "  New Idea  " });
  assert.equal(project.version, PROJECT_SCHEMA_VERSION);
  assert.equal(project.name, "New Idea"); // trimmed
  assert.equal(project.icon, "generic");
  assert.equal(project.architect.data, null);
  assert.deepEqual(project.canvas, { screens: [], components: [], assets: [], uiStates: [], layout: [] });
  assert.deepEqual(project.forge, { sourceFiles: [], builds: [], tests: [], diagnostics: [] });
  assert.deepEqual(project.memory, { records: [], decisions: [], relationships: [], conflicts: [] });
  assert.deepEqual(project.launch, { releases: [], environments: [], preflightChecks: [], deployments: [] });
  assert.equal(typeof project.id, "string");
  assert.ok(project.id.length > 0);
  assert.equal(typeof project.createdAt, "string");
  assert.equal(project.createdAt, project.updatedAt);
  // idea defaults to an empty prompt when none is supplied
  assert.deepEqual(project.idea, { prompt: "" });
});

// ── MVP-01 project lifecycle ──────────────────────────────────────────

test("the lifecycle service creates a trimmed project with stable identity", () => {
  const result = projectLifecycleService.createProject([], "  Payments Core  ");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.project.name, "Payments Core");
  assert.ok(result.project.id.startsWith("project-"));
  assert.equal(result.project.createdAt, result.project.updatedAt);
});

test("the lifecycle service rejects empty and duplicate project identities", () => {
  const existing = createProject({ name: "Payments Core" });
  assert.deepEqual(
    projectLifecycleService.createProject([existing], "   "),
    { ok: false, reason: "empty-name" },
  );
  assert.deepEqual(
    projectLifecycleService.createProject([existing], " payments core "),
    { ok: false, reason: "duplicate-name" },
  );
});

test("selecting a project makes it the one canonical active project", () => {
  const first = createProject({ name: "First" });
  const second = createProject({ name: "Second" });
  const selected = projectLifecycleService.selectProject([first, second], second.id);
  assert.equal(activeProject(selected)?.id, second.id);
  assert.equal(selected[0].lastOpenedAt, null);
  assert.ok(selected[1].lastOpenedAt);
});

test("the Projects window projection consumes a real created project", () => {
  const result = projectLifecycleService.createProject([], "Window Project");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const card = toWindowProject(result.project);
  assert.equal(card.id, result.project.id);
  assert.equal(card.name, "Window Project");
  assert.equal(card.progress, 0);
});

// ── 2. Loading/migrating an existing pre-M14 project ────────────────────
test("migrateProject() converts a legacy pre-M14A record without architecture", () => {
  const migrated = migrateProject(sampleLegacyProject(false));
  assert.equal(migrated.version, PROJECT_SCHEMA_VERSION);
  assert.equal(migrated.id, "legacy-1");
  assert.equal(migrated.name, "Legacy Project");
  assert.equal(migrated.icon, "saas");
  assert.equal(migrated.color, "var(--color-blue)");
  assert.equal(migrated.editedLabel, "Edited 2d ago");
  assert.equal(migrated.architect.data, null);
  assert.deepEqual(migrated.idea, { prompt: "" });
  // every artifact slot exists and is empty, not missing
  assert.deepEqual(migrated.canvas, { screens: [], components: [], assets: [], uiStates: [], layout: [] });
  assert.deepEqual(migrated.forge, { sourceFiles: [], builds: [], tests: [], diagnostics: [] });
  assert.deepEqual(migrated.memory, { records: [], decisions: [], relationships: [], conflicts: [] });
  assert.deepEqual(migrated.launch, { releases: [], environments: [], preflightChecks: [], deployments: [] });
});

test("migrateProjects() handles a mixed array (legacy + malformed) without throwing or dropping entries", () => {
  const raw = [sampleLegacyProject(false), sampleLegacyProject(true), null, "not-an-object", 42];
  const migrated = migrateProjects(raw);
  assert.equal(migrated.length, raw.length); // nothing silently dropped
  for (const p of migrated) {
    assert.equal(p.version, PROJECT_SCHEMA_VERSION);
    assert.ok(isRecord(p.architect));
  }
});

// ── 3. Architect data survives migration byte-for-byte ──────────────────
test("Architect GeneratedArchitecture data survives migration exactly (deep-equal)", () => {
  const architecture = sampleArchitecture();
  const legacy = sampleLegacyProject(true);
  legacy.architecture = architecture;
  const migrated = migrateProject(legacy);
  assert.deepEqual(migrated.architect.data, architecture);
  // and the prompt got carried into `idea` too, per the migration's own
  // documented contract ("architecture?.prompt ?? ''")
  assert.equal(migrated.idea.prompt, architecture.prompt);
});

test("A record already in the current shape is backfilled, not re-migrated (idempotent)", () => {
  const current = createProject({ name: "Already Current", architect: { data: sampleArchitecture() } });
  const result = migrateProject(current);
  assert.deepEqual(result, current);
});

// ── 4. Serialization / deserialization round-trip ───────────────────────
test("JSON.stringify/parse round-trip preserves a CattipuProject exactly", () => {
  const project = createProject({
    name: "Round Trip",
    icon: "website",
    architect: { data: sampleArchitecture() },
  });
  const roundTripped = JSON.parse(JSON.stringify(project)) as CattipuProject;
  assert.deepEqual(roundTripped, project);
});

// ── 5. Artifact IDs remain stable / unique ───────────────────────────────
test("nextProjectId() produces unique ids across repeated calls", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 500; i++) ids.add(nextProjectId());
  assert.equal(ids.size, 500);
});

test("An id is preserved verbatim through migration — migration never reassigns identity", () => {
  const legacy = sampleLegacyProject(true);
  const migrated = migrateProject(legacy);
  assert.equal(migrated.id, legacy.id);
});

test("Architect sub-object ids (nodes/edges/apis/etc.) are preserved verbatim through migration", () => {
  const architecture = sampleArchitecture();
  const legacy = sampleLegacyProject(true);
  legacy.architecture = architecture;
  const migrated = migrateProject(legacy);
  const data = migrated.architect.data!;
  assert.equal(data.nodes[0].id, architecture.nodes[0].id);
  assert.equal(data.edges[0].id, architecture.edges[0].id);
  assert.equal(data.apis[0].id, architecture.apis[0].id);
  assert.equal(data.features[0].id, architecture.features[0].id);
  assert.equal(data.roadmap[0].id, architecture.roadmap[0].id);
});

// ── seed identity is deterministic across server and client ──────────
//
// The page is rendered twice from two separate evaluations of the store
// module: once on the server, once in the browser. zustand hydrates from
// the store's initial state, so any id minted from the clock or from
// Math.random at module load puts a different `data-entry-id` into each
// render — the Explorer hydration mismatch. Each evaluation below gets a
// fresh module instance and its own clock and random source, which is
// what two machines are.

type ProjectStoreModule = typeof import("@/store/useProjectStore");

function evaluateProjectStore(clock: number, random: number): ProjectStoreModule {
  for (const key of Object.keys(require.cache)) {
    if (/[\\/]store[\\/]useProjectStore\.ts$/.test(key)) delete require.cache[key];
  }
  const realNow = Date.now;
  const realRandom = Math.random;
  Date.now = () => clock;
  Math.random = () => random;
  try {
    // A fresh module instance needs the CommonJS cache that tsx runs this
    // file under; a static or dynamic import would hand back the cached one.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/store/useProjectStore") as ProjectStoreModule;
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }
}

test("seed projects are identical in two independent evaluations (server vs client)", () => {
  const server = evaluateProjectStore(1_756_000_000_000, 0.11).useProjectStore;
  const client = evaluateProjectStore(1_756_000_987_654, 0.83).useProjectStore;
  assert.notEqual(server, client, "each evaluation must be its own module instance");
  const serverSeed = server.getInitialState().projects;
  const clientSeed = client.getInitialState().projects;
  assert.equal(serverSeed.length, 3);
  assert.deepEqual(
    clientSeed.map((p) => p.id),
    serverSeed.map((p) => p.id),
  );
  assert.deepEqual(clientSeed, serverSeed);
  assert.equal(new Set(serverSeed.map((p) => p.id)).size, serverSeed.length);
});

test("persisted project ids replace the seed verbatim — hydration never re-mints them", () => {
  const saved = [createProject({ name: "Saved One" }), createProject({ name: "Saved Two" })];
  const data = new Map<string, string>([
    ["cattipu-projects", JSON.stringify({ state: { projects: saved }, version: PROJECT_SCHEMA_VERSION })],
  ]);
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
  };
  const g = globalThis as Record<string, unknown>;
  const had = { localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"), window: Object.getOwnPropertyDescriptor(g, "window") };
  Object.defineProperty(g, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  try {
    const store = evaluateProjectStore(1_756_000_000_000, 0.5).useProjectStore;
    // The first (hydration) render still sees the deterministic seed…
    assert.deepEqual(
      store.getInitialState().projects.map((p) => p.id),
      evaluateProjectStore(1, 0.9).useProjectStore.getInitialState().projects.map((p) => p.id),
    );
    // …and the persisted record then replaces it, ids untouched.
    assert.deepEqual(
      store.getState().projects.map((p) => p.id),
      saved.map((p) => p.id),
    );
  } finally {
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
});

test("store creation persists, restores, and makes the new project active", () => {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
  };
  const g = globalThis as Record<string, unknown>;
  const had = { localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"), window: Object.getOwnPropertyDescriptor(g, "window") };
  Object.defineProperty(g, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  try {
    const store = evaluateProjectStore(1_756_000_000_000, 0.5).useProjectStore;
    const result = store.getState().createProject("Persistent Project");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(activeProject(store.getState().projects)?.id, result.project.id);
    assert.match(data.get("cattipu-projects") ?? "", /Persistent Project/);

    const restored = evaluateProjectStore(1_756_000_000_100, 0.6).useProjectStore;
    assert.equal(
      restored.getState().projects.some((project) => project.id === result.project.id),
      true,
    );
  } finally {
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
});

test("malformed persisted project data falls back safely", () => {
  assert.deepEqual(migrateProjects("not a project list"), []);
  const migrated = migrateProjects([null, "broken", 42]);
  assert.equal(migrated.length, 3);
  assert.ok(migrated.every((project) => project.name === "Untitled Project"));
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// ── runner ────────────────────────────────────────────────────────────
let failed = 0;
for (const t of tests) {
  try {
    t.run();
    console.log(`ok - ${t.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL - ${t.name}`);
    console.error(err instanceof Error ? err.stack ?? err.message : err);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed > 0) process.exit(1);
