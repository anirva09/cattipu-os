import type { GeneratedArchitecture } from "@/lib/ai/types";
import {
  DEFAULT_PROJECT_OWNER,
  PROJECT_SCHEMA_VERSION,
  PROJECT_TYPE_BY_ICON,
  createEmptyCanvasArtifacts,
  createEmptyForgeArtifacts,
  createEmptyLaunchArtifacts,
  createEmptyMemoryArtifacts,
  type CattipuProject,
  type ProjectIcon,
} from "./types";

/**
 * Milestone 14A — deterministic, pure migration from whatever shape a
 * persisted project record is in to the current `CattipuProject`. No I/O,
 * no randomness beyond a fresh id if one is somehow missing — same input
 * always produces the same output, so this is directly unit-testable
 * (see __tests__/migrate.test.ts).
 *
 * The pre-M14A shape (store/useProjectStore.ts's old `Project` interface,
 * persisted under the "cattipu-projects" localStorage key):
 *
 *   { id, name, icon, color, editedLabel, architecture?: GeneratedArchitecture }
 *
 * "Existing persisted projects must continue loading... do not discard
 * user projects" — every field on that old shape maps onto a field here;
 * nothing is dropped. `architecture` (if present) becomes the migrated
 * project's `architect.data` verbatim — the single most important
 * guarantee this file makes.
 */

interface LegacyProjectV0 {
  id: string;
  name: string;
  icon: ProjectIcon;
  color: string;
  editedLabel: string;
  architecture?: GeneratedArchitecture;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** True once a record already has the current schema's shape — detected
 * by the two fields no pre-M14A project ever had (`version`, `architect`),
 * rather than by trusting a `version` number alone (a corrupt or
 * hand-edited record could claim a version it doesn't actually match). */
function isCurrentShape(value: Record<string, unknown>): value is Record<string, unknown> & CattipuProject {
  return typeof value.version === "number" && isRecord(value.architect);
}

/** Fills in any artifact slot a not-quite-current record is missing
 * (e.g. a record written by a future version bump this file doesn't
 * know about yet, or a hand-built fixture) — defensive, not a silent
 * data-loss path: every field that IS present is kept as-is. */
function backfillMissingArtifacts(project: CattipuProject): CattipuProject {
  return {
    ...project,
    idea: project.idea ?? { prompt: project.architect.data?.prompt ?? "" },
    canvas: project.canvas ?? createEmptyCanvasArtifacts(),
    forge: project.forge ?? createEmptyForgeArtifacts(),
    memory: project.memory ?? createEmptyMemoryArtifacts(),
    launch: project.launch ?? createEmptyLaunchArtifacts(),
    // Milestone 15 fields. A v1 record predates all of them, so every one
    // is filled from something the record already carries rather than
    // invented: the type from the icon it was saved with, the owner from
    // the same constant new projects use. `lastOpenedAt` stays null - the
    // record genuinely does not know when it was last opened, and null
    // says that honestly where a fabricated timestamp would not.
    type: project.type ?? PROJECT_TYPE_BY_ICON[project.icon ?? "generic"],
    owner: project.owner ?? DEFAULT_PROJECT_OWNER,
    lastOpenedAt: project.lastOpenedAt ?? null,
    pinned: project.pinned ?? false,
    favorite: project.favorite ?? false,
    archived: project.archived ?? false,
    // Milestone 19. A record written before templates existed was not
    // made from one, and `null` says that. Guessing a template from the
    // icon would put a plan on a project whose author never chose one.
    template: project.template ?? null,
  };
}

function migrateLegacy(legacy: LegacyProjectV0): CattipuProject {
  const now = new Date().toISOString();
  const architecture = legacy.architecture ?? null;
  return {
    version: PROJECT_SCHEMA_VERSION,
    id: legacy.id,
    name: legacy.name,
    icon: legacy.icon,
    color: legacy.color,
    editedLabel: legacy.editedLabel,
    // No original creation timestamp exists on the legacy shape — "now"
    // (the moment of migration) is the most honest value available,
    // used for both fields rather than fabricating a fake history.
    createdAt: now,
    updatedAt: now,
    type: PROJECT_TYPE_BY_ICON[legacy.icon ?? "generic"],
    owner: DEFAULT_PROJECT_OWNER,
    lastOpenedAt: null,
    pinned: false,
    favorite: false,
    archived: false,
    template: null,
    idea: { prompt: architecture?.prompt ?? "" },
    architect: { data: architecture },
    canvas: createEmptyCanvasArtifacts(),
    forge: createEmptyForgeArtifacts(),
    memory: createEmptyMemoryArtifacts(),
    launch: createEmptyLaunchArtifacts(),
  };
}

/** Migrate one persisted record, whatever shape it's actually in. */
export function migrateProject(raw: unknown): CattipuProject {
  if (!isRecord(raw)) {
    // Nothing usable to preserve — return a blank, valid project rather
    // than throwing, so one corrupt entry can't take down the whole list.
    return { ...migrateLegacy({ id: "", name: "Untitled Project", icon: "generic", color: "var(--color-green)", editedLabel: "Edited just now" }) };
  }
  if (isCurrentShape(raw)) {
    return backfillMissingArtifacts(raw);
  }
  return migrateLegacy(raw as unknown as LegacyProjectV0);
}

export function migrateProjects(raw: unknown): CattipuProject[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateProject);
}
