#!/usr/bin/env node
/**
 * PixelForge manufacturing: character grids → production SVG masters.
 *
 *   node scripts/gen_pixelforge.mjs          write every mark
 *   node scripts/gen_pixelforge.mjs --check  exit 1 if any SVG differs from its grid
 *
 * The grids in scripts/pixelforge/grids/{32,16}/ ARE the artwork: one
 * character per pixel, `.` transparent, every other character a key into
 * scripts/pixelforge/palette.json. This script only serialises them, in the
 * format the rest of the family already uses and tests/icons.test.ts pins:
 * one <path> per colour made of `M x y hN v1 h-N z` runs, crisp edges, no
 * transforms, no strokes, no curves.
 *
 * Construction rules the grids follow (ICON_REGISTRY v1.0, final lock):
 * 32×32 masters carry a 2px near-black (#241f12) outer contour — a 1px frame
 * on each part plus a 1px exterior ring, which leaves every convex corner
 * stepped — 1px internal divisions, a 1px top-left highlight and a 1–2px
 * bottom-right shade. 16×16 masters are drawn separately with a 1px contour.
 * Nothing here scales one size into the other; the few 32 masters whose only
 * production use is 16px (Settings navigation, status marks) are 2× pixel
 * doublings of their hand-drawn 16, which keeps the 2px-outline rule exact.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scripts', 'pixelforge');
const PALETTE = JSON.parse(readFileSync(join(SRC, 'palette.json'), 'utf8'));

/**
 * grid name → label, permanent id, and where each size is written. Marks that
 * already ship keep the id components/PixelIcon/shellIcons.ts gives them; new
 * marks take their ICON_REGISTRY v1.0 id (or the next free one in their
 * department). Ids are unique across the table.
 */
export const PIXELFORGE_MARKS = {
  // filesystem family
  folder: { label: 'Folder', id: 'CAT-FAMILY-folder', shell: true },
  folderopen: { label: 'Open Folder', id: 'CAT-EXP-003', shell: true },
  projects: { label: 'Projects', id: 'CAT-SHELL-002', shell: true },
  template: { label: 'Template Folder', id: 'CAT-PROJ-002', shell: true },
  archive: { label: 'Archive', id: 'CAT-EXP-009', shell: true },
  file: { label: 'File', id: 'CAT-EXP-004', shell: true },
  explorer: { label: 'Explorer', id: 'CAT-SHELL-007', shell: true },
  openfile: { label: 'Shortcut', id: 'CAT-UTIL-004', shell: true },
  newproject: { label: 'New Project', id: 'CAT-UTIL-001', shell: true },
  recent: { label: 'Recent', id: 'CAT-UTIL-002', shell: true },
  // applications
  architect: { label: 'Architect', id: 'CAT-SHELL-003', shell: true },
  canvas: { label: 'Canvas', id: 'CAT-SHELL-004', shell: true },
  forge: { label: 'Forge', id: 'CAT-SHELL-005', shell: true },
  memory: { label: 'Memory', id: 'CAT-SHELL-006', shell: true },
  launch: { label: 'Launch', id: 'CAT-FAMILY-launch', shell: true },
  settings: { label: 'Settings', id: 'CAT-SHELL-008', shell: true },
};

function readGrid(size, name) {
  const rows = readFileSync(join(SRC, 'grids', String(size), `${name}.txt`), 'utf8').trimEnd().split(/\r?\n/);
  if (rows.length !== size || rows.some((r) => r.length !== size)) {
    throw new Error(`${size}/${name}: grid must be ${size}×${size}`);
  }
  for (const ch of rows.join('')) {
    if (ch !== '.' && !PALETTE[ch]) throw new Error(`${size}/${name}: unknown palette key "${ch}"`);
  }
  return rows;
}

export function toSvg(rows, label) {
  const size = rows.length;
  const byColour = new Map();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      const ch = row[x];
      let w = 1;
      while (x + w < size && row[x + w] === ch) w += 1;
      if (ch !== '.') {
        const fill = PALETTE[ch];
        byColour.set(fill, (byColour.get(fill) ?? '') + `M${x} ${y}h${w}v1h-${w}z`);
      }
      x += w;
    }
  });
  const paths = [...byColour].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="${label}"><title>${label}</title>${paths}</svg>\n`
  );
}

function targets(name, mark) {
  if (mark.toolbox) return [[32, join(ROOT, 'public/pixelforge/toolbox', `${name}-32.svg`)]];
  return [16, 32].map((size) => [size, join(ROOT, 'public/pixelforge/shell', String(size), `${name}.svg`)]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const stale = [];
  let written = 0;
  for (const [name, mark] of Object.entries(PIXELFORGE_MARKS)) {
    for (const [size, file] of targets(name, mark)) {
      const svg = toSvg(readGrid(size, name), mark.label);
      if (check) {
        if (!existsSync(file) || readFileSync(file, 'utf8') !== svg) stale.push(file);
      } else {
        writeFileSync(file, svg);
        written += 1;
      }
    }
  }
  if (check) {
    if (stale.length) {
      console.error(`PixelForge SVGs out of date with their grids:\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    console.log('PixelForge SVGs match their grids.');
  } else {
    console.log(`Wrote ${written} PixelForge masters.`);
  }
}
