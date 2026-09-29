import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import type { FileWrite } from "@/lib/contracts/filesystem";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { isSecretPath } from "@/lib/services/forge/webAppTarget";

/**
 * MVP-07 — Filesystem → Forge: one project's files, written to disk for
 * one build.
 *
 * The project filesystem lives in the browser; a compiler needs files on
 * disk. This is the explicit bridge. It writes ONLY the files the request
 * carried (one project's workspace), ONLY beneath the directory it is
 * given, and never a secret file. It keeps nothing: the directory belongs
 * to a single build and ForgeService deletes it when that build ends, so
 * this is a staging copy, not a second filesystem.
 *
 * Every path is checked twice: by the filesystem's own path rule
 * (`projectFileService.normalizePath`) and by resolving it against the
 * root, so neither `..` nor an absolute path nor a drive letter can land a
 * file anywhere else.
 */

export interface Materialized {
  written: string[];
  /** Paths left out, and why — reported, not silently dropped. */
  skipped: Array<{ path: string; reason: "secret" | "invalid-path" }>;
}

export function insideRoot(root: string, path: string): string | null {
  const target = resolve(root, path);
  const rel = relative(root, target);
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? target : null;
}

export async function materializeWorkspace(root: string, files: readonly FileWrite[]): Promise<Materialized> {
  const out: Materialized = { written: [], skipped: [] };
  await mkdir(root, { recursive: true });
  for (const file of files) {
    const path = projectFileService.normalizePath(file.path);
    const target = path ? insideRoot(root, path) : null;
    if (!path || !target) {
      out.skipped.push({ path: file.path, reason: "invalid-path" });
      continue;
    }
    if (isSecretPath(path)) {
      out.skipped.push({ path, reason: "secret" });
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
    out.written.push(path);
  }
  return out;
}
