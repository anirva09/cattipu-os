import { FILE_LIMITS, type FileWrite } from "@/lib/contracts/filesystem";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";

/**
 * MVP-06 — file proposals, read out of an answer's text.
 *
 * The system prompt (systemPrompt.ts) asks every provider for the same
 * plain-text shape, one block per file:
 *
 *   FILE: src/tasks.ts
 *   ```ts
 *   ...the whole file...
 *   ```
 *
 * Plain text rather than a vendor's tool-calling API, so a small local
 * model and a hosted one propose files the same way and no adapter learns
 * anything about files. The gateway runs this on every successful answer.
 *
 * Tolerant of what models actually write — a header in bold or backticks,
 * a language tag on the fence, code fences nested inside a Markdown file —
 * and strict about what it keeps: a path `projectFileService` refuses, an
 * unterminated block or an oversized file is dropped, never repaired.
 */

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;

/** The path named by a `FILE:` header line, or null. Markdown emphasis,
 *  backticks, heading marks and list bullets around it are ignored. */
function headerPath(line: string): string | null {
  const bare = line.replace(/[*`#>]/g, "").replace(/^\s*[-+]\s+/, "").trim();
  const match = /^FILE:\s*(\S.*)$/i.exec(bare);
  return match ? match[1].trim() : null;
}

/**
 * The block's closing line: the first bare fence of the same kind that is
 * not closing a fence opened inside the file. A nested fence opens with an
 * info string (```ts), which is how Markdown content with its own code
 * examples survives intact.
 */
function closingLine(lines: readonly string[], from: number, fence: string): number {
  let depth = 0;
  for (let i = from; i < lines.length; i += 1) {
    const match = FENCE.exec(lines[i]);
    if (!match || match[1][0] !== fence[0] || match[1].length < fence.length) continue;
    if (match[2].trim()) depth += 1;
    else if (depth > 0) depth -= 1;
    else return i;
  }
  return -1;
}

export function parseFileProposals(text: string): FileWrite[] {
  const lines = text.split(/\r?\n/);
  const byPath = new Map<string, string>();
  let i = 0;
  while (i < lines.length) {
    const named = headerPath(lines[i]);
    if (named === null) {
      i += 1;
      continue;
    }
    let open = i + 1;
    while (open < lines.length && !lines[open].trim()) open += 1;
    const fence = open < lines.length ? FENCE.exec(lines[open]) : null;
    if (!fence) {
      i += 1;
      continue;
    }
    const close = closingLine(lines, open + 1, fence[1]);
    if (close < 0) break;
    i = close + 1;

    const path = projectFileService.normalizePath(named);
    const body = lines.slice(open + 1, close).join("\n");
    const content = body ? `${body}\n` : "";
    if (!path || content.length > FILE_LIMITS.maxFileChars) continue;
    // The same path twice means the answer revised itself; the last wins.
    byPath.delete(path);
    byPath.set(path, content);
  }
  return [...byPath]
    .slice(0, FILE_LIMITS.maxWrites)
    .map(([path, content]) => ({ path, content }));
}
