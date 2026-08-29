"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Download, FileText, FileJson, Database, GitBranch, Braces, Printer } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import {
  downloadFile,
  toMarkdown,
  toJson,
  toSql,
  toDbDiagram,
  toOpenApi,
  printArchitectureReport,
} from "@/lib/exportProject";

const FORMATS: {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: "markdown", label: "Markdown", hint: ".md — full write-up", icon: FileText },
  { id: "json", label: "JSON", hint: ".json — raw architecture", icon: FileJson },
  { id: "sql", label: "SQL", hint: ".sql — CREATE TABLE statements", icon: Database },
  { id: "dbdiagram", label: "dbdiagram", hint: ".dbml — paste into dbdiagram.io", icon: GitBranch },
  { id: "openapi", label: "OpenAPI", hint: ".json — 3.0 spec", icon: Braces },
  { id: "pdf", label: "PDF report", hint: "print-ready architecture report", icon: Printer },
];

export function ExportCenter() {
  const open = useArchitectStore((s) => s.exportPanelOpen);
  const setOpen = useArchitectStore((s) => s.setExportPanelOpen);
  const data = useArchitectStore((s) => s.data);

  if (!data) return null;

  const slug = data.projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";

  const run = (id: string) => {
    switch (id) {
      case "markdown":
        downloadFile(`${slug}.md`, toMarkdown(data), "text/markdown");
        break;
      case "json":
        downloadFile(`${slug}.json`, toJson(data), "application/json");
        break;
      case "sql":
        downloadFile(`${slug}.sql`, toSql(data), "text/plain");
        break;
      case "dbdiagram":
        downloadFile(`${slug}.dbml`, toDbDiagram(data), "text/plain");
        break;
      case "openapi":
        downloadFile(`${slug}.openapi.json`, toOpenApi(data), "application/json");
        break;
      case "pdf":
        printArchitectureReport(data);
        break;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="cattipu-raised w-[min(90vw,30rem)] overflow-hidden bg-bg-dim"
          >
            <div className="flex items-center justify-between border-b-2 border-border-strong bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-navy" strokeWidth={2.5} />
                <p className="cattipu-emboss-text font-pixel-ui text-[0.5rem] tracking-wide text-navy">
                  Export project
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close export center"
                className="cattipu-cursor-hand flex h-6 w-6 items-center justify-center rounded-[3px] text-ink-dim hover:bg-navy/10 hover:text-navy"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => run(f.id)}
                    className="cattipu-cursor-hand cattipu-raised cattipu-press flex items-start gap-2.5 bg-surface-solid px-3 py-2.5 text-left"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-black/10 bg-navy/10 text-navy">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{f.label}</p>
                      <p className="text-[11px] text-ink-dim">{f.hint}</p>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
