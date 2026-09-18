/**
 * M20.5E (Architecture Regression Hardening) — executable tests for the
 * boundaries M20.5A–D established, so a later sprint that "just needs one
 * quick import" gets a failing test instead of silent drift.
 *
 * No product feature here and no new production code: every test below
 * either inspects real source files as text (imports, registry literals)
 * or exercises the real `diagnosticsService`/`healthRegistry` already
 * shipped. Where an existing suite (tests/diagnostics.test.ts,
 * tests/diagnostics-ui.test.ts) already proves an invariant at the
 * snapshot level, this file adds a DIFFERENT angle on it — a generic
 * directory scan instead of a fixed file list, or a unit-level check
 * against the registry/reducer source directly — rather than repeating
 * the same assertion for a second time.
 *
 * Run with: npx tsx tests/architecture.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  DIAGNOSTIC_CATEGORIES,
  type DiagnosticValue,
} from "@/lib/contracts/diagnostics/types";
import { diagnosticsService } from "@/lib/services/diagnostics/diagnosticsService";
import { HEALTH_REGISTRY } from "@/lib/services/diagnostics/healthRegistry";
import { staticDriftChecks } from "@/lib/services/diagnostics/staticChecks";
import { CATTIPU_WINDOW_IDS } from "@/components/WindowManager/windowManager.reducer";
import { APP_MAP } from "@/lib/apps";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const ROOT = process.cwd();

// ── tiny reusable source-scan helper (used by several tests below) ─────

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public"]);

function listSourceFiles(dir: string, extensions: readonly string[]): string[] {
  const absDir = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const abs = join(absDir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      files.push(...listSourceFiles(relative(ROOT, abs), extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      files.push(relative(ROOT, abs).split("\\").join("/"));
    }
  }
  return files;
}

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

// ── 1. Diagnostics UI consumes DiagnosticsService only ──────────────────

test("no file under components/Diagnostics/ imports a Zustand store", () => {
  const files = listSourceFiles("components/Diagnostics", [".ts", ".tsx"]);
  assert.ok(files.length >= 4, "expected the Diagnostics component files to exist");
  for (const file of files) {
    const source = readSource(file);
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*\/store\//,
      `${file} imports a store directly — it must go through DiagnosticsService`,
    );
    assert.doesNotMatch(source, /\.getState\(\)/, `${file} calls .getState() directly`);
  }
});

// ── 2. Diagnostics contracts remain framework-independent ───────────────

test("lib/contracts/diagnostics files import no framework or provider SDK", () => {
  const files = listSourceFiles("lib/contracts/diagnostics", [".ts"]);
  assert.ok(files.length >= 2, "expected the diagnostics contract files to exist");

  const forbidden = [
    /from\s+["']react/,
    /from\s+["']zustand/,
    /from\s+["']next/,
    /from\s+["']@?anthropic/i,
    /from\s+["']openai/i,
    /from\s+["']@google\/generative/i,
    /from\s+["']cohere/i,
  ];

  for (const file of files) {
    const source = readSource(file);
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} must stay framework-independent`);
    }
    assert.doesNotMatch(source, /\bwindow\.|\bdocument\./, `${file} must not touch the DOM`);
  }
});

// ── 3. Diagnostics snapshots remain JSON-serializable ────────────────────

/** Walks a value and asserts every leaf is a JSON-safe primitive — a
 *  stronger check than round-tripping through JSON.stringify, which
 *  would silently drop a stray function or `undefined` rather than fail. */
function assertJsonSafe(value: unknown, path: string): void {
  if (value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertJsonSafe(item, `${path}[${i}]`));
    return;
  }
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return;
  if (type === "object") {
    assert.ok(
      value!.constructor === Object,
      `${path} is a ${value!.constructor?.name ?? "non-plain"} instance, not a plain object`,
    );
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      assertJsonSafe(v, `${path}.${key}`);
    }
    return;
  }
  assert.fail(`${path} has non-serializable type "${type}"`);
}

test("a real diagnostics snapshot contains only JSON-safe values (no functions, Map, Set, Date, class instances)", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  assertJsonSafe(snapshot, "snapshot");
});

