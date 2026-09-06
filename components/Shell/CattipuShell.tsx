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
    />
  );
}
