"use client";

import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2,
  Waypoints,
  Server,
  Database,
  Radio,
  Copy,
  Trash2,
  Plus,
  Container,
  Boxes,
  Zap,
  Archive,
} from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import type { ArchitectNode, ArchitectNodeKind, InfraNode, InfraNodeKind } from "@/lib/ai/types";

const KIND_META: Record<
  ArchitectNodeKind,
  { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; accent: string }
> = {
  client: { icon: Globe2, accent: "var(--color-purple)" },
  gateway: { icon: Waypoints, accent: "var(--color-navy)" },
  service: { icon: Server, accent: "var(--color-blue)" },
  queue: { icon: Radio, accent: "var(--color-gold)" },
  datastore: { icon: Database, accent: "var(--color-green)" },
};

const INFRA_KIND_META: Record<
  InfraNodeKind,
  { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; accent: string }
> = {
  gateway: { icon: Waypoints, accent: "var(--color-navy)" },
  orchestration: { icon: Boxes, accent: "var(--color-blue)" },
  compute: { icon: Container, accent: "var(--color-purple)" },
  database: { icon: Database, accent: "var(--color-green)" },
  cache: { icon: Zap, accent: "var(--color-gold)" },
  queue: { icon: Radio, accent: "var(--color-gold)" },
  storage: { icon: Archive, accent: "var(--color-red)" },
};

// stage ordering — used to decide what's "revealed" yet during a live
// Build Playback run. Once status isn't "playing" (fresh open, reopened
// project, post-playback editing), everything renders immediately.
const STAGE_ORDER = ["planner", "blueprint", "first-service", "gateway", "connections", "database", "roadmap", "ready"];
function stageIndex(stage: string | null): number {
  const i = STAGE_ORDER.indexOf(stage ?? "");
  return i === -1 ? STAGE_ORDER.length : i;
}
function revealThreshold(kind: ArchitectNodeKind): string {
  if (kind === "client") return "first-service";
  if (kind === "gateway") return "gateway";
  return "connections";
}

function ArchNodeCard({ data, selected }: NodeProps<{ node: ArchitectNode; revealed: boolean }>) {
  const { node, revealed } = data;
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;
  const renameNode = useArchitectStore((s) => s.renameNode);
  const duplicateNode = useArchitectStore((s) => s.duplicateNode);
  const deleteNode = useArchitectStore((s) => s.deleteNode);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.label);

  const commitRename = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== node.label) renameNode(node.id, draft.trim());
    else setDraft(node.label);
  };

  return (
    <motion.div
      initial={revealed ? false : { opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={[
        "cattipu-cursor-hand cattipu-raised group relative flex w-[190px] items-start gap-2.5 rounded-md bg-surface-solid px-3 py-2.5",
        selected ? "cattipu-window-glow" : "",
      ].join(" ")}
      style={{ borderLeftColor: meta.accent, borderLeftWidth: 4 }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="nodrag nopan absolute -top-2.5 right-1 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateNode(node.id);
          }}
          title="Duplicate"
          aria-label="Duplicate node"
          className="cattipu-cursor-hand cattipu-press flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-black/25 bg-blue text-white shadow-[0_1px_0_rgba(0,0,0,0.25)]"
        >
          <Copy className="h-2.5 w-2.5" strokeWidth={3} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(node.id);
          }}
          title="Delete"
          aria-label="Delete node"
          className="cattipu-cursor-hand cattipu-press flex h-5 w-5 items-center justify-center rounded-[3px] border-2 border-black/25 bg-red text-white shadow-[0_1px_0_rgba(0,0,0,0.25)]"
        >
          <Trash2 className="h-2.5 w-2.5" strokeWidth={3} />
        </button>
      </div>

      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-black/10"
        style={{ background: `color-mix(in srgb, ${meta.accent} 16%, white)`, color: meta.accent }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(node.label);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="nodrag w-full rounded-[2px] border border-navy bg-surface-solid px-1 text-[12.5px] font-semibold text-ink outline-none"
          />
        ) : (
          <p
            className="truncate text-[12.5px] font-semibold text-ink"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            title="Double-click to rename"
          >
            {node.label}
          </p>
        )}
        <p className="cattipu-emboss-text truncate font-pixel-ui text-[0.4rem] tracking-wide text-ink-faint">
          {node.kind}
        </p>
      </span>
    </motion.div>
  );
}

