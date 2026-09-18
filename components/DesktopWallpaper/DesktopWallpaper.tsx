"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_WALLPAPER_ID, getWallpaper, type WallpaperDefinition } from "@/lib/os/wallpapers";
import { useSettingsStore } from "@/store/useSettingsStore";

import "./DesktopWallpaper.css";

const subscribeNever = () => () => {};

/**
 * M21 — the wallpaper the desktop should paint right now.
 *
 * The shell is server-rendered, and the server cannot see the person's
 * saved settings. So the server render and the hydration pass both use the
 * default — which is exactly what the window layer already paints beneath
 * — and the saved choice takes over on the first client render after
 * hydration. `useSyncExternalStore`'s server snapshot is what makes that
 * split without a mismatch and without a setState-in-effect round trip.
 */
export function useAppliedWallpaper(): WallpaperDefinition {
  const selected = useSettingsStore((s) => s.wallpaper);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  return getWallpaper(hydrated ? selected : DEFAULT_WALLPAPER_ID);
}

/**
 * The desktop surface itself. It fills the window layer beneath the
 * desktop objects and every managed window, takes no pointer events, and
 * paints only the registry's static surface — it never touches windows,
 * bars, the sidebar or the page body.
 */
export function DesktopWallpaper({ wallpaper }: { wallpaper: WallpaperDefinition }) {
  return (
    <div
      className="cattipu-desktop-wallpaper"
      data-wallpaper={wallpaper.id}
      data-wallpaper-tone={wallpaper.tone}
      style={wallpaper.surface}
      aria-hidden="true"
    />
  );
}
