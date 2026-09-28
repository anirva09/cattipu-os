/**
 * MVP-04 — the AI boundary.
 *
 *   UI ─→ AIService (client) ─→ /api/ai ─→ AIGateway (server)
 *                                              ↓
 *                                       ProviderRegistry
 *                                              ↓
 *                                       AIProvider adapter ─→ provider API
 *
 * MVP-05 adds Project Memory to the request. The browser sends the project's
 * memory as structured data (`memory`); the gateway validates it against
 * the request's project and assembles the provider context — system prompt,
 * project prompt, project memory — as separate blocks (`AIContextBlock`).
 * The browser never writes provider context itself.
 *
 * Everything in this file is provider-neutral and framework-free: no React,
 * no Next, no provider SDK. The UI and the gateway speak these shapes; only
 * an adapter knows what a provider's wire format looks like. Credentials
 * never cross this boundary — they live in the server environment and are
 * read by the adapter alone.
 */

import type { ProjectMemoryContext } from "./memory";

/** A stable provider identifier, as registered by an adapter. The registry
 *  decides which exist; which one answers by default is server
 *  configuration (lib/services/ai/providerSelection.ts), not a constant the
 *  UI could depend on. */
export type AIProviderId = string;

export type AIRole = "user" | "assistant";

/** One turn of a project conversation. */
export interface AIMessage {
  id: string;
  role: AIRole;
  text: string;
  createdAt: string;
  /** Set on assistant turns: which provider and model produced it. */
  providerId?: AIProviderId;
  model?: string;
}

/** What a caller sends. The project is required: there is no global
 *  conversation, and a request that cannot say which project it belongs to
 *  is refused. */
export interface AIRequest {
  projectId: string;
  /** The project's current name, for the provider's context. Identity is
   *  `projectId`; the name is descriptive only. */
  projectName: string;
  providerId?: AIProviderId;
  /** The conversation so far, oldest first, ending with the new user turn. */
  messages: ReadonlyArray<Pick<AIMessage, "role" | "text">>;
  /** MVP-05. This project's memory, as data. Optional: a request without
   *  it is answered with the system context alone. */
  memory?: ProjectMemoryContext;
}

/**
 * MVP-05 — where a block of provider context came from. The three are kept
 * apart all the way to the adapter, which sends each as its own system
 * block; none is ever merged into a user message.
 *
 *   system          CATTIPU's own instructions (lib/services/ai/systemPrompt.ts)
 *   project-prompt  the project's active prompt, written by its owner
 *   project-memory  the project's memory records
 */
export type AIContextSource = "system" | "project-prompt" | "project-memory";

/** One block of system-role context, rendered by the server. */
export interface AIContextBlock {
  source: AIContextSource;
  text: string;
}

/** A normalised provider answer. */
export interface AIResponse {
  projectId: string;
  providerId: AIProviderId;
  model: string;
  text: string;
  /** The provider's own stop signal, normalised to a string. */
  stopReason: string;
}

export type AIErrorCode =
  /** No credentials for the provider in the server environment. */
  | "not-configured"
  /** No provider is registered under the requested id. */
  | "unknown-provider"
  /** The request itself is malformed (missing project, empty prompt, ...). */
  | "invalid-request"
  /** The provider's runtime cannot be reached (e.g. a local model server
   *  that is not installed or not running). */
  | "unavailable"
  /** The provider rejected the credentials or their permissions. */
  | "authentication"
  | "rate-limited"
  | "overloaded"
  /** The provider declined to answer (e.g. a safety refusal). */
  | "refused"
  /** The provider failed or answered with something unusable. */
  | "provider-error"
  /** The request never reached the gateway or the provider. */
  | "network";

export interface AIError {
  code: AIErrorCode;
  /** Plain words for the person at the console. Never contains credentials. */
  message: string;
  /** Whether trying the same request again later may succeed. */
  retryable: boolean;
  providerId?: AIProviderId;
}

export type AIResult =
  | { ok: true; response: AIResponse }
  | { ok: false; error: AIError };

/** What the console shows before anything is sent: is there a provider,
 *  and can it be used? */
export interface AIProviderStatus {
  providerId: AIProviderId;
  label: string;
  model: string;
  configured: boolean;
  /** Runs on this machine rather than a hosted API. */
  local: boolean;
  /** What to do when the provider cannot answer, in plain words. */
  setupHint: string;
}

/** What an adapter receives: the request, already validated by the gateway,
 *  and the context the gateway assembled for it — system first. */
export interface AIProviderRequest extends AIRequest {
  providerId: AIProviderId;
  context: readonly AIContextBlock[];
}

/**
 * A provider adapter. It translates the normalised request into the
 * provider's wire format and the provider's answer (or failure) back into
 * an `AIResult`. It never throws for a provider failure; it returns one.
 */
export interface AIProvider {
  id: AIProviderId;
  label: string;
  model: string;
  local: boolean;
  setupHint: string;
  /** True when the server environment holds what this provider needs.
   *  Checked before any network call is made. */
  isConfigured(): boolean;
  generate(request: AIProviderRequest): Promise<AIResult>;
}

/** The client-facing service. React depends on this, never on a provider. */
export interface AIService {
  status(providerId?: AIProviderId): Promise<AIProviderStatus | AIError>;
  send(request: AIRequest): Promise<AIResult>;
}
