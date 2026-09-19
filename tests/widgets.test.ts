/**
 * Pre-M22 functional defect closure — the right widget stack's controls
 * and readouts must tell the truth.
 *
 * These render the real RightWidgetStack to static markup rather than
 * reading its source. The component is a plain function of its props, so
 * server rendering is enough to see exactly which controls a person is
 * offered and what they claim. Stylesheets and PixelForge SVG imports are
 * stubbed because Node cannot load them; neither affects what is asserted.
 *
 * Run with: npx tsx tests/widgets.test.ts
 */
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  systemStatusRows,
  type SystemStatusReadout,
} from "@/components/Diagnostics/diagnosticsPresentation";
import { diagnosticsService } from "@/lib/services/diagnostics/diagnosticsService";
import { useBootStore } from "@/store/useBootStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useSettingsStore } from "@/store/useSettingsStore";

// The repository compiles JSX with the classic runtime (tsconfig
// `jsx: preserve`, which tsx lowers to React.createElement).
(globalThis as Record<string, unknown>).React = React;
const loaders = require.extensions as unknown as Record<string, (m: { exports: unknown }) => void>;
loaders[".css"] = (m) => {
  m.exports = {};
};
loaders[".svg"] = (m) => {
  m.exports = { __esModule: true, default: () => null };
};

type WidgetModule = typeof import("@/components/RightWidgetStack/RightWidgetStack");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RightWidgetStack } = require("@/components/RightWidgetStack/RightWidgetStack") as WidgetModule;

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const render = (props: React.ComponentProps<typeof RightWidgetStack>) =>
  renderToStaticMarkup(React.createElement(RightWidgetStack, props));

/** Every Toolbox button in the markup, with the attributes that decide
 *  whether it looks and behaves like a working control. */
function toolboxButtons(html: string) {
  return [...html.matchAll(/<button[^>]*class="cattipu-right-widget-stack__tool [^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map(
    ([button, inner]) => ({
      disabled: /\sdisabled=""/.test(button),
      availability: button.match(/data-availability="(\w+)"/)?.[1],
      title: button.match(/title="([^"]*)"/)?.[1],
      pressable: inner.includes("cattipu-bevel--pressable"),
      label: inner.match(/tool-label">([^<]+)</)?.[1],
    }),
  );
}

const TOOLS = ["Entity", "Service", "Flow", "Screen", "API", "Job", "Script", "Config"];

// ── Toolbox ────────────────────────────────────────────────────────────

test("with no destination, every tool is disabled and says it is planned", () => {
  const tools = toolboxButtons(render({}));
  assert.deepEqual(
    tools.map((t) => t.label),
    TOOLS,
  );
  for (const tool of tools) {
    assert.equal(tool.disabled, true, `${tool.label} looks clickable but has no action`);
    assert.equal(tool.availability, "planned", tool.label);
    assert.equal(tool.title, `${tool.label} — planned`);
    assert.equal(tool.pressable, false, `${tool.label} still presses in like a working control`);
  }
});

test("a tool is only offered as pressable when a handler will receive it", () => {
  const tools = toolboxButtons(render({ onToolSelect: () => {} }));
  assert.equal(tools.length, TOOLS.length);
  for (const tool of tools) {
    assert.equal(tool.disabled, false, tool.label);
    assert.equal(tool.availability, "available", tool.label);
    assert.equal(tool.pressable, true, tool.label);
  }
});

// ── SYSTEM STATUS ──────────────────────────────────────────────────────

const observe = async () => systemStatusRows(await diagnosticsService.getSnapshot());
const row = (rows: SystemStatusReadout[], label: string) => {
  const found = rows.find((r) => r.label === label);
  assert.ok(found, `no ${label} row`);
  return found.value;
};

test("before the service answers, every row is UNKNOWN, not a guess", () => {
  const rows = systemStatusRows(null);
  assert.equal(rows.length, 7);
  for (const r of rows) assert.equal(r.value, "UNKNOWN", r.label);
});

test("unbuilt services never read READY, IDLE or OK", async () => {
  const rows = await observe();
  assert.equal(row(rows, "BUILD:"), "NOT IMPLEMENTED");
  assert.equal(row(rows, "MEMORY:"), "NOT IMPLEMENTED");
  // Architect works, but generation is seeded: no AI provider is connected.
  assert.equal(row(rows, "ARCHITECT:"), "SEEDED");
  for (const r of rows) {
    assert.ok(!["IDLE", "OK", "SAVED"].includes(r.value), `${r.label} claims ${r.value}`);
  }
  assert.ok(!rows.some((r) => r.label === "MEMORY INDEXED:"), "no memory index exists");
});

test("SOUND and CURSOR follow Settings, in both directions", async () => {
  const settings = useSettingsStore.getState();
  const before = { soundEnabled: settings.soundEnabled, cursorEnabled: settings.cursorEnabled };
  try {
    useSettingsStore.setState({ soundEnabled: false, cursorEnabled: false });
    let rows = await observe();
    assert.equal(row(rows, "SOUND:"), "OFF");
    assert.equal(row(rows, "CURSOR:"), "OFF");

    useSettingsStore.setState({ soundEnabled: true, cursorEnabled: true });
    rows = await observe();
    assert.equal(row(rows, "SOUND:"), "ON");
    assert.equal(row(rows, "CURSOR:"), "ON");
  } finally {
    useSettingsStore.setState(before);
  }
});

test("PROJECTS is the tracked project count, not SAVED", async () => {
  const before = useProjectStore.getState().projects;
  try {
    useProjectStore.setState({ projects: before.slice(0, 1) });
    assert.equal(row(await observe(), "PROJECTS:"), "1");
    useProjectStore.setState({ projects: [] });
    assert.equal(row(await observe(), "PROJECTS:"), "0");
  } finally {
    useProjectStore.setState({ projects: before });
  }
});

test("DESKTOP reports the boot phase, not a fixed READY", async () => {
  const before = useBootStore.getState().phase;
  try {
    useBootStore.setState({ phase: "booting" });
    assert.notEqual(row(await observe(), "DESKTOP:"), "READY");
    useBootStore.setState({ phase: "booted" });
    assert.equal(row(await observe(), "DESKTOP:"), "READY");
  } finally {
    useBootStore.setState({ phase: before });
  }
});

test("the widget draws exactly the rows it is given", async () => {
  const rows = await observe();
  const html = render({ statuses: rows });
  const drawn = [...html.matchAll(/<dt>([^<]*)<\/dt><dd>([^<]*)<\/dd>/g)].map(([, label, value]) => ({ label, value }));
  assert.deepEqual(drawn, rows);
});

// ── runner ─────────────────────────────────────────────────────────────

async function run() {
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

void run();
