import type { LaunchClient, LaunchError, LaunchResponse } from "@/lib/contracts/launch";

/**
 * The browser side of Launch. React depends on this contract only: it
 * never starts a process, never names a path, never builds an address.
 * Every outcome — including a request that never reaches the server —
 * comes back normalised.
 */

const ENDPOINT = "/api/launch";

const networkError = (message: string): LaunchError => ({ code: "network", message });

function isLaunchResponse(value: unknown): value is LaunchResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  const v = value as { ok: unknown; runtime?: unknown; error?: unknown };
  return v.ok === true ? typeof v.runtime === "object" && v.runtime !== null : typeof v.error === "object" && v.error !== null;
}

export function createLaunchClient(fetcher: typeof fetch = (...args) => fetch(...args)): LaunchClient {
  async function post(body: Record<string, string>): Promise<LaunchResponse> {
    let res: Response;
    try {
      res = await fetcher(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return { ok: false, error: networkError("Launch could not be reached. Check that CATTIPU's server is running.") };
    }
    try {
      const parsed: unknown = await res.json();
      if (isLaunchResponse(parsed)) return parsed;
    } catch {
      // falls through
    }
    return { ok: false, error: { code: "internal", message: `Launch answered unexpectedly (HTTP ${res.status}).` } };
  }

  return {
    async status() {
      try {
        const res = await fetcher(ENDPOINT, { method: "GET", cache: "no-store" });
        return await res.json();
      } catch {
        return networkError("Launch could not be reached.");
      }
    },
    launch: ({ projectId, buildId }) => post({ action: "start", projectId, buildId }),
    stop: ({ projectId }) => post({ action: "stop", projectId }),
  };
}

export const launchClient: LaunchClient = createLaunchClient();
