import { create } from "zustand";

import type { BuildConfiguration, BuildTargetId, ForgeClient, ForgeError } from "@/lib/contracts/forge";
import { workspaceForProject } from "@/lib/os/filesystem";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { forgeClient } from "@/lib/services/forge/forgeClient";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useProjectStore } from "@/store/useProjectStore";

/**
 * MVP-07 — Forge's in-flight state, one entry per project.
 *
 * Builds themselves are the project's (`project.forge.builds`, persisted by
 * the project store). What lives here is only what must NOT survive a
 * reload: whether a build is running and the last error that stopped one
 * from starting — so, like useAIStore, this store is not persisted.
 *
 * `build` is the whole browser half of the pipeline: the files come from
 * the filesystem (their owner) as a snapshot of the project's workspace,
 * the build runs on the server, and the result is filed under the project
 * that asked — even if the person has switched projects meanwhile.
 */

export interface ForgeSession {
  status: "idle" | "running";
  startedAt: string | null;
  error: ForgeError | null;
}

export const IDLE_FORGE_SESSION: ForgeSession = Object.freeze({ status: "idle", startedAt: null, error: null }) as ForgeSession;

interface ForgeState {
  sessions: Record<string, ForgeSession>;
  build: (
    projectId: string,
    target: BuildTargetId,
    configuration: BuildConfiguration,
    client?: ForgeClient,
  ) => Promise<void>;
}

export const useForgeStore = create<ForgeState>()((set, get) => {
  const setSession = (projectId: string, session: ForgeSession) =>
    set((s) => ({ sessions: { ...s.sessions, [projectId]: session } }));

  return {
    sessions: {},

    build: async (projectId, target, configuration, client = forgeClient) => {
      if (get().sessions[projectId]?.status === "running") return;
      const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return;

      const objects = useFilesystemStore.getState().objects;
      const workspace = workspaceForProject(objects, projectId);
      if (!workspace) {
        setSession(projectId, {
          status: "idle",
          startedAt: null,
          error: { code: "invalid-request", message: `${project.name} has no workspace folder, so there are no files to build.` },
        });
        return;
      }

      setSession(projectId, { status: "running", startedAt: new Date().toISOString(), error: null });
      const response = await client.build({
        projectId,
        target,
        configuration,
        files: projectFileService.snapshot(objects, workspace.id),
      });

      const notify = useNotificationStore.getState().push;
      if (!response.ok) {
        setSession(projectId, { status: "idle", startedAt: null, error: response.error });
        notify("error", "Build did not start", { message: response.error.message });
        return;
      }
      useProjectStore.getState().recordForgeBuild(projectId, response.result);
      setSession(projectId, { status: "idle", startedAt: null, error: null });
      notify(
        response.result.status === "success" ? "success" : "error",
        response.result.status === "success" ? "Build complete" : "Build failed",
        { message: `${project.name}: ${response.result.summary}` },
      );
    },
  };
});
