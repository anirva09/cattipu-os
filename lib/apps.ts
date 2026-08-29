import type { AppId } from "@/store/useWindowStore";

export interface AppDef {
  id: AppId;
  label: string;
  icon: string; // filename in public/icons/
  shortcut?: string; // display hint, e.g. "A" for Cmd+A
  tagline: string; // used in placeholder windows / command palette
  /** Milestone 11 (Architect Retro Workstation Identity) — added, optional.
   * Milestone 12 (Constitutional Foundation Retrofit) — RENAMED from
   * `titlebarAccent` and narrowed in meaning: the shared application-
   * window rule now gives every window an oxblood title bar by default
   * (--color-app-titlebar in globals.css), so this field no longer
   * drives the title bar at all. What's left is Architect's own content-
   * level identity — when set, Window.tsx stamps `data-accent` on the
   * window frame, which re-points --color-navy (and the border tokens)
   * for that window's CONTENT subtree only — see the
   * [data-accent="oxblood"] rule in globals.css. Undefined for every app
   * but Architect: everyone else's content stays on chrome_navy, only
   * their title bar (like Architect's) is oxblood via the shared rule. */
  chromeAccent?: "oxblood";
}

export const APPS: AppDef[] = [
  { id: "home", label: "Home", icon: "home", tagline: "Your desktop, at a glance." },
  {
    id: "projects",
    label: "Projects",
    icon: "projects",
    shortcut: "P",
    tagline: "Everything you're building.",
  },
  {
    id: "architect",
    label: "Architect",
    icon: "architect",
    shortcut: "A",
    tagline: "AI system design — architecture, services, APIs, database.",
    chromeAccent: "oxblood",
  },
  {
    id: "canvas",
    label: "Canvas",
    icon: "canvas",
    shortcut: "C",
    tagline: "AI UI generator.",
  },
  {
    id: "forge",
    label: "Forge",
    icon: "forge",
    shortcut: "F",
    tagline: "AI coding workspace.",
  },
  {
    id: "launch",
    label: "Launch",
    icon: "launch",
    shortcut: "L",
    tagline: "Deployment workspace.",
  },
  {
    id: "memory",
    label: "Memory",
    icon: "memory",
    shortcut: "M",
    tagline: "Persistent AI knowledge about your project.",
  },
  {
    id: "explorer",
    label: "Explorer",
    icon: "explorer",
    shortcut: "E",
    tagline: "Browse everything on your OS.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    shortcut: ",",
    tagline: "Preferences for CATTIPU OS.",
  },
];

// Not a dock app — reachable from the desktop icon and the command
// palette only, so it doesn't crowd the rail.
export const ABOUT_APP: AppDef = {
  id: "about",
  label: "About CATTIPU OS",
  icon: "home",
  tagline: "Ideas become software.",
};

// Milestone 1 (Home Screen Refinement) — same pattern as ABOUT_APP above:
// a desktop-shortcut-only entry, not a dock app. Falls through to
// PlaceholderApp in WindowManager since there's no real template library
// yet — reusing the existing stub rather than inventing new functionality.
export const TEMPLATES_APP: AppDef = {
  id: "templates",
  label: "Templates",
  icon: "templates",
  tagline: "Starter blueprints for new projects.",
};

export const APP_MAP: Record<AppId, AppDef> = Object.fromEntries(
  [...APPS, ABOUT_APP, TEMPLATES_APP].map((a) => [a.id, a])
) as Record<AppId, AppDef>;
