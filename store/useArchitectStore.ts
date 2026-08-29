import { create } from "zustand";
import type {
  ArchitectNode,
  ArchitectNodeKind,
  GeneratedArchitecture,
  SqlColumn,
} from "@/lib/ai/types";
import { generateArchitecture } from "@/lib/ai/generateArchitecture";
import { layoutAppNodes, layoutInfraNodes, nextAppNodePosition } from "@/lib/ai/layout";
import { useProjectStore } from "@/store/useProjectStore";
import type { CattipuProject } from "@/lib/project/types";

export type ArchitectStatus = "idle" | "generating" | "playing" | "ready" | "error";
// Milestone 11 (Architect Retro Workstation Identity) — "planner" (which
// combined summary + features + stack in one panel) is split into three
// outline sections below: "summary", "features", "stack". "database" and
// "recommendations" keep their existing ids (only their outline labels
// change, to "Data Model" and "Ideas") so Command Palette's
// setArchitectTab("apis"/"roadmap") calls and BuildPlayback's own
// setActiveTab("architecture"/"database"/"roadmap") staging calls both
// stay valid untouched.
export type ArchitectTab =
  | "summary"
  | "features"
  | "architecture"
  | "database"
  | "stack"
  | "apis"
  | "recommendations"
  | "roadmap";
export type GraphView = "application" | "infrastructure";
export type PlaybackStage =
  | "planner"
  | "blueprint"
  | "first-service"
  | "gateway"
  | "connections"
  | "database"
  | "roadmap"
  | "ready"
  | null;

