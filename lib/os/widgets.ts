/**
 * MVP-09 — the desktop widgets: the one descriptive owner of which widgets
 * exist and what they are called.
 *
 * Two owners, split the way wallpapers are (lib/os/wallpapers.ts):
 *
 *   WHICH widgets are closed or minimised → `useSettingsStore` (persisted)
 *   WHAT the widgets are, in stack order  → this list (static, pure data)
 *
 * The widget column, the desktop's Widgets menu and the settings store all
 * read this list; none keeps its own. Plain data, so stores and tests can
 * import it without pulling in a renderer.
 */

export const DESKTOP_WIDGETS = [
  { id: "welcome", title: "WELCOME", label: "Welcome" },
  { id: "recent", title: "RECENT PROJECTS", label: "Recent Projects" },
  { id: "architect", title: "ARCHITECT PREVIEW", label: "Architect Preview" },
  { id: "system", title: "SYSTEM STATUS", label: "System Status" },
  { id: "toolbox", title: "TOOLBOX", label: "Toolbox" },
] as const;

export type DesktopWidgetId = (typeof DESKTOP_WIDGETS)[number]["id"];

export const DESKTOP_WIDGET_IDS: readonly DesktopWidgetId[] = DESKTOP_WIDGETS.map((w) => w.id);

export function isDesktopWidgetId(value: unknown): value is DesktopWidgetId {
  return typeof value === "string" && (DESKTOP_WIDGET_IDS as readonly string[]).includes(value);
}

/**
 * A stored list of widget ids, cleaned: unknown ids (a widget a later build
 * removed, a hand-edited record) and duplicates are dropped, and the result
 * follows stack order. Anything that is not a list is an empty one.
 */
export function sanitizeWidgetIds(value: unknown): DesktopWidgetId[] {
  if (!Array.isArray(value)) return [];
  return DESKTOP_WIDGET_IDS.filter((id) => value.includes(id));
}

export function widgetLabel(id: DesktopWidgetId): string {
  return DESKTOP_WIDGETS.find((w) => w.id === id)?.label ?? id;
}
