import {
  type CattipuProject,
  type ProjectStatus,
} from "@/lib/project/types";
import type { ProjectDetails } from "@/components/DetailsPanel/DetailsPanel";
import type { ProjectsWindowProject } from "@/components/ProjectsWindow/ProjectsWindow";
import type { FolderTreeNode } from "@/components/FolderTree/FolderTree";
import { nextNumberedName } from "./filesystem";

/**
 * Milestone 15 (Living Projects) — the projects slice of the OS state
 * layer: everything a window needs to *show* about a project, derived in
 * one place from the stored artifact.
 *
 * The rule this file exists to enforce is that nothing visible is a
 * literal. A window asks for a project's progress or status and gets a
 * value computed from what the project actually contains; there is no
 * setter for either, so no screen can be right while another is stale, and
 * no percentage can be typed in by hand.
 *
 * Every window renders through these functions rather than reading the
 * store shape directly. That is what makes one action update every window:
 * they are not kept in sync, they are the same computation.
 */

// ── progress ────────────────────────────────────────────────────────────

/**
 * The six things a CATTIPU project accumulates, in the order the product
 * flows. Progress is how many of them exist — nothing else.
 *
 * This is deliberately coarse. A finer measure (percentage of screens
 * designed, tests passing) would need data the artifacts do not yet carry,
 * and inventing a formula over data that isn't there is how a hardcoded
 * 78% gets reintroduced wearing a function's clothes. Six honest sixths
 * beat one plausible fiction.
 */
export const PROJECT_MILESTONES = [
  { key: "idea", label: "Idea captured", has: (p: CattipuProject) => p.idea.prompt.trim().length > 0 },
  { key: "architect", label: "Architecture designed", has: (p: CattipuProject) => p.architect.data !== null },
  { key: "canvas", label: "Interface drawn", has: (p: CattipuProject) => p.canvas.screens.length > 0 },
  { key: "forge", label: "Built", has: (p: CattipuProject) => p.forge.builds.length > 0 },
  { key: "memory", label: "Indexed", has: (p: CattipuProject) => p.memory.records.length > 0 },
  { key: "launch", label: "Released", has: (p: CattipuProject) => p.launch.releases.length > 0 },
] as const;

/** 0–100, always an integer, always derived. */
export function projectProgress(project: CattipuProject): number {
  const done = PROJECT_MILESTONES.filter((m) => m.has(project)).length;
  return Math.round((done / PROJECT_MILESTONES.length) * 100);
}

export function projectMilestonesReached(project: CattipuProject): string[] {
  return PROJECT_MILESTONES.filter((m) => m.has(project)).map((m) => m.label);
}

// ── status ──────────────────────────────────────────────────────────────

/** Derived from artifacts, except `archived`, which is a real decision. */
export function projectStatus(project: CattipuProject): ProjectStatus {
  if (project.archived) return "Archived";
  if (project.launch.releases.length > 0) return "Shipped";
  if (project.forge.builds.length > 0) return "Building";
  if (project.architect.data !== null) return "Designing";
  return "New";
}

// ── version ─────────────────────────────────────────────────────────────

/**
 * The version a person sees, which is not `project.version` — that is the
 * storage schema number and means nothing to anyone reading a window.
 * A released project shows its latest release; an unreleased one shows
 * v0.1.0, because it has not released anything and should not claim to.
 */
export function projectVersionLabel(project: CattipuProject): string {
  const releases = project.launch.releases;
  if (releases.length === 0) return "v0.1.0";
  const latest = releases[releases.length - 1] as { version?: string };
  return latest?.version ?? "v0.1.0";
}

// ── time ────────────────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now" / "5m ago" / "3h ago" / "2d ago" / a date beyond a week.
 *  `now` is a parameter so this is a pure function and testable without
 *  freezing the clock. */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const delta = Math.max(0, now - then);
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  if (delta < 7 * DAY) return `${Math.floor(delta / DAY)}d ago`;
  return formatDate(iso);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * Absolute stamps are formatted by hand, in UTC, rather than through
 * `toLocaleDateString`.
 *
 * Intl formatting depends on the runtime's locale and timezone, and this
 * text is rendered twice - once by the server and once by the browser
 * hydrating it. A server in UTC and a browser in IST produce different
 * strings for the same instant, React sees markup that does not match,
 * and it throws away the server render (#418). That is a real bug, not a
 * warning: it silently doubles the work of every first paint.
 *
 * A fixed pattern is also what the Golden Master shows - "14 Aug 1996
 * 09:22 am" - so there was never a reason to ask Intl in the first place.
 */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const h24 = d.getUTCHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? "am" : "pm";
  return `${formatDate(iso)} ${pad(h)}:${pad(d.getUTCMinutes())} ${suffix}`;
}

// ── ordering ────────────────────────────────────────────────────────────

/** Pinned first, then most recently touched. The Projects list, the
 *  Recent widget and Explorer all sort through this, so they cannot
 *  disagree about what "recent" means. */
export function orderProjects(projects: readonly CattipuProject[]): CattipuProject[] {
  return [...projects].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const at = new Date(a.lastOpenedAt ?? a.updatedAt).getTime();
    const bt = new Date(b.lastOpenedAt ?? b.updatedAt).getTime();
    return bt - at;
  });
}

// ── window projections ──────────────────────────────────────────────────

