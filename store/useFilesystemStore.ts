import { create } from "zustand";
import { persist } from "zustand/middleware";

import { moveObject, nextFreeCell, type GridCell } from "@/lib/os/desktop";
import { FILE_LIMITS, type ApplyFileWritesResult, type FileWrite } from "@/lib/contracts/filesystem";
import {
  canMoveInto,
  nextFolderName,
  removeSubtree,
  workspaceForProject,
  type OsObject,
} from "@/lib/os/filesystem";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { projectWorkspaceService } from "@/lib/services/filesystem/projectWorkspaceService";

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
  /** One persisted selection for every filesystem consumer. Project
   * context is derived from the active Project; the selected node remains
   * filesystem state and is never copied into useProjectStore. */
  selectedObjectId: string | null;
  selectObject: (id: string | null) => void;
  createFolder: (parentId?: string | null) => OsObject;
  createProjectShortcut: (
    projectId: string,
    parentId?: string | null,
  ) => OsObject;
  /**
   * Milestone 19 (Part D) — the workspace a template project gets.
   *
   * One folder at the OS root, linked to the project so its name is
   * resolved from the project rather than copied, holding one empty
   * sub-folder per section the template's plan actually has, plus a
   * shortcut back to the project.
   *
   * Empty folders and nothing else. A folder is a place to put an
   * artifact, not an artifact, so `projectProgress` still reads 0% on a
   * project that has only just been created — which is the same reason
   * the plan is never written into `canvas.screens`.
   *
   * A project has at most one workspace: calling this again for the same
   * project returns the existing folder and writes nothing.
   */
  createProjectWorkspace: (
    projectId: string,
    fallbackLabel: string,
    sections: readonly string[],
  ) => OsObject;
  renameObject: (id: string, label: string) => void;
  removeObject: (id: string) => void;
  /** Desktop move: a new grid cell, same parent. */
  moveTo: (id: string, cell: GridCell) => void;
  /** Explorer move: a new parent. Returns false when the move is refused
   *  (into itself, into its own descendant, or into a missing folder) so
   *  the caller can say so rather than silently doing nothing. */
  moveIntoFolder: (id: string, parentId: string | null) => boolean;
  /**
   * MVP-06 — writes files into a project's workspace by path, creating the
   * folders a path needs. All or nothing; the rules are
   * projectFileService's. Only ever called on an explicit request (Apply
   * in the AI Console), never as a side effect of an AI answer arriving.
   */
  applyFileWrites: (projectId: string, writes: readonly FileWrite[]) => ApplyFileWritesResult;
  /** MVP-06 — saves a file's text (Explorer's editor). False when the id is
   *  not a file or the text is over the limit. */
  writeFileContent: (id: string, content: string) => boolean;
}

let seq = 0;
const nextId = () => `desk-${Date.now().toString(36)}-${(seq += 1)}`;

export const useFilesystemStore = create<FilesystemState>()(
  persist(
    (set, get) => ({
      objects: [],
      selectedObjectId: null,

      selectObject: (id) => {
        const exists = id === null || get().objects.some((object) => object.id === id);
        if (exists) set({ selectedObjectId: id });
      },

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

      createProjectWorkspace: (projectId, fallbackLabel, sections) => {
        const objects = get().objects;
        // The record shapes and the one-workspace-per-project rule live in
        // projectWorkspaceService; this store supplies identity, clock and
        // a free desktop cell, and persists the result.
        const result = projectWorkspaceService.provision(
          objects,
          { projectId, fallbackLabel, sections },
          {
            id: nextId(),
            createdAt: new Date().toISOString(),
            position: nextFreeCell(objects),
          },
        );
        if (result.created) set({ objects: result.objects });
        return result.workspace;
      },

      renameObject: (id, label) => {
        const next = label.trim();
        if (!next) return;
        // A file's name is the last segment of its path, so it is held to
        // what a path segment may be; a "/" in it would name another place.
        const target = get().objects.find((o) => o.id === id);
        if (target?.kind === "file" && (next.includes("/") || projectFileService.normalizePath(next) !== next)) return;
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, label: next } : o)),
        }));
      },

      /** Removes the object and, for a folder, everything inside it. No
       *  project is touched: a shortcut owns no project data, so there is
       *  nothing else it could remove. */
      removeObject: (id) => {
        set((s) => {
          const objects = removeSubtree(s.objects, id);
          // A selection that pointed into the removed subtree would name
          // nothing; it goes with it.
          const selectedObjectId = objects.some((o) => o.id === s.selectedObjectId)
            ? s.selectedObjectId
            : null;
          return { objects, selectedObjectId };
        });
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

      applyFileWrites: (projectId, writes) => {
        const objects = get().objects;
        const workspace = workspaceForProject(objects, projectId);
        if (!workspace) return { ok: false, reason: "no-workspace" };
        const result = projectFileService.apply(objects, workspace.id, writes, {
          nextId,
          at: new Date().toISOString(),
        });
        if (result.ok) set({ objects: result.objects });
        return result;
      },

      writeFileContent: (id, content) => {
        const objects = get().objects;
        if (content.length > FILE_LIMITS.maxFileChars) return false;
        if (!objects.some((o) => o.id === id && o.kind === "file")) return false;
        set({ objects: objects.map((o) => (o.id === id ? { ...o, content } : o)) });
        return true;
      },
    }),
    {
      name: "cattipu-desktop",
      // v3 drops `wallpaper`. M16 added it here on the reasoning that the
      // wallpaper is a property of the desktop surface, and said M19 would
      // give it a manager. M19 did not, and useSettingsStore has owned the
      // wallpaper the whole time — so this field had two authors and zero
      // readers, which is the duplicate state the OS layer exists to
      // prevent. A record persisted by v2 simply drops the key.
      // v4 adds `selectedObjectId`, the Explorer tree's selection. Older
      // records start with no selection; one naming a missing object is
      // dropped rather than restored as a dangling id.
      // v5 (MVP-06) adds `file` records carrying `content`. Nothing earlier
      // wrote one, so there is nothing to convert; a file record without
      // text (a hand-edited value) is dropped rather than restored as a
      // file that cannot be opened.
      version: 5,
      partialize: (state) => ({
        objects: state.objects,
        selectedObjectId: state.selectedObjectId,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<FilesystemState>;
        const objects = (Array.isArray(state.objects) ? state.objects : []).filter(
          (o) => o.kind !== "file" || typeof o.content === "string",
        );
        const selectedObjectId =
          typeof state.selectedObjectId === "string" &&
          objects.some((object) => object.id === state.selectedObjectId)
            ? state.selectedObjectId
            : null;
        if (version >= 2) return { objects, selectedObjectId };
        // M16 wrote a flat desktop. Every object it saved was on the
        // desktop by definition, so the root is where they belong.
        return {
          objects: objects.map((o) => ({ ...o, parentId: o.parentId ?? null })),
          selectedObjectId,
        };
      },
    },
  ),
);
