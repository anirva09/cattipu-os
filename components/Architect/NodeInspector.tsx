"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ListChecks, Link2, Radio, Table2, Route, Server, Copy, Trash2 } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";

export function NodeInspector() {
  const data = useArchitectStore((s) => s.data);
  const activeTab = useArchitectStore((s) => s.activeTab);
  const graphView = useArchitectStore((s) => s.graphView);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const selectNode = useArchitectStore((s) => s.selectNode);
  const duplicateNode = useArchitectStore((s) => s.duplicateNode);
  const deleteNode = useArchitectStore((s) => s.deleteNode);

  const inArchTab = activeTab === "architecture" && !!data;
  const appNode = inArchTab && graphView === "application" ? data!.nodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const infraNode = inArchTab && graphView === "infrastructure" ? data!.infraNodes.find((n) => n.id === selectedNodeId) ?? null : null;

  return (
    <AnimatePresence>
      {(appNode || infraNode) && (
        <motion.div
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className="cattipu-raised absolute inset-y-0 right-0 z-10 flex w-[240px] flex-col overflow-hidden bg-bg-dim shadow-[-6px_0_16px_rgba(11,20,40,0.10)]"
        >
          <div className="flex items-center justify-between border-b-2 border-border-strong bg-surface px-3.5 py-3">
            <p className="truncate text-[13px] font-semibold text-ink">
              {appNode?.label ?? infraNode?.label}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {appNode && (
                <>
                  <button
                    onClick={() => duplicateNode(appNode.id)}
                    aria-label="Duplicate node"
                    title="Duplicate"
                    className="cattipu-cursor-hand flex h-5 w-5 items-center justify-center rounded-[3px] text-ink-dim hover:bg-navy/10 hover:text-navy"
                  >
                    <Copy className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => deleteNode(appNode.id)}
                    aria-label="Delete node"
                    title="Delete"
                    className="cattipu-cursor-hand flex h-5 w-5 items-center justify-center rounded-[3px] text-ink-dim hover:bg-red/10 hover:text-red"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </>
              )}
              <button
                onClick={() => selectNode(null)}
                aria-label="Close inspector"
                className="cattipu-cursor-hand flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] text-ink-dim hover:bg-navy/10 hover:text-navy"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-3.5 py-3">
            {appNode && (
              <>
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
                  items={infraNode.usedBy.map(
                    (id) => data!.nodes.find((n) => n.id === id)?.label ?? id
                  )}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
              "cattipu-recessed rounded-[3px] bg-surface-solid px-2 py-1 text-[11.5px] text-ink",
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
