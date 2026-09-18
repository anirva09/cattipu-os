/**
 * M21 — Wallpaper Studio: the one descriptive owner of the wallpaper family.
 *
 * Two owners, deliberately split:
 *
 *   WHICH wallpaper is selected   → `useSettingsStore.wallpaper` (persisted)
 *   WHAT each wallpaper looks like → this registry (static, pure data)
 *
 * The Desktop and Wallpaper Studio both read this list; neither keeps its
 * own. A surface is plain CSS background data — colour, image layers, tile
 * size — never a React component and never a DOM node, so the registry can
 * be imported by tests, stores and the diagnostics service without pulling
 * in a renderer.
 *
 * Every surface is static and local. Engineering Paper keeps the exact
 * 8px raster tile the Golden Master desktop was signed off with; the other
 * five are generated here from integer-pixel CSS grids or inline SVG pixel
 * tiles. No surface fetches anything from the network, animates, or is
 * larger than one small tile.
 */

export const WALLPAPER_IDS = [
  "engineering-paper",
  "blueprint-grid",
  "graph-paper",
  "cad-dark",
  "industrial-hatch",
  "molded-cream",
] as const;

export type WallpaperId = (typeof WALLPAPER_IDS)[number];

/** How a surface is manufactured, for the Studio's TYPE readout. */
export type WallpaperSurfaceKind = "raster-tile" | "line-grid" | "pixel-tile";

/**
 * Whether the surface is light or dark. The desktop uses it to give icon
 * labels a cream plate on dark surfaces — the wallpaper never recolours
 * windows, bars or any other shell chrome.
 */
export type WallpaperTone = "light" | "dark";

/** Everything needed to paint the surface; each value is a CSS string. */
export interface WallpaperSurface {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
}

export interface WallpaperDefinition {
  id: WallpaperId;
  /** Display name, as the Studio list and readout print it. */
  name: string;
  description: string;
  kind: WallpaperSurfaceKind;
  /** The physical material the surface imitates. */
  material: string;
  /** The repeat the pattern is built on, in CSS pixels. */
  tilePx: number;
  tone: WallpaperTone;
  surface: WallpaperSurface;
}

export const DEFAULT_WALLPAPER_ID: WallpaperId = "engineering-paper";

// ---------------------------------------------------------------------
// Surface construction helpers. Integer pixels only: every line is 1px,
// every repeat is a multiple of 8 so the patterns share the shell's grid.
// ---------------------------------------------------------------------

/** A 1px line grid repeating every `step` px, drawn from the tile origin. */
function lineGrid(color: string, step: number): { image: string; size: string } {
  return {
    image:
      `linear-gradient(to right, ${color} 0 1px, transparent 1px), ` +
      `linear-gradient(to bottom, ${color} 0 1px, transparent 1px)`,
    size: `${step}px ${step}px, ${step}px ${step}px`,
  };
}

type Pixel = readonly [x: number, y: number];

/**
 * A square SVG tile of single-pixel rects, inlined as a data URI.
 * `shape-rendering="crispEdges"` keeps each rect on the pixel grid.
 */
