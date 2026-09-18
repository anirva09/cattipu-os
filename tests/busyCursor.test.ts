/**
 * M20C2 (Animated Busy Cursor) — tests for the DOM-free half of the
 * busy-cursor mechanism: the pure timing functions in
 * lib/os/busyCursor.ts, and store/useBusyStore.ts's reporting surface.
 *
 * CursorProvider.tsx itself (the `document`/`window`/timer-owning
 * component) is deliberately NOT tested here — this repo's test runner
 * is plain `node:assert` over `tsx`, with no DOM environment (no
 * jsdom/testing-library dependency), so a real component test isn't
 * practical without adding one. Splitting the actual timing DECISIONS
 * out into plain functions (see busyCursor.ts's own header) is what
 * makes them testable at all without that dependency; this file is
 * exactly that trade-off paying off.
 *
 * Written against the specific wrong implementations:
 *
 *  - the frame cycle is checked past frame 4 specifically, because
 *    `frame % 4` alone (no `+ 1`) is the bug that produces a frame 0 —
 *    a file that does not exist — instead of wrapping back to 1;
 *  - the hold-time math is checked for NEVER GOING NEGATIVE, because a
 *    signed remaining-time is the bug that lets a caller schedule a
 *    timer with a negative delay (which still exists, still needs
 *    clearing, and defeats "no stray timer after the operation ends");
 *  - begin() is checked for being called twice with the SAME id, because
 *    an implementation that always adds without checking membership
 *    first would need two end() calls to clear one busy reason, and the
 *    caller (an effect that begin()s once and end()s once on cleanup)
 *    would never call it twice;
 *  - end() is checked for two DIFFERENT ids overlapping, because a
 *    single-boolean "isBusy" implementation (rather than a Set of
 *    reasons) is the bug that lets the first operation to finish
 *    prematurely clear the cursor while a second one is still running;
 *  - end() is also checked on an id that was never begun, because a
 *    Set.delete()-without-checking implementation would silently accept
 *    it (harmless here, but worth pinning so it stays a deliberate no-op
 *    rather than an accident).
 *
 * Run with: npx tsx tests/busyCursor.test.ts
 */
import assert from "node:assert/strict";

import {
  BUSY_FRAME_COUNT,
  MIN_BUSY_VISIBLE_MS,
  nextBusyFrame,
  remainingHoldMs,
} from "@/lib/os/busyCursor";
import { useBusyStore } from "@/store/useBusyStore";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

// ── nextBusyFrame ──────────────────────────────────────────────────────

test("frames cycle 1 -> 2 -> 3 -> 4 -> 1, never touching 0", () => {
  let frame = 1;
  const seen = [frame];
  for (let i = 0; i < BUSY_FRAME_COUNT * 2; i++) {
    frame = nextBusyFrame(frame);
    seen.push(frame);
  }
  assert.equal(seen.length, BUSY_FRAME_COUNT * 2 + 1);
  assert.ok(seen.every((f) => f >= 1 && f <= BUSY_FRAME_COUNT));
  // exactly one full cycle back to the start, twice over
  assert.deepEqual(seen, [1, 2, 3, 4, 1, 2, 3, 4, 1]);
});

test("frame 4 wraps to 1, not 5 or 0", () => {
  assert.equal(nextBusyFrame(4), 1);
});

// ── remainingHoldMs ────────────────────────────────────────────────────

test("no time elapsed -> the full hold is still owed", () => {
  assert.equal(remainingHoldMs(1_000, 1_000), MIN_BUSY_VISIBLE_MS);
});

test("hold partially elapsed -> exactly the remainder is owed", () => {
  const elapsed = 120;
  assert.equal(remainingHoldMs(1_000, 1_000 + elapsed), MIN_BUSY_VISIBLE_MS - elapsed);
});

test("hold fully elapsed -> zero, not negative", () => {
  assert.equal(remainingHoldMs(1_000, 1_000 + MIN_BUSY_VISIBLE_MS), 0);
});

test("hold long overdue -> still zero, never negative", () => {
  assert.equal(remainingHoldMs(1_000, 1_000 + MIN_BUSY_VISIBLE_MS + 5_000), 0);
});

// ── useBusyStore ───────────────────────────────────────────────────────

const resetBusyStore = () => useBusyStore.setState({ reasons: new Set() });

test("begin() then end() with the same id returns to not-busy", () => {
  resetBusyStore();
  useBusyStore.getState().begin("a");
  assert.equal(useBusyStore.getState().reasons.size, 1);
  useBusyStore.getState().end("a");
  assert.equal(useBusyStore.getState().reasons.size, 0);
});

test("begin() twice with the same id is idempotent", () => {
  resetBusyStore();
  useBusyStore.getState().begin("a");
  useBusyStore.getState().begin("a");
  assert.equal(useBusyStore.getState().reasons.size, 1);
  useBusyStore.getState().end("a");
  assert.equal(useBusyStore.getState().reasons.size, 0);
});

test("two overlapping busy sources: ending one leaves the other busy", () => {
  resetBusyStore();
  useBusyStore.getState().begin("architect-generate");
  useBusyStore.getState().begin("forge-build");
  assert.equal(useBusyStore.getState().reasons.size, 2);
  useBusyStore.getState().end("architect-generate");
  // still busy: forge-build never ended
  assert.equal(useBusyStore.getState().reasons.size, 1);
  assert.ok(useBusyStore.getState().reasons.has("forge-build"));
  useBusyStore.getState().end("forge-build");
  assert.equal(useBusyStore.getState().reasons.size, 0);
});

test("end() on an id that was never begun is a harmless no-op", () => {
  resetBusyStore();
  useBusyStore.getState().begin("a");
  useBusyStore.getState().end("never-began");
  assert.equal(useBusyStore.getState().reasons.size, 1);
  assert.ok(useBusyStore.getState().reasons.has("a"));
});

// ── run ─────────────────────────────────────────────────────────────────

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(error as Error).message.split("\n")[0]}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
