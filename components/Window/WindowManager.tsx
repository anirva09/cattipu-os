"use client";

import { useWindowStore } from "@/store/useWindowStore";
import { APP_MAP } from "@/lib/apps";
import { Window } from "./LegacyWindow";
import { ProjectsApp } from "./ProjectsApp";
import { PlaceholderApp } from "./PlaceholderApp";
// Milestone 17: the mock Explorer this file used was deleted with the
// static filesystem it displayed. This legacy manager is not mounted
// anywhere (CattipuShell drives the shell), so it is repointed at the
// real Explorer rather than deleted in an Explorer sprint.
import { ExplorerApp } from "@/components/Explorer";
import { SettingsApp } from "./SettingsApp";
import { AboutApp } from "./AboutApp";
import { ArchitectApp } from "../Architect/ArchitectApp";

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);

  return (
    <div className="pointer-events-none absolute inset-0">
      {windows
        .filter((w) => !w.minimized)
        .map((win) => (
          <Window key={win.id} win={win}>
            {win.appId === "home" || win.appId === "projects" ? (
              <ProjectsApp />
            ) : win.appId === "explorer" ? (
              <ExplorerApp />
            ) : win.appId === "settings" ? (
              <SettingsApp />
            ) : win.appId === "about" ? (
              <AboutApp />
            ) : win.appId === "architect" ? (
              <ArchitectApp />
            ) : (
              <PlaceholderApp app={APP_MAP[win.appId]} />
            )}
          </Window>
        ))}
    </div>
  );
}
