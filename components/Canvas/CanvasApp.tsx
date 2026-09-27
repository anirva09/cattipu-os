"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import { ShellIcon } from "../PixelIcon";
import type { ArchitectNodeKind } from "@/lib/ai/types";
import { ARCHITECT_NODE_KINDS, type ArchitectEditFailure } from "@/lib/contracts/architect";
import type { CanvasEdgeView, CanvasNodeView, CanvasView } from "@/lib/contracts/canvas";
import { activeProject } from "@/lib/os/projects";
import { architectureEditor } from "@/lib/services/architect/architectService";
import {
  CANVAS_GRID,
  CANVAS_NODE,
  CANVAS_ORIGIN,
  canvasService,
  snapToCanvasGrid as snap,
} from "@/lib/services/canvas/canvasService";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./CanvasApp.css";

/**
 * MVP-03 — Canvas, the visual projection of the active project's
 * architecture.
 *
 * Architect owns WHAT the system is: nodes, labels, kinds and edges are
 * read from `project.architect.data` on every render and never copied.
 * Canvas owns WHERE each node is drawn: `project.canvas.layout`, written
 * only through the project store's `placeCanvasNode`. Selection and an
 * in-progress drag are presentation state of this window and are not
 * persisted.
 *
 * Creating and editing a node (New Node, the inspector) is an Architect
 * edit: it goes through `architectureEditor` into the project's one
 * architecture, and Canvas draws the result like any other node.
 */

export const CATTIPU_CANVAS_REFERENCE = {
  toolbarHeight: 34,
  statusHeight: 24,
  inspectorWidth: 176,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
} as const;

type CanvasStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

/** Short plate tags, so the kind reads before the label. */
const KIND_TAG: Record<ArchitectNodeKind, string> = {
  client: "CLIENT",
  gateway: "GATEWAY",
  service: "SERVICE",
  queue: "QUEUE",
  datastore: "DATA",
};

const KIND_NAME: Record<ArchitectNodeKind, string> = {
  client: "Client",
  gateway: "Gateway",
  service: "Service",
  queue: "Queue",
  datastore: "Datastore",
};

const EDIT_MESSAGE: Record<ArchitectEditFailure, string> = {
  "no-project": "The project no longer exists.",
  "unknown-node": "That node no longer exists.",
  "empty-name": "A node needs a name.",
  "invalid-kind": "Choose a node type.",
};

/** Selection belongs to one project's drawing; it never follows a switch. */
interface CanvasSelection {
  projectId: string;
  nodeId: string;
}

export interface CanvasAppProps {
  /** Raises Architect, where a project's architecture is made. */
  onOpenWindow?: (id: "architect" | "projects") => void;
}

export function CanvasApp({ onOpenWindow }: CanvasAppProps) {
  const projects = useProjectStore((s) => s.projects);
  const view = useMemo(() => canvasService.view(activeProject(projects)), [projects]);
  const [selection, setSelection] = useState<CanvasSelection | null>(null);
  const projectId = view.kind === "no-project" ? null : view.project.id;
  const selectedId = selection && selection.projectId === projectId ? selection.nodeId : null;
  const select = (nodeId: string | null) =>
    setSelection(nodeId && projectId ? { projectId, nodeId } : null);

  const style: CanvasStyle = {
    ...cattipuCssVariables,
    "--cattipu-canvas-toolbar-height": `${CATTIPU_CANVAS_REFERENCE.toolbarHeight}px`,
    "--cattipu-canvas-status-height": `${CATTIPU_CANVAS_REFERENCE.statusHeight}px`,
    "--cattipu-canvas-pad": `${CATTIPU_CANVAS_REFERENCE.padding}px`,
    "--cattipu-canvas-gap": `${CATTIPU_CANVAS_REFERENCE.gap}px`,
    "--cattipu-canvas-node-width": `${CANVAS_NODE.width}px`,
    "--cattipu-canvas-node-height": `${CANVAS_NODE.height}px`,
    "--cattipu-canvas-inspector-width": `${CATTIPU_CANVAS_REFERENCE.inspectorWidth}px`,
    // Architect's semantic purple marks what Architect owns: node kinds,
    // the selected node and the inspector heading.
    "--cattipu-canvas-accent": cattipuTokens.colors.architect,
  };

  return (
    <div className="cattipu-canvas" style={style} data-testid="canvas" data-canvas-state={view.kind}>
      {view.kind === "ready" ? (
        // Keyed by project: selection and a half-finished drag belong to
        // one project's drawing and must not follow the switch.
        <CanvasSurface key={view.project.id} view={view} selectedId={selectedId} onSelect={select} />
      ) : (
        <CanvasEmpty view={view} onOpenWindow={onOpenWindow} onSelect={select} />
      )}
    </div>
  );
}

/** Adds a Service node to the project's architecture and selects it. */
function addNode(projectId: string, onSelect: (nodeId: string | null) => void) {
  const result = architectureEditor.addNode(projectId, { kind: "service" });
  if (result.ok) onSelect(result.node.id);
}