test("a DiagnosticCheck's detail values conform to the DiagnosticValue union", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const isDiagnosticValue = (v: unknown): v is DiagnosticValue =>
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    (Array.isArray(v) && v.every((item) => typeof item === "string"));

  const allChecks = [
    ...snapshot.checks,
    ...snapshot.services.flatMap((s) => s.checks ?? []),
  ];
  for (const check of allChecks) {
    for (const [key, value] of Object.entries(check.detail ?? {})) {
      assert.ok(isDiagnosticValue(value), `${check.id}.detail.${key} is not a DiagnosticValue`);
    }
  }
});

// ── 4. Every diagnostics service/domain id is unique ─────────────────────

test("HEALTH_REGISTRY has exactly one entry per DiagnosticCategory, no duplicates", () => {
  const ids = HEALTH_REGISTRY.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "HEALTH_REGISTRY has a duplicate id");
  assert.deepEqual([...ids].sort(), [...DIAGNOSTIC_CATEGORIES].sort());
});

// ── 5. Planned services remain honestly not-implemented, on the right milestone ──

test("HEALTH_REGISTRY assigns exactly the roadmap milestones this sprint locks in", () => {
  const expected: Record<string, string | undefined> = {
    system: undefined,
    project: undefined,
    filesystem: undefined,
    windows: undefined,
    settings: undefined,
    notifications: undefined,
    architect: undefined,
    ai: "M23",
    memory: "M24",
    forge: "M26",
    live: "M27",
    launch: "M28",
  };
  for (const entry of HEALTH_REGISTRY) {
    assert.equal(
      entry.plannedMilestone,
      expected[entry.id],
      `${entry.id} should plan for ${expected[entry.id] ?? "no milestone (already implemented)"}`,
    );
  }
});

// ── 6. Placeholder code must never let a planned service look ready ─────

test("every check nested under a not-implemented service is itself not-implemented, never ready/offline/degraded/unknown", async () => {
  const snapshot = await diagnosticsService.getSnapshot();
  const planned = snapshot.services.filter((s) => s.status === "not-implemented");
  assert.equal(planned.length, 5, "expected exactly the five planned services");
  for (const service of planned) {
    for (const check of service.checks ?? []) {
      assert.equal(
        check.status,
        "not-implemented",
        `${service.id}.${check.id} reports "${check.status}" — a planned service must not carry a ready-looking check`,
      );
    }
  }
});

// ── 7. components/WindowManager remains the canonical window owner ──────

test("CATTIPU_WINDOW_IDS is still exactly the five-window fixed set — no silent growth", () => {
  assert.deepEqual(
    [...CATTIPU_WINDOW_IDS],
    ["projects", "architect", "memory", "explorer", "settings"],
  );
});

// ── 8. store/useWindowStore.ts remains legacy/orphaned ──────────────────

test("only the three known legacy call sites import store/useWindowStore.ts", () => {
  const knownImporters = new Set([
    "components/CommandPalette/CommandPalette.tsx",
    "lib/os/extensions.ts",
    "lib/apps.ts",
  ]);

  const candidates = [
    ...listSourceFiles("components", [".ts", ".tsx"]),
    ...listSourceFiles("lib", [".ts", ".tsx"]),
    ...listSourceFiles("store", [".ts", ".tsx"]),
    ...listSourceFiles("app", [".ts", ".tsx"]),
  ];

  const actualImporters = candidates.filter((file) => {
    if (file === "store/useWindowStore.ts") return false; // the file itself
    const source = readSource(file);
    return /from\s+["'][^"']*\/useWindowStore["']/.test(source);
  });

  assert.deepEqual(
    [...actualImporters].sort(),
    [...knownImporters].sort(),
    "a new file imports the legacy, unmounted useWindowStore — it must not gain new production consumers",
  );
});

// ── 9. No second application/window registry ────────────────────────────

test("the legacy AppId registry (APP_MAP) has not silently grown beyond its known 11 ids", () => {
  const ids = Object.keys(APP_MAP).sort();
  assert.deepEqual(ids, [
    "about",
    "architect",
    "canvas",
    "explorer",
    "forge",
    "home",
    "launch",
    "memory",
    "projects",
    "settings",
    "templates",
  ]);
});

