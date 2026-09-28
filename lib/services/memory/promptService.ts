import {
  MEMORY_LIMITS,
  type MemoryChange,
  type MemoryFailure,
  type PromptService,
} from "@/lib/contracts/memory";
import type { ProjectPrompt } from "@/lib/project/types";

/**
 * MVP-05 — the rules for a project's prompts.
 *
 * A prompt is a named instruction the project owner keeps for the AI. It
 * belongs to one project; the active one travels with every AI request as
 * its own block of context, never merged into the person's message. Pure,
 * like memoryService: the project store persists what this returns.
 */

const fail = <T>(reason: MemoryFailure): MemoryChange<T> => ({ ok: false, reason });

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export const promptService: PromptService = {
  save(memory, projectId, draft, stamp) {
    const name = draft.name.trim();
    const content = draft.content.trim();
    if (!name) return fail("empty-name");
    if (!content) return fail("empty-text");
    if (name.length > MEMORY_LIMITS.maxPromptNameChars || content.length > MEMORY_LIMITS.maxPromptChars) {
      return fail("too-long");
    }
    if (memory.prompts.some((p) => p.id !== draft.id && sameName(p.name, name))) return fail("duplicate-name");

    if (draft.id) {
      const current = memory.prompts.find((p) => p.id === draft.id);
      if (!current) return fail("not-found");
      const prompt: ProjectPrompt = { ...current, projectId, name, content, updatedAt: stamp.at };
      return {
        ok: true,
        value: prompt,
        memory: { ...memory, prompts: memory.prompts.map((p) => (p.id === prompt.id ? prompt : p)) },
      };
    }

    if (memory.prompts.length >= MEMORY_LIMITS.maxPrompts) return fail("limit-reached");
    const prompt: ProjectPrompt = { id: stamp.id, projectId, name, content, createdAt: stamp.at, updatedAt: stamp.at };
    // The first prompt a project gets is the one it uses; after that the
    // person chooses.
    const activePromptId = memory.activePromptId ?? prompt.id;
    return { ok: true, value: prompt, memory: { ...memory, prompts: [...memory.prompts, prompt], activePromptId } };
  },

  remove(memory, promptId) {
    if (!memory.prompts.some((p) => p.id === promptId)) return fail("not-found");
    return {
      ok: true,
      value: null,
      memory: {
        ...memory,
        prompts: memory.prompts.filter((p) => p.id !== promptId),
        activePromptId: memory.activePromptId === promptId ? null : memory.activePromptId,
      },
    };
  },

  setActive(memory, promptId) {
    if (promptId === null) return { ok: true, value: null, memory: { ...memory, activePromptId: null } };
    const prompt = memory.prompts.find((p) => p.id === promptId);
    if (!prompt) return fail("not-found");
    return { ok: true, value: prompt, memory: { ...memory, activePromptId: prompt.id } };
  },

  active(project) {
    const id = project.memory.activePromptId;
    if (!id) return null;
    return project.memory.prompts.find((p) => p.id === id && p.projectId === project.id) ?? null;
  },
};
