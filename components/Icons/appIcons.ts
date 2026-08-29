import { makeGrid, rect, outline, line, triangleUp, set, type Grid } from "./grid";

/**
 * Milestone 13 (Native Icon Foundation) — the 24×24 "Application" icon
 * set. Original CATTIPU artwork: bold axis-aligned silhouettes (a solid
 * triangle fill for anything pointed, an outlined+filled rect for
 * anything boxy), top-left white highlight pixels, a `shade()`-derived
 * darker pixel or two on the bottom/right edge, one restrained accent
 * color per icon drawn from the existing CATTIPU palette. Construction
 * principle only — no historical system's actual layout or asset is
 * copied.
 *
 * Exactly the 11 ids every surface in the app already passes to AppIcon
 * (the 8 real apps + "home", used for both the Home app and the About
 * shortcut, + "archive"/"templates", the two non-dock desktop shortcuts) —
 * see lib/apps.ts and components/Desktop/DesktopIcons.tsx.
 */

export type AppIconId =
  | "home"
  | "projects"
  | "architect"
  | "canvas"
  | "forge"
  | "memory"
  | "launch"
  | "explorer"
  | "settings"
  | "archive"
  | "templates";

function home(): Grid {
  const g = makeGrid(24);
  // Roof — solid triangle, navy (this app's identity accent).
  triangleUp(g, 11, 5, 12, 8, "navy");
  set(g, 6, 6, "white"); // top-left highlight
  set(g, 16, 11, "navy");
  // Walls
  outline(g, 6, 12, 17, 19, "ink");
  rect(g, 7, 13, 16, 18, "cream");
  set(g, 7, 13, "white"); // top-left highlight
  rect(g, 16, 18, 16, 18, "cream");
  // Door
  rect(g, 11, 15, 12, 19, "ink");
  // Windows (gold — lit)
  rect(g, 8, 14, 9, 15, "gold");
  rect(g, 14, 14, 15, 15, "gold");
  return g;
}

function projects(): Grid {
  const g = makeGrid(24);
  // Back panel + tab
  outline(g, 4, 9, 19, 19, "ink");
  rect(g, 5, 10, 18, 18, "cream");
  outline(g, 4, 6, 11, 9, "ink");
  rect(g, 5, 7, 10, 8, "cream");
  // Gold tab strip (label)
  rect(g, 5, 7, 10, 7, "gold");
  // Front-flap seam
  line(g, 4, 12, 19, 12, "ink");
  rect(g, 5, 13, 18, 18, "cream");
  set(g, 5, 7, "white");
  set(g, 17, 17, "cream");
  return g;
}

function architect(): Grid {
  const g = makeGrid(24);
  const node = (x0: number, y0: number) => {
    outline(g, x0, y0, x0 + 3, y0 + 3, "ink");
    rect(g, x0 + 1, y0 + 1, x0 + 2, y0 + 2, "navy");
    set(g, x0 + 1, y0 + 1, "white");
  };
  // Root node, two children — connectors first so nodes sit on top.
  line(g, 11, 9, 11, 10, "oxblood");
  line(g, 11, 10, 7, 14, "oxblood");
  line(g, 7, 14, 7, 15, "oxblood");
  line(g, 12, 9, 12, 10, "oxblood");
  line(g, 12, 10, 16, 14, "oxblood");
  line(g, 16, 14, 16, 15, "oxblood");
  node(10, 5);
  node(5, 15);
  node(15, 15);
  return g;
}

function canvas(): Grid {
  const g = makeGrid(24);
  outline(g, 4, 5, 19, 18, "ink");
  rect(g, 5, 6, 18, 17, "paper");
  set(g, 5, 6, "white");
  // Sun
  rect(g, 15, 8, 16, 9, "gold");
  // Mountain
  triangleUp(g, 9, 10, 16, 4, "blue");
  line(g, 5, 16, 13, 16, "ink");
  set(g, 17, 16, "cream");
  return g;
}

function forge(): Grid {
  const g = makeGrid(24);
  // Horn — a sideways triangle tapering to a point off the anvil's left
  // edge, same rows as the top slab (interpolated per-row like
  // triangleUp, just built horizontally instead of vertically).
  const hornTop = 8;
  const hornBottom = 11;
  for (let y = hornTop; y <= hornBottom; y++) {
    const t = (y - hornTop) / (hornBottom - hornTop);
    const xStart = Math.round(6 - t * 4); // 6 -> 2, tip at the bottom row
    rect(g, xStart, y, 6, y, "red");
  }
  // Top slab (the working face)
  outline(g, 6, 7, 18, 11, "ink");
  rect(g, 7, 8, 17, 10, "red");
  set(g, 7, 8, "white");
  // Waist
  outline(g, 10, 12, 13, 14, "ink");
  rect(g, 11, 12, 12, 13, "red");
  // Flared base
  outline(g, 7, 15, 16, 19, "ink");
  rect(g, 8, 16, 15, 18, "red");
  rect(g, 8, 18, 15, 18, "oxblood");
  return g;
}

