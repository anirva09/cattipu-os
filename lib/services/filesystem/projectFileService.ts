import {
  FILE_LIMITS,
  type ApplyFileWritesResult,
  type FileWritePreview,
  type ProjectFileService,
  type ProjectFilesContext,
} from "@/lib/contracts/filesystem";
import { childrenOf, descendantIds, type OsObject } from "@/lib/os/filesystem";

/**
 * MVP-06 — files inside a Project's workspace, addressed by path.
 *
 * The filesystem stores a tree of labelled records, not paths. A path is
 * how the AI (and a person) names a file, so this service is the one place
 * that turns "src/tasks.ts" into records and back. Pure, like
 * projectWorkspaceService: useFilesystemStore owns the records and calls
 * these rules; the gateway uses `normalizePath` on the server.
 */

/** Letters, digits, space, dot, dash and underscore — what a folder label
 *  in this OS can carry without a path becoming ambiguous. */
const SEGMENT = /^[A-Za-z0-9 ._-]+$/;

function segmentsOf(path: string): string[] | null {
  const normalized = projectFileService.normalizePath(path);
  return normalized ? normalized.split("/") : null;
}

/** The child of `parentId` named `label`, in listing order, so two siblings
 *  that share a label always resolve to the same one. */
function childNamed(objects: readonly OsObject[], parentId: string, label: string): OsObject | null {
  return childrenOf(objects, parentId).find((o) => o.kind !== "project-shortcut" && o.label === label) ?? null;
}

/** Where a path lands: its parent folder id (or null when that folder does
 *  not exist yet) and the file at the path, if any. */
function locate(
  objects: readonly OsObject[],
  workspaceId: string,
  segments: readonly string[],
): { ok: true; parentId: string | null; file: OsObject | null } | { ok: false } {
  let parentId: string | null = workspaceId;
  for (const name of segments.slice(0, -1)) {
    if (parentId === null) break;
    const child = childNamed(objects, parentId, name);
    if (child && child.kind !== "folder") return { ok: false };
    parentId = child ? child.id : null;
  }
  if (parentId === null) return { ok: true, parentId: null, file: null };
  const existing = childNamed(objects, parentId, segments[segments.length - 1]);
  if (existing && existing.kind !== "file") return { ok: false };
  return { ok: true, parentId, file: existing };
}

export const projectFileService: ProjectFileService = {
  normalizePath(path) {
    if (typeof path !== "string") return null;
    const trimmed = path.trim().replace(/\\/g, "/").replace(/^(\.\/)+/, "");
    if (!trimmed || trimmed.startsWith("/") || trimmed.length > FILE_LIMITS.maxPathChars) return null;
    const segments = trimmed.split("/");
    if (segments.length > FILE_LIMITS.maxDepth) return null;
    for (const segment of segments) {
      if (
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment !== segment.trim() ||
        segment.length > FILE_LIMITS.maxSegmentChars ||
        !SEGMENT.test(segment)
      ) {
        return null;
      }
    }
    return segments.join("/");
  },

  pathOf(objects, fileId, workspaceId) {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = objects.find((o) => o.id === fileId && o.kind === "file") ?? null;
    if (!current) return null;
    while (current && current.id !== workspaceId && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.label);
      const parentId: string | null = current.parentId;
      current = parentId === null ? null : objects.find((o) => o.id === parentId) ?? null;
    }
    return current?.id === workspaceId ? names.join("/") : null;
  },

  fileAt(objects, workspaceId, path) {
    const segments = segmentsOf(path);
    if (!segments) return null;
    const place = locate(objects, workspaceId, segments);
    return place.ok ? place.file : null;
  },

  preview(objects, workspaceId, writes) {
    const out: FileWritePreview[] = [];
    for (const write of writes) {
      const segments = segmentsOf(write.path);
      if (!segments) return null;
      const place = locate(objects, workspaceId, segments);
      if (!place.ok) return null;
      const path = segments.join("/");
      out.push({
        path,
        status: !place.file ? "create" : place.file.content === write.content ? "unchanged" : "update",
      });
    }
    return out;
  },

  apply(objects, workspaceId, writes, source): ApplyFileWritesResult {
    if (!objects.some((o) => o.id === workspaceId && o.kind === "folder")) {
      return { ok: false, reason: "no-workspace" };
    }
    if (writes.length > FILE_LIMITS.maxWrites) return { ok: false, reason: "too-many" };

    // Applied to a working copy one write at a time, so a later write sees
    // the folders an earlier one created. Any failure returns before the
    // copy is handed back: a batch is written whole or not at all.
    let next: OsObject[] = [...objects];
    const written: FileWritePreview[] = [];
    const fileIds: string[] = [];
    for (const write of writes) {
      const segments = segmentsOf(write.path);
      if (!segments) return { ok: false, reason: "invalid-path", path: write.path };
      const path = segments.join("/");
      if (typeof write.content !== "string" || write.content.length > FILE_LIMITS.maxFileChars) {
        return { ok: false, reason: "too-long", path };
      }

      let parentId = workspaceId;
      for (const name of segments.slice(0, -1)) {
        const child = childNamed(next, parentId, name);
        if (child && child.kind !== "folder") return { ok: false, reason: "path-conflict", path };
        if (child) {
          parentId = child.id;
          continue;
        }
        const folder: OsObject = {
          id: source.nextId(),
          kind: "folder",
          label: name,
          parentId,
          position: { col: 0, row: 0 },
          createdAt: source.at,
        };
        next = [...next, folder];
        parentId = folder.id;
      }

      const name = segments[segments.length - 1];
      const existing = childNamed(next, parentId, name);
      if (existing && existing.kind !== "file") return { ok: false, reason: "path-conflict", path };
      if (existing) {
        const status = existing.content === write.content ? "unchanged" : "update";
        if (status === "update") {
          next = next.map((o) => (o.id === existing.id ? { ...o, content: write.content } : o));
        }
        written.push({ path, status });
        fileIds.push(existing.id);
        continue;
      }
      const file: OsObject = {
        id: source.nextId(),
        kind: "file",
        label: name,
        parentId,
        position: { col: 0, row: 0 },
        createdAt: source.at,
        content: write.content,
      };
      next = [...next, file];
      written.push({ path, status: "create" });
      fileIds.push(file.id);
    }
    return { ok: true, objects: next, written, fileIds };
  },

  snapshot(objects, workspaceId) {
    const inside = new Set(descendantIds(objects, workspaceId));
    return objects
      .filter((o) => o.kind === "file" && inside.has(o.id))
      .map((o) => ({ path: projectFileService.pathOf(objects, o.id, workspaceId), content: o.content ?? "" }))
      .filter((f): f is { path: string; content: string } => f.path !== null)
      .sort((a, b) => a.path.localeCompare(b.path));
  },

  contextFor(objects, workspaceId, projectId): ProjectFilesContext {
    const files = projectFileService.snapshot(objects, workspaceId).slice(0, FILE_LIMITS.maxContextFiles);

    // Paths always travel; content only while it fits the budget, so a
    // large file never crowds every other file's content out of a request
    // that comes before it alphabetically.
    let budget: number = FILE_LIMITS.maxContextChars;
    return {
      projectId,
      files: files.map((f) => {
        if (f.content.length > budget) return { path: f.path, content: "", omitted: true };
        budget -= f.content.length;
        return f;
      }),
    };
  },
};
