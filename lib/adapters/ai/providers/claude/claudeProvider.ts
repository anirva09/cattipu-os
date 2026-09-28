import Anthropic from "@anthropic-ai/sdk";

import type { AIError, AIProvider, AIProviderRequest, AIResult } from "@/lib/contracts/ai";

/**
 * The Claude adapter — the only module that knows the Anthropic API.
 *
 * Server-side only: it reads credentials from the server environment and is
 * reached through /api/ai, never imported by a client component. The key is
 * never logged, returned or placed in an error message.
 */

export const CLAUDE_PROVIDER_ID = "claude";
/** Overridable per deployment without a code change. */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-5";
/** Sized for a single console answer. */
const MAX_TOKENS = 16_000;
/** Below a 60s serverless limit, so a slow answer returns a normalised
 *  error instead of the platform killing the request. */
const REQUEST_TIMEOUT_MS = 55_000;

type ClaudeClient = Pick<Anthropic, "beta">;

export interface ClaudeProviderOptions {
  env?: Record<string, string | undefined>;
  /** Injected in tests; defaults to the official SDK client. */
  createClient?: () => ClaudeClient;
}


/** Maps an SDK failure onto the normalised contract — most specific first. */
export function claudeError(error: unknown, model: string): AIError {
  const base = { providerId: CLAUDE_PROVIDER_ID };
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { ...base, code: "authentication", message: "Claude rejected the server's API key. Check ANTHROPIC_API_KEY.", retryable: false };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { ...base, code: "rate-limited", message: "Claude is rate-limiting this key. Wait a moment and try again.", retryable: true };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return { ...base, code: "provider-error", message: `Claude does not recognise the model "${model}".`, retryable: false };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { ...base, code: "provider-error", message: "Claude rejected the request as invalid.", retryable: false };
  }
  // In the TypeScript SDK the connection errors subclass APIError, so they
  // are checked before the generic status branch.
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { ...base, code: "provider-error", message: "Claude took too long to answer. Try a shorter prompt or try again.", retryable: true };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { ...base, code: "network", message: "The server could not reach Claude.", retryable: true };
  }
  if (error instanceof Anthropic.APIError) {
    if (error.status === 529) {
      return { ...base, code: "overloaded", message: "Claude is overloaded right now. Try again shortly.", retryable: true };
    }
    const status = error.status ?? 0;
    return {
      ...base,
      code: "provider-error",
      message: `Claude returned an error${status ? ` (HTTP ${status})` : ""}.`,
      retryable: status >= 500,
    };
  }
  return { ...base, code: "provider-error", message: "Claude failed unexpectedly.", retryable: true };
}

export function createClaudeProvider(options: ClaudeProviderOptions = {}): AIProvider {
  const env = options.env ?? process.env;
  const model = env.CATTIPU_CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
  // The SDK reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) itself; the
  // adapter only checks that one is present so a missing key is reported
  // before any network call.
  const configured = () => Boolean(env.ANTHROPIC_API_KEY?.trim() || env.ANTHROPIC_AUTH_TOKEN?.trim());
  const createClient =
    options.createClient ?? (() => new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 }));

  return {
    id: CLAUDE_PROVIDER_ID,
    label: "Claude",
    model,
    local: false,
    setupHint:
      "Set ANTHROPIC_API_KEY in the server environment (for local development, .env.local) and restart.",
    isConfigured: configured,

    async generate(request: AIProviderRequest): Promise<AIResult> {
      try {
        const response = await createClient().beta.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          // The gateway's context blocks (system, project prompt, project
          // memory) as separate system text blocks, in order.
          system: request.context.map((block) => ({ type: "text" as const, text: block.text })),
          messages: request.messages.map((message) => ({ role: message.role, content: message.text })),
          // A classifier decline is re-run server-side on Anthropic's
          // recommended model for that category instead of ending the turn.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });

        // Checked before reading content: a refusal is not an answer.
        if (response.stop_reason === "refusal") {
          return {
            ok: false,
            error: {
              code: "refused",
              message: "Claude declined to answer this prompt.",
              retryable: false,
              providerId: CLAUDE_PROVIDER_ID,
            },
          };
        }

        const text = response.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("\n\n")
          .trim();
        if (!text) {
          return {
            ok: false,
            error: { code: "provider-error", message: "Claude returned no text.", retryable: true, providerId: CLAUDE_PROVIDER_ID },
          };
        }

        return {
          ok: true,
          response: {
            projectId: request.projectId,
            providerId: CLAUDE_PROVIDER_ID,
            // The model that actually produced the message (a fallback may
            // have served it).
            model: response.model,
            text,
            stopReason: response.stop_reason ?? "unknown",
          },
        };
      } catch (error) {
        return { ok: false, error: claudeError(error, model) };
      }
    },
  };
}
