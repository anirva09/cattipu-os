import type { AIContextBlock, AIRequest } from "@/lib/contracts/ai";
import { FILE_LIMITS, type ProjectFilesContext } from "@/lib/contracts/filesystem";
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
 *
 * MVP-06 adds the project's files the same way: paths and text as data
 * (`parseFilesContext`), rendered here as one `project-files` block.
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
 * MVP-06 — narrows untrusted request data to a `ProjectFilesContext` for
 * `projectId`. Like memory, files filed under another project are refused,
 * not filtered.
 */
export function parseFilesContext(
  input: unknown,
  projectId: string,
): { ok: true; files: ProjectFilesContext | undefined } | { ok: false; message: string } {
  if (input === undefined || input === null) return { ok: true, files: undefined };
  if (!isRecord(input)) return { ok: false, message: "Project files must be an object." };
  if (input.projectId !== projectId) {
    return { ok: false, message: "The project files sent belong to a different project." };
  }
  const raw = input.files ?? [];
  if (!Array.isArray(raw)) return { ok: false, message: "Project files must be a list." };
  if (raw.length > FILE_LIMITS.maxContextFiles) {
    return { ok: false, message: `A request can describe at most ${FILE_LIMITS.maxContextFiles} files.` };
  }
  let chars = 0;
  const files: Array<ProjectFilesContext["files"][number]> = [];
  for (const f of raw) {
    if (!isRecord(f) || typeof f.path !== "string" || typeof f.content !== "string") {
      return { ok: false, message: "Every project file needs a path and content." };
    }
    chars += f.content.length;
    if (f.path.length > FILE_LIMITS.maxPathChars || chars > FILE_LIMITS.maxContextChars) {
      return { ok: false, message: "The project files sent are too large." };
    }
    files.push({ path: f.path, content: f.content, ...(f.omitted === true ? { omitted: true } : {}) });
  }
  return { ok: true, files: { projectId, files } };
}

function filesBlock(request: AIRequest): AIContextBlock | null {
  const files = request.files;
  if (!files || files.projectId !== request.projectId) return null;
  const header = `Files in the workspace of "${request.projectName}", paths relative to the workspace.`;
  if (files.files.length === 0) {
    return { source: "project-files", text: [header, "The workspace has no files yet."].join("\n") };
  }
  const parts = files.files.map((f) =>
    f.omitted
      ? [`FILE: ${f.path}`, "(content not included: too large for this request)"].join("\n")
      : [`FILE: ${f.path}`, "```", f.content.replace(/\n$/, ""), "```"].join("\n"),
  );
  return { source: "project-files", text: [header, ...parts].join("\n\n") };
}

/**
 * The context for one request: CATTIPU's system prompt, then the project's
 * active prompt, then its memory, then its files — each its own block, each
 * only when there is something in it. Deterministic: the same request
 * always produces the same blocks.
 */
export function assembleContext(request: AIRequest): AIContextBlock[] {
  const blocks: AIContextBlock[] = [{ source: "system", text: systemPrompt(request.projectName) }];
  const files = filesBlock(request);
  const memory = request.memory;
  if (!memory || memory.projectId !== request.projectId) return files ? [...blocks, files] : blocks;

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

  if (files) blocks.push(files);
  return blocks;
}
