"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { DividerGroove } from "../DividerGroove/DividerGroove";
import { FolderTree, type FolderTreeNode } from "../FolderTree/FolderTree";
import { ShellIcon } from "../PixelIcon";
import type { ShellIconName } from "../PixelIcon";
import {
  canMoveInto,
  descendantIds,
  explorerEntries,
  folderChildren,
  folderPath,
  resolveLocation,
  searchEverything,
  type ExplorerEntry,
  type OsObject,
} from "@/lib/os/filesystem";
import { orderProjects } from "@/lib/os/projects";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./ExplorerApp.css";

/**
 * Milestone 17 (Real File Explorer).
 *
 * Explorer is now a VIEW of the OS state, not a window with a filesystem
 * of its own. It holds exactly three pieces of local state — where you
 * are standing, what you have typed in the search box, and which folders
 * are open in the tree — and every one of those is a property of this
 * window, not of the OS. Everything a person can see or change lives in
 * useFilesystemStore and useProjectStore.
 *
 * That is what makes "the grid must automatically refresh whenever the OS
 * state changes" true without a refresh mechanism: there is nothing
 * cached to invalidate. A folder created on the desktop is in the next
 * render because the next render reads the same array the desktop wrote
 * to.
 *
 * The static "Apps / Assets / Templates / Downloads" filesystem the old
 * Explorer displayed is gone. It was a mock, and a mock filesystem in the
 * window whose job is to browse the real one is worse than an empty one:
 * it teaches people paths that do not exist.
 */

export const CATTIPU_EXPLORER_REFERENCE = {
  toolbarHeight: 34,
  treeWidth: 248,
  dividerSize: 16,
  searchWidth: 208,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
  rootLabel: "CATTIPU OS",
} as const;

type ExplorerStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

interface MenuState {
  x: number;
  y: number;
  entry: ExplorerEntry | null;
}

function iconFor(kind: ExplorerEntry["kind"]): ShellIconName {
  // Three kinds, three silhouettes. `openfile` is the folder mark with an
  // arrow leaving it, which is what a shortcut is: a second way to reach
  // something that lives somewhere else. Reusing the project mark for
  // both would put two identically drawn, identically labelled entries
  // side by side in the root listing.
  if (kind === "folder") return "folder";
  if (kind === "project-shortcut") return "openfile";
  return "projects";
}

export interface ExplorerAppProps {
  /** Raises (and if needed launches) another shell window. Explorer opens
   *  projects through the OS rather than rendering its own copy of one. */
  onOpenWindow?: (id: "projects" | "architect") => void;
}

