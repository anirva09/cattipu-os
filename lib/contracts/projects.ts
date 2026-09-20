import type { CattipuProject } from "@/lib/project/types";

/** The small application contract for the first project lifecycle. */
export type ProjectCreationFailure = "empty-name" | "duplicate-name";

export type CreateProjectResult =
  | { ok: true; project: CattipuProject }
  | { ok: false; reason: ProjectCreationFailure };

export interface ProjectLifecycleService {
  createProject(
    projects: readonly CattipuProject[],
    name: string,
  ): CreateProjectResult;
  selectProject(
    projects: readonly CattipuProject[],
    id: string,
  ): CattipuProject[];
}