function InfraNodeCardView({ data }: NodeProps<{ node: InfraNode }>) {
  const { node } = data;
  const meta = INFRA_KIND_META[node.kind];
  const Icon = meta.icon;
  return (
    <div
      className="cattipu-cursor-hand cattipu-raised flex w-[176px] items-start gap-2.5 rounded-md bg-surface-solid px-3 py-2.5"
      style={{ borderLeftColor: meta.accent, borderLeftWidth: 4 }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-black/10"
        style={{ background: `color-mix(in srgb, ${meta.accent} 16%, white)`, color: meta.accent }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-ink">{node.label}</p>
        <p className="cattipu-emboss-text truncate font-pixel-ui text-[0.4rem] tracking-wide text-ink-faint">
          {node.kind}
        </p>
      </span>
    </div>
  );
}

const nodeTypes = { arch: ArchNodeCard };
const infraNodeTypes = { infra: InfraNodeCardView };

export function ArchitectureCanvas() {
  const data = useArchitectStore((s) => s.data);
  const status = useArchitectStore((s) => s.status);
  const playbackStage = useArchitectStore((s) => s.playbackStage);
  const graphView = useArchitectStore((s) => s.graphView);
  const setGraphView = useArchitectStore((s) => s.setGraphView);
  const selectNode = useArchitectStore((s) => s.selectNode);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const addNode = useArchitectStore((s) => s.addNode);
  const setNodePosition = useArchitectStore((s) => s.setNodePosition);
  const connectNodes = useArchitectStore((s) => s.connectNodes);
  const deleteNode = useArchitectStore((s) => s.deleteNode);
  const deleteEdge = useArchitectStore((s) => s.deleteEdge);

  const playing = status === "playing";
  const stageIdx = stageIndex(playbackStage);
  const showBlueprint = playing && playbackStage === "blueprint";
  const showEdges = !playing || stageIdx >= stageIndex("connections");
  const eventsPulse = playing && playbackStage === "connections";

  const appNodes: Node[] = useMemo(() => {
    if (!data) return [];
    return data.nodes.map((n) => {
      const revealed = !playing || stageIdx >= stageIndex(revealThreshold(n.kind));
      return {
        id: n.id,
        type: "arch",
        position: n.position ?? { x: 40, y: 40 },
        data: { node: n, revealed },
        selected: n.id === selectedNodeId,
        draggable: true,
      };
    });
  }, [data, playing, stageIdx, selectedNodeId]);

  const appEdges: Edge[] = useMemo(() => {
    if (!data || !showEdges) return [];
    return data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      className: e.label === "Events" && eventsPulse ? "cattipu-edge-animated cattipu-edge-pulse" : "cattipu-edge-animated",
      labelStyle: { fill: "var(--color-navy)", fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: "var(--color-surface-solid)" },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 2,
      style: { stroke: "var(--color-navy)" },
    }));
  }, [data, showEdges, eventsPulse]);

  const infraNodesRF: Node[] = useMemo(() => {
    if (!data) return [];
    return data.infraNodes.map((n) => ({
      id: n.id,
      type: "infra",
      position: n.position ?? { x: 40, y: 40 },
      data: { node: n },
      selected: n.id === selectedNodeId,
      draggable: false,
    }));
  }, [data, selectedNodeId]);

  const infraEdgesRF: Edge[] = useMemo(() => {
    if (!data) return [];
    return data.infraEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      labelStyle: { fill: "var(--color-navy)", fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: "var(--color-surface-solid)" },
      style: { stroke: "var(--color-navy)" },
    }));
  }, [data]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (c.type === "position" && c.position && c.dragging === false) {
          setNodePosition(c.id, c.position);
        } else if (c.type === "remove") {
          deleteNode(c.id);
        }
      }
    },
    [setNodePosition, deleteNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) {
        if (c.type === "remove") deleteEdge(c.id);
      }
    },
    [deleteEdge]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      connectNodes(connection.source, connection.target);
    },
    [connectNodes]
  );

  if (!data) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-surface-solid">
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-border-strong bg-bg-dim px-3 py-2">
        <div className="cattipu-recessed flex items-center gap-0.5 rounded-[4px] p-0.5">
          <button
            onClick={() => setGraphView("application")}
            className={[
              "cattipu-cursor-hand cattipu-press rounded-[3px] px-2.5 py-1 font-pixel-ui text-[0.4rem] tracking-wide",
              graphView === "application" ? "bg-navy text-white" : "text-ink-dim",
            ].join(" ")}
          >
            Application
          </button>
          <button
            onClick={() => setGraphView("infrastructure")}
            className={[
              "cattipu-cursor-hand cattipu-press rounded-[3px] px-2.5 py-1 font-pixel-ui text-[0.4rem] tracking-wide",
              graphView === "infrastructure" ? "bg-navy text-white" : "text-ink-dim",
            ].join(" ")}
          >
            Infrastructure
          </button>
        </div>

        {graphView === "application" && (
          <div className="ml-auto flex items-center gap-1.5">
            <ToolbarAddButton label="Service" onClick={() => addNode("service")} icon={Server} />
            <ToolbarAddButton label="Database" onClick={() => addNode("datastore")} icon={Database} />
            <ToolbarAddButton label="Queue" onClick={() => addNode("queue")} icon={Radio} />
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence>
          {showBlueprint && (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(11,61,145,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(11,61,145,0.35) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                backgroundColor: "var(--color-surface-solid)",
              }}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {graphView === "application" ? (
          <ReactFlow
            className="cattipu-flow"
            nodes={appNodes}
            edges={appEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            deleteKeyCode={["Backspace", "Delete"]}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.4}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(11,61,145,0.18)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <ReactFlow
            className="cattipu-flow"
            nodes={infraNodesRF}
            edges={infraEdgesRF}
            nodeTypes={infraNodeTypes}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.4}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(11,61,145,0.18)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

function ToolbarAddButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="cattipu-cursor-hand cattipu-press cattipu-raised flex items-center gap-1 rounded-[4px] bg-surface-solid px-2 py-1 text-[11px] font-medium text-ink-dim hover:text-navy"
    >
      <Plus className="h-3 w-3" strokeWidth={3} />
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </button>
  );
}
