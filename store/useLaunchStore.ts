import { create } from "zustand";

import type { LaunchClient, LaunchError, LaunchRuntime, LaunchServerStatus } from "@/lib/contracts/launch";
import { launchClient } from "@/lib/services/launch/launchClient";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useProjectStore } from "@/store/useProjectStore";

/**
 * MVP-08 — Launch's view of the server, one entry per project.
 *
 * Whether an application is running is a fact about a process on the
 * server, so it is never persisted: this store holds only what the server
 * last SAID (`runtime`, with when it said it) and what is in flight. After
 * a reload it is empty until `refresh` asks again — nothing here can carry
 * a stale RUNNING across a reload. The project keeps the launch history
 * (`project.launch.runs`, via useProjectStore).
 *
 * `launch` checks the build against the project before asking the server —
 * a failed build or one with no artifact never becomes a request — and the
 * server checks it again against Forge, which is the authority.
 */

export interface LaunchSession {
  /** A request in flight. */
  pending: "starting" | "stopping" | null;
  /** The project's runtime as the server last reported it. */
  runtime: LaunchRuntime | null;
  error: LaunchError | null;
}

export const IDLE_LAUNCH_SESSION: LaunchSession = Object.freeze({ pending: null, runtime: null, error: null }) as LaunchSession;

export type LaunchServerView =
  | { kind: "unknown" }
  | { kind: "known"; status: Omit<LaunchServerStatus, "runtimes">; observedAt: string }
  | { kind: "unavailable"; error: LaunchError };

interface LaunchState {
  server: LaunchServerView;
  sessions: Record<string, LaunchSession>;
  /** Asks the server for every runtime and reconciles every project. */
  refresh: (client?: LaunchClient) => Promise<void>;
  launch: (projectId: string, buildId: string, client?: LaunchClient) => Promise<void>;
  stop: (projectId: string, client?: LaunchClient) => Promise<void>;
}

const live = (runtime: LaunchRuntime | null | undefined) =>
  runtime?.status === "running" || runtime?.status === "starting" || runtime?.status === "stopping";

export const useLaunchStore = create<LaunchState>()((set, get) => {
  const session = (projectId: string) => get().sessions[projectId] ?? IDLE_LAUNCH_SESSION;
  const setSession = (projectId: string, patch: Partial<LaunchSession>) =>
    set((s) => ({ sessions: { ...s.sessions, [projectId]: { ...(s.sessions[projectId] ?? IDLE_LAUNCH_SESSION), ...patch } } }));
  const notify = (...args: Parameters<ReturnType<typeof useNotificationStore.getState>["push"]>) =>
    useNotificationStore.getState().push(...args);
  const nameOf = (projectId: string) => useProjectStore.getState().projects.find((p) => p.id === projectId)?.name ?? projectId;

  return {
    server: { kind: "unknown" },
    sessions: {},

    refresh: async (client = launchClient) => {
      const status = await client.status();
      if ("code" in status) {
        set({ server: { kind: "unavailable", error: status } });
        return;
      }
      const { runtimes, ...rest } = status;
      set({ server: { kind: "known", status: rest, observedAt: new Date().toISOString() } });

      const projects = useProjectStore.getState();
      for (const project of projects.projects) {
        const reported = runtimes.find((r) => r.projectId === project.id) ?? null;
        const before = session(project.id).runtime;
        // A runtime seen running that the server now reports failed ended
        // on its own, not because anyone asked.
        if (before?.status === "running" && reported?.launchId === before.launchId && reported.status === "failed") {
          notify("error", "Application stopped unexpectedly", { message: `${project.name}: ${reported.reason ?? "its server exited."}` });
        }
        if (reported || before) setSession(project.id, { runtime: reported });
        if (reported || project.launch.runs.some((r) => r.result === null)) {
          projects.reconcileLaunches(project.id, reported);
        }
      }
    },

    launch: async (projectId, buildId, client = launchClient) => {
      if (session(projectId).pending) return;
      const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return;

      const build = project.forge.builds.find((b) => b.id === buildId);
      const refuse = (message: string) => setSession(projectId, { error: { code: "build-not-found", message } });
      if (!build) return refuse(`Build ${buildId} is not one of ${project.name}'s builds.`);
      if (build.status !== "success" || !build.artifact) return refuse(`Build ${buildId} failed, so it has no artifact to launch.`);

      setSession(projectId, { pending: "starting", error: null });
      const response = await client.launch({ projectId, buildId });
      if (!response.ok) {
        setSession(projectId, { pending: null, error: response.error });
        notify("error", "Launch did not start", { message: response.error.message });
        return;
      }
      const { runtime } = response;
      setSession(projectId, { pending: null, runtime, error: null });
      useProjectStore.getState().recordLaunch(projectId, runtime);
      if (runtime.status === "running") {
        notify("success", "Application launched", { message: `${project.name}: ${runtime.endpoint}` });
      } else {
        notify("error", "Launch failed", { message: `${project.name}: ${runtime.reason ?? "the application did not start."}` });
      }
    },

    stop: async (projectId, client = launchClient) => {
      const current = session(projectId);
      if (current.pending || !live(current.runtime)) return;
      setSession(projectId, { pending: "stopping", error: null });
      const response = await client.stop({ projectId });
      if (!response.ok) {
        setSession(projectId, { pending: null, error: response.error });
        // Nothing running on the server: whatever the view held has ended.
        if (response.error.code === "not-running") {
          setSession(projectId, { runtime: null });
          useProjectStore.getState().reconcileLaunches(projectId, null);
        }
        notify("error", "Stop failed", { message: response.error.message });
        return;
      }
      setSession(projectId, { pending: null, runtime: response.runtime, error: null });
      useProjectStore.getState().recordLaunch(projectId, response.runtime);
      notify("info", "Application stopped", { message: `${nameOf(projectId)}: ${response.runtime.endpoint ?? "stopped"}` });
    },
  };
});
