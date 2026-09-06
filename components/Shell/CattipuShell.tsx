"use client";

import { useEffect, useMemo, useState } from "react";

import { InteractiveDesktop } from "@/components/InteractiveDesktop";
import type { CattipuShellWindowId } from "@/components/InteractiveDesktop";
import { ArchitectApp } from "@/components/Architect/ArchitectApp";
import { FileExplorerApp } from "@/components/Window/FileExplorerApp";
import { SettingsApp } from "@/components/Window/SettingsApp";
import { PlaceholderApp } from "@/components/Window/PlaceholderApp";
import { APP_MAP } from "@/lib/apps";
import type { CattipuSidebarIcons } from "@/components/Sidebar/Sidebar";
import { CATTIPU_SIDEBAR_ITEMS } from "@/components/Sidebar/Sidebar";
import { ShellIcon } from "@/components/PixelIcon";
import type { ShellIconName } from "@/components/PixelIcon";
import { PixelLogo } from "@/components/Boot/PixelLogo";
import { ProjectsWindow } from "@/components/ProjectsWindow/ProjectsWindow";
import { useProjectStore } from "@/store/useProjectStore";
import {
  orderProjects,
  toProjectDetails,
  toProjectTree,
  toWindowProject,
} from "@/lib/os/projects";

/**
 * The seam between this repository and the frozen v0.9 package.
 *
 * `InteractiveDesktop` is a locked visual component: it asks for a brand
 * mark, a sidebar icon per item, and a preformatted date string, and it
 * owns everything below that. Everything repo-specific — which icon set
 * feeds the rail, how the clock is formatted — lives here instead of in
 * the package, so the package stays byte-identical to what was signed off
 * and this file is the only place integration decisions are recorded.
 */

/** The nine rail items the package's Sidebar declares. Every one resolves to
 *  a frozen PixelForge mark — Sheet 01 covers eight of them and `launch`
 *  comes from the same family. The rail draws nothing of its own. */

function useDateTimeText(): string {
  // Rendered empty on the server and filled on the client. A date formatted
  // during SSR is a guaranteed hydration mismatch — the server's clock and
  // timezone are not the viewer's — and the top bar would flash the wrong
  // time before correcting itself.
  const [text, setText] = useState("");

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

    setText(format());
    const id = window.setInterval(() => setText(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return text;
}

/**
 * The existing apps, re-hosted inside the package's window chrome.
 *
 * Each one is the same component the legacy shell rendered — none of the
 * feature code changed, only the frame around it. `projects` is absent
 * deliberately: the package's own ProjectsWindow is the signed-off design
 * for that window and already reads the same project set.
 *
 * `memory` has no dedicated app in this repository; the legacy shell fell
 * through to PlaceholderApp for it and so does this, rather than inventing
 * a Memory feature during an integration sprint.
 */
const WINDOW_CONTENT: Partial<Record<CattipuShellWindowId, React.ReactNode>> = {
  architect: <ArchitectApp />,
  explorer: <FileExplorerApp />,
  settings: <SettingsApp />,
  memory: <PlaceholderApp app={APP_MAP.memory} />,
};

/**
 * Milestone 15 — the Projects window, reading the OS state layer.
 *
 * The window itself is a frozen visual component and is not edited: it
 * already accepts `treeNodes`, `projects`, `details` and a selection
 * callback, with hardcoded constants as defaults. Passing real values is
 * the whole integration. Nothing here formats or computes anything —
 * every displayed value comes from lib/os/projects.ts, which is also what
 * Explorer, Recent and the desktop will read, so one rename or one build
 * moves all of them at once.
 */
function LiveProjectsWindow({ onMinimize, onMaximize, onClose }: {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordered = useMemo(() => orderProjects(projects), [projects]);
  const selected =
    ordered.find((p) => p.id === selectedId) ?? ordered[0] ?? null;

  const treeNodes = useMemo(() => toProjectTree(projects), [projects]);
  const cards = useMemo(() => ordered.map((p) => toWindowProject(p)), [ordered]);
  const details = useMemo(
    () => (selected ? toProjectDetails(selected) : undefined),
    [selected],
  );

  const handleTreeSelect = (id: string) => {
    setSelectedId(id);
    // Selecting a project in the tree IS opening it, as far as "Last
    // Opened" is concerned - that is the moment a person looked at it.
    if (projects.some((p) => p.id === id)) openProject(id);
  };

  return (
    <ProjectsWindow
      treeNodes={treeNodes}
      projects={cards}
      details={details}
      selectedTreeId={selected?.id}
      onTreeSelect={handleTreeSelect}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      onClose={onClose}
    />
  );
}

export function CattipuShell() {
  const dateTimeText = useDateTimeText();

  const sidebarIcons = useMemo<CattipuSidebarIcons>(() => {
    const entries = CATTIPU_SIDEBAR_ITEMS.map(({ id, label }) => [
      id,
      <ShellIcon key={id} name={id as ShellIconName} title={label} />,
    ]);
    return Object.fromEntries(entries) as CattipuSidebarIcons;
  }, []);

  return (
    <InteractiveDesktop
      brandMark={<PixelLogo variant="topbar" className="h-9 w-9" />}
      sidebarIcons={sidebarIcons}
      dateTimeText={dateTimeText}
      windowContent={WINDOW_CONTENT}
      renderProjectsWindow={(controls) => <LiveProjectsWindow {...controls} />}
    />
  );
}
