import type { ForgeClient, ForgeError, ForgeResponse } from "@/lib/contracts/forge";

/**
 * The browser side of Forge. React depends on this contract only: it never
 * starts a process or touches a path. Every outcome — including a request
 * that never reaches the server — comes back normalised.
 */

const ENDPOINT = "/api/forge";

const networkError = (message: string): ForgeError => ({ code: "network", message });

function isForgeResponse(value: unknown): value is ForgeResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  const v = value as { ok: unknown; result?: unknown; error?: unknown };
  return v.ok === true ? typeof v.result === "object" && v.result !== null : typeof v.error === "object" && v.error !== null;
}

export function createForgeClient(fetcher: typeof fetch = (...args) => fetch(...args)): ForgeClient {
  return {
    async status() {
      try {
        const res = await fetcher(ENDPOINT, { method: "GET", cache: "no-store" });
        return await res.json();
      } catch {
        return networkError("Forge could not be reached.");
      }
    },

    async build(request) {
      let res: Response;
      try {
        res = await fetcher(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
      } catch {
        return { ok: false, error: networkError("Forge could not be reached. Check that CATTIPU's server is running.") };
      }
      try {
        const body: unknown = await res.json();
        if (isForgeResponse(body)) return body;
      } catch {
        // falls through
      }
      return { ok: false, error: { code: "internal", message: `Forge answered unexpectedly (HTTP ${res.status}).` } };
    },

    async artifact(projectId, buildId) {
      try {
        const query = `?projectId=${encodeURIComponent(projectId)}&buildId=${encodeURIComponent(buildId)}`;
        const res = await fetcher(`${ENDPOINT}${query}`, { method: "GET", cache: "no-store" });
        return await res.json();
      } catch {
        return networkError("Forge could not be reached.");
      }
    },
  };
}

export const forgeClient: ForgeClient = createForgeClient();
