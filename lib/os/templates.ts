import type {
  CattipuProject,
  ProjectIcon,
  ProjectType,
} from "@/lib/project/types";

/**
 * Milestone 19 (Project Templates) — what kind of thing is being built.
 *
 * A template does two things and deliberately not a third.
 *
 * It sets METADATA that nothing else can infer. Nothing in a project's
 * artifacts can tell a CLI tool from a Chrome extension, so `type` and
 * `icon` are genuine stored choices and a template is the moment they
 * are made.
 *
 * It declares a PLAN — the screens, services and environments this kind
 * of project is expected to grow. The plan is DERIVED from the template
 * id at read time, not written into the project's artifact slots, and
 * that distinction is the whole design:
 *
 *   Seeding `canvas.screens` with five named screens would make
 *   `projectProgress` (lib/os/projects.ts) report a project as partly
 *   built the instant it is created, with nothing built. M15 exists
 *   precisely so progress cannot lie about what has been done. A brand
 *   new project from a template is 0%, because it is.
 *
 * So the plan is what Canvas and Forge will read when they scaffold, and
 * until then it is a statement of intent that costs nothing and claims
 * nothing. That is what "this sprint prepares the foundation" means
 * here: the shape is decided, the work is not faked.
 */

export type ProjectTemplateId =
  | "web-app"
  | "mobile-app"
  | "api"
  | "ai-agent"
  | "saas"
  | "dashboard"
  | "chrome-extension"
  | "desktop-app"
  | "cli-tool"
  | "game";

/** What a template intends the project to grow. Names only — no ids, no
 *  timestamps, nothing that could be mistaken for a real artifact. */
export interface TemplatePlan {
  /** Canvas screens this kind of project normally has. */
  screens: readonly string[];
  /** Forge services / modules. */
  services: readonly string[];
  /** Launch environments. */
  environments: readonly string[];
}

export interface ProjectTemplate {
  id: ProjectTemplateId;
  label: string;
  /** One line, shown beside the name when choosing. */
  summary: string;
  type: ProjectType;
  icon: ProjectIcon;
  plan: TemplatePlan;
}

const STAGED = ["Development", "Staging", "Production"] as const;
const LOCAL_ONLY = ["Development", "Release"] as const;

/**
 * The ten templates, in the order the sprint lists them. The order is
 * kept rather than sorted alphabetically: it runs from the most common
 * thing someone builds to the least, and a menu that reorders itself
 * into alphabetical order buries "Web App" under "Chrome Extension".
 */
export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: "web-app",
    label: "Web App",
    summary: "Pages, routing and a backend",
    type: "Web",
    icon: "website",
    plan: {
      screens: ["Landing", "Sign In", "Home", "Settings"],
      services: ["Web Server", "Auth", "Database"],
      environments: STAGED,
    },
  },
  {
    id: "mobile-app",
    label: "Mobile App",
    summary: "Screens, navigation and a device build",
    type: "Web",
    icon: "generic",
    plan: {
      screens: ["Onboarding", "Home", "Detail", "Profile"],
      services: ["API Client", "Local Store", "Push"],
      environments: ["Development", "TestFlight", "Production"],
    },
  },
  {
    id: "api",
    label: "API",
    summary: "Endpoints, a data model and no interface",
    type: "API",
    icon: "generic",
    plan: {
      // An API has no screens. Listing one would be the template lying
      // about the shape of the thing.
      screens: [],
      services: ["Gateway", "Auth", "Database", "Jobs"],
      environments: STAGED,
    },
  },
  {
    id: "ai-agent",
    label: "AI Agent",
    summary: "Prompts, tools and a memory store",
    type: "AI",
    icon: "generic",
    plan: {
      screens: ["Chat"],
      services: ["Model Gateway", "Tool Runner", "Memory Store"],
      environments: STAGED,
    },
  },
  {
    id: "saas",
    label: "SaaS",
    summary: "Tenants, billing and an admin side",
    type: "Platform",
    icon: "saas",
    plan: {
      screens: ["Marketing", "Sign Up", "Dashboard", "Billing", "Admin"],
      services: ["Web Server", "Auth", "Billing", "Database", "Jobs"],
      environments: STAGED,
    },
  },
  {
    id: "dashboard",
    label: "Dashboard",
    summary: "Charts over data someone else owns",
    type: "Web",
    icon: "saas",
    plan: {
      screens: ["Overview", "Detail", "Filters"],
      services: ["Query Layer", "Cache"],
      environments: STAGED,
    },
  },
  {
    id: "chrome-extension",
    label: "Chrome Extension",
    summary: "A popup, a content script and a background worker",
    type: "Web",
    icon: "generic",
    plan: {
      screens: ["Popup", "Options"],
      services: ["Background Worker", "Content Script"],
      environments: LOCAL_ONLY,
    },
  },
  {
    id: "desktop-app",
    label: "Desktop App",
    summary: "Windows, local files and an installer",
    type: "Platform",
    icon: "generic",
    plan: {
      screens: ["Main Window", "Preferences"],
      services: ["Main Process", "Local Store", "Updater"],
      environments: LOCAL_ONLY,
    },
  },
  {
    id: "cli-tool",
    label: "CLI Tool",
    summary: "Commands, flags and output",
    type: "Library",
    icon: "generic",
    plan: {
      screens: [],
      services: ["Command Parser", "Core", "Output Formatter"],
      environments: LOCAL_ONLY,
    },
  },
  {
    id: "game",
    label: "Game",
    summary: "A loop, scenes and assets",
    type: "Platform",
    icon: "generic",
    plan: {
      screens: ["Title", "Play", "Pause", "Game Over"],
      services: ["Game Loop", "Renderer", "Save Data"],
      environments: LOCAL_ONLY,
    },
  },
] as const;

const BY_ID = new Map(PROJECT_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(
  id: ProjectTemplateId | null | undefined,
): ProjectTemplate | null {
  return id ? BY_ID.get(id) ?? null : null;
}

export function isTemplateId(value: unknown): value is ProjectTemplateId {
  return typeof value === "string" && BY_ID.has(value as ProjectTemplateId);
}

/** The plan for a project, or null if it was not made from a template.
 *  Derived, never stored — see the note at the top of this file. */
export function projectPlan(project: CattipuProject): TemplatePlan | null {
  return getTemplate(project.template)?.plan ?? null;
}

/** How many things the template intends the project to grow. Used by the
 *  details panel to say what a template committed to, without claiming
 *  any of it exists yet. */
export function planSize(plan: TemplatePlan): number {
  return plan.screens.length + plan.services.length + plan.environments.length;
}
