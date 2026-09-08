import type { CattipuProject } from "@/lib/project/types";

/**
 * Milestone 17 (Real File Explorer) — the OS filesystem.
 *
 * M16 gave the desktop real objects with a grid position. M17 gives those
 * same objects a PLACE: every one carries a `parentId`, and `null` means
 * the OS root.
 *
 * That single field is what makes the desktop and Explorer one surface
 * rather than two that must be kept in step:
 *
 *   parentId === null   the object is at the OS root, which IS the
 *                       desktop — so it appears on the desktop AND in
 *                       Explorer's root listing
 *   parentId === "f1"   the object is inside folder f1 — so it appears
 *                       in Explorer under f1 and nowhere on the desktop
 *
 * "Creating a desktop folder should immediately appear inside Explorer"
 * and "creating a folder inside Explorer should immediately appear on the
 * desktop if it belongs there" are then not two synchronisations to
 * implement and keep working. There is one array of objects and two views
 * of it, and "belongs there" is the single comparison `parentId === null`.
 *
 * Projects are deliberately NOT in this tree. They are owned by
 * useProjectStore, they have no parent, and giving them one here would
 * mean a second place that decides where a project lives. Explorer shows
 * them at the root alongside root folders and shortcuts; the folder tree
 * is a tree of FOLDERS, which is what it is called.
 */

export type OsObjectKind = "folder" | "project-shortcut";

/** Grid cells, not pixels. Snapping is then not a rounding step applied
 *  after a drag — a position simply cannot be off-grid — and a layout
 *  saved on a 1920 screen still lands correctly on a 1366 one. */
export interface GridCell {
  col: number;
  row: number;
}

export interface OsObject {
  id: string;
  kind: OsObjectKind;
  /** Folders own their label. Shortcuts leave this empty and resolve it
   *  from the project they point at — see `objectLabel`. */
  label: string;
  /** Set on shortcuts only. The link, never a copy. */
  projectId?: string;
  /** `null` is the OS root, which is the desktop surface. */
  parentId: string | null;
  /** Only meaningful at the root — nothing inside a folder is on a grid.
   *  Kept on the record regardless so an object that comes back out to
   *  the root has somewhere to land. */
  position: GridCell;
  createdAt: string;
}

/** @deprecated Milestone 16's name for the same record, kept so the
 *  desktop layer's imports did not all have to churn in one sprint. */
export type DesktopObject = OsObject;

export const OS_ROOT: null = null;

// ── reading the tree ────────────────────────────────────────────────────

/** Folders first, then shortcuts, each alphabetical. A listing whose
 *  order depends on creation time reshuffles itself as you work. */
function byKindThenLabel(
  a: OsObject,
  b: OsObject,
  projects: readonly CattipuProject[],
): number {
  if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
  return objectLabel(a, projects).localeCompare(objectLabel(b, projects));
}

export function childrenOf(
  objects: readonly OsObject[],
  parentId: string | null,
  projects: readonly CattipuProject[] = [],
): OsObject[] {
  return objects
    .filter((o) => o.parentId === parentId)
    .sort((a, b) => byKindThenLabel(a, b, projects));
}

export function folderChildren(
  objects: readonly OsObject[],
  parentId: string | null,
): OsObject[] {
  return childrenOf(objects, parentId).filter((o) => o.kind === "folder");
}

export function findFolder(
  objects: readonly OsObject[],
  id: string | null,
): OsObject | null {
  if (id === null) return null;
  return objects.find((o) => o.id === id && o.kind === "folder") ?? null;
}

/**
 * Every id beneath a folder, to any depth.
 *
 * Iterative rather than recursive, and it tracks what it has already
 * seen: persisted data can in principle carry a cycle (a hand-edited
 * localStorage value, a bug in an older build), and a recursive walk
 * would hang the tab rather than report it.
 */
export function descendantIds(
  objects: readonly OsObject[],
  folderId: string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>([folderId]);
  const queue = [folderId];
  while (queue.length) {
    const parent = queue.shift() as string;
    for (const child of objects) {
      if (child.parentId !== parent || seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child.id);
      if (child.kind === "folder") queue.push(child.id);
    }
  }
  return out;
}

/**
 * The chain of folders from the root down to `folderId`, inclusive.
 *
 * This is what the breadcrumbs render, and it is DERIVED from parentId
 * rather than accumulated as the user navigates. A breadcrumb trail kept
 * as a separate array is the classic way to end up pointing at a folder
 * that was renamed or deleted in another window; here it cannot, because
 * there is no trail to go stale.
 */
