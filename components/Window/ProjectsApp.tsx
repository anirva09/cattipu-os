"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Cpu, Globe2, Sparkles, Plus, ArrowUpRight } from "lucide-react";
import { useProjectStore, type ProjectIcon } from "@/store/useProjectStore";
import { useArchitectStore } from "@/store/useArchitectStore";
import { useWindowStore } from "@/store/useWindowStore";
import { useUiSound } from "@/lib/useUiSound";

const ICONS: Record<ProjectIcon, React.ComponentType<{ className?: string }>> = {
  banking: Building2,
  saas: Cpu,
  website: Globe2,
  generic: Sparkles,
};

export function ProjectsApp() {
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const loadFromProject = useArchitectStore((s) => s.loadFromProject);
  const openApp = useWindowStore((s) => s.openApp);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const playSound = useUiSound();

  const submit = () => {
    if (!name.trim()) {
      playSound("error");
      return;
    }
    addProject(name);
    playSound("success");
    setName("");
    setCreating(false);
  };

  return (
    <div className="flex h-full flex-col bg-surface-solid">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Your projects</h2>
          <p className="text-sm text-ink-dim">Where ideas become software.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-navy/90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          New Project
        </button>
      </div>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border bg-bg"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-center gap-2 px-5 py-3"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your project…"
                className="flex-1 rounded-md border border-border-strong bg-surface-solid px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-navy"
              />
              <button
                type="submit"
                className="rounded-md bg-navy px-3 py-1.5 text-[13px] font-medium text-white hover:bg-navy/90"
              >
                Create
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-auto px-2 py-2">
        {projects.map((p) => {
          const Icon = ICONS[p.icon];
          const openable = !!p.architecture;
          return (
            <button
              key={p.id}
              disabled={!openable}
              onClick={() => {
                if (!p.architecture) return;
                loadFromProject(p);
                openApp("architect", "Architect");
              }}
              className={[
                "cattipu-cursor-hand group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                openable ? "hover:bg-bg" : "cursor-default",
              ].join(" ")}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2"
                style={{ borderColor: p.color, color: p.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-ink-dim">{p.editedLabel}</p>
              </div>
              {openable && (
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={2.5}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
