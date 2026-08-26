"use client";

import { motion } from "framer-motion";
import { Network, ArrowRight } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import type { HttpMethod } from "@/lib/ai/types";

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: "var(--color-blue)",
  POST: "var(--color-green)",
  PUT: "var(--color-gold)",
  PATCH: "var(--color-purple)",
  DELETE: "var(--color-red)",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 28 } },
};

export function ApiCatalogPanel() {
  const data = useArchitectStore((s) => s.data);
  const viewApi = useArchitectStore((s) => s.viewApi);
  if (!data) return null;

  const nodeLabel = (id: string) => data.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="h-full overflow-auto bg-bg-dim px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Network className="h-4 w-4 text-navy" strokeWidth={2.5} />
        <h3 className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
          API catalog
        </h3>
      </div>

      {data.apis.length === 0 ? (
        <p className="text-[13px] text-ink-dim">No HTTP endpoints in this architecture yet.</p>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2">
          {data.apis.map((api) => (
            <motion.button
              key={api.id}
              variants={item}
              onClick={() => viewApi(api.nodeId)}
              className="cattipu-cursor-hand cattipu-raised group flex flex-col gap-1.5 rounded-md bg-surface-solid px-3.5 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className="cattipu-emboss-text-inverted flex h-5 w-16 shrink-0 items-center justify-center rounded-[3px] font-pixel-ui text-[0.4rem] text-white"
                  style={{ background: METHOD_COLOR[api.method] }}
                >
                  {api.method}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[14px] text-ink">{api.route}</span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-faint group-hover:text-navy">
                  {nodeLabel(api.nodeId)}
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 pl-[4.6rem] text-[11.5px] text-ink-dim sm:grid-cols-2">
                <p>
                  <span className="text-ink-faint">Request </span>
                  <span className="font-mono text-[12.5px] text-ink">{api.request}</span>
                </p>
                <p>
                  <span className="text-ink-faint">Response </span>
                  <span className="font-mono text-[12.5px] text-ink">{api.response}</span>
                </p>
                <p>
                  <span className="text-ink-faint">Auth </span>
                  {api.authentication}
                </p>
                {api.dependencies.length > 0 && (
                  <p className="truncate">
                    <span className="text-ink-faint">Depends on </span>
                    {api.dependencies.join(", ")}
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
