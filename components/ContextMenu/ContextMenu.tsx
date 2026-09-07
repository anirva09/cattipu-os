"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import { cattipuTokens } from "../../design-system/tokens";
import { ShellIcon } from "../PixelIcon";
import type { ShellIconName } from "../PixelIcon";

import "../../design-system/bevel.css";
import "./ContextMenu.css";

/**
 * Milestone 16 (Living Desktop) — the mechanical context menu.
 *
 * Built out of the same three primitives every other CATTIPU surface is
 * built from: a 2px outer frame, a raised bevel, and the VGA type stack.
 * Nothing new is introduced — no shadow, no rounded corner, no accent
 * colour that is not already a token — because a menu that looks like it
 * came from a different program is the fastest way to break the illusion
 * that this is one machine.
 *
 * Two behaviours are worth stating because they are the ones that are
 * usually got wrong:
 *
 * 1. The menu is positioned in VIEWPORT coordinates and flipped after
 *    measurement, not before. Guessing the height from the item count
 *    means the guess is wrong the moment a font loads late or an item
 *    wraps, and a menu that hangs off the bottom of the screen is a menu
 *    with unreachable items. Measuring costs one layout pass and can
 *    never be wrong.
 *
 * 2. The menu is rendered through a PORTAL to <body>.
 *
 *    `position: fixed` and a high z-index are not enough on their own: a
 *    fixed element is still confined to the stacking context it is
 *    declared in, and this menu is opened from inside the desktop layer
 *    (z-index 0) and from inside managed windows (z-index 1 upward).
 *    Left in place it renders UNDER any window stacked above its host —
 *    the menu is visible, clickable-looking, and every click lands on the
 *    window covering it. The portal takes it out of every one of those
 *    contexts, which is the only way "always on top" can be true.
 *
 * 3. Nested choices DRILL DOWN in place rather than flying out sideways.
 *    A hover-triggered flyout needs an intent timer, a safe-triangle, and
 *    a story for touch input; a drill-down needs a back row. The list of
 *    projects to make a shortcut for is the only nesting the desktop
 *    has, and it does not justify the other three.
 */

export interface ContextMenuAction {
  kind?: "action";
  id: string;
  label: string;
  icon?: ShellIconName;
  /** Rendered right-aligned and dimmed — a shortcut hint or a reason. */
  hint?: string;
  disabled?: boolean;
  onSelect?: () => void;
  /** Selecting this pushes a nested list instead of running `onSelect`. */
  children?: ContextMenuItem[];
}

export interface ContextMenuSeparator {
  kind: "separator";
  id: string;
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

export interface ContextMenuProps {
  /** Viewport coordinates of the pointer that opened the menu. */
  x: number;
  y: number;
  title?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

type MenuStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

const MENU_MARGIN = 8;

function isAction(item: ContextMenuItem): item is ContextMenuAction {
  return item.kind !== "separator";
}

export function ContextMenu({ x, y, title, items, onClose }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // A stack of nested lists. `[]` is the root menu; pushing an entry
  // shows that item's children with a back row above them.
  const [trail, setTrail] = useState<ContextMenuAction[]>([]);
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: x,
    top: y,
  });

  const current = trail.length ? trail[trail.length - 1].children ?? [] : items;
  const heading = trail.length ? trail[trail.length - 1].label : title;

  // Opening in a new place is a new menu, not the old one moved: any
  // drilled-down state belongs to the object that was right-clicked.
  useEffect(() => {
    setTrail([]);
    setPosition({ left: x, top: y });
  }, [x, y, items]);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MENU_MARGIN;
    const maxTop = window.innerHeight - rect.height - MENU_MARGIN;
    // Flip about the anchor rather than sliding, so the pointer never ends
    // up sitting on top of an item it did not aim for.
    const left = x > maxLeft ? Math.max(MENU_MARGIN, x - rect.width) : x;
    const top = y > maxTop ? Math.max(MENU_MARGIN, y - rect.height) : y;
    setPosition({
      left: Math.min(Math.max(left, MENU_MARGIN), Math.max(MENU_MARGIN, maxLeft)),
      top: Math.min(Math.max(top, MENU_MARGIN), Math.max(MENU_MARGIN, maxTop)),
    });
  }, [x, y, trail, items]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        // Escape backs out one level before closing — otherwise a
        // mis-click into a submenu costs the whole menu.
        setTrail((t) => (t.length ? t.slice(0, -1) : t));
        if (!trail.length) onClose();
      }
    };
    // `true` so the menu closes before whatever was clicked reacts.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, trail.length]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  // Portals need a DOM, so the menu renders nothing until it is mounted.
  // It only ever exists in response to a pointer event, so there is no
  // first-paint cost to this.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const select = useCallback(
    (item: ContextMenuAction) => {
      if (item.disabled) return;
      if (item.children) {
        setTrail((t) => [...t, item]);
        return;
      }
      // Close first: an action that opens a window should not have this
      // menu still painted over the window it opened.
      onClose();
      item.onSelect?.();
    },
    [onClose],
  );

  const style = useMemo<MenuStyle>(
    () => ({
      left: `${position.left}px`,
      top: `${position.top}px`,
      "--cattipu-menu-highlight": cattipuTokens.colors.navy,
    }),
    [position.left, position.top],
  );

  if (!mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="cattipu-context-menu cattipu-edge--outer cattipu-bevel--raised"
      style={style}
      role="menu"
      aria-label={heading ?? "Context menu"}
      tabIndex={-1}
      onContextMenu={(event) => event.preventDefault()}
    >
      {trail.length > 0 && (
        <button
          type="button"
          className="cattipu-context-menu__back"
          onClick={() => setTrail((t) => t.slice(0, -1))}
        >
          <span className="cattipu-context-menu__back-arrow" aria-hidden="true" />
          <span className="cattipu-context-menu__label">{heading}</span>
        </button>
      )}

      {trail.length === 0 && heading && (
        <div className="cattipu-context-menu__heading">{heading}</div>
      )}

      <ul className="cattipu-context-menu__list">
        {current.length === 0 && (
          <li className="cattipu-context-menu__empty">NOTHING AVAILABLE</li>
        )}

        {current.map((item) =>
          isAction(item) ? (
            <li key={item.id}>
              <button
                type="button"
                role="menuitem"
                className="cattipu-context-menu__item"
                data-disabled={item.disabled ? "true" : undefined}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                onClick={() => select(item)}
              >
                <span className="cattipu-context-menu__icon">
                  {item.icon ? <ShellIcon name={item.icon} size={16} /> : null}
                </span>
                <span className="cattipu-context-menu__label">{item.label}</span>
                {item.children ? (
                  <span
                    className="cattipu-context-menu__more"
                    aria-hidden="true"
                  />
                ) : item.hint ? (
                  <span className="cattipu-context-menu__hint">{item.hint}</span>
                ) : null}
              </button>
            </li>
          ) : (
            <li
              key={item.id}
              className="cattipu-context-menu__separator"
              role="separator"
            />
          ),
        )}
      </ul>
    </div>,
    document.body,
  );
}