test("CATTIPU_SIDEBAR_ITEMS has not silently grown beyond its known 9 ids", () => {
  // Sidebar.tsx cannot be imported directly in this plain tsx/node test
  // runner — it side-effect-imports its own .css, and this suite has no
  // bundler (the same reason every other suite in tests/ only imports
  // pure lib/store modules). Reading the literal array as text keeps this
  // a real check on the shipped source rather than a hand-copied guess.
  const source = readSource("components/Sidebar/Sidebar.tsx");
  const match = source.match(
    /export const CATTIPU_SIDEBAR_ITEMS = \[([\s\S]*?)\] as const;/,
  );
  assert.ok(match, "CATTIPU_SIDEBAR_ITEMS literal not found in Sidebar.tsx");

  const ids = [...match![1].matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids, [
    "architect",
    "canvas",
    "explorer",
    "forge",
    "home",
    "launch",
    "memory",
    "projects",
    "settings",
  ]);
});

// ── 10. React components must not import an AI provider SDK ─────────────

test("no .tsx component imports a known AI provider SDK package", () => {
  const providerSdkPattern =
    /from\s+["'](openai|@anthropic-ai\/|@google\/generative-ai|@google-cloud\/aiplatform|cohere-ai|@azure\/openai|replicate|groq-sdk|mistralai|@aws-sdk\/client-bedrock)/i;

  for (const file of listSourceFiles("components", [".tsx"])) {
    const source = readSource(file);
    assert.doesNotMatch(source, providerSdkPattern, `${file} imports an AI provider SDK directly`);
  }

  const pkg = JSON.parse(readSource("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of Object.keys(allDeps)) {
    assert.doesNotMatch(name, providerSdkPattern, `package.json declares a provider SDK: ${name}`);
  }
});

// ── 11. React components must not own deployment/Forge/Live/Memory infra ──

test("no .tsx component performs network calls, spawns processes, or reads process.env (one documented dev-only exception)", () => {
  // components/PixelIcon/ShellIcon.tsx's process.env.NODE_ENV check is a
  // dev-only console-warning gate, recorded in docs/architecture/
  // BOUNDARY_AUDIT.md §3.3 as the one existing exception. It reads no
  // infrastructure and makes no network/process call.
  const allowedProcessEnv = new Set(["components/PixelIcon/ShellIcon.tsx"]);

  for (const file of listSourceFiles("components", [".tsx"])) {
    const source = readSource(file);
    assert.doesNotMatch(source, /child_process/, `${file} must not spawn a process`);
    assert.doesNotMatch(source, /\bfetch\(/, `${file} must not make a network call directly`);
    if (!allowedProcessEnv.has(file)) {
      assert.doesNotMatch(source, /process\.env/, `${file} reads process.env — infra belongs to a service`);
    }
  }
});

// ── 12. The diagnostics panel stays inside Settings, no new window id ───

test("SettingsApp still renders the diagnostics section, and no window id named \"diagnostics\" exists", () => {
  const settingsSource = readSource("components/Window/SettingsApp.tsx");
  assert.match(settingsSource, /"diagnostics"/, "SettingsApp must still expose a diagnostics section");
  assert.ok(
    !(CATTIPU_WINDOW_IDS as readonly string[]).includes("diagnostics"),
    "diagnostics must not become a managed WindowManager window id",
  );
});

// ── 13. Known architecture-drift checks remain visible ──────────────────

test("staticDriftChecks() still reports every known drift finding by id", () => {
  const ids = staticDriftChecks().map((c) => c.id);
  const required = [
    "windows.legacy-store-consumers",
    "notifications.center-unmounted",
    "system.icon-systems-duplicated",
    "project.import-direction",
    "ai.type-import-cycle",
    "filesystem.explorer-hydration-mismatch",
  ];
  for (const id of required) {
    assert.ok(ids.includes(id), `drift check "${id}" was removed — it must stay visible, not silently deleted`);
  }
});

// ── run ────────────────────────────────────────────────────────────────

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
