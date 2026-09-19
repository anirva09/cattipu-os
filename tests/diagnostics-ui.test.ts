/**
 * M20.5D (Developer Diagnostics) — tests for the diagnostics panel's UI
 * logic: components/Diagnostics/diagnosticsPresentation.ts, and the
 * panel's contract with the real `diagnosticsService`.
 *
 * There is no React test renderer in this repository (no jsdom, no
 * @testing-library — every existing suite under tests/ is plain
 * assertions against pure functions and store state), so this file
 * follows the same pattern: it verifies the presentation helpers the
 * components call, the real snapshot shape those components render
 * directly, and — by reading the component source files — the
 * architectural guarantee that none of them reaches into a store.
 *
 * Run with: npx tsx tests/diagnostics-ui.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DIAGNOSTIC_STATUSES,
  type DiagnosticsSnapshot,
  type ServiceHealth,
} from "@/lib/contracts/diagnostics/types";
import { diagnosticsService } from "@/lib/services/diagnostics/diagnosticsService";
import {
  STATUS_PRESENTATION,
  describeSnapshotError,
  formatObservedAt,
  summarizeServiceStatuses,
} from "@/components/Diagnostics/diagnosticsPresentation";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const DIAGNOSTICS_DIR = join(process.cwd(), "components", "Diagnostics");
const COMPONENT_FILES = [
  "DeveloperDiagnostics.tsx",
  "ServiceHealthRow.tsx",
  "DiagnosticsChecks.tsx",
];

// ── 1. every status renders as text, never color alone ─────────────────

test("every DiagnosticStatus has a non-empty text label, not just a glyph", () => {
  for (const status of DIAGNOSTIC_STATUSES) {
    const presentation = STATUS_PRESENTATION[status];
    assert.ok(presentation, `no presentation registered for "${status}"`);
    assert.ok(presentation.label.length > 0, `"${status}" has no text label`);
    assert.ok(presentation.glyph.length > 0, `"${status}" has no glyph`);
  }
});

// ── 2. future services render NOT IMPLEMENTED + a milestone ────────────

test("a not-implemented service's status text reads NOT IMPLEMENTED", () => {
  assert.equal(STATUS_PRESENTATION["not-implemented"].label, "NOT IMPLEMENTED");
});

test("future services in the real snapshot carry both not-implemented status and a milestone", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  for (const id of ["ai", "memory", "forge", "live", "launch"]) {
    const service = snapshot.services.find((s) => s.id === id);
    assert.ok(service, `${id} missing from snapshot`);
    assert.equal(service!.status, "not-implemented");
    assert.ok(service!.plannedMilestone, `${id} has no plannedMilestone to render`);
  }
});

// ── 3. degraded services display honestly, never rounded up ────────────

test("a degraded service's status text reads DEGRADED, not READY", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const degraded = snapshot.services.find((s) => s.status === "degraded");
  assert.ok(degraded, "the real snapshot has at least one degraded service to present");
  assert.equal(STATUS_PRESENTATION[degraded!.status].label, "DEGRADED");
});

// ── 4. summary counts are derived from the snapshot, never hardcoded ───

test("summarizeServiceStatuses counts every service exactly once", () => {
  const services: ServiceHealth[] = [
    { id: "a", name: "A", category: "system", status: "ready" },
    { id: "b", name: "B", category: "project", status: "ready" },
    { id: "c", name: "C", category: "filesystem", status: "degraded" },
    { id: "d", name: "D", category: "forge", status: "not-implemented" },
  ];
  const counts = summarizeServiceStatuses(services);
  assert.equal(counts.ready, 2);
  assert.equal(counts.degraded, 1);
  assert.equal(counts["not-implemented"], 1);
  assert.equal(counts.offline, 0);
  assert.equal(counts.unknown, 0);
  const total = DIAGNOSTIC_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  assert.equal(total, services.length);
});

test("summarizeServiceStatuses against the real snapshot sums back to the service count", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const counts = summarizeServiceStatuses(snapshot.services);
  const total = DIAGNOSTIC_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  assert.equal(total, snapshot.services.length);
});

// ── 5. the checks section renders straight from snapshot.checks ────────

test("every top-level check has the fields a checks list renders directly", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  assert.ok(snapshot.checks.length > 0, "expected at least one recorded architecture-drift check");
  for (const check of snapshot.checks) {
    assert.ok(check.id, "check missing id");
    assert.ok(check.label, "check missing label");
    assert.ok(check.message, "check missing message");
    assert.ok(DIAGNOSTIC_STATUSES.includes(check.status), `check "${check.id}" has an unknown status`);
  }
});

// ── 6. refresh asks the service for a fresh snapshot, not a cached one ─

test("refresh (a second getSnapshot() call) returns a distinct object every time", async () => {
  const first = await diagnosticsService.getSnapshot();
  const second = await diagnosticsService.getSnapshot();
  assert.notEqual(first, second, "refresh must not hand back the same snapshot object");
  assert.notEqual(first.services, second.services, "refresh must not share the services array");
});

// ── 7. loading/error states are handled without crashing ───────────────

test("describeSnapshotError extracts a real Error's message", () => {
  assert.equal(describeSnapshotError(new Error("network down")), "network down");
});

test("describeSnapshotError never throws on a non-Error rejection", () => {
  assert.equal(describeSnapshotError("a plain string"), "unknown error");
  assert.equal(describeSnapshotError(undefined), "unknown error");
  assert.equal(describeSnapshotError({ weird: true }), "unknown error");
});

test("formatObservedAt falls back to the raw string instead of throwing on bad input", () => {
  assert.equal(formatObservedAt("not-a-date"), "not-a-date");
  assert.ok(formatObservedAt(new Date(0).toISOString()).length > 0);
});

// ── 8. no duplicate service rows (React key stability) ─────────────────

test("the real snapshot has no duplicate service ids to key rows by", async () => {
  const snapshot: DiagnosticsSnapshot = await diagnosticsService.getSnapshot();
  const ids = snapshot.services.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate service id would collide as a React key");
});

// ── 9. the panel components never import a store directly ──────────────

test("no Diagnostics component imports a Zustand store — only the service", () => {
  for (const file of COMPONENT_FILES) {
    const source = readFileSync(join(DIAGNOSTICS_DIR, file), "utf8");
    assert.doesNotMatch(
      source,
      /from ["'](@\/store\/|\.\.\/\.\.\/store\/)/,
      `${file} must read diagnostics through DiagnosticsService, not a store directly`,
    );
  }
});

test("the panel component calls diagnosticsService.getSnapshot(), not a store getState()", () => {
  const source = readFileSync(join(DIAGNOSTICS_DIR, "DeveloperDiagnostics.tsx"), "utf8");
  assert.match(source, /diagnosticsService\s*\n?\s*\.getSnapshot\(\)/);
  assert.doesNotMatch(source, /\.getState\(\)/);
});

// ── run ──────────────────────────────────────────────────────────────────

async function run() {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAIL ${name}`);
      console.log(`       ${(error as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed) process.exit(1);
}

void run();
