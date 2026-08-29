"use client";

import { PixelIcon } from "./PixelIcon";
import { APP_ICONS, type AppIconId } from "./appIcons";

/**
 * Milestone 13 (Native Icon Foundation) — replaces the old PNG-backed
 * AppIcon (components/Dock/AppIcon.tsx, now a re-export of this one) with
 * the native 24×24 pixel-grid family. Same prop surface as before
 * (icon/className/alt/style) so none of its six call sites (Dock,
 * DesktopShortcutCard, Window titlebar, PlaceholderApp, FileExplorerApp,
 * CommandPalette) need to change.
 */

interface AppIconProps {
  icon: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function AppIcon({ icon, className, alt, style }: AppIconProps) {
  const grid = APP_ICONS[icon as AppIconId] ?? APP_ICONS.home;
  return <PixelIcon grid={grid} size={24} className={className} style={style} title={alt} />;
}
