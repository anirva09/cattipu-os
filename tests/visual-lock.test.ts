/**
 * Final visual lock — regression tests for typography, menus and the
 * PixelForge family.
 *
 * Like tests/icons.test.ts these read source and asset text; they do not
 * compare screenshots. They pin the rules a later edit could silently break:
 *
 *  - shell text drifting back to requested bold, fractional sizes or a
 *    second font, and the portalled menu losing the design-system variables;
 *  - the desktop and Explorer menus restating labels and icons instead of
 *    sharing one presentation table;
 *  - an SVG that no longer matches the grid it was manufactured from, a
 *    registry name with no asset, a duplicated id, or lucide creeping back
 *    into the surfaces this pass migrated.
 *
 * Run with: npx tsx tests/visual-lock.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { cattipuCssVariables, cattipuTokens } from "../design-system/tokens";
import { MENU_COMMANDS, MENU_OBJECT_ICONS } from "../components/ContextMenu/menuCommands";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** Shell stylesheets this pass moved onto the role tokens. */
const MIGRATED_CSS = [
  "components/BottomStatusBar/BottomStatusBar.css",
  "components/ContextMenu/ContextMenu.css",
  "components/DesktopObjects/DesktopObjectLayer.css",
  "components/DetailsPanel/DetailsPanel.css",
  "components/Diagnostics/Diagnostics.css",
  "components/Explorer/ExplorerApp.css",
  "components/FolderTreeItem/FolderTreeItem.css",
  "components/InteractiveDesktop/InteractiveDesktop.css",
  "components/ProjectCard/ProjectCard.css",
  "components/RightWidgetStack/RightWidgetStack.css",
  "components/Sidebar/Sidebar.css",
  "components/SidebarButton/SidebarButton.css",
  "components/TopBar/TopBar.css",
  "components/WallpaperStudio/WallpaperStudio.css",
  "components/Window/Window.css",
  "components/Window/SettingsApp.css",
  "components/Window/PlaceholderApp.css",
];

/** Registry block `export const NAME = { ... }` as a map of key → value text. */
function registryBlock(source: string, name: string): Map<string, string> {
  const block = source.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(block, `${name} not found`);
  return new Map([...block.matchAll(/^\s+([\w]+): ([^,\n]+),?$/gm)].map((m) => [m[1], m[2].trim()]));
}

// ── typography ─────────────────────────────────────────────────────────

test("the shell face is a local asset registered under the token's family name", () => {
  assert.ok(existsSync(join(ROOT, "public/fonts/Web437_IBM_VGA_8x16.woff")));
  assert.match(read("app/globals.css"), /font-family: "Px437 IBM VGA8";[\s\S]*?src: url\("\/fonts\/Web437_IBM_VGA_8x16\.woff"\)/);
  assert.match(cattipuTokens.type.family, /^'Px437 IBM VGA8'/);
});

test("role metrics are whole pixels at weight 400, published as CSS variables", () => {
  const { type } = cattipuTokens;
  const roles = ["desktopTitle", "windowTitle", "widgetHeader", "body", "status"] as const;
  assert.deepEqual(
    roles.map((r) => [type[r], type.lineHeight[r]]),
    [[26, 28], [18, 20], [15, 16], [13, 16], [11, 12]],
  );
  for (const r of roles) {
    assert.ok(Number.isInteger(type[r]) && Number.isInteger(type.lineHeight[r]), r);
    assert.ok(type.lineHeight[r] >= type[r], `${r}: line box smaller than the text`);
  }
  assert.equal(type.weight, 400);
  for (const role of ["desktop-title", "window-title", "widget-header", "body", "status"]) {
    for (const part of ["size", "line"]) {
      assert.ok(`--cattipu-type-${role}-${part}` in cattipuCssVariables, `${role}-${part}`);
    }
  }
  assert.equal(cattipuCssVariables["--cattipu-type-weight"], "400");
});

test("the page never synthesizes weight, italic or small caps", () => {
  assert.match(read("app/globals.css"), /body \{[\s\S]*?font-synthesis: none;/);
});

test("migrated shell CSS requests no bold and no fractional type metrics", () => {
  for (const file of MIGRATED_CSS) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css, /font-weight:\s*(bold|[5-9]00)\b/, `${file}: requested weight`);
    for (const m of css.matchAll(/(font-size|line-height|letter-spacing):\s*([^;]+);/g)) {
      assert.doesNotMatch(m[2], /\d\.\d+(px|em|rem)/, `${file}: fractional ${m[1]} ${m[2]}`);
      assert.doesNotMatch(m[2], /\d(em|rem)\b/, `${file}: relative ${m[1]} ${m[2]} drifts off the pixel grid`);
    }
  }
});

