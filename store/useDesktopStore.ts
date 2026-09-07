import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  moveObject,
  nextFolderName,
  nextFreeCell,
  type DesktopObject,
  type GridCell,
} from "@/lib/os/desktop";

/**
 * Milestone 16 (Living Desktop) — the desktop slice of the OS state layer.
 *
 * This is a new domain, not a second copy of an existing one. It owns
 * where things sit on the desktop and which projects have a launcher;
 * it owns nothing about the projects themselves. A shortcut record is a
 * `projectId` and a position — the project's name, icon and status stay
 * in useProjectStore, which is why renaming a project needs no code here
 * and deleting a shortcut cannot touch one.
 *
 * The desktop starts EMPTY. The Golden Master has no desktop objects, and
 * seeding a couple to demonstrate the feature would put the shipped
 * default out of parity with the approved render for everyone who never
 * asked for them.
 */

interface DesktopState {
  objects: DesktopObject[];
  /** Wallpaper is stored here rather than in settings because it is a
   *  property of the desktop surface. M19 will give it a manager; this is
   *  the field it will write to, so the shape does not change later. */
  wallpaper: string | null;

  createFolder: () => DesktopObject;
  createProjectShortcut: (projectId: string) => DesktopObject;
  renameObject: (id: string, label: string) => void;
  removeObject: (id: string) => void;
  moveTo: (id: string, cell: GridCell) => void;
  setWallpaper: (wallpaper: string | null) => void;
}

let seq = 0;
const nextId = () => `desk-${Date.now().toString(36)}-${(seq += 1)}`;

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      objects: [],
      wallpaper: null,

      createFolder: () => {
        const objects = get().objects;
        const folder: DesktopObject = {
          id: nextId(),
          kind: "folder",
          label: nextFolderName(objects),
          position: nextFreeCell(objects),
          createdAt: new Date().toISOString(),
        };
        set({ objects: [...objects, folder] });
        return folder;
      },

      createProjectShortcut: (projectId) => {
        const objects = get().objects;
        const shortcut: DesktopObject = {
          id: nextId(),
          kind: "project-shortcut",
          // Empty on purpose. The label is resolved from the project at
          // render time (lib/os/desktop.ts `objectLabel`), so it can never
          // fall out of step with a rename. A value here would be a copy,
          // and a copy is the bug.
          label: "",
          projectId,
          position: nextFreeCell(objects),
          createdAt: new Date().toISOString(),
        };
        set({ objects: [...objects, shortcut] });
        return shortcut;
      },

      renameObject: (id, label) => {
        const next = label.trim();
        if (!next) return;
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, label: next } : o)),
        }));
      },

      /** Removes the desktop object and nothing else. A shortcut owns no
       *  project data, so there is nothing else it could remove. */
      removeObject: (id) => {
        set((s) => ({ objects: s.objects.filter((o) => o.id !== id) }));
      },

      moveTo: (id, cell) => {
        set((s) => ({ objects: moveObject(s.objects, id, cell) }));
      },

      setWallpaper: (wallpaper) => set({ wallpaper }),
    }),
    {
      name: "cattipu-desktop",
      version: 1,
      partialize: (state) => ({
        objects: state.objects,
        wallpaper: state.wallpaper,
      }),
    },
  ),
);
