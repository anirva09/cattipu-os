"use client";

import { PixelIcon } from "./PixelIcon";
import { UTILITY_ICONS, type UtilityIconId } from "./utilityIcons";

/** Milestone 13 (Native Icon Foundation) — the 16×16 utility vocabulary's
 * renderer. `id` is the closed 16-name set from utilityIcons.ts. */
interface UtilityIconProps {
  id: UtilityIconId;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function UtilityIcon({ id, size = 16, className, style, title }: UtilityIconProps) {
  return <PixelIcon grid={UTILITY_ICONS[id]} size={size} className={className} style={style} title={title} />;
}