function memory(): Grid {
  const g = makeGrid(24);
  outline(g, 6, 5, 17, 7, "ink");
  rect(g, 7, 6, 16, 6, "purple");
  outline(g, 6, 6, 17, 18, "ink");
  rect(g, 7, 7, 16, 17, "purple");
  set(g, 7, 7, "white");
  line(g, 7, 10, 16, 10, "ink");
  line(g, 7, 13, 16, 13, "ink");
  line(g, 7, 16, 16, 16, "ink");
  outline(g, 6, 17, 17, 19, "ink");
  rect(g, 7, 18, 16, 18, "purple");
  return g;
}

function launch(): Grid {
  const g = makeGrid(24);
  // Nose
  triangleUp(g, 11, 4, 8, 4, "navy");
  set(g, 10, 5, "white");
  // Body
  outline(g, 9, 8, 14, 17, "ink");
  rect(g, 10, 9, 13, 16, "navy");
  // Porthole
  rect(g, 11, 11, 12, 12, "paper");
  // Fins
  rect(g, 6, 15, 8, 18, "green");
  rect(g, 15, 15, 17, 18, "green");
  // Flame
  rect(g, 10, 18, 13, 19, "gold");
  rect(g, 11, 20, 12, 21, "red");
  return g;
}

function explorer(): Grid {
  const g = makeGrid(24);
  // Same folder family as "projects", distinguished by a navy (neutral,
  // not gold) accent and a front flap drawn open/forward rather than
  // flush — "browse", not "own this project."
  outline(g, 4, 6, 10, 9, "ink");
  rect(g, 5, 7, 9, 8, "cream");
  outline(g, 4, 9, 19, 19, "ink");
  rect(g, 5, 10, 18, 18, "cream");
  set(g, 5, 7, "white");
  outline(g, 3, 14, 20, 20, "ink");
  rect(g, 4, 15, 19, 19, "paper");
  rect(g, 4, 15, 19, 15, "navy");
  set(g, 18, 18, "cream");
  return g;
}

function settings(): Grid {
  const g = makeGrid(24);
  // Teeth
  rect(g, 11, 4, 12, 5, "slate");
  rect(g, 11, 18, 12, 19, "slate");
  rect(g, 4, 11, 5, 12, "slate");
  rect(g, 18, 11, 19, 12, "slate");
  // Octagon body
  outline(g, 6, 6, 17, 17, "ink");
  rect(g, 7, 7, 16, 16, "slate");
  return applyGearCorners(g);
}

// Cutting the four corners after the main body is drawn keeps the shape
// a clean stepped octagon rather than a plain square — done as a small
// pass instead of teaching `rect()` to accept `null`.
function applyGearCorners(g: Grid): Grid {
  const cut = (x0: number, y0: number) => {
    for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < x0 + 2; x++) g[y][x] = null;
  };
  cut(6, 6);
  cut(16, 6);
  cut(6, 16);
  cut(16, 16);
  // Center hole + rivet + highlight
  outline(g, 10, 10, 13, 13, "ink");
  set(g, 8, 8, "gold");
  set(g, 8, 7, "white");
  set(g, 15, 15, "ink");
  return g;
}

function archive(): Grid {
  const g = makeGrid(24);
  outline(g, 4, 7, 19, 9, "ink");
  rect(g, 5, 8, 18, 8, "cream");
  outline(g, 5, 9, 18, 19, "ink");
  rect(g, 6, 10, 17, 18, "cream");
  set(g, 6, 10, "white");
  line(g, 6, 14, 17, 14, "ink");
  line(g, 11, 10, 11, 18, "ink");
  line(g, 12, 10, 12, 18, "ink");
  rect(g, 10, 5, 13, 7, "gold");
  return g;
}

function templates(): Grid {
  const g = makeGrid(24);
  outline(g, 7, 5, 17, 19, "ink");
  rect(g, 8, 6, 16, 18, "paper");
  set(g, 8, 6, "white");
  // Folded corner
  line(g, 14, 6, 17, 9, "ink");
  for (let y = 6; y <= 8; y++) for (let x = 15; x <= 16; x++) if (x - 14 >= y - 6) g[y][x] = null;
  rect(g, 10, 11, 14, 11, "blue");
  rect(g, 10, 14, 14, 14, "blue");
  rect(g, 10, 17, 14, 17, "blue");
  return g;
}

export const APP_ICONS: Record<AppIconId, Grid> = {
  home: home(),
  projects: projects(),
  architect: architect(),
  canvas: canvas(),
  forge: forge(),
  memory: memory(),
  launch: launch(),
  explorer: explorer(),
  settings: settings(),
  archive: archive(),
  templates: templates(),
};