/** What the frozen ProjectsWindow asks for, computed from real state. */
export function toWindowProject(
  project: CattipuProject,
  now: number = Date.now(),
): ProjectsWindowProject {
  return {
    id: project.id,
    name: project.name,
    version: projectVersionLabel(project),
    // The frozen ProjectCard renders "{updated} by {owner}" itself, so
    // this is the time alone. Appending the owner here produced
    // "just now by node by node" on every card.
    updated: relativeTime(project.lastOpenedAt ?? project.updatedAt, now),
    owner: project.owner,
    progress: projectProgress(project),
  };
}

/** What the frozen DetailsPanel asks for. `location` is synthesised from
 *  the project's own name and version rather than stored: there is no
 *  filesystem behind it yet, and a stored path would be a fiction that
 *  outlives a rename. */
export function toProjectDetails(project: CattipuProject): ProjectDetails {
  const reached = projectMilestonesReached(project);
  return {
    name: project.name,
    location: `\\\\CATTIPU\\PROJECTS\\${project.archived ? "Archived" : "Active"}\\${project.name}\\${projectVersionLabel(project)}`,
    type: `${project.type} · ${projectStatus(project)}`,
    owner: project.owner,
    created: formatStamp(project.createdAt),
    notes: reached.length
      ? `${reached.join(" · ")}. Last opened ${relativeTime(project.lastOpenedAt)}.`
      : `Nothing built yet. Created ${relativeTime(project.createdAt)}.`,
  };
}

/** The Projects tree, grouped the way the frozen window expects but built
 *  from the real list. Empty groups are still shown - a folder that
 *  disappears when it empties is a folder you cannot drop anything into. */
export function toProjectTree(projects: readonly CattipuProject[]): FolderTreeNode[] {
  const node = (p: CattipuProject): FolderTreeNode => ({
    id: p.id,
    label: p.name,
    kind: "project",
  });
  const active = orderProjects(projects.filter((p) => !p.archived)).map(node);
  const archived = orderProjects(projects.filter((p) => p.archived)).map(node);
  return [
    {
      id: "projects-root",
      label: "CATTIPU/PROJECTS",
      kind: "folder",
      children: [
        { id: "active", label: "Active", kind: "folder", children: active },
        { id: "archived", label: "Archived", kind: "folder", children: archived },
        { id: "templates", label: "Templates", kind: "folder", children: [] },
        { id: "samples", label: "Samples", kind: "folder", children: [] },
      ],
    },
  ];
}

// ── Milestone 19 ────────────────────────────────────────────────────────

export const UNTITLED_PROJECT = "Untitled Project";

/**
 * "Untitled Project", "Untitled Project (2)", "Untitled Project (3)".
 *
 * The same rule folders use, and the same reason: computed from the
 * names in use right now, so renaming a project frees its number with no
 * code to free it. Archived projects still count — they still exist and
 * a person can still see them, so reusing the name would produce two
 * projects called the same thing in one list.
 */
export function nextProjectName(projects: readonly CattipuProject[]): string {
  return nextNumberedName(UNTITLED_PROJECT, projects.map((p) => p.name));
}

/**
 * The project the shell is currently "in", or null.
 *
 * Derived from `lastOpenedAt`, which M15 already sets whenever anything
 * opens a project — the desktop, Explorer, the Projects tree. There is no
 * separate `activeProjectId` to keep in step, which is the point: a
 * second field would be a second answer to the same question, and the
 * one place it would go wrong is the moment a project is deleted.
 *
 * `null` until something has actually been opened. A fresh install has
 * seed projects that nobody has looked at yet, and claiming one of them
 * is active would put a name in the title bar the person never chose.
 */
export function activeProject(
  projects: readonly CattipuProject[],
): CattipuProject | null {
  let best: CattipuProject | null = null;
  for (const project of projects) {
    if (!project.lastOpenedAt) continue;
    if (!best || project.lastOpenedAt > (best.lastOpenedAt as string)) {
      best = project;
    }
  }
  return best;
}

/** What the top bar shows beside the brand: the active project's name,
 *  or nothing. The TopBar renders "CATTIPU OS" alone when this is
 *  undefined, which is exactly the "no project active" case. */
export function workspaceTitle(
  projects: readonly CattipuProject[],
): string | undefined {
  return activeProject(projects)?.name;
}

/** The brand, alone or with the active project.
 *
 * The browser tab is not a Golden Master surface, so it spells the
 * separator the way the sprint writes it — an em dash. The TopBar keeps
 * its own frozen glyph; see the note at the call site in CattipuShell.
 * Both read `activeProject`, so they cannot disagree about WHICH project
 * is active even though they punctuate it differently. */
export function documentTitle(projects: readonly CattipuProject[]): string {
  const name = workspaceTitle(projects);
  return name ? `CATTIPU OS — ${name}` : "CATTIPU OS";
}

/**
 * Milestone 19 (Part E) — what the RECENT PROJECTS widget lists.
 *
 * Recency is `lastOpenedAt` when the project has been opened and
 * `createdAt` when it has not, so a project just created appears at the
 * top the moment it exists — which is what "creating a project should
 * immediately update Recent Projects" asks for — and then moves on merit
 * once things start being opened.
 *
 * `updatedAt` is deliberately NOT the fallback, even though
 * `orderProjects` uses it: editing a project's architecture is not the
 * same as visiting it, and a background write would otherwise reshuffle
 * a list labelled "recent". Archived projects are excluded; the widget
 * is a way back into live work.
 */
export function recentProjectNames(
  projects: readonly CattipuProject[],
  limit = 3,
): string[] {
  return [...projects]
    .filter((p) => !p.archived)
    .sort(
      (a, b) =>
        Date.parse(b.lastOpenedAt ?? b.createdAt) -
        Date.parse(a.lastOpenedAt ?? a.createdAt),
    )
    .slice(0, limit)
    .map((p) => p.name);
}
