"use client";

/**
 * The one notification owner. Milestone 12 created it as a toast queue;
 * M22 (Notification Center) makes it the session's notification history,
 * read by components/System/NotificationCenter.tsx behind the top-bar
 * Bell.
 *
 * What changed in M22, and why:
 *
 * - Entries no longer expire. The M12 queue removed ordinary pushes after
 *   4s and capped itself at 3 so that toasts could not stack into a
 *   "modern stacked-toast wall". There is no toast surface any more: the
 *   Notification Center is a panel the person opens, so an entry that
 *   vanished on a timer would simply be missing from history. `sticky`
 *   and `durationMs` existed only to drive that timer and are gone.
 * - Entries carry `read`. Unread meaning belongs to the notification, not
 *   to the Bell, so the Bell's indicator is derived from this store.
 *   Opening the center does not mark anything read; a notification
 *   becomes read when it is acted on (`markRead`) or when the person asks
 *   for it (`markAllRead`).
 * - History is bounded (`MAX_HISTORY`), dropping the oldest. It is a
 *   session history, not an activity log: nothing is persisted, and a
 *   reload starts empty, exactly as before M22.
 *
 * The store is the only place ids and timestamps are made — both at push
 * time, never while rendering — and its array is in insertion order, which
 * is the canonical order (`newestFirst` reverses it for display).
 */

import { create } from "zustand";
import { playSound } from "@/lib/sounds";
import { useSettingsStore } from "@/store/useSettingsStore";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CattipuNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  /** Epoch ms, stamped by `push`. Display only; order is array order. */
  createdAt: number;
  read: boolean;
}

interface PushOptions {
  message?: string;
}

interface NotificationState {
  /** Oldest first — the order entries were pushed in. */
  notifications: CattipuNotification[];
  push: (type: NotificationType, title: string, opts?: PushOptions) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

let seq = 0;
const nextId = () => `notif-${++seq}`;

/** Enough for a working session; a burst past it drops the oldest. */
export const MAX_HISTORY = 100;

// Sound mapping — see lib/sounds.ts's "Sound constitution" comment for the
// full frozen vocabulary. Only success/error get a sound: info/warning
// firing a sound on every push would be exactly the "hover spam" the
// constitution rules out for a queue that can receive several pushes in
// quick succession. The chime belongs to `push`, so reading or rendering
// the history never makes a sound.
function chime(type: NotificationType) {
  const { soundEnabled, soundVolume } = useSettingsStore.getState();
  if (!soundEnabled) return;
  if (type === "success") playSound("success", soundVolume);
  if (type === "error") playSound("error", soundVolume);
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (type, title, opts) => {
    const id = nextId();
    const entry: CattipuNotification = {
      id,
      type,
      title,
      message: opts?.message,
      createdAt: Date.now(),
      read: false,
    };
    set((s) => ({ notifications: [...s.notifications, entry].slice(-MAX_HISTORY) }));
    chime(type);
    return id;
  },

  markRead: (id) => {
    set((s) =>
      s.notifications.some((n) => n.id === id && !n.read)
        ? { notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }
        : s,
    );
  },

  markAllRead: () => {
    set((s) =>
      s.notifications.some((n) => !n.read)
        ? { notifications: s.notifications.map((n) => (n.read ? n : { ...n, read: true })) }
        : s,
    );
  },

  dismiss: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  clearAll: () => {
    set((s) => (s.notifications.length ? { notifications: [] } : s));
  },
}));

/** Display order: the most recent push first. Derived from insertion
 *  order, so two pushes in the same millisecond still order correctly. */
export function newestFirst(
  notifications: readonly CattipuNotification[],
): CattipuNotification[] {
  return [...notifications].reverse();
}

export function unreadCount(notifications: readonly CattipuNotification[]): number {
  return notifications.reduce((count, n) => (n.read ? count : count + 1), 0);
}
