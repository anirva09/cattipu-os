"use client";

/**
 * Milestone 12 (Constitutional Foundation Retrofit) — NEW. Native CATTIPU
 * notification primitive: "hard border, cream/ivory molded body, bitmap
 * text, small icon area... no rounded modern toast cards, no blur, no
 * glass, no soft floating shadow." This store only owns the queue and its
 * timers; rendering is components/System/NotificationCenter.tsx.
 *
 * "Multiple notifications must not become a modern stacked-toast wall" —
 * enforced here, not just visually: the queue itself is capped at
 * MAX_VISIBLE, so a burst of pushes drops the oldest rather than growing
 * an unbounded stack that only LOOKS capped in the UI.
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
  createdAt: number;
  /** Ordinary notifications disappear on their own in ~3-5s. Critical
   * errors may require dismissal instead — sticky skips the auto-dismiss
   * timer. Defaults to true for "error", false for everything else. */
  sticky: boolean;
}

interface PushOptions {
  message?: string;
  sticky?: boolean;
  durationMs?: number;
}

interface NotificationState {
  notifications: CattipuNotification[];
  push: (type: NotificationType, title: string, opts?: PushOptions) => string;
  dismiss: (id: string) => void;
}

let seq = 0;
const nextId = () => `notif-${++seq}`;

const MAX_VISIBLE = 3;
// "ordinary notifications disappear in approximately 3-5 seconds" — 4s
// lands in the middle of that window.
const DEFAULT_DURATION_MS = 4000;

// Sound mapping — see lib/sounds.ts's "Sound constitution" comment for the
// full frozen vocabulary. Only success/error get a sound: info/warning
// firing a sound on every push would be exactly the "hover spam" the
// constitution rules out for a queue that can receive several pushes in
// quick succession.
function chime(type: NotificationType) {
  const { soundEnabled, soundVolume } = useSettingsStore.getState();
  if (!soundEnabled) return;
  if (type === "success") playSound("success", soundVolume);
  if (type === "error") playSound("error", soundVolume);
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  push: (type, title, opts) => {
    const id = nextId();
    const sticky = opts?.sticky ?? type === "error";
    const entry: CattipuNotification = {
      id,
      type,
      title,
      message: opts?.message,
      createdAt: Date.now(),
      sticky,
    };
    set((s) => ({ notifications: [...s.notifications, entry].slice(-MAX_VISIBLE) }));
    chime(type);
    if (!sticky) {
      const duration = opts?.durationMs ?? DEFAULT_DURATION_MS;
      window.setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },
}));
