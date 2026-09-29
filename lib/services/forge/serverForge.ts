import { tmpdir } from "node:os";
import { join } from "node:path";

import { runProcess } from "@/lib/adapters/forge/processRunner";
import { resolveEsbuildToolchain } from "@/lib/adapters/forge/esbuildToolchain";
import { createForgeService } from "./forgeService";

/**
 * The server's one ForgeService, the way serverGateway.ts holds the one AI
 * Gateway.
 *
 * Building runs a native process on the machine that serves CATTIPU, so it
 * is on where that machine is the developer's own — `next dev` — and off in
 * a production server unless its operator sets FORGE_ENABLED=1. Workspaces
 * and artifacts go under the OS temp directory (FORGE_ROOT overrides it),
 * outside the repository, so a build never shows up as a source change.
 */

export function forgePolicy(env: NodeJS.ProcessEnv = process.env): { enabled: boolean; reason: string | null } {
  if (env.FORGE_ENABLED === "0") return { enabled: false, reason: "Building is switched off on this server (FORGE_ENABLED=0)." };
  if (env.NODE_ENV !== "production" || env.FORGE_ENABLED === "1") return { enabled: true, reason: null };
  return { enabled: false, reason: "Building runs on a development server. Set FORGE_ENABLED=1 to allow it here." };
}

/** Server environment values that must never reach stored build output. */
export function secretValues(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env)
    .filter(([key, value]) => /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key) && typeof value === "string" && value.length >= 8)
    .map(([, value]) => value as string);
}

export const serverForge = createForgeService({
  root: process.env.FORGE_ROOT || join(tmpdir(), "cattipu-forge"),
  toolchain: () => resolveEsbuildToolchain(),
  runner: runProcess,
  policy: () => forgePolicy(),
  secrets: () => secretValues(),
});
