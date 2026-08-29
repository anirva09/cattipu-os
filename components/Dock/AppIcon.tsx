/**
 * Milestone 13 (Native Icon Foundation) — AppIcon's real implementation
 * moved to components/Icons/AppIcon.tsx (the "one obvious place" future
 * apps import icons from). Re-exported here unchanged so every existing
 * import site (Dock.tsx, DesktopShortcutCard.tsx, Window.tsx,
 * PlaceholderApp.tsx, FileExplorerApp.tsx, CommandPalette.tsx) keeps
 * working with no changes — this file's only job now is that redirect.
 */
export { AppIcon } from "@/components/Icons/AppIcon";
