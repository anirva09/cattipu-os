import type { AIProvider, AIProviderId } from "@/lib/contracts/ai";

/**
 * Resolves providers by stable id. Adding a provider is one adapter plus
 * one entry where the registry is assembled (lib/services/ai/serverGateway.ts);
 * nothing that calls the gateway changes.
 */
export interface ProviderRegistry {
  resolve(id: AIProviderId): AIProvider | undefined;
  list(): readonly AIProvider[];
}

export function createProviderRegistry(providers: readonly AIProvider[]): ProviderRegistry {
  const byId = new Map<AIProviderId, AIProvider>();
  for (const provider of providers) {
    if (byId.has(provider.id)) throw new Error(`Duplicate AI provider id: ${provider.id}`);
    byId.set(provider.id, provider);
  }
  return {
    resolve: (id) => byId.get(id),
    list: () => [...byId.values()],
  };
}
