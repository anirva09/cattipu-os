"use client";

import type { Grid } from "./grid";
import { resolve } from "./grid";

/**
 * Milestone 13 (Native Icon Foundation) — renders a Grid as inline SVG:
 * one <rect> per pixel, `shapeRendering="crispEdges"`. Vector, not
 * raster, so every icon stays pixel-sharp at any of the app's actual
 * render sizes (16px title-bar glyph, 64px PlaceholderApp hero, whatever
 * the dock's icon-size setting picks) without a PNG DIMS table to
 * hand-maintain per icon — the grid's own size *is* the source of truth.
 */

interface PixelIconProps {
  grid: Grid;
  size?: number; // rendered px (square); default = 1 grid cell per px
  className?: string;
  style?: React.CSSProperties;
  title?: string; // when present, icon is exposed to a11y as role="img"
}

export function PixelIcon({ grid, size, className, style, title }: PixelIconProps) {
  const n = grid.length;
  const s = size ?? n;
  const resolved = resolve(grid);
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const color = resolved[y][x];
      if (!color) continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={s}
      height={s}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
}