export function ExplorerApp({ onOpenWindow }: ExplorerAppProps) {
  const objects = useFilesystemStore((s) => s.objects);
  const createFolder = useFilesystemStore((s) => s.createFolder);
  const renameObject = useFilesystemStore((s) => s.renameObject);
  const removeObject = useFilesystemStore((s) => s.removeObject);
  const moveIntoFolder = useFilesystemStore((s) => s.moveIntoFolder);

  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const removeProject = useProjectStore((s) => s.removeProject);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // A folder deleted in another window (or on the desktop) must not leave
  // this one pointing at nothing. Resolving every render means the
  // fallback is structural rather than an effect that has to fire.
  const location = resolveLocation(objects, locationId);
  useEffect(() => {
    if (location !== locationId) setLocationId(location);
  }, [location, locationId]);

  const ordered = useMemo(() => orderProjects(projects), [projects]);
  const searching = query.trim().length > 0;

  const entries = useMemo(
    () =>
      searching
        ? searchEverything(objects, projects, query, ordered)
        : explorerEntries(objects, projects, location, ordered),
    [objects, projects, query, searching, location, ordered],
  );

  const trail = useMemo(() => folderPath(objects, location), [objects, location]);

  // ── tree ──────────────────────────────────────────────────────────────

  /** Ancestors of where you are standing are always open, so navigating
   *  by any route — grid, breadcrumb, desktop — leaves the tree showing
   *  the same place. Expansion the user set is kept on top of that. */
  const openIds = useMemo(() => {
    const set = new Set(expanded);
    for (const folder of trail) set.add(folder.id);
    return set;
  }, [expanded, trail]);

  const buildNodes = useCallback(
    (parentId: string | null): FolderTreeNode[] =>
      folderChildren(objects, parentId).map((folder) => {
        const children = buildNodes(folder.id);
        return {
          id: folder.id,
          label: folder.label,
          kind: "folder" as const,
          expanded: openIds.has(folder.id),
          children: children.length ? children : undefined,
        };
      }),
    [objects, openIds],
  );

  const treeNodes = useMemo<FolderTreeNode[]>(
    () => [
      {
        id: "__root__",
        label: CATTIPU_EXPLORER_REFERENCE.rootLabel,
        kind: "folder",
        expanded: true,
        children: buildNodes(null),
      },
    ],
    [buildNodes],
  );

  /**
   * One gesture, because the frozen FolderTreeItem has no disclosure
   * control and adding one would change the Projects window, which is
   * Golden Master. Clicking a folder navigates to it and opens it;
   * clicking the folder you are already in collapses it. Expand and
   * collapse are both reachable, and no frozen component was edited to
   * get there.
   */
  const handleTreeSelect = (id: string) => {
    setQuery("");
    if (id === "__root__") {
      setLocationId(null);
      return;
    }
    if (id === location) {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setLocationId(id);
    setExpanded((prev) => new Set(prev).add(id));
  };

  // ── opening ───────────────────────────────────────────────────────────

  const open = useCallback(
    (entry: ExplorerEntry) => {
      if (entry.kind === "folder") {
        setQuery("");
        setLocationId(entry.id);
        setExpanded((prev) => new Set(prev).add(entry.id));
        return;
      }
      // The SAME project the rest of the OS tracks. Explorer holds no
      // project records of its own, so there is nothing here that could
      // become a duplicate.
      if (entry.projectId) openProject(entry.projectId);
      onOpenWindow?.("projects");
    },
    [onOpenWindow, openProject],
  );

  // ── renaming ──────────────────────────────────────────────────────────

  const commitRename = (entry: ExplorerEntry, value: string) => {
    const next = value.trim();
    setRenamingId(null);
    if (!next) return;
    // A shortcut has no name of its own — renaming one renames the
    // project it points at, which is the same edit the desktop makes.
    if (entry.kind === "folder" && entry.objectId) renameObject(entry.objectId, next);
    else if (entry.projectId) renameProject(entry.projectId, next);
  };

  // ── menus ─────────────────────────────────────────────────────────────

  const openMenu = (event: ReactMouseEvent, entry: ExplorerEntry | null) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(entry?.id ?? null);
    setMenu({ x: event.clientX, y: event.clientY, entry });
  };

  /** Every folder this object may legally move into, root included. */
  const moveTargets = useCallback(
    (objectId: string): ContextMenuItem[] => {
      const blocked = new Set([objectId, ...descendantIds(objects, objectId)]);
      const folders = objects.filter(
        (o): o is OsObject => o.kind === "folder" && !blocked.has(o.id),
      );
      const targets: Array<{ id: string | null; label: string }> = [
        { id: null, label: CATTIPU_EXPLORER_REFERENCE.rootLabel },
        ...folders.map((f) => ({ id: f.id as string | null, label: f.label })),
      ];
      const usable = targets.filter((t) => canMoveInto(objects, objectId, t.id));
      return usable.map((t) => ({
        id: t.id ?? "__root__",
        label: t.label,
        icon: "folder" as ShellIconName,
        onSelect: () => moveIntoFolder(objectId, t.id),
      }));
    },
    [moveIntoFolder, objects],
  );

  const backgroundItems = (): ContextMenuItem[] => [
    {
      id: "new-folder",
      label: "New Folder",
      icon: "folder",
      // Created in the folder you are standing in. At the root that means
      // it lands on the desktop too, because the root IS the desktop.
      onSelect: () => createFolder(location),
    },
    { kind: "separator", id: "sep-1" },
    { id: "paste", label: "Paste", disabled: true, hint: "EMPTY" },
    {
      id: "refresh",
      label: "Refresh",
      icon: "recent",
      // The listing is derived from state on every render, so there is
      // nothing to reload. Clearing the selection and the search is what
      // a person actually gets here, and claiming a reload would be
      // theatre.
      onSelect: () => {
        setSelectedId(null);
        setQuery("");
      },
    },
  ];

  const entryItems = (entry: ExplorerEntry): ContextMenuItem[] => {
    const openItem: ContextMenuItem = {
      id: "open",
      label: "Open",
      icon: "openfile",
      onSelect: () => open(entry),
    };
    const renameItem: ContextMenuItem = {
      id: "rename",
      label: "Rename",
      onSelect: () => setRenamingId(entry.id),
    };

    if (entry.kind === "folder" && entry.objectId) {
      const targets = moveTargets(entry.objectId);
      return [
        openItem,
        { kind: "separator", id: "sep-1" },
        renameItem,
        {
          id: "move",
          label: "Move to",
          icon: "folder",
          disabled: targets.length === 0,
          children: targets,
        },
        {
          id: "delete",
          label: "Delete",
          // Said out loud, because it is the one action here that can
          // remove something the person cannot see from this row.
          hint: descendantIds(objects, entry.objectId).length
            ? "AND CONTENTS"
            : undefined,
          onSelect: () => removeObject(entry.objectId as string),
        },
      ];
    }

    if (entry.kind === "project-shortcut" && entry.objectId) {
      const targets = moveTargets(entry.objectId);
      return [
        openItem,
        { kind: "separator", id: "sep-1" },
        renameItem,
        {
          id: "move",
          label: "Move to",
          icon: "folder",
          disabled: targets.length === 0,
          children: targets,
        },
        {
          id: "remove",
          label: "Remove Shortcut",
          hint: "KEEPS PROJECT",
          onSelect: () => removeObject(entry.objectId as string),
        },
      ];
    }

    return [
      openItem,
      { kind: "separator", id: "sep-1" },
      renameItem,
      {
        id: "duplicate",
        label: "Duplicate",
        icon: "newproject",
        onSelect: () => {
          if (entry.projectId) duplicateProject(entry.projectId);
        },
      },
      {
        id: "delete",
        label: "Delete",
        onSelect: () => {
          if (entry.projectId) removeProject(entry.projectId);
        },
      },
    ];
  };

  // ── render ────────────────────────────────────────────────────────────

  const style: ExplorerStyle = {
    ...cattipuCssVariables,
    "--cattipu-explorer-toolbar-height": `${CATTIPU_EXPLORER_REFERENCE.toolbarHeight}px`,
    "--cattipu-explorer-tree-width": `${CATTIPU_EXPLORER_REFERENCE.treeWidth}px`,
    "--cattipu-explorer-divider": `${CATTIPU_EXPLORER_REFERENCE.dividerSize}px`,
    "--cattipu-explorer-search-width": `${CATTIPU_EXPLORER_REFERENCE.searchWidth}px`,
    "--cattipu-explorer-pad": `${CATTIPU_EXPLORER_REFERENCE.padding}px`,
    "--cattipu-explorer-gap": `${CATTIPU_EXPLORER_REFERENCE.gap}px`,
    "--cattipu-menu-highlight": cattipuTokens.colors.navy,
  };

  const crumbs = [
    { id: null as string | null, label: CATTIPU_EXPLORER_REFERENCE.rootLabel },
    ...trail.map((f) => ({ id: f.id as string | null, label: f.label })),
  ];

  return (
    <div className="cattipu-explorer" style={style} data-testid="explorer">
      <div className="cattipu-explorer__toolbar">
        <button
          type="button"
          className="cattipu-explorer__up cattipu-bevel--raised cattipu-bevel--pressable"
          aria-label="Up one folder"
          data-testid="explorer-up"
          disabled={searching || location === null}
          onClick={() => setLocationId(trail[trail.length - 2]?.id ?? null)}
        >
          <span className="cattipu-explorer__up-arrow" aria-hidden="true" />
        </button>

        <nav
          className="cattipu-explorer__crumbs"
          aria-label="Location"
          data-testid="explorer-crumbs"
        >
          {searching ? (
            <span
              className="cattipu-explorer__crumb"
              data-current="true"
              data-testid="explorer-crumb"
            >
              {`Search: "${query.trim()}"`}
            </span>
          ) : (
            crumbs.map((crumb, index) => (
              <span key={crumb.id ?? "__root__"} style={{ display: "contents" }}>
                {index > 0 && (
                  <span className="cattipu-explorer__crumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  type="button"
                  className="cattipu-explorer__crumb"
                  data-testid="explorer-crumb"
                  data-current={index === crumbs.length - 1 ? "true" : undefined}
                  onClick={() => setLocationId(crumb.id)}
                >
                  {crumb.label}
                </button>
              </span>
            ))
          )}
        </nav>

        <div className="cattipu-explorer__search cattipu-bevel--inset">
          <ShellIcon name="search" size={16} />
          <input
            className="cattipu-explorer__search-field"
            data-testid="explorer-search"
            type="text"
            placeholder="Search"
            aria-label="Search this OS"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
          />
          {query && (
            <button
              type="button"
              className="cattipu-explorer__search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="cattipu-explorer__body">
        <div className="cattipu-explorer__tree">
          <FolderTree
            nodes={treeNodes}
            selectedId={searching ? undefined : location ?? "__root__"}
            onSelect={handleTreeSelect}
            aria-label="Folders"
          />
        </div>

        <DividerGroove orientation="vertical" />

        <div
          className="cattipu-explorer__grid"
          data-testid="explorer-grid"
          onPointerDown={() => {
            setSelectedId(null);
            setRenamingId(null);
          }}
          onContextMenu={(event) => openMenu(event, null)}
        >
          {searching && (
            <p className="cattipu-explorer__found" data-testid="explorer-found">
              {entries.length} {entries.length === 1 ? "MATCH" : "MATCHES"}
            </p>
          )}

          {entries.length === 0 ? (
            <p className="cattipu-explorer__empty">
              {searching ? "Nothing matches that." : "This folder is empty."}
            </p>
          ) : (
            <ul className="cattipu-explorer__items">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div
                    className="cattipu-explorer__item"
                    data-testid="explorer-item"
                    data-entry-id={entry.id}
                    data-entry-kind={entry.kind}
                    data-selected={selectedId === entry.id ? "true" : undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={entry.label}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedId(entry.id);
                    }}
                    onDoubleClick={() => open(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") open(entry);
                      if (event.key === "F2") setRenamingId(entry.id);
                    }}
                    onContextMenu={(event) => openMenu(event, entry)}
                  >
                    <span className="cattipu-explorer__item-plate">
                      <ShellIcon name={iconFor(entry.kind)} size={32} />
                    </span>

                    {renamingId === entry.id ? (
                      <input
                        className="cattipu-explorer__rename"
                        defaultValue={entry.label}
                        autoFocus
                        onFocus={(event) => event.currentTarget.select()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onBlur={(event) => commitRename(entry, event.currentTarget.value)}
                        onKeyDown={(event) => {
                          // The row this input sits inside also listens for
                          // Enter, and opens the item. Without stopping the
                          // event here, committing a rename immediately
                          // navigates into the folder you just renamed.
                          event.stopPropagation();
                          if (event.key === "Enter") {
                            commitRename(entry, event.currentTarget.value);
                          }
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                      />
                    ) : (
                      <span
                        className="cattipu-explorer__item-label"
                        title={entry.label}
                      >
                        {entry.label}
                      </span>
                    )}

                    {entry.location && (
                      <span
                        className="cattipu-explorer__item-where"
                        title={entry.location}
                      >
                        {entry.location}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.entry ? menu.entry.label : CATTIPU_EXPLORER_REFERENCE.rootLabel}
          items={menu.entry ? entryItems(menu.entry) : backgroundItems()}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
