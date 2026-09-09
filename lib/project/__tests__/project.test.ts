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
} from "../types";
import { migrateProject, migrateProjects } from "../migrate";
import type { GeneratedArchitecture } from "../../ai/types";

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
  assert.deepEqual(project.canvas, { screens: [], components: [], assets: [], uiStates: [] });
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
  assert.deepEqual(migrated.canvas, { screens: [], components: [], assets: [], uiStates: [] });
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
