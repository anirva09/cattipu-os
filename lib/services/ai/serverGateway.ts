import { createClaudeProvider } from "@/lib/adapters/ai/providers/claude/claudeProvider";
import { createOllamaProvider } from "@/lib/adapters/ai/providers/ollama/ollamaProvider";

import { createAIGateway, type AIGateway } from "./aiGateway";
import { createProviderRegistry } from "./providerRegistry";
import { selectDefaultProvider } from "./providerSelection";

/**
 * The server's gateway, assembled once. SERVER ONLY — this pulls in the
 * provider adapters; the browser reaches it through /api/ai
 * (app/api/ai/route.ts) via the client AIService.
 *
 * Both providers are always registered. Which one answers by default is
 * server configuration (AI_PROVIDER; Ollama in development, Claude in
 * production) — see providerSelection.ts.
 *
 * To add a provider: write its adapter under lib/adapters/ai/providers/
 * and add it to this list. Nothing that calls the gateway changes.
 */
export const serverAIGateway: AIGateway = createAIGateway(
  createProviderRegistry([createOllamaProvider(), createClaudeProvider()]),
  { defaultProvider: () => selectDefaultProvider(process.env) },
);
