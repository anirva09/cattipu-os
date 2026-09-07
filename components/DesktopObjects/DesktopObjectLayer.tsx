"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cattipuTokens } from "../../design-system/tokens";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { ShellIcon } from "../PixelIcon";
import type { ShellIconName } from "../PixelIcon";
import {
  DESKTOP_GRID,
  cellToPixels,
  desktopObjects,
  objectLabel,
  pixelsToCell,
  projectsWithoutShortcut,
  sameCell,
  type GridCell,
  type OsObject,
} from "@/lib/os/desktop";
import { orderProjects } from "@/lib/os/projects";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useProjectStore } from "@/store/useProjectStore";

import "./DesktopObjectLayer.css";

/**
 * Milestone 16 (Living Desktop) — desktop objects, rendered.
 *
 * Everything here is presentation and pointer handling. Where an object may
 * sit, what happens when one is dropped on another, what a shortcut is
 * called and which shortcuts are still offerable all live in
 * lib/os/desktop.ts, which is why those are the parts with tests and this
 * file has none: there is nothing in it to assert that a screenshot would
 * not say better.
 *
 * The layer reads the two stores directly rather than taking objects as
 * props. It is a repository component, not part of the frozen package, and
 * threading six callbacks through InteractiveDesktop to reach it would put
 * desktop-object knowledge inside a component that must stay generic.
 */

/** How far the pointer must travel before a press becomes a drag. Below
 *  this, a click that wobbles two pixels would move the icon and the
 *  selection would feel like it was fighting back. */
const DRAG_THRESHOLD = 4;

/** The icon's footprint inside its 88x96 cell, leaving a 4px gutter so two
 *  adjacent labels never touch. Height is fixed rather than content-sized:
 *  a two-line label must not make one icon taller than its neighbours. */
const OBJECT_WIDTH = 84;
const OBJECT_HEIGHT = 90;

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  active: boolean;
}

interface MenuState {
  x: number;
  y: number;
  targetId: string | null;
}

export interface DesktopObjectLayerProps {
  /** Raises (and if needed launches) one of the shell's windows. Owned by
   *  the window manager inside InteractiveDesktop, so it arrives as a
   *  callback rather than being reached for here. */
  onOpenWindow: (id: "projects" | "explorer") => void;
}

function iconFor(object: OsObject): ShellIconName {
  // Milestone 17 moved shortcuts from the `projects` mark to `openfile` —
  // the folder mark with an arrow leaving it, which is what a shortcut is.
  // Explorer lists projects AND shortcuts in the same grid, so they need
  // separate silhouettes there; one object type with two different marks
  // depending on which window you are looking at would be worse than
  // either choice. The empty desktop, which is what the Golden Master
  // locks, is unaffected.
  return object.kind === "folder" ? "folder" : "openfile";
}