let seq = 0;
const nextEntityId = (prefix: string) => `${prefix}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;

function buildCreateTableSql(name: string, columns: SqlColumn[]): string {
  const body = columns.map((c) => `  ${c.name} ${c.type}`).join(",\n");
  return `CREATE TABLE ${name} (\n${body}\n);`;
}

interface ArchitectState {
  prompt: string;
  status: ArchitectStatus;
  activeTab: ArchitectTab;
  graphView: GraphView;
  data: GeneratedArchitecture | null;
  selectedNodeId: string | null;
  error: string | null;
  runId: number; // bumped on every generate() so stale timers can bail out
  playbackStage: PlaybackStage;
  roadmapCollapsed: Record<string, boolean>;
  linkedProjectId: string | null; // which Project record this workspace is live-synced to
  exportPanelOpen: boolean;

  setPrompt: (prompt: string) => void;
  generate: (prompt: string) => Promise<void>;
  setStatus: (status: ArchitectStatus) => void;
  setActiveTab: (tab: ArchitectTab) => void;
  setGraphView: (view: GraphView) => void;
  setPlaybackStage: (stage: PlaybackStage) => void;
  selectNode: (id: string | null) => void;
  toggleRoadmapPhase: (id: string) => void;
  setExportPanelOpen: (open: boolean) => void;
  setLinkedProject: (id: string | null) => void;
  reset: () => void;

  // Feature 1 — editable architecture graph
  addNode: (kind: ArchitectNodeKind, label?: string) => void;
  renameNode: (id: string, label: string) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  setNodePosition: (id: string, position: { x: number; y: number }) => void;
  connectNodes: (source: string, target: string, label?: string) => void;
  deleteEdge: (id: string) => void;

  // Feature 3 — live ER diagram
  renameTable: (oldName: string, newName: string) => void;
  addColumn: (tableName: string) => void;
  deleteColumn: (tableName: string, columnName: string) => void;
  renameColumn: (tableName: string, oldName: string, newName: string) => void;
  changeColumnType: (tableName: string, columnName: string, newType: string) => void;
  addRelationship: (from: string, to: string, label: string) => void;

  // Feature 4 / 6 — click-through from API catalog / recommendations
  viewApi: (nodeId: string) => void;
  viewRecommendation: (nodeId: string) => void;

  // Feature 10 — project memory
  loadFromProject: (project: CattipuProject) => void;
}

const initialFields = {
  prompt: "",
  status: "idle" as ArchitectStatus,
  // Milestone 11 — default outline section is now Architecture (was
  // "planner"), per the brief: "Default generated view should be
  // Architecture." Matches what loadFromProject() below already set.
  activeTab: "architecture" as ArchitectTab,
  graphView: "application" as GraphView,
  data: null,
  selectedNodeId: null,
  error: null,
  playbackStage: null as PlaybackStage,
  roadmapCollapsed: {} as Record<string, boolean>,
  linkedProjectId: null as string | null,
  exportPanelOpen: false,
};

export const useArchitectStore = create<ArchitectState>((set, get) => {
  // Every mutating action funnels through here: if this workspace is
  // linked to a real Project record, the edit is written straight back —
  // "no fake persistence" means every edit is already saved, not just a
  // snapshot taken on close.
  function commit(data: GeneratedArchitecture) {
    set({ data });
    const { linkedProjectId } = get();
    if (linkedProjectId) {
      useProjectStore.getState().updateProjectArchitecture(linkedProjectId, data);
    }
  }

  return {
    ...initialFields,
    runId: 0,

    setPrompt: (prompt) => set({ prompt }),

    generate: async (prompt) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      const runId = get().runId + 1;
      set({
        runId,
        status: "generating",
        prompt: trimmed,
        data: null,
        selectedNodeId: null,
        error: null,
        activeTab: "architecture",
        graphView: "application",
        playbackStage: "planner",
        roadmapCollapsed: {},
        linkedProjectId: null,
      });

      try {
        const raw = await generateArchitecture(trimmed);
        // a newer generate() call superseded this one — drop the result
        if (get().runId !== runId) return;
        const data: GeneratedArchitecture = {
          ...raw,
          nodes: layoutAppNodes(raw.nodes),
          infraNodes: layoutInfraNodes(raw.infraNodes),
        };
        set({ data, status: "playing" });
      } catch (err) {
        if (get().runId !== runId) return;
        set({ status: "error", error: err instanceof Error ? err.message : "Generation failed" });
      }
    },

    setStatus: (status) => set({ status }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setGraphView: (graphView) => set({ graphView }),
    setPlaybackStage: (playbackStage) => set({ playbackStage }),
    selectNode: (selectedNodeId) => set({ selectedNodeId }),
    toggleRoadmapPhase: (id) =>
      set((s) => ({ roadmapCollapsed: { ...s.roadmapCollapsed, [id]: !s.roadmapCollapsed[id] } })),
    setExportPanelOpen: (exportPanelOpen) => set({ exportPanelOpen }),
    setLinkedProject: (linkedProjectId) => set({ linkedProjectId }),

    reset: () => set({ ...initialFields }),

    // ── Feature 1 — editable architecture graph ─────────────────────────
    addNode: (kind, label) => {
      const { data } = get();
      if (!data) return;
      const id = nextEntityId("node");
      const kindLabel = { client: "Client", gateway: "Gateway", service: "Service", queue: "Queue", datastore: "Datastore" }[kind];
      const node: ArchitectNode = {
        id,
        label: label ?? `New ${kindLabel}`,
        kind,
        responsibilities: [],
        endpoints: [],
        dependencies: [],
        events: [],
        tables: [],
        position: nextAppNodePosition(data.nodes, kind),
      };
      commit({ ...data, nodes: [...data.nodes, node] });
      set({ selectedNodeId: id });
    },

    renameNode: (id, label) => {
      const { data } = get();
      if (!data || !label.trim()) return;
      commit({ ...data, nodes: data.nodes.map((n) => (n.id === id ? { ...n, label: label.trim() } : n)) });
    },

    deleteNode: (id) => {
      const { data, selectedNodeId } = get();
      if (!data) return;
      commit({
        ...data,
        nodes: data.nodes.filter((n) => n.id !== id),
        edges: data.edges.filter((e) => e.source !== id && e.target !== id),
        apis: data.apis.filter((a) => a.nodeId !== id),
        recommendations: data.recommendations.filter((r) => r.targetNodeId !== id),
      });
      if (selectedNodeId === id) set({ selectedNodeId: null });
    },

    duplicateNode: (id) => {
      const { data } = get();
      if (!data) return;
      const src = data.nodes.find((n) => n.id === id);
      if (!src) return;
      const newId = nextEntityId("node");
      const clone: ArchitectNode = {
        ...src,
        id: newId,
        label: `${src.label} Copy`,
        position: { x: (src.position?.x ?? 0) + 36, y: (src.position?.y ?? 0) + 36 },
      };
      commit({ ...data, nodes: [...data.nodes, clone] });
      set({ selectedNodeId: newId });
    },

    setNodePosition: (id, position) => {
      const { data } = get();
      if (!data) return;
      commit({ ...data, nodes: data.nodes.map((n) => (n.id === id ? { ...n, position } : n)) });
    },

    connectNodes: (source, target, label = "HTTP") => {
      const { data } = get();
      if (!data || source === target) return;
      const exists = data.edges.some((e) => e.source === source && e.target === target && e.label === label);
      if (exists) return;
      const edge = { id: nextEntityId("edge"), source, target, label };
      commit({ ...data, edges: [...data.edges, edge] });
    },

    deleteEdge: (id) => {
      const { data } = get();
      if (!data) return;
      commit({ ...data, edges: data.edges.filter((e) => e.id !== id) });
    },

    // ── Feature 3 — live ER diagram ──────────────────────────────────────
    renameTable: (oldName, newName) => {
      const { data } = get();
      const trimmed = newName.trim();
      if (!data || !trimmed || trimmed === oldName) return;
      commit({
        ...data,
        tables: data.tables.map((t) =>
          t.name === oldName ? { ...t, name: trimmed, sql: buildCreateTableSql(trimmed, t.columns) } : t
        ),
        relationships: data.relationships.map((r) => ({
          from: r.from === oldName ? trimmed : r.from,
          to: r.to === oldName ? trimmed : r.to,
          label: r.label,
        })),
        nodes: data.nodes.map((n) => ({
          ...n,
          tables: n.tables.map((t) => (t === oldName ? trimmed : t)),
        })),
      });
    },

    addColumn: (tableName) => {
      const { data } = get();
      if (!data) return;
      commit({
        ...data,
        tables: data.tables.map((t) => {
          if (t.name !== tableName) return t;
          let base = "new_column";
          let n = 1;
          const existing = new Set(t.columns.map((c) => c.name));
          while (existing.has(base)) base = `new_column_${++n}`;
          const columns = [...t.columns, { name: base, type: "TEXT" }];
          return { ...t, columns, sql: buildCreateTableSql(t.name, columns) };
        }),
      });
    },

    deleteColumn: (tableName, columnName) => {
      const { data } = get();
      if (!data) return;
      commit({
        ...data,
        tables: data.tables.map((t) => {
          if (t.name !== tableName) return t;
          const columns = t.columns.filter((c) => c.name !== columnName);
          return { ...t, columns, sql: buildCreateTableSql(t.name, columns) };
        }),
      });
    },

    renameColumn: (tableName, oldName, newName) => {
      const { data } = get();
      const trimmed = newName.trim();
      if (!data || !trimmed) return;
      commit({
        ...data,
        tables: data.tables.map((t) => {
          if (t.name !== tableName) return t;
          const columns = t.columns.map((c) => (c.name === oldName ? { ...c, name: trimmed } : c));
          return { ...t, columns, sql: buildCreateTableSql(t.name, columns) };
        }),
      });
    },

    changeColumnType: (tableName, columnName, newType) => {
      const { data } = get();
      if (!data) return;
      commit({
        ...data,
        tables: data.tables.map((t) => {
          if (t.name !== tableName) return t;
          const columns = t.columns.map((c) => (c.name === columnName ? { ...c, type: newType } : c));
          return { ...t, columns, sql: buildCreateTableSql(t.name, columns) };
        }),
      });
    },

    addRelationship: (from, to, label) => {
      const { data } = get();
      if (!data || !from || !to || from === to) return;
      commit({ ...data, relationships: [...data.relationships, { from, to, label: label || "1 — ∞" }] });
    },

    // ── Feature 4 / 6 — click-through ────────────────────────────────────
    viewApi: (nodeId) => set({ activeTab: "architecture", graphView: "application", selectedNodeId: nodeId }),
    viewRecommendation: (nodeId) =>
      set({ activeTab: "architecture", graphView: "application", selectedNodeId: nodeId }),

    // ── Feature 10 — project memory ─────────────────────────────────────
    loadFromProject: (project) => {
      if (!project.architect.data) return;
      set({
        data: project.architect.data,
        prompt: project.architect.data.prompt,
        linkedProjectId: project.id,
        status: "ready",
        activeTab: "architecture",
        graphView: "application",
        selectedNodeId: null,
        playbackStage: null,
        error: null,
        roadmapCollapsed: {},
      });
    },
  };
});
