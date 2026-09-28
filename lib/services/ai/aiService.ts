import type {
  AIError,
  AIProviderStatus,
  AIRequest,
  AIResult,
  AIService,
} from "@/lib/contracts/ai";

/**
 * The browser side of the AI boundary. React depends on this contract only:
 * it never imports an adapter, a provider SDK or a credential. Every
 * outcome — including a request that never reaches the server — comes back
 * as a normalised `AIResult`.
 */

const ENDPOINT = "/api/ai";

const networkError = (message: string): AIError => ({ code: "network", message, retryable: true });

function isAIResult(value: unknown): value is AIResult {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  const v = value as { ok: unknown; response?: unknown; error?: unknown };
  return v.ok === true ? typeof v.response === "object" && v.response !== null : typeof v.error === "object" && v.error !== null;
}

export function createAIService(fetcher: typeof fetch = (...args) => fetch(...args)): AIService {
  return {
    async status(providerId) {
      try {
        const query = providerId ? `?provider=${encodeURIComponent(providerId)}` : "";
        const res = await fetcher(`${ENDPOINT}${query}`, { method: "GET", cache: "no-store" });
        const body = (await res.json()) as AIProviderStatus | AIError;
        return body;
      } catch {
        return networkError("The AI gateway could not be reached.");
      }
    },

    async send(request: AIRequest): Promise<AIResult> {
      let res: Response;
      try {
        res = await fetcher(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
      } catch {
        return { ok: false, error: networkError("The AI gateway could not be reached. Check the connection and try again.") };
      }
      try {
        const body: unknown = await res.json();
        if (isAIResult(body)) return body;
      } catch {
        // falls through to the malformed-response error below
      }
      return {
        ok: false,
        error: { code: "provider-error", message: `The AI gateway answered unexpectedly (HTTP ${res.status}).`, retryable: true },
      };
    },
  };
}

export const aiService: AIService = createAIService();
