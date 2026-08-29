"use client";

/**
 * Milestone 12 (Constitutional Foundation Retrofit) — NEW. Renders the
 * native notification queue (store/useNotificationStore.ts). Mounted once,
 * high in the tree (components/Desktop/Desktop.tsx), same pattern as
 * CommandPalette. "No rounded modern toast cards, no blur, no glass, no
 * soft floating shadow" — built entirely from the existing molded-plastic
 * primitives (.cattipu-raised + .cattipu-chamfer, the same hard bevel/hard
 * chamfer every window and the Command Palette already use), not a new
 * visual language.
 */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { UtilityIcon, type UtilityIconId } from "@/components/Icons";
import {
  useNotificationStore,
  type NotificationType,
} from "@/store/useNotificationStore";

const TYPE_META: Record<NotificationType, { iconId: UtilityIconId; accent: string; label: string }> = {
  // Resolves docs/DESIGN_CONSTITUTION.md's previously-disclosed "declared
  // but no component reads them yet" gap for --color-success/--color-warning
  // — this is their first real semantic consumer. info/error reuse the
  // existing --color-navy / --color-red accents (no new tokens needed).
  // Milestone 13 — icons are now the native 16×16 utility glyphs
  // ("ready" is the vocabulary's name for the success/green state).
  info: { iconId: "info", accent: "var(--color-navy)", label: "INFO" },
  success: { iconId: "ready", accent: "var(--color-success)", label: "SUCCESS" },
  warning: { iconId: "warning", accent: "var(--color-warning)", label: "WARNING" },
  error: { iconId: "error", accent: "var(--color-red)", label: "ERROR" },
};

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex w-[19rem] flex-col-reverse gap-2">
      <AnimatePresence initial={false}>
        {notifications.map((n) => {
          const meta = TYPE_META[n.type];
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12, ease: "linear" }}
              role="status"
              className="cattipu-raised cattipu-chamfer cattipu-notification pointer-events-auto flex items-start gap-2.5 bg-surface-solid px-3 py-2.5"
            >
              <span
                className="cattipu-notification-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"
                style={{ borderColor: meta.accent, color: meta.accent }}
              >
                <UtilityIcon id={meta.iconId} size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="font-label text-[0.4rem] tracking-wide" style={{ color: meta.accent }}>
                  {meta.label}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-ink">{n.title}</p>
                {n.message && (
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-dim">{n.message}</p>
                )}
              </span>
              <button
                onClick={() => dismiss(n.id)}
                aria-label="Dismiss notification"
                className="cattipu-cursor-hand -mr-1 -mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-ink-faint hover:text-ink"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
