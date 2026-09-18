/**
 * M21 (Wallpaper Studio) — regression tests for the wallpaper family and
 * its single owner.
 *
 * Written against the specific wrong implementations this milestone could
 * drift into:
 *
 *  - a registry that silently loses its default, or grows a second one,
 *    is what makes every existing desktop change on upgrade;
 *  - a settings migration that rebuilds the record instead of patching it
 *    is the bug that wipes a person's cursor and sound choices to add one
 *    field — so the store is rehydrated here from a real legacy record;
 *  - a Studio or Desktop that keeps "just a small list" of its own, or a
 *    second persisted key, is the duplicate owner Constitution §19 forbids;
 *  - a surface that points at a remote URL breaks the offline workstation.
 *
 * Run with: npx tsx tests/wallpaper.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  DEFAULT_WALLPAPER_ID,
  WALLPAPERS,
  WALLPAPER_IDS,
  WALLPAPER_SETTINGS_VERSION,
  getWallpaper,
  isWallpaperId,
  migrateWallpaperSetting,
  resolveWallpaperId,
} from "@/lib/os/wallpapers";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function listFiles(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const abs = join(ROOT, dir, entry);
    if (statSync(abs).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...listFiles(relative(ROOT, abs), extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      out.push(relative(ROOT, abs).split("\\").join("/"));
    }
  }
  return out;
}

// ── registry ───────────────────────────────────────────────────────────

test("the family is exactly the six M21 wallpapers, in registry order", () => {
  assert.deepEqual(
    WALLPAPERS.map((w) => w.id),
    ["engineering-paper", "blueprint-grid", "graph-paper", "cad-dark", "industrial-hatch", "molded-cream"],
  );
  assert.deepEqual([...WALLPAPER_IDS], WALLPAPERS.map((w) => w.id));
});

test("wallpaper ids and display names are unique", () => {
  assert.equal(new Set(WALLPAPERS.map((w) => w.id)).size, WALLPAPERS.length);
  assert.equal(new Set(WALLPAPERS.map((w) => w.name)).size, WALLPAPERS.length);
});

test("there is exactly one default and it is Engineering Paper", () => {
  assert.equal(DEFAULT_WALLPAPER_ID, "engineering-paper");
  assert.equal(WALLPAPERS.filter((w) => w.id === DEFAULT_WALLPAPER_ID).length, 1);
});

test("Engineering Paper still paints the Golden Master 8px tile the window layer uses", () => {
  const paper = getWallpaper("engineering-paper");
  const layerCss = read("components/InteractiveDesktop/InteractiveDesktop.css");
  assert.equal(paper.surface.backgroundColor, "#E9DFC4");
  assert.equal(paper.surface.backgroundSize, "8px 8px");
  assert.ok(paper.surface.backgroundImage?.includes("/assets/cattipu/engineering-paper-8px.png"));
  assert.ok(layerCss.includes('url("/assets/cattipu/engineering-paper-8px.png")'));
});

test("every entry carries complete metadata on the shell's 8px grid", () => {
  for (const w of WALLPAPERS) {
    assert.ok(w.name.trim() && w.description.trim() && w.material.trim(), `${w.id}: empty text field`);
    assert.ok(["raster-tile", "line-grid", "pixel-tile"].includes(w.kind), `${w.id}: kind`);
    assert.ok(w.tone === "light" || w.tone === "dark", `${w.id}: tone`);
    assert.ok(Number.isInteger(w.tilePx) && w.tilePx > 0 && w.tilePx % 8 === 0, `${w.id}: tilePx ${w.tilePx}`);
    assert.match(w.surface.backgroundColor, /^#[0-9A-F]{6}$/i, `${w.id}: backgroundColor`);
    for (const size of (w.surface.backgroundSize ?? "").match(/[\d.]+px/g) ?? []) {
      assert.ok(Number.isInteger(parseFloat(size)), `${w.id}: fractional tile size ${size}`);
    }
  }
});

test("surfaces are plain serializable CSS data, not components or nodes", () => {
  const round = JSON.parse(JSON.stringify(WALLPAPERS));
  assert.deepEqual(round, WALLPAPERS);
  for (const w of WALLPAPERS) {
    for (const value of Object.values(w.surface)) assert.equal(typeof value, "string");
  }
});

test("no surface references a remote asset; local assets exist on disk", () => {
  for (const w of WALLPAPERS) {
    const urls = [...(w.surface.backgroundImage ?? "").matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    for (const url of urls) {
      if (url.startsWith("data:image/svg+xml,")) continue;
      assert.ok(url.startsWith("/") && !url.startsWith("//"), `${w.id}: non-local url ${url}`);
      assert.ok(existsSync(join(ROOT, "public", url)), `${w.id}: missing asset public${url}`);
    }
    assert.doesNotMatch(w.surface.backgroundImage ?? "", /https?:/, `${w.id}: remote url`);
  }
});

test("dark tones are the two dark surfaces, so labels get their plate there only", () => {
  assert.deepEqual(
    WALLPAPERS.filter((w) => w.tone === "dark").map((w) => w.id),
    ["blueprint-grid", "cad-dark"],
  );
});

// ── resolution and migration ───────────────────────────────────────────

test("unknown, legacy and malformed values resolve to the default", () => {
  for (const value of [undefined, null, "", "paper-grain", "sunrise-geometry", "CAD-DARK", 7, {}]) {
    assert.equal(resolveWallpaperId(value), DEFAULT_WALLPAPER_ID, String(value));
    assert.equal(isWallpaperId(value), false);
  }
  for (const id of WALLPAPER_IDS) assert.equal(resolveWallpaperId(id), id);
});

test("pre-M21 records migrate every legacy wallpaper to the default the desktop actually showed", () => {
  assert.equal(WALLPAPER_SETTINGS_VERSION, 1);
  for (const legacy of ["paper-grain", "blueprint-grid", "sunrise-geometry", undefined]) {
    assert.equal(migrateWallpaperSetting(legacy, 0), DEFAULT_WALLPAPER_ID, String(legacy));
  }
  assert.equal(migrateWallpaperSetting("cad-dark", 1), "cad-dark");
  assert.equal(migrateWallpaperSetting("nonsense", 1), DEFAULT_WALLPAPER_ID);
});

// ── the real settings store, against real persisted records ────────────

// One map for the whole file: zustand resolves its storage once, when the
// store module is first imported, so later tests reseed this same map.
const data = new Map<string, string>();

function installStorage(seed: Record<string, string>) {
  data.clear();
  for (const [k, v] of Object.entries(seed)) data.set(k, v);
  // zustand's persist reads `window.localStorage`, and Node ships its own
  // getter-only `localStorage` global, so both are defined explicitly.
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
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });
  return data;
}

test("a legacy v0 settings record keeps every other preference and gains the default wallpaper", async () => {
  installStorage({
    "cattipu-settings": JSON.stringify({
      state: {
        wallpaper: "blueprint-grid",
        dockMode: "always",
        dockIconSize: "lg",
        cursorEnabled: false,
        soundEnabled: false,
        soundVolume: 0.2,
      },
      version: 0,
    }),
  });
  const { useSettingsStore } = await import("@/store/useSettingsStore");
  await useSettingsStore.persist.rehydrate();

  const s = useSettingsStore.getState();
  assert.equal(s.wallpaper, DEFAULT_WALLPAPER_ID);
  assert.equal(s.cursorEnabled, false);
  assert.equal(s.soundEnabled, false);
  assert.equal(s.soundVolume, 0.2);
  assert.equal(s.dockMode, "always");
  assert.equal(s.dockIconSize, "lg");

  // Applying writes through the one persisted key, at the new version.
  s.setWallpaper("cad-dark");
  const saved = JSON.parse(data.get("cattipu-settings")!);
  assert.equal(saved.version, WALLPAPER_SETTINGS_VERSION);
  assert.equal(saved.state.wallpaper, "cad-dark");
  assert.equal(saved.state.cursorEnabled, false);
  assert.deepEqual([...data.keys()], ["cattipu-settings"]);
});

test("a current-version record with an unknown id loads as the default; a valid one survives reload", async () => {
  installStorage({
    "cattipu-settings": JSON.stringify({ state: { wallpaper: "sunrise-geometry", soundVolume: 0.8 }, version: 1 }),
  });
  const { useSettingsStore } = await import("@/store/useSettingsStore");
  await useSettingsStore.persist.rehydrate();
  assert.equal(useSettingsStore.getState().wallpaper, DEFAULT_WALLPAPER_ID);
  assert.equal(useSettingsStore.getState().soundVolume, 0.8);

  data.set("cattipu-settings", JSON.stringify({ state: { wallpaper: "molded-cream" }, version: 1 }));
  await useSettingsStore.persist.rehydrate();
  assert.equal(useSettingsStore.getState().wallpaper, "molded-cream");
});

// ── single owner ───────────────────────────────────────────────────────

test("only useSettingsStore holds wallpaper state — no wallpaper store, context or storage key", () => {
  const offenders = listFiles("store", [".ts"])
    .concat(listFiles("components", [".ts", ".tsx"]))
    .concat(listFiles("lib", [".ts"]))
    .filter((file) => {
      const src = read(file);
      return (
        /use[A-Z]\w*Wallpaper\w*Store|Wallpaper\w*Context|createContext[^;]*[Ww]allpaper/.test(src) ||
        (/wallpaper/i.test(src) && /(localStorage|sessionStorage)\.setItem/.test(src) &&
          !file.endsWith("useSettingsStore.ts"))
      );
    });
  assert.deepEqual(offenders, [], offenders.join(", "));
  assert.deepEqual(
    listFiles("store", [".ts"]).filter((f) => /wallpaper\s*:/.test(read(f))),
    ["store/useSettingsStore.ts"],
  );
});

test("Desktop and Studio read the registry; no component repeats the wallpaper id list", () => {
  assert.match(read("components/DesktopWallpaper/DesktopWallpaper.tsx"), /from "@\/lib\/os\/wallpapers"/);
  assert.match(read("components/WallpaperStudio/WallpaperStudio.tsx"), /\bWALLPAPERS\b[\s\S]*from "@\/lib\/os\/wallpapers"/);
  const nonDefault = WALLPAPER_IDS.filter((id) => id !== DEFAULT_WALLPAPER_ID);
  const repeats = listFiles("components", [".ts", ".tsx", ".css"])
    .concat(listFiles("app", [".ts", ".tsx", ".css"]))
    .filter((file) => nonDefault.some((id) => read(file).includes(`"${id}"`) || read(file).includes(`'${id}'`)));
  assert.deepEqual(repeats, []);
});

test("Wallpaper Studio is a Settings section, not a new window, app or sidebar entry", () => {
  const settings = read("components/Window/SettingsApp.tsx");
  assert.match(settings, /section === "wallpaper" && <WallpaperStudio \/>/);
  assert.doesNotMatch(read("components/WindowManager/windowManager.reducer.ts"), /["']wallpaper["']/);
  assert.doesNotMatch(read("lib/apps.ts"), /wallpaper/i);
  assert.doesNotMatch(read("components/Sidebar/Sidebar.tsx"), /wallpaper/i);
});

test("the wallpaper surfaces add no Lucide, no network calls and no body styling", () => {
  for (const file of [
    "components/WallpaperStudio/WallpaperStudio.tsx",
    "components/DesktopWallpaper/DesktopWallpaper.tsx",
    "lib/os/wallpapers.ts",
  ]) {
    const src = read(file);
    assert.doesNotMatch(src, /lucide-react/, file);
    // The one allowed http: string is the SVG namespace inside an inline tile.
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org\/2000\/svg)/, file);
    assert.doesNotMatch(src, /document\.body|document\.documentElement/, file);
  }
  assert.doesNotMatch(read("components/Window/SettingsApp.tsx"), /\bPalette\b.*lucide|import \{[^}]*\bPalette\b/);
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
