"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Cpu, Globe2, Sparkles, Plus, ArrowUpRight } from "lucide-react";
import { useProjectStore, type ProjectIcon } from "@/store/useProjectStore";
import { useArchitectStore } from "@/store/useArchitectStore";
import { useWindowStore } from "@/store/useWindowStore";
import { useUiSound } from "@/lib/useUiSound";
import { Input } from "@/components/UI/Input";
import { CattipuButton } from "@/components/UI/Button";

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
        {/* Typography pass — this button and "Create" below used to render
            in the modern body font (text-[13px] font-medium) while the
            identical "New Project" action elsewhere (the Home Screen
            Toolbox) already used the shared pixel-ui CattipuButton — an
            accidental modern-font leak on one of two renderings of the
            same action. Migrated onto CattipuButton so both read in one
            voice; icon shrunk from h-3.5 to h-3 to match Toolbox's own
            icon size. */}
        <CattipuButton
          variant="primary"
          icon={<Plus className="h-3 w-3" strokeWidth={2.5} />}
          onClick={() => setCreating((c) => !c)}
        >
          New Project
        </CattipuButton>
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
              {/* Milestone 3 (Window Chrome Retrofit) — a real in-window
                  text field, migrated onto the shared workstation Input
                  primitive (square corners, embossed border) in place of
                  the previous ad hoc rounded-md input. */}
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your project…"
                className="flex-1 bg-surface-solid"
              />
              <CattipuButton type="submit" variant="primary">
                Create
              </CattipuButton>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-auto px-2 py-2">
        {projects.map((p) => {
          const Icon = ICONS[p.icon];
          const openable = !!p.architect.data;
          return (
            <button
              key={p.id}
              disabled={!openable}
              onClick={() => {
                if (!p.architect.data) return;
                loadFromProject(p);
                openApp("architect", "Architect");
              }}
              className={[
                // Milestone 6 (Mechanical Surface Consistency) — square
                // corners (was rounded-lg/8px). Desktop.tsx's Recent
                // Projects renders this same "project row" role at
                // rounded-[5px] — two different radii for one role;
                // unified both to hard 0, matching every other
                // control-tier element this pass.
                "cattipu-cursor-hand group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                openable ? "hover:bg-bg" : "cursor-default",
              ].join(" ")}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center border-2"
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
