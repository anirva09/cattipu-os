/**
 * M21 (PixelForge Toolbox refinement) — regression tests for the icon
 * assets the shell renders.
 *
 * These read the committed SVG masters as text. They do not compare
 * pixels; they pin the manufacturing rules a redraw can silently break:
 *
 *  - a registry entry whose import points at a file that does not exist
 *    (PixelIcon renders a "Missing PixelForge icon" marker in dev and
 *    nothing in production);
 *  - a Toolbox tool with no mark, or a mark no tool uses;
 *  - a Toolbox mark drawn with browser-rasterised geometry — polygons,
 *    curves, transforms, gradients, filters or embedded bitmaps — instead
 *    of integer pixel runs;
 *  - a Toolbox colour that is not already part of the Sheet 01 family the
 *    sidebar ships, which is how the Toolbox drifted into a second palette.
 *
 * Run with: npx tsx tests/icons.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const TOOLBOX_DIR = "public/pixelforge/toolbox";
const SHELL_DIR = "public/pixelforge/shell";

/** `import X from '../../public/....svg'` lines, resolved from the importing file. */
function svgImports(file: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of read(file).matchAll(/^import (\w+) from ['"](\.[^'"]+\.svg)['"];/gm)) {
    out.set(m[1], resolve(dirname(join(ROOT, file)), m[2]));
  }
  return out;
}

function fills(svg: string): Set<string> {
  return new Set([...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()));
}

const toolboxIds = [...read("components/RightWidgetStack/RightWidgetStack.tsx").matchAll(/\{ id: '(\w+)', label: '[^']+' \}/g)].map(
  (m) => m[1],
);

test("every PixelForge SVG the registries import exists on disk", () => {
  const imports = new Map([
    ...svgImports("components/PixelIcon/PixelIcon.ts"),
    ...svgImports("components/PixelIcon/shellIcons.ts"),
  ]);
  assert.ok(imports.size >= 8 + 2 * 22, `only ${imports.size} imports found`);
  for (const [name, path] of imports) assert.ok(existsSync(path), `${name} → ${path}`);
});

test("the Toolbox's eight tools each have exactly one 32px master, and no orphan marks exist", () => {
  assert.deepEqual(toolboxIds, ["entity", "service", "flow", "screen", "api", "job", "script", "config"]);
  const files = readdirSync(join(ROOT, TOOLBOX_DIR)).sort();
  assert.deepEqual(files, toolboxIds.map((id) => `${id}-32.svg`).sort());
  const registry = read("components/PixelIcon/PixelIcon.ts");
  for (const id of toolboxIds) {
    assert.match(registry, new RegExp(`from '\\.\\./\\.\\./public/pixelforge/toolbox/${id}-32\\.svg'`), id);
  }
});

test("Toolbox masters are 32x32, crisp-edged, integer pixel runs only", () => {
  for (const id of toolboxIds) {
    const svg = read(`${TOOLBOX_DIR}/${id}-32.svg`);
    assert.match(svg, /viewBox="0 0 32 32"/, id);
    assert.match(svg, /width="32" height="32"/, id);
    assert.match(svg, /shape-rendering="crispEdges"/, id);
    assert.doesNotMatch(
      svg,
      /<(polygon|polyline|circle|ellipse|line|image|text|linearGradient|radialGradient|filter|use)\b|transform=|stroke=|opacity=/,
      id,
    );
    for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
      assert.match(m[1], /^(M\d+ \d+h\d+v1h-\d+z)+$/, `${id}: non-pixel path data`);
    }
  }
});

test("Toolbox masters stay inside the canvas with the Sheet 01 2px outline tone", () => {
  for (const id of toolboxIds) {
    const svg = read(`${TOOLBOX_DIR}/${id}-32.svg`);
    for (const m of svg.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
      const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
      assert.ok(x >= 0 && y >= 0 && y < 32 && x + w <= 32, `${id}: run at ${x},${y} w${w} leaves the canvas`);
    }
    assert.ok(fills(svg).has("#241f12"), `${id}: missing the #241f12 structural outline`);
  }
});

test("every Toolbox colour already ships in the Sheet 01 shell family", () => {
  const family = new Set<string>();
  for (const size of ["16", "32"]) {
    for (const file of readdirSync(join(ROOT, SHELL_DIR, size))) {
      for (const c of fills(read(`${SHELL_DIR}/${size}/${file}`))) family.add(c);
    }
  }
  for (const id of toolboxIds) {
    const stray = [...fills(read(`${TOOLBOX_DIR}/${id}-32.svg`))].filter((c) => !family.has(c));
    assert.deepEqual(stray, [], `${id}: colours outside the family`);
  }
});

test("the Toolbox, PixelIcon registry and Wallpaper Studio import no Lucide glyphs", () => {
  for (const file of [
    "components/RightWidgetStack/RightWidgetStack.tsx",
    "components/PixelIcon/PixelIcon.ts",
    "components/PixelIcon/ShellIcon.tsx",
    "components/WallpaperStudio/WallpaperStudio.tsx",
  ]) {
    assert.doesNotMatch(read(file), /lucide-react/, file);
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
