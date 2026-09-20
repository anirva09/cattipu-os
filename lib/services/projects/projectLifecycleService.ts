import type {
  CreateProjectResult,
  ProjectLifecycleService,
} from "@/lib/contracts/projects";
import {
  createProject as createProjectRecord,
  type CattipuProject,
} from "@/lib/project/types";

function canonicalName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * Project lifecycle rules belong outside React and the persistence store.
 * The store remains the canonical owner of the records; this service owns
 * the application rules for creating and selecting them.
 */
export const projectLifecycleService: ProjectLifecycleService = {
  createProject(projects, name): CreateProjectResult {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, reason: "empty-name" };

    const identity = canonicalName(trimmedName);
    if (projects.some((project) => canonicalName(project.name) === identity)) {
      return { ok: false, reason: "duplicate-name" };
    }

    return { ok: true, project: createProjectRecord({ name: trimmedName }) };
  },

  selectProject(projects, id): CattipuProject[] {
    const selectedAt = new Date().toISOString();
    return projects.map((project) =>
      project.id === id ? { ...project, lastOpenedAt: selectedAt } : project,
    );
  },
};

export function projectCreationMessage(reason: "empty-name" | "duplicate-name"): string {
  return reason === "empty-name"
    ? "Enter a project name."
    : "A project with that name already exists.";
}
