import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GeneratedArchitecture } from "@/lib/ai/types";
import {
  PROJECT_SCHEMA_VERSION,
  createProject,
  nextProjectId,
  type CanvasArtifacts,
  type CattipuProject,
  type ForgeBuild,
  type LaunchRelease,
  type MemoryRecord,
  type ProjectIcon,
} from "@/lib/project/types";
import { migrateProjects } from "@/lib/project/migrate";

/**
 * Milestone 14A (Universal Project Artifact Foundation) — this store now
 * holds `CattipuProject[]` (lib/project/types.ts) instead of the old
 * `Project = metadata + optional GeneratedArchitecture` shape. Existing
 * persisted data (localStorage key "cattipu-projects") is migrated on
 * load — see the `migrate` option below and lib/project/migrate.ts.
 *
 * `ProjectIcon` and the old `Project` name are re-exported here for
 * backward-compatible import paths (ProjectsApp.tsx, FileExplorerApp.tsx,
 * Desktop.tsx, lib/ai/types.ts all import `ProjectIcon` from this file) —
 * only the underlying shape moved, not where callers import it from.
 */
export type { ProjectIcon };
/** @deprecated Use `CattipuProject` (lib/project/types.ts) directly in new
 * code — kept as an alias so no import site needs to change just to pick
 * up the rename. */
export type Project = CattipuProject;

const ICON_COLOR: Record<ProjectIcon, string> = {
  banking: "var(--color-navy)",
  saas: "var(--color-blue)",
  website: "var(--color-purple)",
  generic: "var(--color-green)",
};

interface ProjectState {
  projects: CattipuProject[];
  addProject: (name: string) => CattipuProject;
  addProjectFromArchitecture: (data: GeneratedArchitecture) => CattipuProject;
  /** Live sync from Architect's editable store — real persistence, not a
   * snapshot taken only on close. Whoever reopens this project (Explorer,
   * Projects app) gets back exactly what was last edited. */
  updateProjectArchitecture: (id: string, data: GeneratedArchitecture) => void;

  // Milestone 14A — small typed mutation helpers for the four future-app
  // artifact slots, established now so Canvas/Forge/Memory/Launch have an
  // obvious, consistent operation to call instead of reaching into
  // project state by hand. No UI calls these yet (those apps aren't
  // built) — this is the contract, not a feature.
  setCanvasArtifacts: (id: string, canvas: CanvasArtifacts) => void;
  addForgeBuild: (id: string, build: ForgeBuild) => void;
  appendMemoryRecord: (id: string, record: MemoryRecord) => void;
  addLaunchRelease: (id: string, release: LaunchRelease) => void;

  // ── Milestone 15 (Living Projects) ──────────────────────────────────
  // The verbs the Projects window offers. Every one goes through this
  // store, so a rename in Projects is a rename in Explorer, on the
  // desktop and in Recent - not three copies kept in step by hand.
  //
  // There is deliberately no setProgress or setStatus. Both are derived
  // from artifacts in lib/os/projects.ts, and adding a setter is exactly
  // how a hardcoded percentage gets back in.
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => CattipuProject | null;
  removeProject: (id: string) => void;
  /** Marks the project opened. This is what "Last Opened" and the
   *  ordering of Recent are computed from, so it must be called by
   *  whatever actually opens one. */
  openProject: (id: string) => void;
  togglePinned: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
}

function touch(): Pick<CattipuProject, "updatedAt"> {
  return { updatedAt: new Date().toISOString() };
}

/**
 * Fixed, not `new Date()`.
 *
 * `createProject` stamps createdAt/updatedAt from the clock, and this
 * module is evaluated twice - once on the server rendering the page, once
 * in the browser bundle. Two different clocks produced two different
 * timestamps, so the server's "CREATED: 4:34 PM" and the client's
 * disagreed and React threw #418 and discarded the server markup. Seed
 * data is demo content; pinning its timestamps costs nothing and makes
 * the two renders identical by construction.
 */
const SEED_STAMPS = [
  "2026-08-29T12:36:00.000Z",
  "2026-08-28T09:18:00.000Z",
  "2026-08-27T04:52:00.000Z",
] as const;