function pixelTile(size: number, layers: readonly { fill: string; opacity: number; pixels: readonly Pixel[] }[]): string {
  const rects = layers
    .map(({ fill, opacity, pixels }) =>
      pixels
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" fill-opacity="${opacity}"/>`)
        .join(""),
    )
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const CREAM = "#E9DFC4";
const DARK_CREAM = "#D8C8A2";
const PAPER_WHITE = "#F7F0D8";
const BEVEL_RIGHT = "#6F6652";

const blueprintMinor = lineGrid("rgb(233 223 196 / 10%)", 8);
const blueprintMajor = lineGrid("rgb(233 223 196 / 24%)", 32);
const graphMinor = lineGrid("rgb(0 42 115 / 8%)", 8);
const graphMajor = lineGrid("rgb(0 42 115 / 20%)", 32);
const cadMajor = lineGrid("rgb(233 223 196 / 9%)", 64);

/** 45° hatch: one stepped diagonal per 16px tile, lower-left to upper-right. */
const HATCH_TILE = pixelTile(16, [
  {
    fill: BEVEL_RIGHT,
    opacity: 0.24,
    pixels: Array.from({ length: 16 }, (_, i) => [i, 15 - i] as const),
  },
]);

/** CAD snap-grid: one cream dot at every 16px intersection. */
const CAD_DOT_TILE = pixelTile(16, [{ fill: CREAM, opacity: 0.32, pixels: [[0, 0]] }]);

/** Molded plastic: a fixed, irregular stipple of light and shade pixels. */
const MOLDED_TILE = pixelTile(16, [
  {
    fill: "#FFFFFF",
    opacity: 0.55,
    pixels: [[1, 2], [6, 0], [11, 5], [14, 11], [3, 9], [8, 13], [12, 1], [5, 14]],
  },
  {
    fill: BEVEL_RIGHT,
    opacity: 0.14,
    pixels: [[2, 6], [9, 3], [13, 8], [7, 10], [0, 13], [10, 15], [15, 4], [4, 1]],
  },
]);

export const WALLPAPERS: readonly WallpaperDefinition[] = [
  {
    id: "engineering-paper",
    name: "Engineering Paper",
    description: "The canonical CATTIPU drafting sheet — a warm 8px engineering grid.",
    kind: "raster-tile",
    material: "Drafting paper",
    tilePx: 8,
    tone: "light",
    surface: {
      backgroundColor: CREAM,
      // The Golden Master tile, byte-for-byte: #6F6652 at ~9% along the
      // top and left edge of an 8x8 cell.
      backgroundImage: 'url("/assets/cattipu/engineering-paper-8px.png")',
      backgroundSize: "8px 8px",
    },
  },
  {
    id: "blueprint-grid",
    name: "Blueprint Grid",
    description: "Slate diazo blueprint with an 8px drafting grid and 32px majors.",
    kind: "line-grid",
    material: "Blueprint film",
    tilePx: 32,
    tone: "dark",
    surface: {
      backgroundColor: "#3D5878",
      backgroundImage: `${blueprintMajor.image}, ${blueprintMinor.image}`,
      backgroundSize: `${blueprintMajor.size}, ${blueprintMinor.size}`,
    },
  },
  {
    id: "graph-paper",
    name: "Graph Paper",
    description: "Bright ruled graph paper in blue ink, 8px cells with 32px majors.",
    kind: "line-grid",
    material: "Graph paper",
    tilePx: 32,
    tone: "light",
    surface: {
      backgroundColor: PAPER_WHITE,
      backgroundImage: `${graphMajor.image}, ${graphMinor.image}`,
      backgroundSize: `${graphMajor.size}, ${graphMinor.size}`,
    },
  },
  {
    id: "cad-dark",
    name: "CAD Dark",
    description: "Dark drafting workspace with a 16px snap-dot grid and 64px guides.",
    kind: "pixel-tile",
    material: "CAD workspace",
    tilePx: 64,
    tone: "dark",
    surface: {
      backgroundColor: "#26241E",
      backgroundImage: `${cadMajor.image}, ${CAD_DOT_TILE}`,
      backgroundSize: `${cadMajor.size}, 16px 16px`,
    },
  },
  {
    id: "industrial-hatch",
    name: "Industrial Hatch",
    description: "Section-view material hatch — 45° pixel lines on dark cream stock.",
    kind: "pixel-tile",
    material: "Sectioned steel",
    tilePx: 16,
    tone: "light",
    surface: {
      backgroundColor: DARK_CREAM,
      backgroundImage: HATCH_TILE,
      backgroundSize: "16px 16px",
    },
  },
  {
    id: "molded-cream",
    name: "Molded Cream",
    description: "The workstation chassis itself — cream plastic with a fine molded stipple.",
    kind: "pixel-tile",
    material: "Molded plastic",
    tilePx: 16,
    tone: "light",
    surface: {
      backgroundColor: CREAM,
      backgroundImage: MOLDED_TILE,
      backgroundSize: "16px 16px",
    },
  },
];

const BY_ID: ReadonlyMap<string, WallpaperDefinition> = new Map(WALLPAPERS.map((w) => [w.id, w]));

export function isWallpaperId(value: unknown): value is WallpaperId {
  return typeof value === "string" && BY_ID.has(value);
}

/** Any stored value → a wallpaper that exists. Unknown values fall back to the default. */
export function resolveWallpaperId(value: unknown): WallpaperId {
  return isWallpaperId(value) ? value : DEFAULT_WALLPAPER_ID;
}

export function getWallpaper(value: unknown): WallpaperDefinition {
  return BY_ID.get(resolveWallpaperId(value))!;
}

/**
 * Settings persistence version that introduced the wallpaper family.
 *
 * Before M21 the settings record was unversioned (zustand stores it as 0)
 * and `wallpaper` held `paper-grain` / `blueprint-grid` / `sunrise-geometry`
 * — values the Settings picker wrote but no surface ever painted. Every
 * pre-M21 user therefore SAW Engineering Paper, whatever the field said.
 * Migrating any legacy value to the default keeps each existing desktop
 * exactly as it looked; honouring a stale `blueprint-grid` would change it
 * on upgrade to something the person never actually saw.
 */
export const WALLPAPER_SETTINGS_VERSION = 1;

export function migrateWallpaperSetting(value: unknown, fromVersion: number): WallpaperId {
  if (fromVersion < WALLPAPER_SETTINGS_VERSION) return DEFAULT_WALLPAPER_ID;
  return resolveWallpaperId(value);
}
