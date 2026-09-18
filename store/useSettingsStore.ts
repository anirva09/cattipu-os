import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_WALLPAPER_ID,
  WALLPAPER_SETTINGS_VERSION,
  migrateWallpaperSetting,
  resolveWallpaperId,
  type WallpaperId,
} from "@/lib/os/wallpapers";

export type DockMode = "hover" | "always";
export type DockIconSize = "sm" | "md" | "lg";

interface SettingsState {
  /** The applied desktop wallpaper. The family itself lives in lib/os/wallpapers.ts. */
  wallpaper: WallpaperId;
  dockMode: DockMode;
  dockIconSize: DockIconSize;
  cursorEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0..1
  setWallpaper: (v: WallpaperId) => void;
  setDockMode: (v: DockMode) => void;
  setDockIconSize: (v: DockIconSize) => void;
  setCursorEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setSoundVolume: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      wallpaper: DEFAULT_WALLPAPER_ID,
      dockMode: "hover",
      dockIconSize: "md",
      cursorEnabled: true,
      soundEnabled: true,
      soundVolume: 0.5,

      setWallpaper: (wallpaper) => set({ wallpaper }),
      setDockMode: (dockMode) => set({ dockMode }),
      setDockIconSize: (dockIconSize) => set({ dockIconSize }),
      setCursorEnabled: (cursorEnabled) => set({ cursorEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
    }),
    {
      name: "cattipu-settings",
      // M21 — the first shape change since this record was created, so the
      // first version. Pre-M21 records load as version 0 and only their
      // `wallpaper` is rewritten (see migrateWallpaperSetting); cursor,
      // sound, volume and dock preferences pass through untouched.
      version: WALLPAPER_SETTINGS_VERSION,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        return { ...state, wallpaper: migrateWallpaperSetting(state.wallpaper, version) };
      },
      // A current-version record can still carry an id this build does not
      // know (hand-edited storage, a rolled-back release). Resolve it on
      // load so the store itself never holds an unrenderable wallpaper.
      merge: (persisted, current) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        return { ...current, ...state, wallpaper: resolveWallpaperId(state.wallpaper) };
      },
    }
  )
);

// Sprint 3 — Dock System: every step is an 8px-grid multiple, and the
// default ("md") lands exactly on the approved 24x24 icon grid.
export const DOCK_ICON_SIZE_PX: Record<DockIconSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

// Collapsed rail width is the spec'd 72px. Expanded was 196px through
// Milestone 1; Milestone 2 ("1998 workstation control") pins it to 184px
// instead — resolving the discrepancy flagged when Milestone 2 was
// scoped. Framer Motion's `animate` needs a plain number, so these live
// as a JS constant rather than a CSS custom property — `--dock-width-*`
// in globals.css documents the same values for anything CSS-only.
export const DOCK_RAIL_WIDTH_PX = {
  collapsed: 72,
  expanded: 184,
} as const;
