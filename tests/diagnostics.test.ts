/**
 * M20.5C (Diagnostics Service) — tests for lib/services/diagnostics.
 *
 * Written against the specific wrong implementations:
 *
 *  - the snapshot's contract version and timestamp are checked together,
 *    because a producer that stamps each check with its OWN `new Date()`
 *    call is the bug that makes a single snapshot internally
 *    inconsistent under concurrent reads;
 *  - future services (ai/memory/forge/live/launch) are checked for being
 *    `not-implemented` rather than `ready` or `offline`, because seeded
 *    Architect data or an empty CattipuProject.forge slot are exactly
 *    the kind of thing that tempts a producer into claiming "offline"
 *    (implemented but failed) for something that was never implemented;
 *  - `deriveDiagnosticsStatus` is checked for IGNORING not-implemented
 *    entries, because folding every roadmap milestone into the same
 *    precedence as `degraded`/`offline` is the bug that reports a
 *    healthy MVP as broken merely because Forge and Live do not exist
 *    yet;
 *  - two `getSnapshot()` calls are checked for sharing no mutable
 *    reference, because returning the same cached object is the bug
 *    that lets one caller's read of a snapshot mutate what every other
 *    caller sees.
 *
 * Run with: npx tsx tests/diagnostics.test.ts
 */
import assert from "node:assert/strict";

import {
  deriveDiagnosticsStatus,
  diagnosticsService,
} from "@/lib/services/diagnostics/diagnosticsService";
import {
  DIAGNOSTICS_CONTRACT_VERSION,
  DIAGNOSTIC_CATEGORIES,
  type DiagnosticsSnapshot,
  type DiagnosticStatus,
  type ServiceHealth,
} from "@/lib/contracts/diagnostics/types";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useProjectStore } from "@/store/useProjectStore";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const emptySnapshot = (
  services: ServiceHealth[],
): DiagnosticsSnapshot => ({
  contractVersion: DIAGNOSTICS_CONTRACT_VERSION,
  observedAt: new Date().toISOString(),
  services,
  checks: [],
});

// ── getSnapshot() shape ──────────────────────────────────────────────────

test("getSnapshot returns the current contract version", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  assert.equal(snapshot.contractVersion, DIAGNOSTICS_CONTRACT_VERSION);
});

test("observedAt is a valid timestamp shared by every check in the snapshot", async () => {
  const before = Date.now();
  const snapshot = await diagnosticsService.getSnapshot();
  const after = Date.now();

  const parsed = Date.parse(snapshot.observedAt);
  assert.ok(!Number.isNaN(parsed), "observedAt must parse as a date");
  assert.ok(parsed >= before && parsed <= after, "observedAt must fall within the call");

  for (const service of snapshot.services) {
    for (const check of service.checks ?? []) {
      assert.equal(check.checkedAt, snapshot.observedAt);
    }
  }
  for (const check of snapshot.checks) {
    assert.equal(check.checkedAt, snapshot.observedAt);
  }
});

test("known services are registered exactly once, one per diagnostic category", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const ids = snapshot.services.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "a service id was registered more than once");
  assert.deepEqual([...ids].sort(), [...DIAGNOSTIC_CATEGORIES].sort());
});

test("implemented canonical domains report a truthful, non-future status", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  for (const id of ["project", "filesystem", "windows", "settings", "architect", "system"]) {
    const service = snapshot.services.find((s) => s.id === id);
    assert.ok(service, `${id} is missing from the snapshot`);
    assert.notEqual(service!.status, "not-implemented", `${id} should not be not-implemented`);
  }
});

test("future services report not-implemented, never ready or offline", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  for (const id of ["ai", "memory", "forge", "live", "launch"]) {
    const service = snapshot.services.find((s) => s.id === id);
    assert.ok(service, `${id} is missing from the snapshot`);
    assert.equal(service!.status, "not-implemented");
  }
});

test("future services carry the roadmap milestone that owns them", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const expected: Record<string, string> = {
    ai: "M23",
    memory: "M24",
    forge: "M26",
    live: "M27",
    launch: "M28",
  };
  for (const [id, milestone] of Object.entries(expected)) {
    const service = snapshot.services.find((s) => s.id === id);
    assert.equal(service?.plannedMilestone, milestone, `${id} should plan for ${milestone}`);
  }
});

