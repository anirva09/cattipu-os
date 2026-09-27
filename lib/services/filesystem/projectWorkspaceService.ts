import type {
  ProjectWorkspaceService,
  ProjectWorkspaceState,
  ProvisionWorkspaceResult,
} from "@/lib/contracts/filesystem";
import {
  isInWorkspace,
  workspaceForProject,
  type OsObject,
} from "@/lib/os/filesystem";

/**
 * The rules connecting a Project to its filesystem workspace.
 *
 * Kept outside React and outside the persisted store, like
 * projectLifecycleService: useFilesystemStore remains the canonical owner
 * of the records and calls these rules; views read the result.
 */
export const projectWorkspaceService: ProjectWorkspaceService = {
  provision(objects, request, source): ProvisionWorkspaceResult {
    // One workspace per project. A second creation call (a retried form,
    // a template and a manual create racing) returns the first instead of
    // leaving two root folders that both claim the same project.
    const existing = workspaceForProject(objects, request.projectId);
    if (existing) return { objects: [...objects], workspace: existing, created: false };

    const root: OsObject = {
      id: source.id,
      kind: "folder",
      label: request.fallbackLabel,
      projectId: request.projectId,
      parentId: null,
      position: source.position,
      createdAt: source.createdAt,
    };
    const sections: OsObject[] = request.sections.map((name, i) => ({
      id: `${root.id}-s${i}`,
      kind: "folder",
      label: name,
      parentId: root.id,
      // Nested objects are laid out by Explorer's grid, which reads list
      // order, not cells; the cell is stored for the day one of these is
      // dragged onto the desktop.
      position: { col: i, row: 0 },
      createdAt: source.createdAt,
    }));
    const link: OsObject = {
      id: `${root.id}-link`,
      kind: "project-shortcut",
      label: "",
      projectId: request.projectId,
      parentId: root.id,
      position: { col: request.sections.length, row: 0 },
      createdAt: source.createdAt,
    };
    return {
      objects: [...objects, root, ...sections, link],
      workspace: root,
      created: true,
    };
  },

  resolve(objects, activeProject): ProjectWorkspaceState {
    if (!activeProject) return { kind: "no-project" };
    const workspace = workspaceForProject(objects, activeProject.id);
    return workspace
      ? { kind: "ready", project: activeProject, workspace }
      : { kind: "missing", project: activeProject };
  },

  reconcileSelection(objects, selectedId, state) {
    if (state.kind === "no-project") return selectedId;
    if (state.kind === "missing") return null;
    const workspaceId = state.workspace.id;
    return isInWorkspace(objects, selectedId, workspaceId) ? selectedId : workspaceId;
  },
};