function CanvasEmpty({
  view,
  onOpenWindow,
  onSelect,
}: {
  view: Exclude<CanvasView, { kind: "ready" }>;
  onOpenWindow?: CanvasAppProps["onOpenWindow"];
  onSelect: (nodeId: string | null) => void;
}) {
  const noProject = view.kind === "no-project";
  return (
    <div className="cattipu-canvas__empty cattipu-drafting-paper" data-testid="canvas-empty">
      <span className="cattipu-canvas__empty-plate cattipu-bevel--inset">
        <ShellIcon name={noProject ? "projects" : "architect"} size={32} />
      </span>
      <p className="cattipu-canvas__empty-text">
        {noProject
          ? "No project is open. Select or create a project to draw its architecture."
          : `${view.project.name} has no architecture yet. Add a node here, or create the plan in Architect.`}
      </p>
      {view.kind === "no-architecture" && (
        <button
          type="button"
          className="cattipu-canvas__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="canvas-new-node"
          onClick={() => addNode(view.project.id, onSelect)}
        >
          New Node
        </button>
      )}
      {onOpenWindow && (
        <button
          type="button"
          className="cattipu-canvas__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={() => onOpenWindow(noProject ? "projects" : "architect")}
        >
          {noProject ? "Open Projects" : "Open Architect"}
        </button>
      )}
    </div>
  );
}

