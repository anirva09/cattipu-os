import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GeneratedArchitecture } from "@/lib/ai/types";
import {
  PROJECT_SCHEMA_VERSION,
  createProject,
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
}

function touch(): Pick<CattipuProject, "updatedAt"> {
  return { updatedAt: new Date().toISOString() };
}

const SEED_PROJECTS: CattipuProject[] = [
  createProject({ name: "Banking Platform", icon: "banking", color: ICON_COLOR.banking, editedLabel: "Edited 5m ago" }),
  createProject({ name: "AI SaaS Starter", icon: "saas", color: ICON_COLOR.saas, editedLabel: "Edited 1h ago" }),
  createProject({ name: "CATTIPU Website", icon: "website", color: ICON_COLOR.website, editedLabel: "Edited 3h ago" }),
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
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
