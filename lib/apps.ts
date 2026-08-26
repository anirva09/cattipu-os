import type { AppId } from "@/store/useWindowStore";

export interface AppDef {
  id: AppId;
  label: string;
  icon: string; // filename in public/icons/
  shortcut?: string; // display hint, e.g. "A" for Cmd+A
  tagline: string; // used in placeholder windows / command palette
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
    id: "settings",
    label: "Settings",
    icon: "settings",
    shortcut: ",",
    tagline: "Preferences for CATTIPU OS.",
  },
  {
    id: "explorer",
    label: "Explorer",
    icon: "explorer",
    shortcut: "E",
    tagline: "Browse everything on your OS.",
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

export const APP_MAP: Record<AppId, AppDef> = Object.fromEntries(
  [...APPS, ABOUT_APP].map((a) => [a.id, a])
) as Record<AppId, AppDef>;
