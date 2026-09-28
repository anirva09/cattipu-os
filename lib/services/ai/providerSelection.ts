import type { AIProviderId } from "@/lib/contracts/ai";

/**
 * Which provider answers when a request names none. Server-side only.
 *
 *   AI_PROVIDER=ollama | claude   explicit choice, always wins
 *   (unset, development)          ollama — works on a developer machine with
 *                                 no paid key
 *   (unset, production)           claude — a hosted deployment has no local
 *                                 model server
 *
 * Every provider stays registered either way; this only picks the default.
 */
export function selectDefaultProvider(env: Record<string, string | undefined>): AIProviderId {
  const explicit = env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit) return explicit;
  return env.NODE_ENV === "production" ? "claude" : "ollama";
}