test("Settings is built from the shell's roles and primitives, not a Tailwind card UI", () => {
  const src = read("components/Window/SettingsApp.tsx");
  assert.match(src, /import "\.\/SettingsApp\.css";/);
  assert.doesNotMatch(src, /\brounded(-\w+)?\b|\bfont-(medium|semibold|bold)\b|\btext-(xs|sm|base)\b|\bitalic\b/);
});

// ── menus ──────────────────────────────────────────────────────────────

test("the portalled menu republishes the design-system variables and uses the body role", () => {
  const tsx = read("components/ContextMenu/ContextMenu.tsx");
  assert.match(tsx, /createPortal\(/);
  assert.match(tsx, /\.\.\.cattipuCssVariables,/);
  const css = read("components/ContextMenu/ContextMenu.css");
  assert.match(css, /\.cattipu-context-menu \{[\s\S]*?font-family: var\(--cattipu-font-ui\);[\s\S]*?font-size: var\(--cattipu-type-body-size\);/);
  assert.match(css, /\.cattipu-context-menu__item \{[\s\S]*?height: 24px;/);
  assert.match(css, /grid-template-columns: 24px [^;]* 16px;/);
});

test("one menu component: only ContextMenu renders role=\"menu\" in the live shell", () => {
  const owners = ["components", "app"]
    .flatMap((dir) => listFiles(dir, ".tsx"))
    .filter((f) => /role="menu"/.test(read(f)));
  assert.deepEqual(owners, ["components/ContextMenu/ContextMenu.tsx"]);
});

test("desktop and Explorer menus share one presentation table", () => {
  for (const file of ["components/DesktopObjects/DesktopObjectLayer.tsx", "components/Explorer/ExplorerApp.tsx"]) {
    const src = read(file);
    assert.match(src, /from "\.\.\/ContextMenu\/menuCommands"/, file);
    for (const { label } of Object.values(MENU_COMMANDS)) {
      assert.doesNotMatch(src, new RegExp(`label: "${label}"`), `${file} restates "${label}"`);
    }
    assert.doesNotMatch(src, /icon: "\w+"( as ShellIconName)?,/, `${file} hard-codes a menu mark`);
  }
});

test("menu labels are unique Title Case and every menu mark is a registered shell mark", () => {
  const names = new Set(registryBlock(read("components/PixelIcon/shellIcons.ts"), "SHELL_ICONS_16").keys());
  const labels = Object.values(MENU_COMMANDS).map((c) => c.label);
  assert.equal(new Set(labels).size, labels.length);
  for (const label of labels) assert.match(label, /^([A-Z][a-z]*)( [A-Z][a-z]*)*$/, label);
  for (const c of Object.values(MENU_COMMANDS)) if ("icon" in c) assert.ok(names.has(c.icon), c.icon);
  for (const icon of Object.values(MENU_OBJECT_ICONS)) assert.ok(names.has(icon), icon);
  assert.equal(MENU_COMMANDS.open.icon, "folderopen");
  assert.equal(MENU_COMMANDS.changeWallpaper.icon, "wallpaper");
});

// ── icons ──────────────────────────────────────────────────────────────

type Mark = { label: string; id: string; shell?: boolean; toolbox?: boolean };
async function generator(): Promise<{ PIXELFORGE_MARKS: Record<string, Mark>; toSvg: (rows: string[], label: string) => string }> {
  return import(pathToFileURL(join(ROOT, "scripts/gen_pixelforge.mjs")).href);
}
const gridRows = (size: number, name: string) =>
  read(`scripts/pixelforge/grids/${size}/${name}.txt`).trimEnd().split(/\r?\n/);
const sizesOf = (mark: Mark) => (mark.toolbox ? [32] : [16, 32]);
const svgPath = (name: string, mark: Mark, size: number) =>
  mark.toolbox ? `public/pixelforge/toolbox/${name}-32.svg` : `public/pixelforge/shell/${size}/${name}.svg`;

test("every manufactured SVG is exactly its grid", async () => {
  const { PIXELFORGE_MARKS, toSvg } = await generator();
  for (const [name, mark] of Object.entries(PIXELFORGE_MARKS)) {
    for (const size of sizesOf(mark)) {
      const rows = gridRows(size, name);
      assert.equal(rows.length, size, `${size}/${name}`);
      assert.ok(rows.every((r) => r.length === size), `${size}/${name}`);
      assert.equal(read(svgPath(name, mark, size)).replace(/\r\n/g, "\n"), toSvg(rows, mark.label), `${size}/${name}`);
    }
  }
});

test("32px masters shown at 32 keep the 2px near-black contour inside the breathing row", async () => {
  const { PIXELFORGE_MARKS } = await generator();
  const palette = JSON.parse(read("scripts/pixelforge/palette.json")) as Record<string, string>;
  assert.equal(palette.K, "#241f12");
  // 16-first marks: their only production size is 16; the 32 is a 2× doubling.
  const sixteenFirst = new Set(["wallpaper", "dock", "cursor", "sound", "diagnostics", "about", "info", "ready", "warning", "error"]);
  for (const name of Object.keys(PIXELFORGE_MARKS).filter((n) => !sixteenFirst.has(n))) {
    const rows = gridRows(32, name);
    assert.ok(/^\.+$/.test(rows[0]) && /^\.+$/.test(rows[31]), `${name}: draws in row 0 or 31`);
    assert.ok(rows.every((r) => r[0] === "." && r[31] === "."), `${name}: draws in column 0 or 31`);
    // Every opaque pixel on the silhouette edge is outline: the exterior ring.
    for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
      if (rows[y][x] === ".") continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => rows[y + dy][x + dx] === ".");
      if (edge) assert.equal(rows[y][x], "K", `${name}: non-outline pixel on the silhouette at ${x},${y}`);
    }
  }
  for (const name of sixteenFirst) {
    const small = gridRows(16, name);
    const doubled = small.flatMap((r) => {
      const w = [...r].map((c) => c + c).join("");
      return [w, w];
    });
    assert.deepEqual(gridRows(32, name), doubled, `${name}: 32 is not the 2× doubling of its 16`);
  }
});

test("manufacturing ids are unique, and the shell registry resolves every name at both sizes", async () => {
  const { PIXELFORGE_MARKS } = await generator();
  const ids = Object.values(PIXELFORGE_MARKS).map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);

  const src = read("components/PixelIcon/shellIcons.ts");
  const at32 = registryBlock(src, "SHELL_ICONS_32");
  const at16 = registryBlock(src, "SHELL_ICONS_16");
  const shellIds = registryBlock(src, "SHELL_ICON_IDS");
  assert.deepEqual([...at16.keys()].sort(), [...at32.keys()].sort());
  assert.deepEqual([...shellIds.keys()].sort(), [...at32.keys()].sort());
  assert.equal(new Set(shellIds.values()).size, shellIds.size, "duplicate SHELL_ICON_IDS");
  for (const [name, mark] of Object.entries(PIXELFORGE_MARKS)) {
    if (mark.toolbox) continue;
    assert.ok(at32.has(name) && at16.has(name), `${name} manufactured but not registered`);
    assert.equal(shellIds.get(name), `'${mark.id}'`, `${name}: registry and manufacturing ids differ`);
  }
  for (const m of src.matchAll(/from '\.\.\/\.\.\/(public\/pixelforge\/[^']+\.svg)'/g)) {
    assert.ok(existsSync(join(ROOT, m[1])), m[1]);
  }
});

