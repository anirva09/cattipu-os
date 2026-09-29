import { createLocalWebRuntime } from "@/lib/adapters/launch/localWebRuntime";
import { spawnRuntimeProcess } from "@/lib/adapters/launch/runtimeProcess";
import { serverForge } from "@/lib/services/forge/serverForge";
import { createLaunchService, type LaunchService } from "./launchService";

/**
 * The server's one LaunchService, the way serverForge.ts holds the one
 * ForgeService — with one difference. A build ends with its request; a
 * runtime outlives it. So the service is kept on `globalThis`: when
 * `next dev` reloads this module, the new module finds the service that
 * owns the running processes instead of forgetting them (a forgotten
 * process is a ghost runtime holding a port).
 *
 * Launch runs native processes on the machine that serves CATTIPU, so it
 * follows Forge's rule: on under `next dev`, off in a production server
 * unless its operator sets LAUNCH_ENABLED=1 (LAUNCH_ENABLED=0 always
 * turns it off). Artifacts are found through Forge, never by path.
 */

export function launchPolicy(env: NodeJS.ProcessEnv = process.env): { enabled: boolean; reason: string | null } {
  if (env.LAUNCH_ENABLED === "0") return { enabled: false, reason: "Launching is switched off on this server (LAUNCH_ENABLED=0)." };
  if (env.NODE_ENV !== "production" || env.LAUNCH_ENABLED === "1") return { enabled: true, reason: null };
  return { enabled: false, reason: "Launching runs on a development server. Set LAUNCH_ENABLED=1 to allow it here." };
}

const KEY = "__cattipuLaunchService" as const;
type LaunchGlobal = typeof globalThis & { [KEY]?: LaunchService };
const store = globalThis as LaunchGlobal;

function createServerLaunch(): LaunchService {
  const service = createLaunchService({
    locateArtifact: (projectId, buildId) => serverForge.locateArtifact(projectId, buildId),
    runtime: createLocalWebRuntime({ spawner: spawnRuntimeProcess }),
    policy: () => launchPolicy(),
  });
  // Each runtime also exits by itself when this process's pipes close;
  // this stops them first on an orderly shutdown.
  process.once("beforeExit", () => void service.stopAll());
  return service;
}

export const serverLaunch: LaunchService = store[KEY] ?? (store[KEY] = createServerLaunch());