export function folderPath(
  objects: readonly OsObject[],
  folderId: string | null,
): OsObject[] {
  const chain: OsObject[] = [];
  const seen = new Set<string>();
  let current = findFolder(objects, folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = findFolder(objects, current.parentId);
  }
  return chain;
}

/** A folder id that no longer resolves falls back to the root, so a
 *  window left open on a folder deleted elsewhere shows the root rather
 *  than an empty listing with a breadcrumb pointing at nothing. */
export function resolveLocation(
  objects: readonly OsObject[],
  folderId: string | null,
): string | null {
  return findFolder(objects, folderId) ? folderId : null;
}

// ── moving ──────────────────────────────────────────────────────────────

/**
 * Whether `id` may be moved into `targetId`.
 *
 * A folder cannot be moved into itself or into any of its own
 * descendants. That move would detach the whole subtree from the root:
 * it would still exist in the array, reachable from nothing, and every
 * listing would simply stop showing it. Refusing is the only outcome
 * that leaves the tree a tree.
 */
export function canMoveInto(
  objects: readonly OsObject[],
  id: string,
  targetId: string | null,
): boolean {
  const moving = objects.find((o) => o.id === id);
  if (!moving) return false;
  if (targetId === null) return moving.parentId !== null;
  if (targetId === id) return false;
  if (!findFolder(objects, targetId)) return false;
  if (moving.parentId === targetId) return false;
  if (moving.kind === "folder" && descendantIds(objects, id).includes(targetId)) {
    return false;
  }
  return true;
}

/** Removes a folder and everything under it. A folder that vanished
 *  while its contents stayed in the array would leave those objects
 *  unreachable — present in storage, absent from every view. */
export function removeSubtree(
  objects: readonly OsObject[],
  id: string,
): OsObject[] {
  const target = objects.find((o) => o.id === id);
  if (!target) return [...objects];
  const doomed = new Set<string>([
    id,
    ...(target.kind === "folder" ? descendantIds(objects, id) : []),
  ]);
  return objects.filter((o) => !doomed.has(o.id));
}

// ── links ───────────────────────────────────────────────────────────────

/** A shortcut shows its project's CURRENT name. Nothing copies it. */
export function objectLabel(
  object: OsObject,
  projects: readonly CattipuProject[],
): string {
  if (object.kind !== "project-shortcut") return object.label;
  const project = projects.find((p) => p.id === object.projectId);
  return project?.name ?? object.label;
}

/**
 * Shortcuts whose project no longer exists are dropped from what is
 * rendered.
 *
 * They are NOT deleted from the store here — this is a pure projection,
 * and a render pass is the wrong place to destroy data. Hiding is enough
 * for the views to stay honest, and it leaves the record recoverable if
 * a project ever comes back (an undo, a restored backup).
 */
export function visibleObjects(
  objects: readonly OsObject[],
  projects: readonly CattipuProject[],
): OsObject[] {
  return objects.filter(
    (o) =>
      o.kind !== "project-shortcut" ||
      projects.some((p) => p.id === o.projectId),
  );
}

/** Which projects do not have a shortcut yet — what the "New Project
 *  Shortcut" menu offers. Making a second shortcut for the same project
 *  is not useful and makes "remove shortcut" ambiguous. */
export function projectsWithoutShortcut(
  objects: readonly OsObject[],
  projects: readonly CattipuProject[],
): CattipuProject[] {
  const linked = new Set(
    objects.filter((o) => o.kind === "project-shortcut").map((o) => o.projectId),
  );
  return projects.filter((p) => !linked.has(p.id));
}

// ── naming ──────────────────────────────────────────────────────────────

/**
 * The next unused name in a numbered series: "Untitled Folder",
 * "Untitled Folder (2)", "Untitled Folder (3)".
 *
 * Computed from the names in use RIGHT NOW, never from a counter. That
 * is what makes "renaming frees the name" true without any code to free
 * it: rename "Untitled Folder (2)" to "Invoices" and the next new folder
 * is "Untitled Folder (2)" again, because nothing is holding the number.
 * A stored counter would keep climbing forever and would have to be
 * reset by hand, which is a bug waiting to be written.
 *
 * The parenthesised form is deliberate. "Untitled Folder 2" reads as a
 * name someone chose; "Untitled Folder (2)" reads as the machine
 * disambiguating, which is what it is.
 */
