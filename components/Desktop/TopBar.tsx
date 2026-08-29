"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { PixelLogo } from "../Boot/PixelLogo";
import { useProjectStore } from "@/store/useProjectStore";
import { useWindowStore } from "@/store/useWindowStore";

/**
 * Milestone 1 (Home Screen Refinement) — "Keep only: CATTIPU OS, Current
 * Project, Search, Bell, Clock, Menu." Replaces the previous Sun/Volume
 * glyph pair with this exact 6-item set. Notes on interpretation (also in
 * MILESTONE1_REPORT.md):
 *  - "Current Project" isn't tracked anywhere in the app (no concept of an
 *    "active" project exists yet) — shown here as the most recently edited
 *    project from the existing store, which is the closest real data.
 *  - Search reuses the existing CommandPalette (⌘K) rather than building a
 *    second search surface — dispatches the same keyboard event its own
 *    listener already handles, so CommandPalette.tsx isn't touched.
 *  - Bell has no notification system behind it yet — left as a visual,
 *    non-interactive glyph rather than fabricating fake notifications.
 *  - Menu opens Settings, the closest existing "system menu" surface.
 *
 * Milestone 12 (Constitutional Foundation Retrofit) — the wordmark and
 * current-project text below now use the frozen `font-label` role
 * (compact bitmap UI) instead of reaching for `font-pixel-ui` directly;
 * same underlying face, same rendered result, just consuming the named
 * role per the constitution. Bell is still deliberately non-interactive —
 * a real notification primitive now exists (see
 * components/System/NotificationCenter.tsx) but wiring the top-bar bell
 * to it is out of this milestone's scope ("do not retrofit every feature
 * onto notifications").
 */
export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);
  const projects = useProjectStore((s) => s.projects);
  const openApp = useWindowStore((s) => s.openApp);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000 * 15);
    return () => window.clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";
  const date = now
    ? now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "";

  const currentProject = projects[0]?.name?.toUpperCase() ?? "NO ACTIVE PROJECT";

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  return (
    <div className="cattipu-raised-navy relative z-30 flex h-11 shrink-0 items-center justify-between bg-navy px-4 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <span className="cattipu-badge flex h-8 w-8 shrink-0 items-center justify-center">
          <PixelLogo mode="retro" variant="topbar" className="h-6 w-auto" />
        </span>
        <span className="cattipu-emboss-text-inverted font-label text-[0.6rem] tracking-[0.1em]">
          CATTIPU OS
        </span>
        <span className="cattipu-vgroove h-4" aria-hidden />
        <span
          className="cattipu-emboss-text-inverted min-w-0 truncate font-label text-[0.45rem] tracking-wide text-white/70"
          title={currentProject}
        >
          {currentProject}
        </span>
      </div>

      <div className="cattipu-recessed-navy flex shrink-0 items-center gap-3 px-2.5 py-1.5 text-[13px] text-white/85">
        <button
          onClick={openSearch}
          aria-label="Search (⌘K)"
          className="cattipu-cursor-hand cattipu-well-navy flex h-5 w-5 items-center justify-center"
        >
          <Search className="h-3 w-3 text-white/65" strokeWidth={2.5} />
        </button>
        <span className="cattipu-vgroove h-4" aria-hidden />
        <span
          aria-label="Notifications"
          className="cattipu-well-navy flex h-5 w-5 items-center justify-center"
        >
          <Bell className="h-3 w-3 text-white/65" strokeWidth={2.5} />
        </span>
        <span className="cattipu-vgroove h-4" aria-hidden />
        <span className="cattipu-emboss-text-inverted font-code tabular-nums">
          {date} {time}
        </span>
        <span className="cattipu-vgroove h-4" aria-hidden />
        <button
          onClick={() => openApp("settings", "Settings")}
          aria-label="Menu"
          className="cattipu-cursor-hand cattipu-well-navy flex h-5 w-5 items-center justify-center"
        >
          <Menu className="h-3 w-3 text-white/65" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
