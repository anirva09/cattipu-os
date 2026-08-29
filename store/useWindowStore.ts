import { create } from "zustand";
import { playSound } from "@/lib/sounds";
import { useSettingsStore } from "@/store/useSettingsStore";

function chime(name: "window-open" | "window-close") {
  const { soundEnabled, soundVolume } = useSettingsStore.getState();
  if (soundEnabled) playSound(name, soundVolume);
}

export type AppId =
  | "home"
  | "projects"
  | "architect"
  | "canvas"
  | "forge"
  | "launch"
  | "memory"
  | "settings"
  | "explorer"
  | "about"
  | "templates";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInstance {
  id: string;
  appId: AppId;
  title: string;
  rect: Rect;
  prevRect: Rect | null; // used to restore from maximized
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

interface WindowState {
  windows: WindowInstance[];
  nextZ: number;
  lastRects: Partial<Record<AppId, Rect>>;
  // Milestone 4 (Window Interaction Polish) — "newly opened windows do not
  // perfectly overlap." A monotonically increasing counter, separate from
  // `windows.length`: the old cascade keyed off the *currently open*
  // count, which resets to 0 whenever windows are closed — so opening
  // App A, closing it, then opening App B landed App B in exactly the
  // same spot A started in. This counter only ever goes up.
  spawnCount: number;
  openApp: (appId: AppId, title: string, initialRect?: Partial<Rect>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setRect: (id: string, rect: Rect) => void;
}

let seq = 0;
const nextId = () => `win-${++seq}`;

// apps whose content needs more room than the 620x460 default get a
// bigger first-open size — still just the starting point, still fully
// resizable, and still overridden by a remembered rect once one exists.
const DEFAULT_SIZES: Partial<Record<AppId, { width: number; height: number }>> = {
  architect: { width: 1040, height: 700 },
  explorer: { width: 700, height: 500 },
};

// stagger new windows so they don't stack exactly on top of each other
function cascadePosition(count: number): Pick<Rect, "x" | "y"> {
  const step = 28;
  const base = { x: 160, y: 96 };
  return {
    x: base.x + (count % 6) * step,
    y: base.y + (count % 6) * step,
  };
}

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: [],
  nextZ: 1,
  lastRects: {},
  spawnCount: 0,

  openApp: (appId, title, initialRect) => {
    const { windows, nextZ, lastRects, spawnCount } = get();

    // if this app is already open, just focus (and un-minimize) it
    const existing = windows.find((w) => w.appId === appId);
    if (existing) {
      set({
        windows: windows.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, zIndex: nextZ } : w
        ),
        nextZ: nextZ + 1,
      });
      return;
    }

    // reopen where this app was left, otherwise cascade a fresh spot —
    // keyed off spawnCount (ever-increasing), not the current open count,
    // so repeated open/close cycles keep advancing the stagger instead of
    // resetting to the same spot every time.
    const remembered = lastRects[appId];
    const pos = remembered ?? cascadePosition(spawnCount);
    const defaults = DEFAULT_SIZES[appId];
    const win: WindowInstance = {
      id: nextId(),
      appId,
      title,
      rect: {
        x: pos.x,
        y: pos.y,
        width: remembered?.width ?? initialRect?.width ?? defaults?.width ?? 620,
        height: remembered?.height ?? initialRect?.height ?? defaults?.height ?? 460,
      },
      prevRect: null,
      zIndex: nextZ,
      minimized: false,
      maximized: false,
    };
    set({ windows: [...windows, win], nextZ: nextZ + 1, spawnCount: spawnCount + 1 });
    chime("window-open");
  },

  closeWindow: (id) => {
    set((s) => {
      const win = s.windows.find((w) => w.id === id);
      const lastRects = win
        ? { ...s.lastRects, [win.appId]: win.maximized ? s.lastRects[win.appId] ?? win.rect : win.rect }
        : s.lastRects;
      return { windows: s.windows.filter((w) => w.id !== id), lastRects };
    });
    chime("window-close");
  },

  focusWindow: (id) => {
    const { nextZ } = get();
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: nextZ } : w)),
      nextZ: nextZ + 1,
    }));
  },

  minimizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    }));
  },

  toggleMaximize: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          return { ...w, maximized: false, rect: w.prevRect ?? w.rect, prevRect: null };
        }
        return { ...w, maximized: true, prevRect: w.rect };
      }),
    }));
  },

  setRect: (id, rect) => {
    set((s) => {
      const win = s.windows.find((w) => w.id === id);
      return {
        windows: s.windows.map((w) => (w.id === id ? { ...w, rect } : w)),
        lastRects: win ? { ...s.lastRects, [win.appId]: rect } : s.lastRects,
      };
    });
  },
}));
