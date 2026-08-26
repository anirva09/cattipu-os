import type { GeneratedArchitecture } from "./types";
import { pickTemplate } from "./seedTemplates";

/**
 * ── The one file to change when wiring a real model ──────────────────
 *
 * Everything downstream (useArchitectStore, BuildPlayback, every panel,
 * and the project-integration step) depends only on the shape of
 * GeneratedArchitecture returned below — never on how it was produced.
 * To connect a real OpenAI/Claude key later:
 *
 *   1. Flip USE_SEEDED_DATA to false.
 *   2. Implement generateFromModel() below — call your model, then
 *      normalize its response into GeneratedArchitecture (see
 *      lib/ai/types.ts). A small `lib/ai/normalize.ts` helper is a
 *      reasonable next step if the model's raw JSON needs reshaping.
 *
 * No component, store, or window ever needs to change.
 */
const USE_SEEDED_DATA = true;

export async function generateArchitecture(prompt: string): Promise<GeneratedArchitecture> {
  if (USE_SEEDED_DATA) {
    return generateSeeded(prompt);
  }
  return generateFromModel(prompt);
}

async function generateSeeded(prompt: string): Promise<GeneratedArchitecture> {
  // a short, honest "thinking" delay — this is seeded data, not a real
  // call, but the UI (loading state, playback) is built for the latency
  // a real model call would actually have.
  await wait(450);
  return pickTemplate(prompt);
}

async function generateFromModel(prompt: string): Promise<GeneratedArchitecture> {
  void prompt;
  // Example shape for wiring a real model behind an API route:
  //
  //   const res = await fetch("/api/architect/generate", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ prompt }),
  //   });
  //   if (!res.ok) throw new Error("Architect generation failed");
  //   return (await res.json()) as GeneratedArchitecture;
  //
  throw new Error(
    "generateFromModel() isn't implemented yet — set USE_SEEDED_DATA back to true, or implement this function before flipping it off."
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
