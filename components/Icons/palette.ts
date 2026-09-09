/**
 * Milestone 13 (Native Icon Foundation) — the closed, restrained color set
 * every native icon draws from. Every value here is an existing CATTIPU
 * token (app/globals.css `--color-*`), copied as a literal hex because
 * these render as SVG `fill` attributes, not CSS — no new colors are
 * introduced for icons.
 */

export const PALETTE = {
  ink: "#141110", // silhouette / outline — matches --color-ink
  paper: "#faf5e6", // --color-surface — icon "page" fill
  cream: "#e7d7c3", // --color-cream — icon body fill
  white: "#fffdf7", // top-left highlight pixel
  navy: "#031f56", // --color-navy
  oxblood: "#5c1524", // --color-oxblood — Architect's own accent (M11/M12)
  gold: "#f0c419", // --color-gold
  red: "#d6403a", // --color-red
  blue: "#3c6ad8", // --color-blue
  purple: "#7856ab", // --color-ai
  green: "#2ba24c", // --color-green
  slate: "#7a7566", // --color-ink-dim — neutral, for "mechanical" tools
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Darkens a palette color for the bottom/right "dimensionality" edge
 * required by the frozen construction rule (top-left lighting implies a
 * darker opposite edge) — derived at import time so every icon's shadow
 * tone stays mathematically consistent with its base color instead of a
 * second hand-picked hex per icon. */
export function shade(hex: string, amount = 0.4): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.substring(0, 2), 16);
  const g = parseInt(n.substring(2, 4), 16);
  const b = parseInt(n.substring(4, 6), 16);
  const f = (c: number) => Math.round(c * (1 - amount)).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
