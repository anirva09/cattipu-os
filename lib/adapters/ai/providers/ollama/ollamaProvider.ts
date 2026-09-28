import type { AIError, AIProvider, AIProviderRequest, AIResult } from "@/lib/contracts/ai";
import { systemPrompt } from "@/lib/services/ai/systemPrompt";

/**
 * The Ollama adapter — a local model server on this machine.
 *
 * Server-side only, like every adapter: the browser never sees the model
 * server's address. It speaks Ollama's native chat endpoint
 * (POST {base}/api/chat, stream off) and turns every outcome into the
 * provider-neutral contract.
 *
 * Configuration (server environment, all optional):
 *   OLLAMA_BASE_URL    default http://127.0.0.1:11434
 *   OLLAMA_MODEL       default qwen2.5-coder:1.5b — small enough to run on a
 *                      CPU-only laptop with 8 GB of RAM
 *   OLLAMA_TIMEOUT_MS  default 120000 — CPU inference is slow; a hosted
 *                      deployment has no local server and never gets here
 *   OLLAMA_NUM_GPU     unset = Ollama decides; 0 = CPU only. For machines
 *                      whose GPU Ollama detects but cannot run (the model
 *                      runner exits instead of answering)
 */

export const OLLAMA_PROVIDER_ID = "ollama";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:1.5b";
const DEFAULT_TIMEOUT_MS = 120_000;
/** Bounds one answer so a small CPU model finishes in reasonable time. */
const MAX_OUTPUT_TOKENS = 1024;

export interface OllamaProviderOptions {
  env?: Record<string, string | undefined>;
  /** Injected in tests; defaults to the platform fetch. */
  fetcher?: typeof fetch;
}

interface OllamaChatResponse {
  model?: unknown;
  message?: { content?: unknown };
  done_reason?: unknown;
  error?: unknown;
}

function isValidBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createOllamaProvider(options: OllamaProviderOptions = {}): AIProvider {
  const env = options.env ?? process.env;
  const baseUrl = (env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
  const model = env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const parsedTimeout = Number(env.OLLAMA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;
  const rawGpu = env.OLLAMA_NUM_GPU?.trim();
  const numGpu = rawGpu && /^\d+$/.test(rawGpu) ? Number(rawGpu) : undefined;
  const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const fail = (error: Omit<AIError, "providerId">): AIResult => ({
    ok: false,
    error: { ...error, providerId: OLLAMA_PROVIDER_ID },
  });

  return {
    id: OLLAMA_PROVIDER_ID,
    label: "Local AI",
    model,
    local: true,
    setupHint: `Install Ollama, make sure it is running, and run: ollama pull ${model}`,
    // Nothing secret is needed; configuration is only a usable address and a
    // model name. Whether the server is up is learned by asking it.
    isConfigured: () => isValidBaseUrl(baseUrl) && model.length > 0,

    async generate(request: AIProviderRequest): Promise<AIResult> {
      let res: Response;
      try {
        res = await fetcher(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            options: { num_predict: MAX_OUTPUT_TOKENS, ...(numGpu === undefined ? {} : { num_gpu: numGpu }) },
            messages: [
              { role: "system", content: systemPrompt(request.projectName) },
              ...request.messages.map((message) => ({ role: message.role, content: message.text })),
            ],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          return fail({
            code: "provider-error",
            message: `The local model took longer than ${Math.round(timeoutMs / 1000)}s to answer. Try a shorter prompt.`,
            retryable: true,
          });
        }
        // Not installed and not running look the same from here: nothing
        // answers at the address.
        return fail({
          code: "unavailable",
          message: "The local AI server is not reachable. Make sure Ollama is installed and running.",
          retryable: true,
        });
      }

      let body: OllamaChatResponse | null = null;
      try {
        body = (await res.json()) as OllamaChatResponse;
      } catch {
        body = null;
      }

      if (!res.ok) {
        const detail = typeof body?.error === "string" ? body.error : "";
        if (res.status === 404 || /not found/i.test(detail)) {
          return fail({
            code: "not-configured",
            message: `The local model "${model}" is not installed. Run: ollama pull ${model}`,
            retryable: false,
          });
        }
        if (res.status === 400) {
          return fail({ code: "provider-error", message: "The local model rejected the request.", retryable: false });
        }
        return fail({
          code: "provider-error",
          message: `The local AI server returned an error (HTTP ${res.status}).`,
          retryable: res.status >= 500,
        });
      }

      if (!body || typeof body.message?.content !== "string") {
        return fail({ code: "provider-error", message: "The local AI server sent an unreadable answer.", retryable: true });
      }
      const text = body.message.content.trim();
      if (!text) {
        return fail({ code: "provider-error", message: "The local model returned no text.", retryable: true });
      }

      return {
        ok: true,
        response: {
          projectId: request.projectId,
          providerId: OLLAMA_PROVIDER_ID,
          model: typeof body.model === "string" ? body.model : model,
          text,
          stopReason: typeof body.done_reason === "string" ? body.done_reason : "stop",
        },
      };
    },
  };
}
