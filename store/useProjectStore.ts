import { create } from "zustand";
import type { GeneratedArchitecture } from "@/lib/ai/types";

export type ProjectIcon = "banking" | "saas" | "website" | "generic";

export interface Project {
  id: string;
  name: string;
  icon: ProjectIcon;
  color: string; // brand token, e.g. "var(--color-purple)"
  editedLabel: string;
  /** Set only for projects created by Architect — the full generated result. */
  architecture?: GeneratedArchitecture;
}

const ICON_COLOR: Record<ProjectIcon, string> = {
  banking: "var(--color-navy)",
  saas: "var(--color-blue)",
  website: "var(--color-purple)",
  generic: "var(--color-green)",
};

interface ProjectState {
  projects: Project[];
  addProject: (name: string) => Project;
  addProjectFromArchitecture: (data: GeneratedArchitecture) => Project;
  /** Live sync from Architect's editable store — real persistence, not a
   * snapshot taken only on close. Whoever reopens this project (Explorer,
   * Projects app) gets back exactly what was last edited. */
  updateProjectArchitecture: (id: string, data: GeneratedArchitecture) => void;
}

let seq = 0;
const nextId = () => `project-${++seq}`;

const SEED_PROJECTS: Project[] = [
  {
    id: nextId(),
    name: "Banking Platform",
    icon: "banking",
    color: "var(--color-navy)",
    editedLabel: "Edited 5m ago",
  },
  {
    id: nextId(),
    name: "AI SaaS Starter",
    icon: "saas",
    color: "var(--color-blue)",
    editedLabel: "Edited 1h ago",
  },
  {
    id: nextId(),
    name: "CATTIPU Website",
    icon: "website",
    color: "var(--color-purple)",
    editedLabel: "Edited 3h ago",
  },
];

export const useProjectStore = create<ProjectState>((set) => ({
  projects: SEED_PROJECTS,
  addProject: (name) => {
    const project: Project = {
      id: nextId(),
      name: name.trim() || "Untitled Project",
      icon: "generic",
      color: "var(--color-green)",
      editedLabel: "Edited just now",
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },
  addProjectFromArchitecture: (data) => {
    const project: Project = {
      id: nextId(),
      name: data.projectName || "Untitled Project",
      icon: data.projectIcon,
      color: ICON_COLOR[data.projectIcon],
      editedLabel: "Built by Architect · just now",
      architecture: data,
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },
  updateProjectArchitecture: (id, data) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, architecture: data, editedLabel: "Edited just now" } : p
      ),
    }));
  },
}));
