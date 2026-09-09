import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WallpaperVariant = "paper-grain" | "blueprint-grid" | "sunrise-geometry";
export type DockMode = "hover" | "always";
export type DockIconSize = "sm" | "md" | "lg";

interface SettingsState {
  wallpaper: WallpaperVariant;
  dockMode: DockMode;
  dockIconSize: DockIconSize;
  cursorEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0..1
  setWallpaper: (v: WallpaperVariant) => void;
  setDockMode: (v: DockMode) => void;
  setDockIconSize: (v: DockIconSize) => void;
  setCursorEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setSoundVolume: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      wallpaper: "paper-grain",
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
    { name: "cattipu-settings" }
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
