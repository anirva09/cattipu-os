import type {
  AIError,
  AIProviderId,
  AIProviderStatus,
  AIRequest,
  AIResult,
} from "@/lib/contracts/ai";
import { assembleContext, parseFilesContext, parseMemoryContext } from "./contextAssembly";
import { parseFileProposals } from "./fileProposals";
import type { ProviderRegistry } from "./providerRegistry";

/**
 * The AI Gateway: the one server-side entry point for AI requests.
 *
 * It validates the request, resolves the provider through the registry,
 * refuses early when that provider has no credentials, assembles the
 * provider context from the project's memory (MVP-05) and files (MVP-06),
 * reads file proposals out of the answer (MVP-06), and guarantees the
 * caller always receives a normalised `AIResult` — never a raw provider
 * error and never an exception.
 */
export interface AIGateway {
  handle(input: unknown): Promise<AIResult>;
  status(providerId?: string): AIProviderStatus | AIError;
}

/** Bounds that keep one request reasonable for a single console turn. */
export const AI_LIMITS = {
  maxMessages: 100,
  maxMessageChars: 20_000,
} as const;

const invalid = (message: string): AIResult => ({
  ok: false,
  error: { code: "invalid-request", message, retryable: false },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Narrows untrusted JSON to an `AIRequest`, or says what is wrong. */
export function parseAIRequest(input: unknown): { ok: true; request: AIRequest } | { ok: false; result: AIResult } {
  if (!isRecord(input)) return { ok: false, result: invalid("The request body must be a JSON object.") };
  const { projectId, projectName, providerId, messages, memory, files } = input;
  if (typeof projectId !== "string" || !projectId.trim()) {
    return { ok: false, result: invalid("An AI request must name the project it belongs to.") };
  }
  if (typeof projectName !== "string") return { ok: false, result: invalid("The project name is missing.") };
  if (providerId !== undefined && typeof providerId !== "string") {
    return { ok: false, result: invalid("The provider id must be a string.") };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, result: invalid("There is no prompt to send.") };
  }
  if (messages.length > AI_LIMITS.maxMessages) {
    return { ok: false, result: invalid(`A conversation can carry at most ${AI_LIMITS.maxMessages} messages.`) };
  }
  const turns: AIRequest["messages"][number][] = [];
  for (const message of messages) {
    if (!isRecord(message) || (message.role !== "user" && message.role !== "assistant") || typeof message.text !== "string") {
      return { ok: false, result: invalid("Every message needs a role of user or assistant and a text.") };
    }
    if (message.text.length > AI_LIMITS.maxMessageChars) {
      return { ok: false, result: invalid(`A message can be at most ${AI_LIMITS.maxMessageChars} characters.`) };
    }
    turns.push({ role: message.role, text: message.text });
  }
  if (turns[0].role !== "user") return { ok: false, result: invalid("A conversation must start with a user message.") };
  const last = turns[turns.length - 1];
  if (last.role !== "user" || !last.text.trim()) {
    return { ok: false, result: invalid("Enter a prompt before sending.") };
  }
  const parsedMemory = parseMemoryContext(memory, projectId);
  if (!parsedMemory.ok) return { ok: false, result: invalid(parsedMemory.message) };
  const parsedFiles = parseFilesContext(files, projectId);
  if (!parsedFiles.ok) return { ok: false, result: invalid(parsedFiles.message) };
  return {
    ok: true,
    request: {
      projectId,
      projectName,
      providerId: providerId as string | undefined,
      messages: turns,
      ...(parsedMemory.memory ? { memory: parsedMemory.memory } : {}),
      ...(parsedFiles.files ? { files: parsedFiles.files } : {}),
    },
  };
}

export interface AIGatewayOptions {
  /** Which provider answers when a request names none. Read per call, so
   *  it follows the server's configuration (providerSelection.ts). */
  defaultProvider: () => AIProviderId;
}

export function createAIGateway(registry: ProviderRegistry, options: AIGatewayOptions): AIGateway {
  const unknownProvider = (id: string): AIError => ({
    code: "unknown-provider",
    message: `No AI provider named "${id}" is available.`,
    retryable: false,
    providerId: id,
  });

  return {
    status(providerId = options.defaultProvider()) {
      const provider = registry.resolve(providerId);
      if (!provider) return unknownProvider(providerId);
      return {
        providerId: provider.id,
        label: provider.label,
        model: provider.model,
        configured: provider.isConfigured(),
        local: provider.local,
        setupHint: provider.setupHint,
      };
    },

    async handle(input) {
      const parsed = parseAIRequest(input);
      if (!parsed.ok) return parsed.result;
      const request = parsed.request;
      const providerId = request.providerId ?? options.defaultProvider();
      const provider = registry.resolve(providerId);
      if (!provider) return { ok: false, error: unknownProvider(providerId) };
      if (!provider.isConfigured()) {
        return {
          ok: false,
          error: {
            code: "not-configured",
            message: `${provider.label} is not configured on this server. ${provider.setupHint}`,
            retryable: false,
            providerId,
          },
        };
      }
      try {
        const result = await provider.generate({ ...request, providerId, context: assembleContext(request) });
        // An adapter answers for its own project only.
        if (result.ok && result.response.projectId !== request.projectId) {
          return {
            ok: false,
            error: { code: "provider-error", message: "The provider answered for a different project.", retryable: false, providerId },
          };
        }
        if (!result.ok) return result;
        // Proposals are read here, once, for every provider. They are data
        // for the person to apply; the gateway writes nothing.
        const fileChanges = parseFileProposals(result.response.text);
        return fileChanges.length > 0
          ? { ok: true, response: { ...result.response, fileChanges } }
          : result;
      } catch {
        // Adapters return failures rather than throw; if one throws anyway,
        // the caller still gets a normalised error. The raw error is not
        // echoed: it may carry request details.
        return {
          ok: false,
          error: { code: "provider-error", message: `${provider.label} failed unexpectedly.`, retryable: true, providerId },
        };
      }
    },
  };
}
