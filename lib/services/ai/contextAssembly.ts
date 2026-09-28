import type { AIContextBlock, AIRequest } from "@/lib/contracts/ai";
import {
  MEMORY_LIMITS,
  MEMORY_RECORD_LABEL,
  isMemoryRecordKind,
  type ProjectMemoryContext,
} from "@/lib/contracts/memory";

import { systemPrompt } from "./systemPrompt";

/**
 * MVP-05 — the server's assembly of provider context.
 *
 *   AIRequest.memory (data from the browser)
 *        ↓ parseMemoryContext   validated, bounded, same project only
 *        ↓ assembleContext      system · project prompt · project memory
 *   AIProviderRequest.context   separate system blocks, provider-neutral
 *
 * The browser selects which records and prompt belong to the project; it
 * never writes the words a provider reads. That happens here, once, for
 * every provider, so switching providers never changes what the assistant
 * is told about the project.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Narrows untrusted request data to a `ProjectMemoryContext` for
 * `projectId`, or says what is wrong. Memory filed under another project is
 * refused outright rather than filtered: it means the caller mixed up two
 * projects, and answering anyway would leak one into the other.
 */
export function parseMemoryContext(
  input: unknown,
  projectId: string,
): { ok: true; memory: ProjectMemoryContext | undefined } | { ok: false; message: string } {
  if (input === undefined || input === null) return { ok: true, memory: undefined };
  if (!isRecord(input)) return { ok: false, message: "Project memory must be an object." };
  if (input.projectId !== projectId) {
    return { ok: false, message: "The project memory sent belongs to a different project." };
  }

  let prompt: ProjectMemoryContext["prompt"] = null;
  if (input.prompt !== undefined && input.prompt !== null) {
    const p = input.prompt;
    if (!isRecord(p) || typeof p.id !== "string" || typeof p.name !== "string" || typeof p.content !== "string") {
      return { ok: false, message: "The project prompt needs an id, a name and content." };
    }
    if (p.projectId !== projectId) {
      return { ok: false, message: "The project prompt sent belongs to a different project." };
    }
    if (p.name.length > MEMORY_LIMITS.maxPromptNameChars || p.content.length > MEMORY_LIMITS.maxPromptChars) {
      return { ok: false, message: "The project prompt is too long." };
    }
    prompt = { id: p.id, projectId, name: p.name, content: p.content };
  }

  const rawRecords = input.records ?? [];
  if (!Array.isArray(rawRecords)) return { ok: false, message: "Project memory records must be a list." };
  if (rawRecords.length > MEMORY_LIMITS.maxRecords) {
    return { ok: false, message: `Project memory can carry at most ${MEMORY_LIMITS.maxRecords} records.` };
  }
  const records: Array<ProjectMemoryContext["records"][number]> = [];
  for (const r of rawRecords) {
    if (!isRecord(r) || typeof r.id !== "string" || !isMemoryRecordKind(r.kind) || typeof r.text !== "string") {
      return { ok: false, message: "Every memory record needs an id, a known kind and text." };
    }
    if (r.text.length > MEMORY_LIMITS.maxRecordChars) {
      return { ok: false, message: "A memory record is too long." };
    }
    records.push({ id: r.id, kind: r.kind, text: r.text });
  }

  return { ok: true, memory: { projectId, prompt, records } };
}

/**
 * The context for one request: CATTIPU's system prompt, then the project's
 * active prompt, then its memory — each its own block, each only when there
 * is something in it. Deterministic: the same request always produces the
 * same blocks.
 */
export function assembleContext(request: AIRequest): AIContextBlock[] {
  const blocks: AIContextBlock[] = [{ source: "system", text: systemPrompt(request.projectName) }];
  const memory = request.memory;
  if (!memory || memory.projectId !== request.projectId) return blocks;

  const prompt = memory.prompt?.content.trim();
  if (memory.prompt && prompt) {
    blocks.push({
      source: "project-prompt",
      text: [
        `Project prompt "${memory.prompt.name.trim()}", set by the owner of "${request.projectName}".`,
        "Follow it for this project:",
        prompt,
      ].join("\n"),
    });
  }

  const lines = memory.records
    .map((r) => ({ label: MEMORY_RECORD_LABEL[r.kind], text: r.text.trim() }))
    .filter((r) => r.text)
    .map((r) => `- [${r.label}] ${r.text}`);
  if (lines.length > 0) {
    blocks.push({
      source: "project-memory",
      text: [
        `Project memory for "${request.projectName}", recorded by its owner.`,
        "Treat these as facts about this project and use them when they are relevant:",
        ...lines,
      ].join("\n"),
    });
  }

  return blocks;
}
