"use client";

/**
 * M22 — the Notification Center. The one renderer of the canonical
 * notification store (store/useNotificationStore.ts), opened by the
 * top-bar Bell.
 *
 * This file used to hold the Milestone 12 toast stack: a bottom-right
 * column of framer-motion cards, drawn with Lucide's X and the retired
 * components/Icons set, mounted only by the legacy Desktop. It was never
 * reachable from the live shell. M22 replaces that presentation here,
 * in the same file, rather than adding a second renderer beside it.
 *
 * It is a shell utility surface, not an application: the shell owns
 * whether it is open (components/Shell/CattipuShell.tsx) and
 * InteractiveDesktop places it in the shell's own layer. It is not a
 * WindowManager window, has no window id and never takes part in window
 * focus, geometry or persistence.
 *
 * Construction is the right rack's widget, restated: a 2px outer frame,
 * a System navy header plate in the display face, and an inset well that
 * holds the history. Rows are separated by the shell's carved groove.
 * Every mark is PixelForge; the dismiss key reuses the window close glyph.
 */

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";

import { cattipuTokens } from "@/design-system/tokens";
import { ShellIcon, type ShellIconName } from "@/components/PixelIcon";
import {
  newestFirst,
  unreadCount,
  useNotificationStore,
  type CattipuNotification,
  type NotificationType,
} from "@/store/useNotificationStore";

import "../../design-system/bevel.css";
import "../Window/Window.css";
import "./NotificationCenter.css";

/** One canonical PixelForge status mark per notification type. */
export const NOTIFICATION_MARKS: Readonly<
  Record<NotificationType, { icon: ShellIconName; label: string }>
> = {
  info: { icon: "info", label: "INFO" },
  success: { icon: "ready", label: "SUCCESS" },
  warning: { icon: "warning", label: "WARNING" },
  error: { icon: "error", label: "ERROR" },
};

/** A count as the compact readouts show it: capped, never widened. */
export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * The stored push time as a 24-hour HH:MM stamp in the viewer's zone.
 * Only ever formatted from `createdAt`, never from the current clock, and
 * only for entries pushed in this browser session — the server never has
 * one to render, so there is nothing for hydration to disagree about.
 */