export function DesktopObjectLayer({ onOpenWindow }: DesktopObjectLayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const objects = useFilesystemStore((s) => s.objects);
  const createFolder = useFilesystemStore((s) => s.createFolder);
  const createProjectShortcut = useFilesystemStore((s) => s.createProjectShortcut);
  const renameObject = useFilesystemStore((s) => s.renameObject);
  const removeObject = useFilesystemStore((s) => s.removeObject);
  const moveTo = useFilesystemStore((s) => s.moveTo);

  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const renameProject = useProjectStore((s) => s.renameProject);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // The desktop draws the objects at the OS ROOT. Anything inside a
  // folder lives in Explorer and nowhere else - that is the whole of
  // "appears on the desktop if it belongs there", and it is one filter
  // over the same array Explorer reads, not a synchronised copy.
  const shown = useMemo(
    () => desktopObjects(objects, projects),
    [objects, projects],
  );

  const bounds = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    return {
      width: rect?.width ?? DESKTOP_GRID.cellWidth,
      height: rect?.height ?? DESKTOP_GRID.cellHeight,
    };
  };

  /** Where a dragged object would land if released now. */
  const dropCell = useCallback(
    (object: OsObject, state: DragState): GridCell => {
      const base = cellToPixels(object.position);
      return pixelsToCell(base.x + state.dx, base.y + state.dy, bounds());
    },
    [],
  );

  // ── pointer ───────────────────────────────────────────────────────────

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    object: OsObject,
  ) => {
    if (event.button !== 0 || renamingId === object.id) return;
    event.stopPropagation();
    setSelectedId(object.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: object.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      active: false,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    setDrag((state) => {
      if (!state || state.pointerId !== event.pointerId) return state;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const active =
        state.active || Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
      return { ...state, dx, dy, active };
    });
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
    object: OsObject,
  ) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.active) {
      const target = dropCell(object, drag);
      if (!sameCell(target, object.position)) moveTo(object.id, target);
    }
    setDrag(null);
  };

  // ── open ──────────────────────────────────────────────────────────────

  const open = useCallback(
    (object: OsObject) => {
      if (object.kind === "folder") {
        // Folders have no window of their own yet, and inventing one
        // during this sprint would be a feature addition. Explorer is the
        // shell's file surface, so a folder opens there.
        onOpenWindow("explorer");
        return;
      }
      if (object.projectId) openProject(object.projectId);
      onOpenWindow("projects");
    },
    [onOpenWindow, openProject],
  );

  // ── rename ────────────────────────────────────────────────────────────

  /**
   * Renaming a SHORTCUT renames the project.
   *
   * The alternative — letting a shortcut carry its own display name — is
   * how the label goes stale the first time the project is renamed
   * anywhere else. There is one name, it lives on the project, and this is
   * an edit of it.
   */
  const commitRename = (object: OsObject, value: string) => {
    const next = value.trim();
    setRenamingId(null);
    if (!next) return;
    if (object.kind === "project-shortcut" && object.projectId) {
      renameProject(object.projectId, next);
      return;
    }
    renameObject(object.id, next);
  };

  // ── menus ─────────────────────────────────────────────────────────────

  const openMenu = (event: ReactPointerEvent | React.MouseEvent, targetId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    if (targetId) setSelectedId(targetId);
    setMenu({ x: event.clientX, y: event.clientY, targetId });
  };

  const menuTarget = menu?.targetId
    ? shown.find((o) => o.id === menu.targetId) ?? null
    : null;

  const desktopItems = useCallback((): ContextMenuItem[] => {
    const offerable = orderProjects(projectsWithoutShortcut(objects, projects));
    return [
      {
        id: "new-folder",
        label: "New Folder",
        icon: "folder",
        onSelect: () => createFolder(),
      },
      {
        id: "new-shortcut",
        label: "New Project Shortcut",
        icon: "projects",
        // Disabled rather than hidden when there is nothing to link: the
        // capability exists, you have simply linked everything already.
        disabled: offerable.length === 0,
        children: offerable.map((project) => ({
          id: project.id,
          label: project.name,
          icon: "projects" as ShellIconName,
          onSelect: () => createProjectShortcut(project.id),
        })),
      },
      { kind: "separator", id: "sep-1" },
      {
        id: "paste",
        label: "Paste",
        // There is no desktop clipboard yet. The item is here because the
        // machine will have one, and shipping it disabled is honest about
        // both halves of that.
        disabled: true,
        hint: "EMPTY",
      },
      {
        id: "refresh",
        label: "Refresh",
        icon: "recent",
        // The desktop renders from state and re-renders when state
        // changes, so there is nothing to reload. Clearing the selection
        // is the one thing a person actually gets from Refresh here, and
        // claiming to have reloaded would be theatre.
        onSelect: () => setSelectedId(null),
      },
      { kind: "separator", id: "sep-2" },
      {
        id: "wallpaper",
        label: "Change Wallpaper",
        icon: "canvas",
        disabled: true,
        hint: "M19",
      },
    ];
  }, [createFolder, createProjectShortcut, objects, projects]);

  const objectItems = useCallback(
    (object: OsObject): ContextMenuItem[] => {
      if (object.kind === "folder") {
        return [
          { id: "open", label: "Open", icon: "openfile", onSelect: () => open(object) },
          { kind: "separator", id: "sep-1" },
          {
            id: "rename",
            label: "Rename",
            onSelect: () => setRenamingId(object.id),
          },
          {
            id: "delete",
            label: "Delete",
            onSelect: () => removeObject(object.id),
          },
        ];
      }
      return [
        { id: "open", label: "Open", icon: "openfile", onSelect: () => open(object) },
        { kind: "separator", id: "sep-1" },
        {
          id: "rename",
          label: "Rename",
          onSelect: () => setRenamingId(object.id),
        },
        {
          id: "remove",
          label: "Remove Shortcut",
          // Named for what it does. "Delete" on a shortcut is the wording
          // that makes people believe they deleted the project.
          hint: "KEEPS PROJECT",
          onSelect: () => removeObject(object.id),
        },
      ];
    },
    [open, removeObject],
  );

  // ── render ────────────────────────────────────────────────────────────

  const layerStyle = {
    "--cattipu-menu-highlight": cattipuTokens.colors.navy,
  } as CSSProperties & Record<`--cattipu-${string}`, string>;

  const dragging = drag?.active ? shown.find((o) => o.id === drag.id) ?? null : null;
  const target = dragging && drag ? dropCell(dragging, drag) : null;

  return (
    <div
      ref={rootRef}
      className="cattipu-desktop-objects"
      style={layerStyle}
      data-testid="desktop-object-layer"
      onPointerDown={() => {
        setSelectedId(null);
        setRenamingId(null);
      }}
      onContextMenu={(event) => openMenu(event, null)}
    >
      {target && (
        <div
          className="cattipu-desktop-objects__drop-target"
          style={{
            left: cellToPixels(target).x,
            top: cellToPixels(target).y,
            width: OBJECT_WIDTH,
            height: OBJECT_HEIGHT,
          }}
        />
      )}

      {shown.map((object) => {
        const base = cellToPixels(object.position);
        const isDragging = drag?.active === true && drag.id === object.id;
        const label = objectLabel(object, projects);

        return (
          <div
            key={object.id}
            className="cattipu-desktop-objects__object"
            data-object-id={object.id}
            data-object-kind={object.kind}
            data-selected={selectedId === object.id ? "true" : undefined}
            data-dragging={isDragging ? "true" : undefined}
            style={{
              left: base.x,
              top: base.y,
              width: OBJECT_WIDTH,
              transform: isDragging ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
            }}
            role="button"
            tabIndex={0}
            aria-label={label}
            onPointerDown={(event) => handlePointerDown(event, object)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerUp(event, object)}
            onPointerCancel={() => setDrag(null)}
            onDoubleClick={() => open(object)}
            onKeyDown={(event) => {
              if (event.key === "Enter") open(object);
              if (event.key === "F2") setRenamingId(object.id);
            }}
            onContextMenu={(event) => openMenu(event, object.id)}
          >
            <span className="cattipu-desktop-objects__plate">
              <ShellIcon name={iconFor(object)} size={32} />
            </span>

            {renamingId === object.id ? (
              <input
                className="cattipu-desktop-objects__rename"
                defaultValue={label}
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
                onPointerDown={(event) => event.stopPropagation()}
                onBlur={(event) => commitRename(object, event.currentTarget.value)}
                onKeyDown={(event) => {
                  // The icon this input sits inside also listens for Enter,
                  // and opens the object. Without stopping the event here,
                  // committing a rename immediately opens what was renamed.
                  event.stopPropagation();
                  if (event.key === "Enter") commitRename(object, event.currentTarget.value);
                  if (event.key === "Escape") setRenamingId(null);
                }}
              />
            ) : (
              <span className="cattipu-desktop-objects__label" title={label}>
                {label}
              </span>
            )}
          </div>
        );
      })}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={
            menuTarget
              ? objectLabel(menuTarget, projects)
              : "Desktop"
          }
          items={menuTarget ? objectItems(menuTarget) : desktopItems()}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