test("filesystem family: tree, cards and menus draw from the registry, not their own glyphs", () => {
  const tree = read("components/FolderTreeItem/FolderTreeItem.tsx");
  assert.match(tree, /<ShellIcon name=\{iconFor\(node\)\} size=\{16\} \/>/);
  assert.match(tree, /'archived'\) return 'archive'/);
  assert.match(tree, /'templates'\) return 'template'/);
  const card = read("components/ProjectCard/ProjectCard.tsx");
  assert.match(card, /<ShellIcon name="projects" size=\{32\} \/>/);
  for (const file of ["components/FolderTreeItem/FolderTreeItem.tsx", "components/ProjectCard/ProjectCard.tsx"]) {
    assert.doesNotMatch(read(file), /<svg\b|<path\b/, `${file} draws its own glyph`);
  }
  const explorer = read("components/Explorer/ExplorerApp.tsx");
  assert.match(explorer, /if \(kind === "folder"\) return "folder";/);
});

test("Architect and Canvas are the manufactured CATTIPU marks", async () => {
  const { PIXELFORGE_MARKS } = await generator();
  for (const name of ["architect", "canvas"]) {
    assert.ok(PIXELFORGE_MARKS[name]?.shell, name);
    const rows = gridRows(32, name).join("");
    assert.match(rows, name === "architect" ? /P/ : /N/, `${name}: semantic colour missing`);
    assert.match(rows, /[YGg]/, `${name}: gold accent missing`);
  }
});

test("Settings navigation and the placeholder window use PixelForge only", () => {
  const settings = read("components/Window/SettingsApp.tsx");
  assert.doesNotMatch(settings, /from "lucide-react"|components\/Icons/);
  const nav = [...settings.matchAll(/\{ id: "(\w+)", label: "[^"]+", icon: "(\w+)" \}/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(nav, [
    ["wallpaper", "wallpaper"], ["dock", "dock"], ["cursor", "cursor"], ["sound", "sound"],
    ["notifications", "bell"], ["diagnostics", "diagnostics"], ["about", "about"],
  ]);
  const placeholder = read("components/Window/PlaceholderApp.tsx");
  assert.doesNotMatch(placeholder, /AppIcon|framer-motion|rounded/);
  assert.match(placeholder, /<ShellIcon name=\{app\.icon\} size=\{32\} \/>/);
});

// ── helpers / run ──────────────────────────────────────────────────────

function listFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(ext)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

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