export function formatNotificationTime(createdAt: number): string {
  const at = new Date(createdAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

const PANEL_STYLE = {
  "--cattipu-notification-lamp": cattipuTokens.colors.welcome,
} as CSSProperties;

interface ContainsNode {
  contains(node: Node | null): boolean;
}

/**
 * Whether an event should close the open center. Escape always does. A
 * press closes it only outside both the panel and the Bell: the Bell's
 * own click is what toggles it, so treating that press as "outside" would
 * close the center and then reopen it.
 */
export function centerDismissal(
  event: { type: string; key?: string; target: EventTarget | null },
  panel: ContainsNode | null,
  bell: ContainsNode | null,
): "escape" | "outside" | null {
  if (event.type === "keydown") return event.key === "Escape" ? "escape" : null;
  if (event.type !== "pointerdown") return null;
  const target = event.target as Node | null;
  if (panel?.contains(target) || bell?.contains(target)) return null;
  return "outside";
}

export interface NotificationCenterPanelProps {
  id?: string;
  notifications: readonly CattipuNotification[];
  panelRef?: RefObject<HTMLElement | null>;
}

/**
 * The panel itself: a plain function of the history it is given. Every
 * action goes straight to the store, so nothing here holds a copy of what
 * was dismissed or read — the next render simply reads the store again.
 */
export function NotificationCenterPanel({
  id,
  notifications,
  panelRef,
}: NotificationCenterPanelProps) {
  const rows = newestFirst(notifications);
  const unread = unreadCount(notifications);
  const store = useNotificationStore.getState;

  // An action that removes or disables the control that ran it would
  // drop focus onto <body>. Parking it on the panel keeps Tab and Escape
  // working from where the person was.
  const holdFocus = () => panelRef?.current?.focus({ preventScroll: true });

  return (
    <section
      id={id}
      ref={panelRef as RefObject<HTMLElement> | undefined}
      tabIndex={-1}
      role="dialog"
      aria-label="Notifications"
      className="cattipu-notification-center cattipu-edge--outer"
      style={PANEL_STYLE}
    >
      <header className="cattipu-notification-center__header">
        <span className="cattipu-notification-center__title">NOTIFICATIONS</span>
        <span className="cattipu-notification-center__count" data-unread={unread}>
          {unread > 0 ? `${formatUnreadCount(unread)} UNREAD` : ""}
        </span>
      </header>

      <div className="cattipu-notification-center__body cattipu-bevel--inset">
        {rows.length === 0 ? (
          <p className="cattipu-notification-center__empty">NO NOTIFICATIONS</p>
        ) : (
          <ol className="cattipu-notification-center__list">
            {rows.map((n) => {
              const mark = NOTIFICATION_MARKS[n.type];
              const content = (
                <>
                  <span className="cattipu-notification-center__row-title">
                    <span className="cattipu-notification-center__title-text">{n.title}</span>
                    {!n.read && (
                      <span className="cattipu-notification-center__lamp" aria-hidden="true" />
                    )}
                  </span>
                  {n.message && (
                    <span className="cattipu-notification-center__message">{n.message}</span>
                  )}
                  <span className="cattipu-notification-center__meta">
                    {mark.label} ·{" "}
                    <time dateTime={new Date(n.createdAt).toISOString()}>
                      {formatNotificationTime(n.createdAt)}
                    </time>
                  </span>
                </>
              );

              return (
                <li
                  key={n.id}
                  className="cattipu-notification-center__row"
                  data-type={n.type}
                  data-read={n.read ? "true" : "false"}
                >
                  <ShellIcon
                    name={mark.icon}
                    size={16}
                    className="cattipu-notification-center__icon"
                  />
                  {n.read ? (
                    <div className="cattipu-notification-center__main">{content}</div>
                  ) : (
                    <button
                      type="button"
                      className="cattipu-notification-center__main cattipu-focus--mechanical cattipu-cursor-hand"
                      aria-label={`Mark read: ${n.title}`}
                      onClick={() => {
                        store().markRead(n.id);
                        holdFocus();
                      }}
                    >
                      {content}
                    </button>
                  )}
                  <button
                    type="button"
                    className="cattipu-notification-center__dismiss cattipu-edge--outer cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical cattipu-cursor-hand"
                    aria-label={`Dismiss: ${n.title}`}
                    onClick={() => {
                      store().dismiss(n.id);
                      holdFocus();
                    }}
                  >
                    <span
                      className="cattipu-window__glyph cattipu-window__glyph--close"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="cattipu-notification-center__footer">
        <button
          type="button"
          className="cattipu-notification-center__action cattipu-edge--outer cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical cattipu-cursor-hand"
          disabled={unread === 0}
          onClick={() => {
            store().markAllRead();
            holdFocus();
          }}
        >
          MARK ALL READ
        </button>
        <button
          type="button"
          className="cattipu-notification-center__action cattipu-edge--outer cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical cattipu-cursor-hand"
          disabled={rows.length === 0}
          onClick={() => {
            store().clearAll();
            holdFocus();
          }}
        >
          CLEAR ALL
        </button>
      </footer>
    </section>
  );
}

export interface NotificationCenterProps {
  id: string;
  open: boolean;
  onClose: () => void;
  /** The Bell that opened it: excluded from outside presses, and where
   *  focus goes back to on Escape. */
  bellRef: RefObject<HTMLButtonElement | null>;
}

export function NotificationCenter({ id, open, onClose, bellRef }: NotificationCenterProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const panelRef = useRef<HTMLElement | null>(null);

  // One pair of window listeners while open, none while closed. Capture
  // phase, like ContextMenu, so the center closes before whatever was
  // pressed outside reacts to the press.
  useEffect(() => {
    if (!open) return;
    const handle = (event: PointerEvent | KeyboardEvent) => {
      const outcome = centerDismissal(event, panelRef.current, bellRef.current);
      if (!outcome) return;
      if (outcome === "escape") {
        event.stopPropagation();
        bellRef.current?.focus({ preventScroll: true });
      }
      onClose();
    };
    window.addEventListener("pointerdown", handle, true);
    window.addEventListener("keydown", handle, true);
    return () => {
      window.removeEventListener("pointerdown", handle, true);
      window.removeEventListener("keydown", handle, true);
    };
  }, [open, onClose, bellRef]);

  // Opening moves focus into the panel, so the next Tab reaches its
  // controls rather than whatever follows the Bell in the document.
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  return <NotificationCenterPanel id={id} notifications={notifications} panelRef={panelRef} />;
}
