import { makeGrid, rect, outline, line, triangleUp, set, type Grid } from "./grid";
import type { PaletteKey } from "./palette";

/**
 * Milestone 13 (Native Icon Foundation) — the minimal 16×16 "Utility"
 * vocabulary. Exactly the 16 named in the brief — no speculative
 * additions. Not every id has a real consumer yet (e.g. "save"/"build"/
 * "run"/"edit"/"delete"/"document" are wired nowhere in this milestone);
 * they exist so the vocabulary itself is complete and importable from one
 * place, the same honesty pattern lib/sounds.ts used in Milestone 12 for
 * a documented-but-partially-unwired vocabulary.
 */

export type UtilityIconId =
  | "folder-closed"
  | "folder-open"
  | "document"
  | "search"
  | "new"
  | "save"
  | "warning"
  | "error"
  | "ready"
  | "info"
  | "expand"
  | "collapse"
  | "run"
  | "build"
  | "edit"
  | "delete";

function octagon(g: Grid, x0: number, y0: number, x1: number, y1: number, fill: PaletteKey) {
  outline(g, x0, y0, x1, y1, "ink");
  rect(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill);
  const cut = (x: number, y: number) => {
    g[y][x] = null;
  };
  cut(x0, y0);
  cut(x1, y0);
  cut(x0, y1);
  cut(x1, y1);
}

function folderClosed(): Grid {
  const g = makeGrid(16);
  outline(g, 2, 4, 6, 6, "ink");
  rect(g, 3, 5, 5, 5, "slate");
  outline(g, 2, 6, 13, 13, "ink");
  rect(g, 3, 7, 12, 12, "cream");
  set(g, 3, 7, "white");
  return g;
}

function folderOpen(): Grid {
  const g = makeGrid(16);
  outline(g, 2, 4, 6, 6, "ink");
  rect(g, 3, 5, 5, 5, "slate");
  outline(g, 2, 6, 13, 8, "ink");
  outline(g, 5, 7, 10, 9, "ink");
  rect(g, 6, 8, 9, 8, "white");
  outline(g, 1, 9, 14, 13, "ink");
  rect(g, 2, 10, 13, 12, "cream");
  set(g, 2, 10, "white");
  return g;
}

function document(): Grid {
  const g = makeGrid(16);
  outline(g, 4, 2, 11, 13, "ink");
  rect(g, 5, 3, 10, 12, "paper");
  set(g, 5, 3, "white");
  for (let i = 0; i < 2; i++) g[2 + i][10 - i] = null;
  line(g, 6, 6, 9, 6, "ink");
  line(g, 6, 9, 9, 9, "ink");
  return g;
}

function search(): Grid {
  const g = makeGrid(16);
  octagon(g, 2, 2, 9, 9, "paper");
  line(g, 9, 9, 13, 13, "ink");
  line(g, 10, 9, 13, 12, "ink");
  return g;
}

function newIcon(): Grid {
  // No background chip — unlike folder/document/save, "new" is meant to
  // sit inline in a button next to a text label (see ProjectsApp.tsx's
  // "New Project"), so it stays a plain bold glyph, same weight as
  // search/expand/collapse/run below, not a colored badge.
  const g = makeGrid(16);
  rect(g, 6, 2, 9, 13, "ink");
  rect(g, 2, 6, 13, 9, "ink");
  return g;
}

function save(): Grid {
  const g = makeGrid(16);
  outline(g, 2, 2, 13, 13, "ink");
  rect(g, 3, 3, 12, 12, "navy");
  for (let i = 0; i < 2; i++) g[2 + i][11 - i] = null;
  rect(g, 5, 3, 9, 4, "slate");
  outline(g, 4, 8, 11, 12, "ink");
  rect(g, 5, 9, 10, 12, "white");
  return g;
}

function warning(): Grid {
  const g = makeGrid(16);
  triangleUp(g, 8, 2, 13, 6, "gold");
  rect(g, 7, 6, 8, 9, "ink");
  rect(g, 7, 11, 8, 12, "ink");
  return g;
}

function error(): Grid {
  const g = makeGrid(16);
  octagon(g, 3, 3, 12, 12, "red");
  line(g, 5, 5, 10, 10, "white");
  line(g, 10, 5, 5, 10, "white");
  return g;
}

function ready(): Grid {
  const g = makeGrid(16);
  octagon(g, 3, 3, 12, 12, "green");
  line(g, 5, 8, 7, 10, "white");
  line(g, 7, 10, 11, 5, "white");
  return g;
}

function info(): Grid {
  const g = makeGrid(16);
  octagon(g, 3, 3, 12, 12, "navy");
  rect(g, 7, 5, 8, 6, "white");
  rect(g, 7, 8, 8, 11, "white");
  return g;
}

function expand(): Grid {
  const g = makeGrid(16);
  const corner = (x: number, y: number, dx: number, dy: number) => {
    line(g, x, y, x + dx * 3, y, "ink");
    line(g, x, y, x, y + dy * 3, "ink");
  };
  corner(2, 2, 1, 1);
  corner(13, 2, -1, 1);
  corner(2, 13, 1, -1);
  corner(13, 13, -1, -1);
  return g;
}

function collapse(): Grid {
  const g = makeGrid(16);
  const corner = (x: number, y: number, dx: number, dy: number) => {
    line(g, x, y, x + dx * 3, y, "ink");
    line(g, x, y, x, y + dy * 3, "ink");
  };
  corner(5, 5, -1, -1);
  corner(10, 5, 1, -1);
  corner(5, 10, -1, 1);
  corner(10, 10, 1, 1);
  return g;
}

function run(): Grid {
  const g = makeGrid(16);
  for (let y = 3; y <= 12; y++) {
    const t = 1 - Math.abs(y - 7.5) / 4.5;
    const xEnd = 4 + Math.round(t * 8);
    rect(g, 4, y, xEnd, y, "green");
  }
  return g;
}

function build(): Grid {
  const g = makeGrid(16);
  outline(g, 8, 2, 13, 6, "ink");
  rect(g, 9, 3, 12, 5, "slate");
  line(g, 9, 7, 3, 13, "ink");
  line(g, 10, 7, 4, 13, "ink");
  return g;
}

function edit(): Grid {
  const g = makeGrid(16);
  line(g, 3, 13, 10, 6, "gold");
  line(g, 4, 13, 11, 6, "gold");
  set(g, 12, 5, "ink");
  set(g, 13, 4, "ink");
  rect(g, 2, 13, 3, 14, "slate");
  return g;
}

function del(): Grid {
  const g = makeGrid(16);
  rect(g, 6, 2, 9, 3, "ink");
  outline(g, 3, 4, 12, 5, "ink");
  rect(g, 4, 5, 11, 5, "slate");
  outline(g, 4, 6, 11, 13, "ink");
  rect(g, 5, 7, 10, 12, "red");
  set(g, 5, 7, "white");
  return g;
}

export const UTILITY_ICONS: Record<UtilityIconId, Grid> = {
  "folder-closed": folderClosed(),
  "folder-open": folderOpen(),
  document: document(),
  search: search(),
  new: newIcon(),
  save: save(),
  warning: warning(),
  error: error(),
  ready: ready(),
  info: info(),
  expand: expand(),
  collapse: collapse(),
  run: run(),
  build: build(),
  edit: edit(),
  delete: del(),
};