function seed(
  index: number,
  opts: Parameters<typeof createProject>[0],
): CattipuProject {
  const at = SEED_STAMPS[index];
  return { ...createProject(opts), createdAt: at, updatedAt: at };
}

const SEED_PROJECTS: CattipuProject[] = [
  seed(0, { name: "Banking Platform", icon: "banking", color: ICON_COLOR.banking, editedLabel: "Edited 5m ago" }),
  seed(1, { name: "AI SaaS Starter", icon: "saas", color: ICON_COLOR.saas, editedLabel: "Edited 1h ago" }),
  seed(2, { name: "CATTIPU Website", icon: "website", color: ICON_COLOR.website, editedLabel: "Edited 3h ago" }),
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,

      addProject: (name) => {
        const project = createProject({ name });
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      addProjectFromArchitecture: (data) => {
        const project = createProject({
          name: data.projectName || "Untitled Project",
          icon: data.projectIcon,
          color: ICON_COLOR[data.projectIcon],
          editedLabel: "Built by Architect · just now",
          idea: { prompt: data.prompt },
          architect: { data },
        });
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      updateProjectArchitecture: (id, data) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, architect: { data }, editedLabel: "Edited just now", ...touch() }
              : p
          ),
        }));
      },

      setCanvasArtifacts: (id, canvas) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, canvas, ...touch() } : p)),
        }));
      },

      addForgeBuild: (id, build) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, forge: { ...p.forge, builds: [...p.forge.builds, build] }, ...touch() } : p
          ),
        }));
      },

      appendMemoryRecord: (id, record) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, memory: { ...p.memory, records: [...p.memory.records, record] }, ...touch() }
              : p
          ),
        }));
      },

      renameProject: (id, name) => {
        const next = name.trim();
        if (!next) return;              // a blank name is not a rename
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: next, editedLabel: "Renamed just now", ...touch() } : p
          ),
        }));
      },

      duplicateProject: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return null;
        // A copy of the WORK, not of the history: a fresh id and fresh
        // timestamps, never opened. Cloning createdAt would make the
        // duplicate claim an age it does not have, and cloning the id
        // would make two projects the same project.
        const copy: CattipuProject = {
          ...structuredClone(source),
          id: nextProjectId(),
          name: `${source.name} copy`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastOpenedAt: null,
          pinned: false,
          favorite: false,
          editedLabel: "Duplicated just now",
        };
        set((s) => ({ projects: [copy, ...s.projects] }));
        return copy;
      },

      removeProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      },

      openProject: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, lastOpenedAt: now } : p
          ),
        }));
      },

      togglePinned: (id) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, pinned: !p.pinned, ...touch() } : p
          ),
        }));
      },

      toggleFavorite: (id) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite, ...touch() } : p
          ),
        }));
      },

      setArchived: (id, archived) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, archived, ...touch() } : p
          ),
        }));
      },

      addLaunchRelease: (id, release) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, launch: { ...p.launch, releases: [...p.launch.releases, release] }, ...touch() }
              : p
          ),
        }));
      },
    }),
    {
      // PROJECT_AUDIT.md Critical-1: this store previously reset on every
      // reload, silently discarding anything built with Architect. Only
      // `projects` needs to survive — Architect's own live-editing state
      // (draft prompt, playback stage, active tab) intentionally stays
      // ephemeral; see SPRINT_02_REPORT.md for why.
      name: "cattipu-projects",
      partialize: (state) => ({ projects: state.projects }),
      // Milestone 14A — a pre-M14A store (no `version` ever configured)
      // persists as version 0 by zustand's own default. Bumping this to
      // PROJECT_SCHEMA_VERSION (1) means any such record fails the
      // version check on load and runs through `migrate` below, which
      // converts every project — including its `architecture`, if any —
      // into the current CattipuProject shape rather than discarding it.
      version: PROJECT_SCHEMA_VERSION,
      migrate: (persistedState) => {
        const state = persistedState as { projects?: unknown } | undefined;
        return { projects: migrateProjects(state?.projects ?? []) };
      },
    }
  )
);