test("known architecture drift produces the expected diagnostic checks", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const ids = snapshot.checks.map((c) => c.id);
  for (const expected of [
    "windows.legacy-store-consumers",
    "system.icon-systems-duplicated",
    "project.import-direction",
    "ai.type-import-cycle",
    "filesystem.explorer-hydration-mismatch",
  ]) {
    assert.ok(ids.includes(expected), `missing drift check "${expected}"`);
  }
});

test("notifications: the history is stored and, since M22, rendered", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const notifications = snapshot.services.find((s) => s.id === "notifications")!;
  assert.equal(notifications.status, "ready");
  assert.ok(!snapshot.checks.some((c) => c.id === "notifications.center-unmounted"));
  const queueCheck = notifications.checks?.find((c) => c.id === "notifications.queue-length");
  assert.equal(queueCheck?.status, "ready");
});

test("filesystem flags an orphaned project shortcut", async () => {
  const objectsBefore = useFilesystemStore.getState().objects;
  const projectsBefore = useProjectStore.getState().projects;

  useFilesystemStore.setState({
    objects: [
      ...objectsBefore,
      {
        id: "diagnostics-test-orphan",
        kind: "project-shortcut",
        label: "",
        projectId: "does-not-exist",
        parentId: null,
        position: { col: 0, row: 0 },
        createdAt: new Date().toISOString(),
      },
    ],
  });

  try {
    const snapshot = await diagnosticsService.getSnapshot();
    const filesystem = snapshot.services.find((s) => s.id === "filesystem")!;
    const orphanCheck = filesystem.checks?.find((c) => c.id === "filesystem.orphaned-shortcuts");
    assert.equal(orphanCheck?.status, "degraded");
    assert.equal(orphanCheck?.detail?.count, 1);
  } finally {
    useFilesystemStore.setState({ objects: objectsBefore });
    useProjectStore.setState({ projects: projectsBefore });
  }
});

test("snapshots are plain serializable objects", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const roundTripped = JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(roundTripped, snapshot);
});

test("repeated getSnapshot() calls do not persist shared mutable snapshot state", async () => {
  const a = await diagnosticsService.getSnapshot();
  const bLengthBefore = (await diagnosticsService.getSnapshot()).services.length;

  (a.services as ServiceHealth[]).push({
    id: "not-a-real-service",
    name: "Not real",
    category: "system",
    status: "ready",
  });

  const b = await diagnosticsService.getSnapshot();
  assert.notEqual(a, b, "getSnapshot() must not return the same object twice");
  assert.notEqual(a.services, b.services, "services arrays must not be shared");
  assert.equal(b.services.length, bLengthBefore, "mutating one snapshot must not affect the next");
});

// ── deriveDiagnosticsStatus ──────────────────────────────────────────────

test("deriveDiagnosticsStatus ignores not-implemented services entirely", () => {
  const snapshot = emptySnapshot([
    { id: "project", name: "Project", category: "project", status: "ready" },
    { id: "forge", name: "Forge", category: "forge", status: "not-implemented", plannedMilestone: "M26" },
  ]);
  assert.equal(deriveDiagnosticsStatus(snapshot), "ready");
});

test("deriveDiagnosticsStatus surfaces offline over degraded over unknown", () => {
  const withStatus = (status: DiagnosticStatus) =>
    emptySnapshot([{ id: "system", name: "System", category: "system", status }]);

  assert.equal(deriveDiagnosticsStatus(withStatus("unknown")), "unknown");
  assert.equal(deriveDiagnosticsStatus(withStatus("degraded")), "degraded");
  assert.equal(deriveDiagnosticsStatus(withStatus("offline")), "offline");
});

test("deriveDiagnosticsStatus reports not-implemented only when nothing else is observable", () => {
  const snapshot = emptySnapshot([
    { id: "forge", name: "Forge", category: "forge", status: "not-implemented", plannedMilestone: "M26" },
    { id: "live", name: "Live", category: "live", status: "not-implemented", plannedMilestone: "M27" },
  ]);
  assert.equal(deriveDiagnosticsStatus(snapshot), "not-implemented");
});

// ── run ───────────────────────────────────────────────────────────────────

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
