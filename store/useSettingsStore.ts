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

export const DOCK_ICON_SIZE_PX: Record<DockIconSize, number> = {
  sm: 22,
  md: 28,
  lg: 36,
};
