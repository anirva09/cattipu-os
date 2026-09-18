"use client";

/**
 * M20C2 (Animated Busy Cursor) — the one canonical "is CATTIPU doing
 * something that takes a while" signal. Before this sprint the only
 * busy-adjacent state anywhere was Architect's own local `status`
 * field, read directly by one CSS selector scoped to its own Generate
 * button — there was no global concept a mouse-cursor override could
 * key off, and nothing else in the shell had anywhere to report to.
 *
 * A feature reports busy by calling `begin(id)` when it starts and
 * `end(id)` when it finishes, fails, or is cancelled — `id` is any
 * stable string naming that operation ("architect-generate", and
 * eventually "forge-build", "launch-deploy", etc., per the milestone
 * brief's own reuse list). Busy state is a Set of reasons, not a single
 * boolean, specifically so two independent long operations overlapping
 * doesn't let the first one to finish prematurely clear the second's
 * still-active busy state — `useIsBusy()` is true whenever the set is
 * non-empty, false only once every reporter has called `end()`.
 *
 * This store owns none of the DELAY/MIN-VISIBLE/frame-timing decisions
 * — that is `lib/os/busyCursor.ts` plus `components/System/
 * CursorProvider.tsx`, the one subscriber. This store is only the
 * reporting surface.
 */

import { create } from "zustand";

interface BusyStoreState {
  reasons: Set<string>;
  begin: (id: string) => void;
  end: (id: string) => void;
}

export const useBusyStore = create<BusyStoreState>((set) => ({
  reasons: new Set(),
  begin: (id) =>
    set((s) => {
      if (s.reasons.has(id)) return s; // already reporting busy — no-op, not a duplicate entry
      const reasons = new Set(s.reasons);
      reasons.add(id);
      return { reasons };
    }),
  end: (id) =>
    set((s) => {
      if (!s.reasons.has(id)) return s; // never began, or already ended — no-op, never goes negative
      const reasons = new Set(s.reasons);
      reasons.delete(id);
      return { reasons };
    }),
}));

/** True whenever at least one feature is currently reporting busy. */
export const useIsBusy = () => useBusyStore((s) => s.reasons.size > 0);
