import type { ArchitectNode, GeneratedArchitecture } from "@/lib/ai/types";
import {
  ARCHITECT_NODE_KINDS,
  type ArchitectEditResult,
  type ArchitectNodePatch,
  type ArchitectService,
  type ArchitectWorkspaceState,
  type ArchitectureEditor,
  type ArchitectureRepository,
  type NewArchitectNode,
} from "@/lib/contracts/architect";
import type { CattipuProject } from "@/lib/project/types";
import { useProjectStore } from "@/store/useProjectStore";

/** The rules for which architecture Architect shows. Pure. */
export const architectService: ArchitectService = {
  resolve(activeProject): ArchitectWorkspaceState {
    if (!activeProject) return { kind: "no-project" };
    const architecture = activeProject.architect.data;
    return architecture
      ? { kind: "ready", project: activeProject, architecture }
      : { kind: "empty", project: activeProject };
  },
};

/**
 * The repository over today's persistence: each project's `architect`
 * artifact slot in the persisted project store. `updateProjectArchitecture`
 * remains the one writer of that slot.
 */
export const projectArchitectureRepository: ArchitectureRepository = {
  load(projectId) {
    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    return project?.architect.data ?? null;
  },
  save(projectId, architecture) {
    const store = useProjectStore.getState();
    if (!store.projects.some((p) => p.id === projectId)) return false;
    store.updateProjectArchitecture(projectId, architecture);
    return true;
  },
};

// ── manual editing (MVP-03) ─────────────────────────────────────────────

const KIND_LABEL: Record<ArchitectNode["kind"], string> = {
  client: "Client",
  gateway: "Gateway",
  service: "Service",
  queue: "Queue",
  datastore: "Datastore",
};

/**
 * The architecture a project starts with when its first node is added by
 * hand. Every list is empty: nothing is invented to make the plan look
 * finished, and the prompt is empty because nobody wrote one.
 */
export function createEmptyArchitecture(project: Pick<CattipuProject, "name" | "icon">): GeneratedArchitecture {
  return {
    prompt: "",
    projectName: project.name,
    projectIcon: project.icon,
    summary: "",
    features: [],
    stack: [],
    nodes: [],
    edges: [],
    tables: [],
    relationships: [],
    roadmap: [],
    apis: [],
    infraNodes: [],
    infraEdges: [],
    recommendations: [],
  };
}

const isKind = (value: unknown): value is ArchitectNode["kind"] =>
  (ARCHITECT_NODE_KINDS as readonly unknown[]).includes(value);

/** Adds one node. `id` is supplied so the rule stays pure and testable. */
export function addArchitectNode(
  architecture: GeneratedArchitecture,
  input: NewArchitectNode,
  id: string,
): ArchitectEditResult {
  if (!isKind(input.kind)) return { ok: false, reason: "invalid-kind" };
  const label = (input.label ?? `New ${KIND_LABEL[input.kind]}`).trim();
  if (!label) return { ok: false, reason: "empty-name" };
  const node: ArchitectNode = {
    id,
    label,
    kind: input.kind,
    responsibilities: [],
    endpoints: [],
    dependencies: [],
    events: [],
    tables: [],
    description: input.description?.trim() ?? "",
  };
  return { ok: true, architecture: { ...architecture, nodes: [...architecture.nodes, node] }, node };
}

/** Changes a node's name, kind or description. Nothing else moves. */
export function updateArchitectNode(
  architecture: GeneratedArchitecture,
  nodeId: string,
  patch: ArchitectNodePatch,
): ArchitectEditResult {
  const current = architecture.nodes.find((n) => n.id === nodeId);
  if (!current) return { ok: false, reason: "unknown-node" };
  if (patch.kind !== undefined && !isKind(patch.kind)) return { ok: false, reason: "invalid-kind" };
  const label = patch.label === undefined ? current.label : patch.label.trim();
  if (!label) return { ok: false, reason: "empty-name" };
  const node: ArchitectNode = {
    ...current,
    label,
    kind: patch.kind ?? current.kind,
    description: patch.description === undefined ? current.description : patch.description.trim(),
  };
  return {
    ok: true,
    architecture: { ...architecture, nodes: architecture.nodes.map((n) => (n.id === nodeId ? node : n)) },
    node,
  };
}

let seq = 0;
const nextNodeId = () => `node-${Date.now().toString(36)}-${(seq += 1)}-${Math.random().toString(36).slice(2, 6)}`;

/** Load → apply one rule → save, through the repository. */
export function createArchitectureEditor(
  repository: ArchitectureRepository,
  findProject: (projectId: string) => Pick<CattipuProject, "name" | "icon"> | null,
  mintId: () => string = nextNodeId,
): ArchitectureEditor {
  const apply = (projectId: string, edit: (a: GeneratedArchitecture) => ArchitectEditResult, create: boolean): ArchitectEditResult => {
    const project = findProject(projectId);
    if (!project) return { ok: false, reason: "no-project" };
    const current = repository.load(projectId) ?? (create ? createEmptyArchitecture(project) : null);
    if (!current) return { ok: false, reason: "unknown-node" };
    const result = edit(current);
    if (result.ok) repository.save(projectId, result.architecture);
    return result;
  };
  return {
    addNode: (projectId, input) => apply(projectId, (a) => addArchitectNode(a, input, mintId()), true),
    updateNode: (projectId, nodeId, patch) => apply(projectId, (a) => updateArchitectNode(a, nodeId, patch), false),
  };
}

export const architectureEditor: ArchitectureEditor = createArchitectureEditor(
  projectArchitectureRepository,
  (projectId) => useProjectStore.getState().projects.find((p) => p.id === projectId) ?? null,
);
