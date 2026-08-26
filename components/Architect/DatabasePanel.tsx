"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, BackgroundVariant, Handle, Position, type Edge, type Node } from "reactflow";
import { Database, Table2, Plus, X, Link2 } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import type { SqlTable } from "@/lib/ai/types";

const TYPE_DURATION_MS = 1400;
const SQL_TYPES = ["UUID", "TEXT", "INT", "BIGINT", "BOOLEAN", "TIMESTAMPTZ", "NUMERIC", "JSONB"];

function ErTableNode({ data }: { data: { table: SqlTable } }) {
  const { table } = data;
  const renameTable = useArchitectStore((s) => s.renameTable);
  const addColumn = useArchitectStore((s) => s.addColumn);
  const deleteColumn = useArchitectStore((s) => s.deleteColumn);
  const changeColumnType = useArchitectStore((s) => s.changeColumnType);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(table.name);

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft.trim() !== table.name) renameTable(table.name, titleDraft.trim());
    else setTitleDraft(table.name);
  };

  return (
    <div className="cattipu-raised w-[210px] overflow-hidden rounded-md bg-surface-solid">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center gap-1.5 border-b-2 border-border-strong bg-bg-dim px-2.5 py-1.5">
        <Table2 className="h-3 w-3 shrink-0 text-navy" strokeWidth={2.5} />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && commitTitle()}
            className="nodrag w-full rounded-[2px] border border-navy bg-surface-solid px-1 font-mono text-[13px] font-semibold text-ink outline-none"
          />
        ) : (
          <p
            className="truncate font-mono text-[14px] font-semibold text-ink"
            onDoubleClick={() => setEditingTitle(true)}
            title="Double-click to rename"
          >
            {table.name}
          </p>
        )}
      </div>
      <ul className="nodrag nopan px-2 py-1.5">
        {table.columns.map((c) => (
          <li key={c.name} className="group flex items-center gap-1 py-0.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] leading-none text-ink">{c.name}</span>
            <select
              value={c.type}
              onChange={(e) => changeColumnType(table.name, c.name, e.target.value)}
              className="cattipu-cursor-hand shrink-0 rounded-[2px] border border-border-strong bg-surface font-mono text-[11px] leading-none text-ink-dim outline-none"
            >
              {SQL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={() => deleteColumn(table.name, c.name)}
              aria-label={`Delete column ${c.name}`}
              className="cattipu-cursor-hand flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-ink-faint opacity-0 hover:bg-red/10 hover:text-red group-hover:opacity-100"
            >
              <X className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => addColumn(table.name)}
        className="nodrag cattipu-cursor-hand flex w-full items-center gap-1 border-t border-border px-2.5 py-1 text-[11px] text-ink-faint hover:bg-navy/[0.06] hover:text-navy"
      >
        <Plus className="h-2.5 w-2.5" strokeWidth={3} />
        Add column
      </button>
    </div>
  );
}

const erNodeTypes = { erTable: ErTableNode };

export function DatabasePanel() {
  const data = useArchitectStore((s) => s.data);
  const addRelationship = useArchitectStore((s) => s.addRelationship);
  const [activeTableIdx, setActiveTableIdx] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const rafRef = useRef<number | null>(null);
  const [relFrom, setRelFrom] = useState("");
  const [relTo, setRelTo] = useState("");
  const [relLabel, setRelLabel] = useState("1 — ∞");

  const tables = useMemo(() => data?.tables ?? [], [data]);
  const fullSql = useMemo(() => tables.map((t) => t.sql).join("\n\n"), [tables]);

  useEffect(() => {
    setActiveTableIdx((i) => Math.min(i, Math.max(0, tables.length - 1)));
  }, [tables.length]);

  useEffect(() => {
    setTypedLength(0);
    if (!fullSql) return;

    const start = performance.now();
    const total = fullSql.length;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / TYPE_DURATION_MS);
      setTypedLength(Math.round(progress * total));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fullSql]);

  const erNodes: Node[] = useMemo(
    () =>
      tables.map((t, i) => ({
        id: t.name,
        type: "erTable",
        position: { x: 20 + i * 240, y: 20 },
        data: { table: t },
        draggable: true,
      })),
    [tables]
  );

  const erEdges: Edge[] = useMemo(
    () =>
      (data?.relationships ?? []).map((r, i) => ({
        id: `rel-${i}`,
        source: r.from,
        target: r.to,
        label: r.label,
        type: "smoothstep",
        labelStyle: { fill: "var(--color-navy)", fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "var(--color-surface-solid)" },
        style: { stroke: "var(--color-navy)" },
      })),
    [data]
  );

  if (!data) return null;

  const revealed = fullSql.slice(0, typedLength);
  const typing = typedLength < fullSql.length;

  const submitRelationship = () => {
    if (!relFrom || !relTo || relFrom === relTo) return;
    addRelationship(relFrom, relTo, relLabel.trim() || "1 — ∞");
    setRelLabel("1 — ∞");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-dim sm:flex-row">
      {/* SQL viewer */}
      <div className="flex min-h-0 flex-1 flex-col border-b-2 border-border-strong sm:w-1/2 sm:border-b-0 sm:border-r-2">
        <div className="flex shrink-0 items-center gap-2 border-b-2 border-border-strong bg-surface px-4 py-2.5">
          <Database className="h-3.5 w-3.5 text-navy" strokeWidth={2.5} />
          <p className="cattipu-emboss-text font-pixel-ui text-[0.45rem] tracking-wide text-navy">
            Schema
          </p>
          <div className="ml-auto flex gap-1">
            {tables.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setActiveTableIdx(i)}
                className={[
                  "cattipu-cursor-hand cattipu-press rounded-[3px] px-1.5 py-0.5 font-mono text-[13px] leading-none",
                  i === activeTableIdx
                    ? "cattipu-recessed bg-navy/10 text-navy"
                    : "cattipu-raised text-ink-dim hover:text-navy",
                ].join(" ")}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <pre className="cattipu-recessed min-h-0 flex-1 overflow-auto bg-[#fbf7ea] px-4 py-3 font-mono text-[15px] leading-relaxed text-ink">
          {revealed}
          {typing && <span className="cattipu-caret text-navy">▌</span>}
        </pre>
      </div>

      {/* ER diagram + relationships */}
      <div className="flex min-h-0 flex-1 flex-col sm:w-1/2">
        <div className="h-[55%] min-h-[180px] border-b border-border">
          <ReactFlow
            className="cattipu-flow"
            nodes={erNodes}
            edges={erEdges}
            nodeTypes={erNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            minZoom={0.4}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(11,61,145,0.16)" />
          </ReactFlow>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-surface px-4 py-3">
          <p className="cattipu-emboss-text mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Relationships
          </p>
          <ul className="mb-2.5 flex flex-col gap-1">
            {(data.relationships ?? []).map((r, i) => (
              <li
                key={i}
                className="cattipu-recessed flex items-center gap-2 rounded-[3px] bg-surface-solid px-2 py-1 font-mono text-[14px] leading-none text-ink"
              >
                <span>{r.from}</span>
                <span className="text-ink-faint">{r.label}</span>
                <span>{r.to}</span>
              </li>
            ))}
          </ul>

          <div className="cattipu-raised flex flex-wrap items-center gap-1.5 rounded-[4px] bg-surface-solid px-2 py-1.5">
            <Link2 className="h-3 w-3 shrink-0 text-ink-faint" strokeWidth={2.5} />
            <select
              value={relFrom}
              onChange={(e) => setRelFrom(e.target.value)}
              className="cattipu-cursor-hand rounded-[3px] border border-border-strong bg-surface px-1 py-0.5 text-[11px] text-ink outline-none"
            >
              <option value="">from…</option>
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={relTo}
              onChange={(e) => setRelTo(e.target.value)}
              className="cattipu-cursor-hand rounded-[3px] border border-border-strong bg-surface px-1 py-0.5 text-[11px] text-ink outline-none"
            >
              <option value="">to…</option>
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              value={relLabel}
              onChange={(e) => setRelLabel(e.target.value)}
              placeholder="1 — ∞"
              className="w-16 min-w-0 rounded-[3px] border border-border-strong bg-surface px-1.5 py-0.5 text-[11px] text-ink outline-none"
            />
            <button
              onClick={submitRelationship}
              disabled={!relFrom || !relTo || relFrom === relTo}
              className="cattipu-cursor-hand cattipu-press ml-auto rounded-[3px] border-2 border-black/20 bg-navy px-2 py-0.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
