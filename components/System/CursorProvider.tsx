"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useIsBusy } from "@/store/useBusyStore";
import {
  BUSY_DELAY_MS,
  FRAME_INTERVAL_MS,
  nextBusyFrame,
  remainingHoldMs,
} from "@/lib/os/busyCursor";

/**
 * Toggles the global pixel-cursor stylesheet rules (see globals.css)
 * on <body> based on the Settings > Cursor preference — unchanged from
 * before M20C2. No cursor logic lives here beyond that flip; the CSS
 * itself owns which cursor a given element resolves to.
 *
 * M20C2 (Animated Busy Cursor) adds the one canonical busy-cursor
 * controller: it watches `useIsBusy()` (store/useBusyStore.ts — any
 * feature reports busy there, not here) and owns every timing decision
 * — the BUSY_DELAY before the cursor changes at all, the
 * MIN_BUSY_VISIBLE hold once it has, and the single 160ms interval that
 * advances `data-cattipu-busy-frame` through the four hand-authored
 * Hourglass frames. All of that lives in refs, not React state: this
 * component always renders null, so there is nothing for state to
 * re-render — a `setInterval` ticking 6x/second into `useState` would
 * just be work with no payoff.
 *
 * Restoring "the correct cursor for whatever is currently under the
 * pointer" needs no special-casing: nothing here ever sets `cursor`
 * directly. Removing the `cattipu-busy` class is the entire "restore"
 * step — the browser's own cascade immediately re-resolves whichever
 * rule already matches the hovered element (Hand over a button, Text
 * over a field, the plain Arrow rule otherwise), the same way it always
 * does on any other class change.
 */
export function CursorProvider() {
  const cursorEnabled = useSettingsStore((s) => s.cursorEnabled);
  const isBusy = useIsBusy();

  useEffect(() => {
    document.body.classList.toggle("cattipu-cursors", cursorEnabled);
  }, [cursorEnabled]);

  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const frameTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const shownAt = useRef(0);
  const visible = useRef(false);

  useEffect(() => {
    const startFrames = () => {
      clearInterval(frameTimer.current);
      // prefers-reduced-motion: the CSS block below has its own
      // `@media (prefers-reduced-motion: reduce)` rule that shows the
      // single static, already-approved hourglass.png regardless of
      // `data-cattipu-busy-frame` — so the correct way to "not cycle"
      // is simply to never start this interval, not to start it and
      // have CSS ignore its output.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let frame = 1;
      document.body.dataset.cattipuBusyFrame = String(frame);
      frameTimer.current = setInterval(() => {
        frame = nextBusyFrame(frame);
        document.body.dataset.cattipuBusyFrame = String(frame);
      }, FRAME_INTERVAL_MS);
    };

    const show = () => {
      if (visible.current) return;
      visible.current = true;
      shownAt.current = Date.now();
      document.body.classList.add("cattipu-busy");
      startFrames();
    };

    const hide = () => {
      if (!visible.current) return;
      visible.current = false;
      clearInterval(frameTimer.current);
      document.body.classList.remove("cattipu-busy");
      delete document.body.dataset.cattipuBusyFrame;
    };

    // Every run starts by clearing whatever this effect scheduled last
    // time — the one place both the "never switch cursor" (BUSY_DELAY)
    // and "repeated operations do not create multiple timers" checks
    // are actually enforced: a still-pending show/hide timer from the
    // previous isBusy value is always cancelled before a new decision
    // is made, so there is never more than one of each in flight.
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);

    if (isBusy) {
      if (visible.current) return; // already showing; nothing to (re)schedule
      showTimer.current = setTimeout(show, BUSY_DELAY_MS);
    } else if (visible.current) {
      const remaining = remainingHoldMs(shownAt.current, Date.now());
      if (remaining <= 0) hide();
      else hideTimer.current = setTimeout(hide, remaining);
    }

    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, [isBusy]);

  // Unmount safety net: never leave a stuck busy cursor or a dangling
  // interval running against a detached component.
  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
      clearInterval(frameTimer.current);
      if (visible.current) {
        document.body.classList.remove("cattipu-busy");
        delete document.body.dataset.cattipuBusyFrame;
      }
    };
  }, []);

  return null;
}
