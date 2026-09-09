"use client";

import { useEffect } from "react";
import { useArchitectStore } from "@/store/useArchitectStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useUiSound } from "@/hooks/useUiSound";

/**
 * Build Playback 2.0 — pure orchestration, no visual output of its own.
 * CATTIPU's signature moment: watching software get constructed, not a
 * chat response. Engineered, not magical — every beat is a fixed,
 * mechanical timestamp, ~7.8s total (inside the brief's 5–8s window).
 *
 * Sequence: Planner discovers features -> a blueprint grid appears on the
 * canvas -> the first service fades in -> the API Gateway arrives -> the
 * rest of the graph + its connections draw -> Database grows (SQL types
 * itself) -> Roadmap fills in -> "System Ready." -> the project is
 * created (or, if this is an edit session reopened from a project, the
 * edit is simply re-synced) and control hands back to the user.
 */
export function BuildPlayback() {
  const status = useArchitectStore((s) => s.status);
  const data = useArchitectStore((s) => s.data);
  const linkedProjectId = useArchitectStore((s) => s.linkedProjectId);
  const setActiveTab = useArchitectStore((s) => s.setActiveTab);
  const setStatus = useArchitectStore((s) => s.setStatus);
  const setPlaybackStage = useArchitectStore((s) => s.setPlaybackStage);
  const setLinkedProject = useArchitectStore((s) => s.setLinkedProject);
  const addProjectFromArchitecture = useProjectStore((s) => s.addProjectFromArchitecture);
  const playSound = useUiSound();

  useEffect(() => {
    if (status !== "playing" || !data) return;

    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    // Planner is already active + discovering (set by generate()).
    at(1800, () => {
      setActiveTab("architecture");
      setPlaybackStage("blueprint");
    });
    at(2150, () => setPlaybackStage("first-service"));
    at(2500, () => setPlaybackStage("gateway"));
    at(2850, () => setPlaybackStage("connections")); // remaining nodes + edges + event pulses
    at(5000, () => {
      setActiveTab("database");
      setPlaybackStage("database"); // SQL types itself
    });
    at(6600, () => {
      setActiveTab("roadmap");
      setPlaybackStage("roadmap");
    });
    at(7100, () => setPlaybackStage("ready")); // "System Ready." banner
    at(7800, () => {
      if (linkedProjectId) {
        // reopened from Explorer/Projects — this is an edit session, not
        // a fresh build. The project record is already live-synced by
        // every store mutation; nothing new to create.
      } else {
        const project = addProjectFromArchitecture(data);
        setLinkedProject(project.id);
      }
      playSound("success");
      setActiveTab("architecture"); // rest on the hero view
      setPlaybackStage(null);
      setStatus("ready");
    });

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [
    status,
    data,
    linkedProjectId,
    setActiveTab,
    setStatus,
    setPlaybackStage,
    setLinkedProject,
    addProjectFromArchitecture,
    playSound,
  ]);

  return null;
}
