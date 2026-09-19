import type { ShellIconName } from "../PixelIcon";

/**
 * The one presentation table for shell menu commands.
 *
 * The desktop and Explorer build their menus separately, because what a
 * command DOES depends on where it was invoked. What a command LOOKS like
 * must not: the same label, capitalisation, PixelForge mark and hint,
 * whichever surface opened the menu. Both menu builders spread these
 * entries instead of restating them, so a rename or an icon change happens
 * in one place.
 *
 * Not a command system. There are no handlers here. Commands stay owned by
 * the surfaces that run them until the M22.5 Command Center exists.
 *
 * Icons only where the command IS an object the family has a mark for.
 * Verbs with no object (Rename, Delete, Paste, Refresh, window
 * arrangement) stay text-only rather than borrowing an unrelated mark.
 */
export interface MenuCommandPresentation {
  label: string;
  icon?: ShellIconName;
  hint?: string;
}

export const MENU_COMMANDS = {
  open: { label: "Open", icon: "folderopen" },
  newFolder: { label: "New Folder", icon: "folder" },
  newProject: { label: "New Project", icon: "newproject" },
  newProjectShortcut: { label: "New Project Shortcut", icon: "projects" },
  paste: { label: "Paste", hint: "EMPTY" },
  refresh: { label: "Refresh" },
  rename: { label: "Rename" },
  moveTo: { label: "Move To", icon: "folder" },
  delete: { label: "Delete" },
  removeShortcut: { label: "Remove Shortcut", hint: "KEEPS PROJECT" },
  duplicate: { label: "Duplicate" },
  window: { label: "Window" },
  cascade: { label: "Cascade" },
  tile: { label: "Tile" },
  restoreAll: { label: "Restore All", hint: "SIZE + PLACE + ORDER" },
  changeWallpaper: { label: "Change Wallpaper", icon: "wallpaper" },
} as const satisfies Record<string, MenuCommandPresentation>;

export type MenuCommandId = keyof typeof MENU_COMMANDS;

/** Marks for the objects menus list by name (a folder, a project). */
export const MENU_OBJECT_ICONS = {
  folder: "folder",
  project: "projects",
} as const satisfies Record<string, ShellIconName>;
