"use client";

import { createElement, type CSSProperties, type SVGProps } from "react";

import { getShellIcon, type ShellIconName } from "./shellIcons";

/**
 * Renders a frozen Shell mark at its NATIVE size, centred in whatever slot
 * the surrounding chrome provides.
 *
 * The masters are integer pixel grids carrying a 2px structural outline and
 * a 1px top-left highlight. Stretching one to fill a 40px or 24px box means
 * fractional scaling, and at 0.75x or 1.25x whole rows fall on half-pixels —
 * the highlight is the first thing to vanish and the outline goes uneven.
 * So the mark is never stretched: the 32px master is used wherever the slot
 * is 24px or bigger, the handcrafted 16px master below that, and the slot's
 * own centring does the rest. Layout is untouched either way, because the
 * slot keeps its size and only its content changes.
 *
 * The wrapping <span> is load-bearing. SidebarButton.css sizes any DIRECT
 * svg child to 100% of the slot; a span breaks that selector and lets the
 * mark keep its own dimensions.
 */

export interface ShellIconProps {
  name: ShellIconName;
  /** Which drawing to use — not a scale factor. Defaults to the 32 master. */
  size?: 16 | 32;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function ShellIcon({
  name,
  size = 32,
  title,
  className,
  style,
}: ShellIconProps) {
  const Icon = getShellIcon(name, size);

  if (!Icon) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        `ShellIcon: "${name}" is not in the frozen PixelForge registry. ` +
          `Shell icons must resolve to a Specimen Sheet 01 asset — add the ` +
          `mark to components/PixelIcon/shellIcons.ts rather than drawing one.`,
      );
    }
    return null;
  }

  const svgProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    focusable: "false",
    // `fill` and `stroke` are inherited SVG properties, and some of the
    // chrome this drops into paints its old line-art glyphs by setting them
    // on the icon slot (TopBar.css does exactly that: `stroke: currentColor;
    // stroke-width: 2px`). Inherited stroke would land on every rect in the
    // mark and fatten the whole drawing. The mark's own paths carry explicit
    // fill attributes, which beat an inherited value, so only stroke has to
    // be shut off — but it has to be shut off here rather than hoped away.
    style: { stroke: "none", strokeWidth: 0 },
  } as SVGProps<SVGSVGElement>;

  return (
    <span
      className={className}
      style={{ display: "grid", placeItems: "center", ...style }}
      data-shell-icon={name}
    >
      {createElement(Icon, svgProps)}
    </span>
  );
}
