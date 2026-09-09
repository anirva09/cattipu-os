"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, ListChecks, Link2, Radio, Table2, Route, Server, Copy, Trash2 } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

/**
 * Milestone 11 (Architect Retro Workstation Identity) — was an
 * absolutely-positioned overlay that slid in over the canvas only once
 * a node was selected. The brief's generated-state shell wants a
 * permanent "right inspector/details pane" region (center workspace +
 * right inspector, alongside the left outline and bottom status strip),
 * so this is now a normal, always-present docked column — width
 * reserved whether or not anything's selected — with only its inner
 * content fading between the two states. Section content and node data
 * are unchanged from the previous milestone; only the outer shell and
 * the (now unnecessary) close button changed.
 */
export function NodeInspector() {
  const data = useArchitectStore((s) => s.data);
  const graphView = useArchitectStore((s) => s.graphView);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const duplicateNode = useArchitectStore((s) => s.duplicateNode);
  const deleteNode = useArchitectStore((s) => s.deleteNode);

  if (!data) return null;

  const appNode = graphView === "application" ? data.nodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const infraNode = graphView === "infrastructure" ? data.infraNodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const node = appNode ?? infraNode;

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-l-2 border-border-strong bg-bg-dim">
      <div className="shrink-0 border-b-2 border-border-strong bg-surface px-3.5 py-2.5">
        <p className="cattipu-emboss-text font-pixel-ui text-[0.35rem] tracking-[0.15em] text-ink-faint">
          INSPECTOR
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">{node?.label ?? "No selection"}</p>
      </div>

      <AnimatePresence mode="wait">
        {node ? (
          <motion.div
            key={node.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="min-h-0 flex-1 overflow-auto px-3.5 py-3"
          >
            {appNode && (
              <>
                <div className="mb-3 flex items-center gap-1">
                  <button
                    onClick={() => duplicateNode(appNode.id)}
                    aria-label="Duplicate node"
                    title="Duplicate"
                    className="cattipu-cursor-hand cattipu-raised flex h-6 items-center gap-1 bg-surface-solid px-2 text-[11px] text-ink-dim hover:text-navy"
                  >
                    <Copy className="h-3 w-3" strokeWidth={2.5} />
                    Duplicate
                  </button>
                  <button
                    onClick={() => deleteNode(appNode.id)}
                    aria-label="Delete node"
                    title="Delete"
                    className="cattipu-cursor-hand cattipu-raised flex h-6 items-center gap-1 bg-surface-solid px-2 text-[11px] text-ink-dim hover:text-red"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                    Delete
                  </button>
                </div>
                <InspectorSection icon={ListChecks} title="Responsibilities" items={appNode.responsibilities} />
                <InspectorSection icon={Route} title="Endpoints" items={appNode.endpoints} mono />
                <InspectorSection icon={Link2} title="Dependencies" items={appNode.dependencies} />
                <InspectorSection icon={Radio} title="Events" items={appNode.events} mono />
                <InspectorSection icon={Table2} title="Tables" items={appNode.tables} mono />
              </>
            )}
            {infraNode && (
              <>
                <InspectorSection icon={ListChecks} title="Responsibilities" items={infraNode.responsibilities} />
                <InspectorSection
                  icon={Server}
                  title="Used by"
                  items={infraNode.usedBy.map((id) => data.nodes.find((n) => n.id === id)?.label ?? id)}
                />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 text-center"
          >
            <span className="cattipu-recessed flex h-9 w-9 items-center justify-center bg-surface-solid">
              <MousePointerClick className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
            </span>
            <p className="text-[12px] leading-relaxed text-ink-faint">
              Click a node on the diagram to inspect its detail.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InspectorSection({
  icon: Icon,
  title,
  items,
  mono,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  items: string[];
  mono?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-ink-faint" strokeWidth={2.5} />
        <p className="cattipu-emboss-text text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          {title}
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li
            key={it}
            className={[
              "cattipu-recessed bg-surface-solid px-2 py-1 text-[11.5px] text-ink",
              mono ? "font-mono text-[13px]" : "",
            ].join(" ")}
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