interface DragState {
  nodeId: string;
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

function CanvasSurface({
  view,
  selectedId,
  onSelect: setSelectedId,
}: {
  view: Extract<CanvasView, { kind: "ready" }>;
  selectedId: string | null;
  onSelect: (nodeId: string | null) => void;
}) {
  const placeCanvasNode = useProjectStore((s) => s.placeCanvasNode);
  const resetCanvasLayout = useProjectStore((s) => s.resetCanvasLayout);
  const [drag, setDrag] = useState<DragState | null>(null);

  const projectId = view.project.id;
  const positioned = useMemo(
    () =>
      view.nodes.map((node) =>
        drag?.nodeId === node.nodeId ? { ...node, x: drag.x, y: drag.y } : node,
      ),
    [view.nodes, drag],
  );
  const byId = useMemo(() => new Map(positioned.map((n) => [n.nodeId, n])), [positioned]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const anyPlaced = view.nodes.some((node) => node.placed);

  // The sheet grows to hold the furthest node, never shrinks below the
  // viewport (CSS min-size), and stays on the 8px grid.
  const sheet = useMemo(() => {
    const right = Math.max(0, ...positioned.map((n) => n.x + CANVAS_NODE.width));
    const bottom = Math.max(0, ...positioned.map((n) => n.y + CANVAS_NODE.height));
    return { width: snap(right + CANVAS_ORIGIN * 2), height: snap(bottom + CANVAS_ORIGIN * 2) };
  }, [positioned]);

  const move = (node: CanvasNodeView, x: number, y: number) => {
    placeCanvasNode(projectId, { nodeId: node.nodeId, x, y });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, node: CanvasNodeView) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(node.nodeId);
    setDrag({
      nodeId: node.nodeId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: node.x,
      originY: node.y,
      x: node.x,
      y: node.y,
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    // The pointer is tracked directly and snapped, so the plate moves in
    // whole grid steps under the cursor rather than easing after it.
    const x = snap(drag.originX + event.clientX - drag.pointerX);
    const y = snap(drag.originY + event.clientY - drag.pointerY);
    if (x !== drag.x || y !== drag.y) setDrag({ ...drag, x, y });
  };

  const onPointerUp = (node: CanvasNodeView) => {
    if (!drag) return;
    const moved = drag.x !== drag.originX || drag.y !== drag.originY;
    setDrag(null);
    if (moved) move(node, drag.x, drag.y);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, node: CanvasNodeView) => {
    const step = event.shiftKey ? CANVAS_GRID * 4 : CANVAS_GRID;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    setSelectedId(node.nodeId);
    move(node, node.x + d[0], node.y + d[1]);
  };

  return (
    <>
      <div className="cattipu-canvas__toolbar">
        <ShellIcon name="architect" size={16} />
        <span className="cattipu-canvas__source" data-testid="canvas-source">
          {`${view.project.name} · Architect`}
        </span>
        <button
          type="button"
          className="cattipu-canvas__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="canvas-new-node"
          onClick={() => addNode(projectId, setSelectedId)}
        >
          New Node
        </button>
        <button
          type="button"
          className="cattipu-canvas__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="canvas-reset"
          disabled={!anyPlaced}
          onClick={() => resetCanvasLayout(projectId)}
        >
          Reset Layout
        </button>
      </div>

      <div className="cattipu-canvas__body">
        <div
          className="cattipu-canvas__viewport cattipu-bevel--inset"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          {view.nodes.length === 0 ? (
            <p className="cattipu-canvas__empty-text cattipu-canvas__empty-text--inline">
              This architecture has no nodes. Add them in Architect.
            </p>
          ) : (
            <div
              className="cattipu-canvas__sheet cattipu-drafting-paper"
              style={{ width: sheet.width, height: sheet.height }}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null);
              }}
            >
              <CanvasEdges edges={view.edges} nodes={byId} width={sheet.width} height={sheet.height} />
              {positioned.map((node) => (
                <button
                  key={node.nodeId}
                  type="button"
                  className="cattipu-canvas__node cattipu-bevel--raised cattipu-focus--mechanical"
                  data-testid="canvas-node"
                  data-node-id={node.nodeId}
                  data-selected={selectedId === node.nodeId ? "true" : undefined}
                  data-dragging={drag?.nodeId === node.nodeId ? "true" : undefined}
                  aria-label={`${node.label}, ${KIND_TAG[node.kind]}, x ${node.x}, y ${node.y}`}
                title={node.description || undefined}
                  style={{ left: node.x, top: node.y }}
                  onPointerDown={(event) => onPointerDown(event, node)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => onPointerUp(node)}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(event) => onKeyDown(event, node)}
                >
                  <span className="cattipu-canvas__node-kind">{KIND_TAG[node.kind]}</span>
                  <span className="cattipu-canvas__node-label">{node.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CanvasInspector projectId={projectId} node={selected} />
      </div>

      <div className="cattipu-canvas__status" data-testid="canvas-status">
        <span>{`NODES ${String(view.nodes.length).padStart(2, "0")}`}</span>
        <span>{`LINKS ${String(view.edges.length).padStart(2, "0")}`}</span>
        <span className="cattipu-canvas__status-selection">
          {selected ? `${selected.label.toUpperCase()} · X ${selected.x} Y ${selected.y}` : "NO SELECTION"}
        </span>
      </div>
    </>
  );
}

/**
 * The selected node's Architect data, edited in place. Name and
 * description commit when the field is left (or on Enter for the name);
 * the type commits on change. Every edit goes through the Architect
 * editor; the inspector keeps drafts only while a field is being typed.
 */
function CanvasInspector({ projectId, node }: { projectId: string; node: CanvasNodeView | null }) {
  const [error, setError] = useState<string | null>(null);

  const commit = (patch: Parameters<typeof architectureEditor.updateNode>[2]) => {
    if (!node) return;
    const result = architectureEditor.updateNode(projectId, node.nodeId, patch);
    setError(result.ok ? null : EDIT_MESSAGE[result.reason]);
  };

  return (
    <aside className="cattipu-canvas__inspector cattipu-bevel--inset" data-testid="canvas-inspector" aria-label="Node inspector">
      <p className="cattipu-canvas__inspector-heading">NODE</p>
      {node ? (
        // Keyed by the node's current data, so the fields show the saved
        // value after every commit and after an edit made in Architect.
        <div className="cattipu-canvas__fields" key={`${node.nodeId}:${node.label}:${node.kind}:${node.description}`}>
          <label className="cattipu-canvas__field">
            <span>Name</span>
            <input
              className="cattipu-canvas__input cattipu-bevel--inset"
              data-testid="canvas-node-name"
              defaultValue={node.label}
              onBlur={(event) => {
                if (event.currentTarget.value.trim() !== node.label) commit({ label: event.currentTarget.value });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.value = node.label;
                  setError(null);
                }
              }}
            />
          </label>
          <label className="cattipu-canvas__field">
            <span>Type</span>
            <select
              className="cattipu-canvas__input cattipu-bevel--inset"
              data-testid="canvas-node-kind"
              defaultValue={node.kind}
              onChange={(event) => commit({ kind: event.currentTarget.value as ArchitectNodeKind })}
            >
              {ARCHITECT_NODE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_NAME[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="cattipu-canvas__field">
            <span>Description</span>
            <textarea
              className="cattipu-canvas__input cattipu-canvas__input--area cattipu-bevel--inset"
              data-testid="canvas-node-description"
              rows={4}
              defaultValue={node.description}
              onBlur={(event) => {
                if (event.currentTarget.value.trim() !== node.description) commit({ description: event.currentTarget.value });
              }}
            />
          </label>
          <p className="cattipu-canvas__readout">{`X ${node.x}  Y ${node.y}`}</p>
          {error && (
            <p className="cattipu-canvas__error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="cattipu-canvas__inspector-empty">Select a node to edit it, or add one with New Node.</p>
      )}
    </aside>
  );
}

/**
 * Links drawn as orthogonal runs — out of the source's right edge, across
 * at the midpoint, into the target's left edge — so every segment is
 * horizontal or vertical and sits on whole pixels. A diagonal would
 * antialias into grey on the pixel shell.
 */
function CanvasEdges({
  edges,
  nodes,
  width,
  height,
}: {
  edges: readonly CanvasEdgeView[];
  nodes: ReadonlyMap<string, CanvasNodeView>;
  width: number;
  height: number;
}) {
  const half = CANVAS_NODE.height / 2;
  return (
    <svg
      className="cattipu-canvas__edges"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {edges.map((edge) => {
        const a = nodes.get(edge.source);
        const b = nodes.get(edge.target);
        if (!a || !b) return null;
        const x1 = a.x + CANVAS_NODE.width;
        const y1 = a.y + half;
        const x2 = b.x;
        const y2 = b.y + half;
        const mid = snap((x1 + x2) / 2);
        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`}
            fill="none"
            stroke="var(--cattipu-bevel-right)"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
