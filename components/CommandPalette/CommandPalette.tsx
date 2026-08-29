"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Server, Database, Radio, Network, Milestone, Download } from "lucide-react";
import { APPS, ABOUT_APP } from "@/lib/apps";
import { useWindowStore } from "@/store/useWindowStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useArchitectStore } from "@/store/useArchitectStore";
import { AppIcon } from "../Dock/AppIcon";

interface Command {
  id: string;
  label: string;
  group: "suggestions" | "recent" | "architect";
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openApp = useWindowStore((s) => s.openApp);
  const projects = useProjectStore((s) => s.projects);
  const architectData = useArchitectStore((s) => s.data);
  const addNode = useArchitectStore((s) => s.addNode);
  const setArchitectTab = useArchitectStore((s) => s.setActiveTab);
  const setExportPanelOpen = useArchitectStore((s) => s.setExportPanelOpen);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const suggestions: Command[] = [
      {
        id: "new-project",
        label: "New Project",
        group: "suggestions",
        shortcut: "⌘N",
        icon: <Plus className="h-4 w-4 text-navy" strokeWidth={2.5} />,
        run: () => openApp("projects", "Projects"),
      },
      ...APPS.filter((a) => a.id !== "home").map((a) => ({
        id: `open-${a.id}`,
        label: `Open ${a.label}`,
        group: "suggestions" as const,
        shortcut: a.shortcut ? `⌘${a.shortcut}` : undefined,
        icon: <AppIcon icon={a.icon} className="h-4 w-auto" />,
        run: () => openApp(a.id, a.label),
      })),
      {
        id: "open-about",
        label: ABOUT_APP.label,
        group: "suggestions" as const,
        icon: <AppIcon icon="home" className="h-4 w-auto" />,
        run: () => openApp("about", ABOUT_APP.label),
      },
    ];

    const recent: Command[] = projects.slice(0, 5).map((p, i) => ({
      id: `recent-${p.id}`,
      label: p.name,
      group: "recent" as const,
      shortcut: `⌘${i + 1}`,
      icon: <AppIcon icon="projects" className="h-4 w-auto" />,
      run: () => openApp("projects", "Projects"),
    }));

    // Architect commands only make sense once there's an active workspace
    // to act on — reuses this same palette, per the brief, rather than a
    // second command surface living inside the Architect window.
    const architect: Command[] = architectData
      ? [
          {
            id: "architect-new-service",
            label: "New Service",
            group: "architect" as const,
            icon: <Server className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              addNode("service");
            },
          },
          {
            id: "architect-add-database",
            label: "Add Database",
            group: "architect" as const,
            icon: <Database className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              addNode("datastore");
            },
          },
          {
            id: "architect-add-queue",
            label: "Add Queue",
            group: "architect" as const,
            icon: <Radio className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              addNode("queue");
            },
          },
          {
            id: "architect-generate-apis",
            label: "Generate APIs",
            group: "architect" as const,
            icon: <Network className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              setArchitectTab("apis");
            },
          },
          {
            id: "architect-generate-roadmap",
            label: "Generate Roadmap",
            group: "architect" as const,
            icon: <Milestone className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              setArchitectTab("roadmap");
            },
          },
          {
            id: "architect-export",
            label: "Export Project",
            group: "architect" as const,
            icon: <Download className="h-4 w-4 text-navy" strokeWidth={2.5} />,
            run: () => {
              openApp("architect", "Architect");
              setExportPanelOpen(true);
            },
          },
        ]
      : [];

    return [...suggestions, ...architect, ...recent];
  }, [openApp, projects, architectData, addNode, setArchitectTab, setExportPanelOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const execute = (cmd: Command | undefined) => {
    if (!cmd) return;
    cmd.run();
    close();
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(filtered[activeIndex]);
    }
  };

  const suggestions = filtered.filter((c) => c.group === "suggestions");
  const architect = filtered.filter((c) => c.group === "architect");
  const recent = filtered.filter((c) => c.group === "recent");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            // Milestone 6 (Mechanical Surface Consistency) — this was the
            // one surface in the whole shell built entirely outside the
            // molded-plastic system: a plain Tailwind rounded-xl card with
            // a 1px ad hoc border, the lighter --color-surface background
            // instead of the --color-surface-solid every other raised
            // panel uses, and a 60px-blur floating drop shadow — precisely
            // the "modern card shadow... glass effect" this pass removes
            // everywhere else. Swapped for the same cattipu-raised bevel
            // and hard 4px chamfer every window/panel already uses, and
            // the shared molded-panel background. Size, position, motion,
            // and every child element are unchanged.
            className="cattipu-raised cattipu-chamfer flex w-[min(92vw,32rem)] flex-col overflow-hidden bg-surface-solid"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-ink-dim" strokeWidth={2} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="shrink-0 rounded border border-border-strong px-1.5 py-0.5 text-[10px] font-medium text-ink-dim">
                ⌘K
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {suggestions.length > 0 && (
                <CommandGroup
                  title="Suggestions"
                  items={suggestions}
                  allItems={filtered}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  execute={execute}
                />
              )}
              {architect.length > 0 && (
                <CommandGroup
                  title="Architect"
                  items={architect}
                  allItems={filtered}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  execute={execute}
                />
              )}
              {recent.length > 0 && (
                <CommandGroup
                  title="Recent"
                  items={recent}
                  allItems={filtered}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  execute={execute}
                />
              )}
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-ink-dim">
                  No matching commands.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CommandGroup({
  title,
  items,
  allItems,
  activeIndex,
  setActiveIndex,
  execute,
}: {
  title: string;
  items: Command[];
  allItems: Command[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  execute: (cmd: Command) => void;
}) {
  return (
    <div className="px-2 py-1.5">
      {/* Milestone 12 (Constitutional Foundation Retrofit) — group headers
          are literally command-menu chrome, so this now names the `font-menu`
          role explicitly rather than relying on the ambient body-font
          default to happen to look right. */}
      <p className="font-menu px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </p>
      {items.map((cmd) => {
        const globalIndex = allItems.indexOf(cmd);
        const active = globalIndex === activeIndex;
        return (
          <button
            key={cmd.id}
            onMouseEnter={() => setActiveIndex(globalIndex)}
            onClick={() => execute(cmd)}
            className={[
              "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
              active ? "bg-navy/10" : "hover:bg-navy/[0.05]",
            ].join(" ")}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {cmd.icon}
            </span>
            <span className="flex-1 truncate text-sm text-ink">{cmd.label}</span>
            {cmd.shortcut && (
              <kbd className="shrink-0 text-[11px] font-medium text-ink-faint">
                {cmd.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
