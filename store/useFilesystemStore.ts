import { create } from "zustand";
import { persist } from "zustand/middleware";

import { moveObject, nextFreeCell, type GridCell } from "@/lib/os/desktop";
import {
  canMoveInto,
  nextFolderName,
  removeSubtree,
  type OsObject,
} from "@/lib/os/filesystem";

/**
 * Milestone 16 (Living Desktop) / Milestone 17 (Real File Explorer) —
 * the filesystem slice of the OS state layer.
 *
 * One array of objects, two views of it. The desktop draws the ones whose
 * `parentId` is null; Explorer draws whichever folder you are standing
 * in. Neither owns the objects and neither has a copy, which is why a
 * folder made on the desktop is already in Explorer and a folder made at
 * Explorer's root is already on the desktop — there is nothing to
 * propagate.
 *
 * It owns nothing about the projects themselves. A shortcut record is a
 * `projectId`, a parent and a position; the project's name, icon and
 * status stay in useProjectStore, which is why renaming a project needs
 * no code here and deleting a shortcut cannot touch one.
 *
 * The desktop starts EMPTY. The Golden Master has no desktop objects, and
 * seeding a couple to demonstrate the feature would put the shipped
 * default out of parity with the approved render for everyone who never
 * asked for them.
 *
 * The persisted key is still "cattipu-desktop". It was named in M16 when
 * this really was only the desktop, and renaming it would silently
 * discard every folder a person made under the old build — a tidier key
 * is not worth someone's data. Version 2 adds `parentId` to records
 * written by M16.
 */

interface FilesystemState {
  objects: OsObject[];
  /** Wallpaper is stored here rather than in settings because it is a
   *  property of the desktop surface. M19 will give it a manager; this is
   *  the field it will write to, so the shape does not change later. */
  wallpaper: string | null;

  createFolder: (parentId?: string | null) => OsObject;
  createProjectShortcut: (
    projectId: string,
    parentId?: string | null,
  ) => OsObject;
  renameObject: (id: string, label: string) => void;
  removeObject: (id: string) => void;
  /** Desktop move: a new grid cell, same parent. */
  moveTo: (id: string, cell: GridCell) => void;
  /** Explorer move: a new parent. Returns false when the move is refused
   *  (into itself, into its own descendant, or into a missing folder) so
   *  the caller can say so rather than silently doing nothing. */
  moveIntoFolder: (id: string, parentId: string | null) => boolean;
  setWallpaper: (wallpaper: string | null) => void;
}

let seq = 0;
const nextId = () => `desk-${Date.now().toString(36)}-${(seq += 1)}`;

export const useFilesystemStore = create<FilesystemState>()(
  persist(
    (set, get) => ({
      objects: [],
      wallpaper: null,

      createFolder: (parentId = null) => {
        const objects = get().objects;
        const folder: OsObject = {
          id: nextId(),
          kind: "folder",
          label: nextFolderName(objects, parentId),
          parentId,
          position: nextFreeCell(objects),
          createdAt: new Date().toISOString(),
        };
        set({ objects: [...objects, folder] });
        return folder;
      },

      createProjectShortcut: (projectId, parentId = null) => {
        const objects = get().objects;
        const shortcut: OsObject = {
          id: nextId(),
          kind: "project-shortcut",
          // Empty on purpose. The label is resolved from the project at
          // render time (lib/os/filesystem.ts `objectLabel`), so it can
          // never fall out of step with a rename. A value here would be a
          // copy, and a copy is the bug.
          label: "",
          projectId,
          parentId,
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

      /** Removes the object and, for a folder, everything inside it. No
       *  project is touched: a shortcut owns no project data, so there is
       *  nothing else it could remove. */
      removeObject: (id) => {
        set((s) => ({ objects: removeSubtree(s.objects, id) }));
      },

      moveTo: (id, cell) => {
        set((s) => ({ objects: moveObject(s.objects, id, cell) }));
      },

      moveIntoFolder: (id, parentId) => {
        const objects = get().objects;
        if (!canMoveInto(objects, id, parentId)) return false;
        // Coming back out to the root means landing on the desktop, and
        // the cell it left behind may well be occupied now. A fresh free
        // cell is the only placement that cannot bury another icon.
        const position =
          parentId === null
            ? nextFreeCell(objects)
            : (objects.find((o) => o.id === id) as OsObject).position;
        set({
          objects: objects.map((o) =>
            o.id === id ? { ...o, parentId, position } : o,
          ),
        });
        return true;
      },

      setWallpaper: (wallpaper) => set({ wallpaper }),
    }),
    {
      name: "cattipu-desktop",
      version: 2,
      partialize: (state) => ({
        objects: state.objects,
        wallpaper: state.wallpaper,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<FilesystemState>;
        const objects = state.objects ?? [];
        const wallpaper = state.wallpaper ?? null;
        if (version >= 2) return { objects, wallpaper };
        // M16 wrote a flat desktop. Every object it saved was on the
        // desktop by definition, so the root is where they belong.
        return {
          objects: objects.map((o) => ({ ...o, parentId: o.parentId ?? null })),
          wallpaper,
        };
      },
    },
  ),
);
