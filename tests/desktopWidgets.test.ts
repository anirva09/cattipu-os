/**
 * MVP-09 — floating desktop widgets.
 *
 *   the wallpaper paints the whole desktop surface, under the widget column
 *   each widget's header keys are real: [_] folds, [□] unfolds, [X] closes
 *   closed widgets come back from ADD WIDGET or the desktop's Widgets menu
 *   what is closed or folded is saved with Settings and survives a reload
 *
 * Written against the wrong implementations this sprint could plausibly
 * ship: keys that are still decorative spans; a folded widget that still
 * draws its body; a closed widget with no way back; a saved list that can
 * hold an id no widget has; a wallpaper that still stops at the window
 * layer's edge; a surface that moves the Golden Master tile's origin.
 *
 * Run with: npx tsx tests/desktopWidgets.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DESKTOP_WIDGETS, DESKTOP_WIDGET_IDS, isDesktopWidgetId, sanitizeWidgetIds } from "@/lib/os/widgets";
import { MENU_COMMANDS } from "@/components/ContextMenu/menuCommands";
import { useSettingsStore } from "@/store/useSettingsStore";

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
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const render = (props: React.ComponentProps<typeof RightWidgetStack> = {}) =>
  renderToStaticMarkup(React.createElement(RightWidgetStack, props));

const noop = () => {};
const live = { onWidgetHidden: noop, onWidgetCollapsed: noop, onShowAllWidgets: noop };

/** Each widget section in the markup, with its keys. */
function sections(html: string) {
  return [...html.matchAll(/<section[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => ({
    label: m[1],
    open: m[0].match(/<section[^>]*>/)?.[0].includes('data-collapsed="true"') === false,
    html: m[0],
    keys: [...m[2].matchAll(/<button[^>]*data-control="(\w+)"[^>]*>/g)].map((k) => ({ control: k[1], tag: k[0] })),
  }));
}

// ── the registry ───────────────────────────────────────────────────────

test("one registry names every widget, in stack order, with unique ids and labels", () => {
  assert.deepEqual([...DESKTOP_WIDGET_IDS], ["welcome", "recent", "architect", "system", "toolbox"]);
  assert.equal(new Set(DESKTOP_WIDGETS.map((w) => w.label)).size, DESKTOP_WIDGETS.length);
  assert.equal(isDesktopWidgetId("toolbox"), true);
  assert.equal(isDesktopWidgetId("clock"), false);
  assert.deepEqual(sanitizeWidgetIds(["toolbox", "clock", "welcome", "welcome", 3]), ["welcome", "toolbox"], "unknown and duplicate ids are dropped, stack order kept");
  assert.deepEqual(sanitizeWidgetIds("toolbox"), []);
  assert.deepEqual(sanitizeWidgetIds(undefined), []);
});

// ── the keys are real ──────────────────────────────────────────────────

test("every widget has exactly two real keys, minimize and close, and no decorative maximize", () => {
  const html = render(live);
  const all = sections(html);
  assert.deepEqual(all.map((s) => s.label), DESKTOP_WIDGETS.map((w) => w.label));
  for (const s of all) {
    assert.deepEqual(s.keys.map((k) => k.control), ["minimize", "close"], s.label);
    for (const k of s.keys) {
      assert.doesNotMatch(k.tag, /disabled/, `${s.label} ${k.control} is live`);
      assert.match(k.tag, /aria-label="(Minimize|Close) /);
    }
  }
  assert.doesNotMatch(html, /__controls" aria-hidden="true"/, "the key row is no longer hidden from assistive technology");
  assert.doesNotMatch(html, /<span class="cattipu-right-widget-stack__control /, "no key is a painted span");
});

test("without handlers the keys are drawn disabled, never as live controls that do nothing", () => {
  for (const s of sections(render())) {
    for (const k of s.keys) assert.match(k.tag, /disabled=""/, `${s.label} ${k.control}`);
  }
  assert.doesNotMatch(render({ hiddenWidgets: ["toolbox"] }), /ADD WIDGET/, "no ADD WIDGET without a way to add");
});

test("a folded widget is its header plate alone, and its key says Restore", () => {
  const html = render({ ...live, collapsedWidgets: ["recent"] });
  const recent = sections(html).find((s) => s.label === "Recent Projects")!;
  assert.match(recent.html, /data-collapsed="true"/);
  assert.doesNotMatch(recent.html, /__body/, "no body while folded");
  assert.doesNotMatch(recent.html, /VIEW ALL/);
  assert.deepEqual(recent.keys.map((k) => k.control), ["restore", "close"]);
  assert.match(recent.keys[0].tag, /aria-label="Restore Recent Projects"/);
  assert.match(recent.keys[0].tag, /aria-expanded="false"/);
  assert.match(sections(html).find((s) => s.label === "Welcome")!.keys[0].tag, /aria-expanded="true"/, "the others are untouched");
  const css = read("components/RightWidgetStack/RightWidgetStack.css");
  assert.match(css, /__widget\[data-collapsed='true'\] \{[^}]*height: calc\(var\(--cattipu-widget-header-height\) \+ 2 \* var\(--cattipu-border-size\)\)/);
});

test("a closed widget is not drawn; ADD WIDGET appears only while something is closed", () => {
  const html = render({ ...live, hiddenWidgets: ["architect", "toolbox"] });
  assert.deepEqual(sections(html).map((s) => s.label), ["Welcome", "Recent Projects", "System Status"]);
  assert.match(html, /<button[^>]*class="cattipu-right-widget-stack__add [^"]*"[^>]*aria-haspopup="menu"[^>]*>ADD WIDGET<\/button>/);
  assert.doesNotMatch(render(live), /ADD WIDGET/);
  const none = render({ ...live, hiddenWidgets: [...DESKTOP_WIDGET_IDS] });
  assert.equal(sections(none).length, 0);
  assert.match(none, /ADD WIDGET/, "with everything closed there is still a way back");
});

test("widget contents are unchanged: the same frozen heights, tones and bodies", () => {
  const html = render(live);
  for (const [label, height] of [["Welcome", 88], ["Recent Projects", 138], ["Architect Preview", 132], ["System Status", 194], ["Toolbox", 176]] as const) {
    assert.match(sections(html).find((s) => s.label === label)!.html, new RegExp(`--cattipu-widget-height:${height}px`), label);
  }
  assert.match(html, /Welcome back, Creator\./);
  assert.match(html, /VIEW ALL/);
  assert.match(html, /aria-label="Architect preview"/);
  assert.equal((html.match(/cattipu-right-widget-stack__tool /g) ?? []).length, 8, "the Toolbox shelf keeps its eight tools");
});

// ── the settings record ────────────────────────────────────────────────

test("Settings owns what is closed and folded, in stack order; Show All puts everything back", () => {
  const s = useSettingsStore;
  s.setState({ hiddenWidgets: [], collapsedWidgets: [] });
  s.getState().setWidgetHidden("toolbox", true);
  s.getState().setWidgetHidden("welcome", true);
  s.getState().setWidgetHidden("welcome", true);
  assert.deepEqual(s.getState().hiddenWidgets, ["welcome", "toolbox"], "stack order, no duplicates");
  s.getState().setWidgetHidden("toolbox", false);
  assert.deepEqual(s.getState().hiddenWidgets, ["welcome"]);
  s.getState().setWidgetCollapsed("system", true);
  assert.deepEqual(s.getState().collapsedWidgets, ["system"]);
  s.getState().showAllWidgets();
  assert.deepEqual([s.getState().hiddenWidgets, s.getState().collapsedWidgets], [[], []]);
});

test("a saved record survives a reload; malformed or pre-MVP-09 records load as nothing closed", async () => {
  const g = globalThis as Record<string, unknown>;
  const had = { localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"), window: Object.getOwnPropertyDescriptor(g, "window") };
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
  Object.defineProperty(g, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  const pattern = /[\\/]store[\\/]useSettingsStore\.ts$/;
  const saved = Object.keys(require.cache).filter((k) => pattern.test(k)).map((k) => [k, require.cache[k]] as const);
  const fresh = () => {
    for (const key of Object.keys(require.cache).filter((k) => pattern.test(k))) delete require.cache[key];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@/store/useSettingsStore") as typeof import("@/store/useSettingsStore")).useSettingsStore;
  };
  try {
    const first = fresh();
    first.getState().setWidgetHidden("architect", true);
    first.getState().setWidgetCollapsed("welcome", true);
    const reloaded = fresh().getState();
    assert.deepEqual([reloaded.hiddenWidgets, reloaded.collapsedWidgets], [["architect"], ["welcome"]]);

    // Written before MVP-09: no widget fields at all.
    data.set("cattipu-settings", JSON.stringify({ state: { wallpaper: "cad-dark", soundEnabled: false }, version: 1 }));
    const old = fresh().getState();
    assert.deepEqual([old.hiddenWidgets, old.collapsedWidgets, old.wallpaper, old.soundEnabled], [[], [], "cad-dark", false], "nothing else is disturbed");

    // Hand-edited or from another build.
    data.set("cattipu-settings", JSON.stringify({ state: { hiddenWidgets: ["clock", "toolbox"], collapsedWidgets: "all" }, version: 1 }));
    const odd = fresh().getState();
    assert.deepEqual([odd.hiddenWidgets, odd.collapsedWidgets], [["toolbox"], []]);
  } finally {
    for (const key of Object.keys(require.cache).filter((k) => pattern.test(k))) delete require.cache[key];
    for (const [key, mod] of saved) require.cache[key] = mod;
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
});

// ── the desktop surface ────────────────────────────────────────────────

test("the wallpaper paints the whole desktop surface, under the widget column", () => {
  const css = read("components/InteractiveDesktop/InteractiveDesktop.css");
  const surface = css.match(/\.cattipu-interactive-desktop__surface \{([^}]*)\}/)?.[1] ?? "";
  assert.match(surface, /left: var\(--cattipu-desktop-sidebar-width\);/, "same origin as the window layer: the tile does not move");
  assert.match(surface, /top: var\(--cattipu-desktop-topbar-height\);/);
  assert.match(surface, /right: 0;/, "to the right edge, under the widgets");
  assert.match(surface, /bottom: var\(--cattipu-desktop-bottom-height\);/);
  assert.match(surface, /pointer-events: none;/);
  assert.match(surface, /url\("\/assets\/cattipu\/engineering-paper-8px\.png"\)/, "Engineering Paper stays the fallback");
  const layer = css.match(/\.cattipu-interactive-desktop__window-layer \{([^}]*)\}/)?.[1] ?? "";
  assert.match(layer, /right: var\(--cattipu-desktop-window-layer-right\);/, "window bounds, snaps and tiles keep their box");
  assert.match(layer, /background: transparent;/);
  assert.doesNotMatch(layer, /background-image/);

  const desktop = read("components/InteractiveDesktop/InteractiveDesktop.tsx");
  assert.ok(desktop.indexOf("__surface") < desktop.indexOf("__window-layer\""), "the surface is painted beneath the window layer");
  const shell = read("components/Shell/CattipuShell.tsx");
  assert.match(shell, /desktopSurface=\{<DesktopWallpaper wallpaper=\{wallpaper\} \/>\}/);
  assert.equal((shell.match(/<DesktopWallpaper /g) ?? []).length, 1, "the wallpaper is drawn once, on the surface");
});

test("the shell reads widget state hydration-safely and the desktop menu lists every widget", () => {
  const shell = read("components/Shell/CattipuShell.tsx");
  assert.match(shell, /function useDesktopWidgets\(\)[\s\S]*?useSyncExternalStore\(subscribeNever, \(\) => true, \(\) => false\)[\s\S]*?hydrated \? hidden : NO_WIDGETS/);
  assert.equal(MENU_COMMANDS.widgets.label, "Widgets");
  assert.equal(MENU_COMMANDS.showAllWidgets.label, "Show All Widgets");
  const layer = read("components/DesktopObjects/DesktopObjectLayer.tsx");
  assert.match(layer, /\.\.\.MENU_COMMANDS\.widgets,[\s\S]*?DESKTOP_WIDGETS\.map[\s\S]*?hint: hidden \? "OFF" : "ON"[\s\S]*?MENU_COMMANDS\.showAllWidgets/);
  // One menu component: the column's ADD WIDGET opens the shared ContextMenu.
  assert.match(read("components/RightWidgetStack/RightWidgetStack.tsx"), /<ContextMenu\s/);
});

test("the left rail is untouched by this sprint", () => {
  // The rail was explicitly out of scope; its item list and component stay as they were.
  assert.match(read("components/Sidebar/Sidebar.tsx"), /\{ id: 'launch', label: 'Launch' \},\r?\n  \{ id: 'explorer', label: 'Explorer' \},/);
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
