import { PALETTE, type PaletteKey } from "./palette";

/**
 * Milestone 13 (Native Icon Foundation) — the one small drawing primitive
 * every icon in this directory is built from: a square grid of palette
 * keys (or null = transparent). Deliberately not a framework — four
 * helpers (rect/outline/line/set), same spirit as scripts/gen_cursors.py's
 * new_grid()/set_px() used for the frozen cursor set.
 */

export type Grid = (PaletteKey | null)[][];

export function makeGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<PaletteKey | null>(size).fill(null));
}

export function set(g: Grid, x: number, y: number, c: PaletteKey) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
}

export function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: PaletteKey) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, c);
}

export function outline(g: Grid, x0: number, y0: number, x1: number, y1: number, c: PaletteKey) {
  for (let x = x0; x <= x1; x++) {
    set(g, x, y0, c);
    set(g, x, y1, c);
  }
  for (let y = y0; y <= y1; y++) {
    set(g, x0, y, c);
    set(g, x1, y, c);
  }
}

/** Straight horizontal/vertical/45°-diagonal line only — every icon in
 * this set is built from axis-aligned or 45° strokes, matching the
 * hard-edged pixel-icon construction rule (no freeform curves). */
export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, c: PaletteKey) {
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  let x = x0;
  let y = y0;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    set(g, x, y, c);
    x += dx;
    y += dy;
  }
}

/** Solid filled triangle, apex pointing up, base at `baseY` with the given
 * half-width — linear interpolation per row rather than a fixed 45°
 * slope, so roof/mountain/nose/warning shapes aren't forced into
 * equal-delta proportions. No separate outline stroke: a solid fill
 * against the icon's transparent background already reads as a clear
 * silhouette (the frozen rule's own wording — "readable silhouette
 * before internal detail" — is exactly this: shape first, linework
 * second), matching how the rectangular parts use outline()+rect(). */
export function triangleUp(g: Grid, apexX: number, apexY: number, baseY: number, halfWidth: number, c: PaletteKey) {
  const h = baseY - apexY;
  for (let y = apexY; y <= baseY; y++) {
    const t = h === 0 ? 0 : (y - apexY) / h;
    const w = Math.round(halfWidth * t);
    rect(g, apexX - w, y, apexX + w, y, c);
  }
}

/** Resolves a Grid's palette keys to real hex so the renderer never has
 * to know about PALETTE directly. */
export function resolve(g: Grid): (string | null)[][] {
  return g.map((row) => row.map((k) => (k ? PALETTE[k] : null)));
}
