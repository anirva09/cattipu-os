/**
 * Milestone 15 (Living Projects) — tests for the derived project values.
 *
 * The point of these is narrow and specific: prove that progress, status
 * and version RESPOND TO STATE. A test that only asserted "progress is a
 * number between 0 and 100" would pass just as happily against a
 * hardcoded 78, which is the exact defect this milestone exists to
 * remove — so every case here changes one artifact and asserts the
 * derived value moved because of it.
 *
 * Run with: npx tsx lib/os/__tests__/projects.test.ts
 */
import assert from "node:assert/strict";

import {
  PROJECT_MILESTONES,
  orderProjects,
  projectProgress,
  projectStatus,
  projectVersionLabel,
  relativeTime,
  toProjectDetails,
  toProjectTree,
  toWindowProject,
} from "@/lib/os/projects";
import { PROJECT_SCHEMA_VERSION, createProject } from "@/lib/project/types";
import type { CattipuProject } from "@/lib/project/types";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

const blank = () => createProject({ name: "Test Project" });

// ── progress is derived, not stored ─────────────────────────────────────

test("a brand-new project is 0% — nothing has been built", () => {
  assert.equal(projectProgress(blank()), 0);
});

test("each milestone reached moves progress, and only that far", () => {
  const p = blank();
  assert.equal(projectProgress(p), 0);

  const withIdea = { ...p, idea: { prompt: "a banking app" } };
  assert.equal(projectProgress(withIdea), 17);

  const withArch = {
    ...withIdea,
    architect: { data: { prompt: "x" } },
  } as unknown as CattipuProject;
  assert.equal(projectProgress(withArch), 33);
});

test("a project with every artifact is 100%", () => {
  const p = blank();
  const full = {
    ...p,
    idea: { prompt: "x" },
    architect: { data: {} },
    canvas: { ...p.canvas, screens: [{}] },
    forge: { ...p.forge, builds: [{}] },
    memory: { ...p.memory, records: [{}] },
    launch: { ...p.launch, releases: [{}] },
  } as unknown as CattipuProject;
  assert.equal(projectProgress(full), 100);
});

test("progress has no setter — it is a function of artifacts only", () => {
  const p = blank();
  // Writing a progress field onto the record must not change what the
  // OS layer reports. If this ever fails, a stored percentage has crept
  // back in and the Living Desktop rule is broken.
  const lying = { ...p, progress: 78 } as unknown as CattipuProject;
  assert.equal(projectProgress(lying), 0);
});

test("the milestone list and the percentage cannot drift apart", () => {
  const p = blank();
  const full = PROJECT_MILESTONES.reduce<CattipuProject>((acc, m) => {
    switch (m.key) {
      case "idea": return { ...acc, idea: { prompt: "x" } };
      case "architect": return { ...acc, architect: { data: {} } } as unknown as CattipuProject;
      case "canvas": return { ...acc, canvas: { ...acc.canvas, screens: [{}] } } as unknown as CattipuProject;
      case "forge": return { ...acc, forge: { ...acc.forge, builds: [{}] } } as unknown as CattipuProject;
      case "memory": return { ...acc, memory: { ...acc.memory, records: [{}] } } as unknown as CattipuProject;
      case "launch": return { ...acc, launch: { ...acc.launch, releases: [{}] } } as unknown as CattipuProject;
      default: return acc;
    }
  }, p);
  assert.equal(projectProgress(full), 100);
});

// ── status is derived, except archived ──────────────────────────────────

test("status follows the artifacts through the product flow", () => {
  const p = blank();
  assert.equal(projectStatus(p), "New");

  const designing = { ...p, architect: { data: {} } } as unknown as CattipuProject;
  assert.equal(projectStatus(designing), "Designing");

  const building = {
    ...designing,
    forge: { ...p.forge, builds: [{}] },
  } as unknown as CattipuProject;
  assert.equal(projectStatus(building), "Building");

  const shipped = {
    ...building,
    launch: { ...p.launch, releases: [{}] },
  } as unknown as CattipuProject;
  assert.equal(projectStatus(shipped), "Shipped");
});

test("archived overrides everything — it is the one status a user sets", () => {
  const p = blank();
  const shipped = {
    ...p,
    launch: { ...p.launch, releases: [{}] },
    archived: true,
  } as unknown as CattipuProject;
  assert.equal(projectStatus(shipped), "Archived");
});

// ── version ─────────────────────────────────────────────────────────────

