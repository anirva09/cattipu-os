/**
 * M20C2 (Animated Busy Cursor) — the pure, DOM-free half of the
 * canonical busy-cursor timing model.
 *
 * `components/System/CursorProvider.tsx` is the only place that ever
 * touches `document`/`window`/timers; every actual timing DECISION
 * lives here instead, as plain functions of plain numbers, so it can be
 * tested with plain `node:assert` (see `tests/busyCursor.test.ts`)
 * without a DOM environment. The constants are exported from here too,
 * so CursorProvider, its CSS-comment documentation, and the tests all
 * read the same numbers rather than three independently hand-kept
 * copies of 350/320/160.
 */

/** Wait this long after a feature reports busy before the cursor
 * changes at all — short operations (opening a menu, switching a tab,
 * toggling a preference) never flash it. */
export const BUSY_DELAY_MS = 350;

/** Once the busy cursor has actually appeared, keep it visible for at
 * least this long, so a just-shown cursor can never flicker off inside
 * a single rendered frame. */
export const MIN_BUSY_VISIBLE_MS = 320;

/** How often the animation advances to its next frame while visible. */
export const FRAME_INTERVAL_MS = 160;

/** hourglass-1.png .. hourglass-4.png (scripts/gen_cursors.py). */
export const BUSY_FRAME_COUNT = 4;

/**
 * 1 -> 2 -> 3 -> 4 -> 1 -> ... — the one place the wrap rule lives.
 * `frame % COUNT` alone would produce 1,2,3,0 (a frame 0 that has no
 * PNG); `+ 1` is what keeps it in the actual 1..COUNT file-name range.
 */
export function nextBusyFrame(frame: number): number {
  return (frame % BUSY_FRAME_COUNT) + 1;
}

/**
 * Milliseconds still owed on the MIN_BUSY_VISIBLE hold, given when the
 * cursor became visible (`shownAt`, `Date.now()`-style) and the current
 * time (`now`). Never negative: 0 means "safe to hide immediately,"
 * not "hide 40ms in the past" — a caller that used a signed value as a
 * timer delay could otherwise schedule one that fires instantly but
 * still exists, which is exactly the kind of stray timer this sprint's
 * "no interval/timer remains after the operation ends" check is for.
 */
export function remainingHoldMs(shownAt: number, now: number): number {
  return Math.max(0, MIN_BUSY_VISIBLE_MS - (now - shownAt));
}