export function nextNumberedName(
  base: string,
  taken: Iterable<string>,
): string {
  const names = new Set<string>();
  for (const name of taken) names.add(name.trim());
  if (!names.has(base)) return base;
  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${base} (${n})`;
    if (!names.has(candidate)) return candidate;
  }
  return base;
}

export const UNTITLED_FOLDER = "Untitled Folder";

/**
 * Unique among its SIBLINGS, not across the whole filesystem. Two
 * folders with the same name in different parents are as distinguishable
 * as two files in different directories; forcing global uniqueness would
 * number the second one for no reason a person could see.
 */
export function nextFolderName(
  objects: readonly OsObject[],
  parentId: string | null = null,
): string {
  return nextNumberedName(
    UNTITLED_FOLDER,
    objects
      .filter((o) => o.kind === "folder" && o.parentId === parentId)
      .map((o) => o.label),
  );
}

// ── what Explorer shows ─────────────────────────────────────────────────

export type ExplorerEntryKind = "folder" | "project" | "project-shortcut";

export interface ExplorerEntry {
  /** Unique within a listing. For an OS object it is the object's id;
   *  for a project it is the project's. */
  id: string;
  kind: ExplorerEntryKind;
  label: string;
  /** Set on projects and shortcuts — what "Open" acts on. */
  projectId?: string;
  /** Set on folders and shortcuts — the OS object behind the entry. */
  objectId?: string;
  /** Breadcrumb-style location, filled in for search results so a hit
   *  three folders deep says where it was found. */
  location?: string;
}

function entryFor(
  object: OsObject,
  projects: readonly CattipuProject[],
): ExplorerEntry {
  return object.kind === "folder"
    ? { id: object.id, kind: "folder", label: object.label, objectId: object.id }
    : {
        id: object.id,
        kind: "project-shortcut",
        label: objectLabel(object, projects),
        projectId: object.projectId,
        objectId: object.id,
      };
}

/**
 * The grid contents of one folder.
 *
 * Projects appear at the ROOT only. They have no parent — the project
 * store has no folder concept — so listing them inside every folder
 * would be a lie about where they are, and listing them nowhere would
 * make Explorer useless as a project browser.
 */
export function explorerEntries(
  objects: readonly OsObject[],
  projects: readonly CattipuProject[],
  folderId: string | null,
  orderedProjects?: readonly CattipuProject[],
): ExplorerEntry[] {
  const visible = visibleObjects(objects, projects);
  const here = childrenOf(visible, folderId, projects).map((o) =>
    entryFor(o, projects),
  );
  if (folderId !== null) return here;

  const projectEntries = (orderedProjects ?? projects).map((p) => ({
    id: p.id,
    kind: "project" as const,
    label: p.name,
    projectId: p.id,
  }));
  return [...here, ...projectEntries];
}

// ── search ──────────────────────────────────────────────────────────────

/** Where an entry lives, written the way the breadcrumbs write it. */
export function locationLabel(
  objects: readonly OsObject[],
  parentId: string | null,
  rootLabel = "CATTIPU OS",
): string {
  const chain = folderPath(objects, parentId);
  return [rootLabel, ...chain.map((f) => f.label)].join(" / ");
}

/**
 * Search across the whole filesystem, not just the current folder.
 *
 * A search that only looked at the folder you happen to be standing in
 * would answer "no results" for a folder that exists two levels down,
 * which is worse than no search at all: it does not merely fail to help,
 * it tells you something false.
 *
 * Matching is case-insensitive substring. Ranked so a name that STARTS
 * with the query beats one that merely contains it — typing "ba" should
 * surface "Banking Platform" before "Database Archive".
 */
export function searchEverything(
  objects: readonly OsObject[],
  projects: readonly CattipuProject[],
  query: string,
  orderedProjects?: readonly CattipuProject[],
): ExplorerEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const visible = visibleObjects(objects, projects);
  const hits: Array<{ entry: ExplorerEntry; rank: number }> = [];

  for (const object of visible) {
    const label = objectLabel(object, projects);
    const at = label.toLowerCase().indexOf(q);
    if (at < 0) continue;
    hits.push({
      entry: {
        ...entryFor(object, projects),
        location: locationLabel(objects, object.parentId),
      },
      rank: at === 0 ? 0 : 1,
    });
  }

  for (const project of orderedProjects ?? projects) {
    const at = project.name.toLowerCase().indexOf(q);
    if (at < 0) continue;
    hits.push({
      entry: {
        id: project.id,
        kind: "project",
        label: project.name,
        projectId: project.id,
        location: locationLabel(objects, null),
      },
      rank: at === 0 ? 0 : 1,
    });
  }

  return hits
    .sort((a, b) => a.rank - b.rank || a.entry.label.localeCompare(b.entry.label))
    .map((h) => h.entry);
}