test("an unreleased project shows v0.1.0 and does not claim otherwise", () => {
  assert.equal(projectVersionLabel(blank()), "v0.1.0");
});

test("a released project shows its latest release", () => {
  const p = blank();
  const released = {
    ...p,
    launch: { ...p.launch, releases: [{ version: "v1.0.0" }, { version: "v1.1.0" }] },
  } as unknown as CattipuProject;
  assert.equal(projectVersionLabel(released), "v1.1.0");
});

test("the display version is not the schema version", () => {
  // Asserted against the CONSTANT, not the literal 2. The point of this
  // test is that a project's user-facing version label and its storage
  // schema version are different things; pinning the literal made it
  // fail for the right reason at the wrong time — M19's bump to 3 is a
  // schema change, not a regression in what this test is about.
  const p = blank();
  assert.equal(p.version, PROJECT_SCHEMA_VERSION);
  assert.notEqual(projectVersionLabel(p), String(p.version));
});

// ── time ────────────────────────────────────────────────────────────────

test("relativeTime says 'never' for a project never opened", () => {
  assert.equal(relativeTime(null), "never");
});

test("relativeTime buckets by magnitude", () => {
  const now = Date.parse("2026-09-06T12:00:00Z");
  const at = (ms: number) => new Date(now - ms).toISOString();
  assert.equal(relativeTime(at(5_000), now), "just now");
  assert.equal(relativeTime(at(5 * 60_000), now), "5m ago");
  assert.equal(relativeTime(at(3 * 3_600_000), now), "3h ago");
  assert.equal(relativeTime(at(2 * 86_400_000), now), "2d ago");
});

// ── ordering ────────────────────────────────────────────────────────────

test("pinned projects come first, then most recently opened", () => {
  const base = blank();
  const old = { ...base, id: "a", name: "Old", lastOpenedAt: "2026-01-01T00:00:00Z" };
  const recent = { ...base, id: "b", name: "Recent", lastOpenedAt: "2026-09-01T00:00:00Z" };
  const pinned = { ...base, id: "c", name: "Pinned", pinned: true, lastOpenedAt: "2020-01-01T00:00:00Z" };
  const order = orderProjects([old, recent, pinned]).map((p) => p.name);
  assert.deepEqual(order, ["Pinned", "Recent", "Old"]);
});

test("a never-opened project falls back to updatedAt, not to the bottom", () => {
  const base = blank();
  const neverOpened = { ...base, id: "a", name: "Fresh", lastOpenedAt: null, updatedAt: "2026-09-05T00:00:00Z" };
  const opened = { ...base, id: "b", name: "Stale", lastOpenedAt: "2026-01-01T00:00:00Z" };
  assert.deepEqual(orderProjects([opened, neverOpened]).map((p) => p.name), ["Fresh", "Stale"]);
});

// ── window projections ──────────────────────────────────────────────────

test("the Projects card carries derived progress, not a stored number", () => {
  const p = blank();
  const built = {
    ...p,
    idea: { prompt: "x" },
    forge: { ...p.forge, builds: [{}] },
  } as unknown as CattipuProject;
  assert.equal(toWindowProject(p).progress, 0);
  assert.equal(toWindowProject(built).progress, 33);
});

test("the details panel reports the real created stamp and status", () => {
  const p = { ...blank(), createdAt: "2026-08-14T09:22:00Z" };
  const d = toProjectDetails(p);
  assert.match(d.created, /2026/);
  assert.match(d.type, /New$/);
  assert.match(d.notes, /Nothing built yet/);
});

test("the tree splits Active from Archived by the project's own flag", () => {
  const a = { ...blank(), id: "a", name: "Live" };
  const b = { ...blank(), id: "b", name: "Old", archived: true };
  const [root] = toProjectTree([a, b]);
  const active = root.children?.find((c) => c.id === "active");
  const archived = root.children?.find((c) => c.id === "archived");
  assert.deepEqual(active?.children?.map((c) => c.label), ["Live"]);
  assert.deepEqual(archived?.children?.map((c) => c.label), ["Old"]);
});

test("an empty group still exists — a folder you cannot drop into is not a folder", () => {
  const [root] = toProjectTree([]);
  const ids = root.children?.map((c) => c.id);
  assert.deepEqual(ids, ["active", "archived", "templates", "samples"]);
});

// ── runner ──────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    failures.push(name);
    console.log(`FAIL - ${name}`);
    console.log(`       ${(error as Error).message.split("\n")[0]}`);
  }
}
console.log(`\n${passed}/${tests.length} passed`);
if (failures.length) process.exit(1);
