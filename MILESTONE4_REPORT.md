# Milestone 4 Report — Window Interaction Polish

Scope: window interaction behavior and perceived quality only. Title bar
height, control size, chamfer/bevel construction, window sizes, app
layouts, and dock behavior are all unchanged — verified by diff (only
`components/Window/Window.tsx`, `store/useWindowStore.ts`, and
`app/globals.css` changed) and live.

## Files changed

- `components/Window/Window.tsx` — dropped the Framer Motion mount
  animation and the redundant `.cattipu-press` class on window controls;
  added `data-focused`, a drag grid, and `select-none` on the title bar.
- `store/useWindowStore.ts` — added a monotonically increasing
  `spawnCount` so cascade positioning doesn't reset when windows close.
- `app/globals.css` — new Milestone 4 block (title bar cursor + focus
  contrast) plus edits to the existing `.cattipu-window-control` rule
  (instant transitions, explicit pointer cursor) and the pixel-cursor
  system block (title bar grab/grabbing override).

## Item-by-item

**Window dragging.** Two changes. First, drag now snaps to a 2px grid
(`dragGrid={[2, 2]}` on `Rnd`) instead of following raw, often-fractional
pointer deltas — a small but real "clicks into place" feel rather than a
window that can end up 1px off a pixel boundary. Second, the title bar got
`select-none` — without it, a fast drag could catch the title text in a
text-selection highlight mid-drag, a small but very "modern web page,"
not "OS window," artifact. Resizing was left untouched — only dragging
was in scope, and grid-snapping resize risks nudging an app's content by
a stray pixel in a way that reads as a layout change.

**Focus/z-index behavior.** The z-index/focus logic itself
(`isFocused` = "this window's z-index is the max among non-minimized
windows") was already correct and is unchanged. What changed is that it's
now visible: previously the only focus indicator was `.cattipu-window-
glow`, a blue ring plus a soft blurred shadow — both explicitly prohibited
this milestone. It's removed from the window frame entirely (not from
Architect's internal panels, which use the same CSS class for their own
unrelated accent styling and are out of this milestone's scope).

**Title-bar active/inactive states.** The replacement for the glow: a
`data-focused` attribute on the title bar, driven by the same z-index
comparison, switches its background from chrome_navy to a flat desaturated
slate (`#454c60`) when the window isn't the active one, and dims the title
text/icon opacity to match — "subtle workstation-era contrast," the same
mechanism a classic Mac OS or BeOS title bar uses. Nothing else about the
window (frame, bevel, content) changes between the two states, per "subtle
... only." Verified live: active title bar `rgb(3, 31, 86)` (chrome_navy),
inactive `rgb(69, 76, 96)`.

**Minimize / Close / Restore-maximize behavior.** All three were already
functionally correct (minimize hides the window and the dock's un-minimize-
on-reopen already worked; close removes it and remembers its last rect;
toggleMaximize already restores to the pre-maximize rect) — verified live
with an explicit round trip for each rather than assumed. What changed is
purely the perceived-quality layer around them: no mount-in animation, no
exit animation (there wasn't one before either — removal was already
instant), and the control buttons' own state changes are now instant
rather than eased (see Pressed states, below). No new functionality was
added here beyond what's listed under Focus/spawn/drag.

**Window spawn position.** Found and fixed a real bug, not just a
perceived-quality tweak: the previous cascade offset was keyed off the
*currently open* window count, which resets to 0 every time windows are
closed — so opening an app, closing it, then opening a different app
placed the second window in exactly the same spot the first one started
in ("perfectly overlapping" was reachable, just not on the very first
open). Replaced with `spawnCount`, a counter that only ever increases.
Verified live: Projects → close → Explorer no longer land on the same
point.

**Viewport bounds.** `Rnd`'s existing `bounds="parent"` was already
correctly scoped — `WindowManager`'s wrapping div is an `absolute inset-0`
child of the same `<main>` that defines the visible desktop area, so it
already bounds dragging to exactly that region. No code change was needed
here; this was verified live rather than assumed, with two aggressive
drags (toward each corner, well past the visible area) confirming `x`/`y`
never go negative and the title bar always stays reachable on-screen.

**Pointer cursor behavior.** Two real gaps closed. The title bar had no
idle "this is draggable" cursor at all outside the opt-in pixel-cursor
system (Settings > Cursor) — only a `:active` grabbing cursor, so a user
with the system's default cursor got no hint before clicking. Now
`.cattipu-window-titlebar` shows `grab`/`grabbing` by default, and (since
the pixel-cursor system's blanket `body.cattipu-cursors *` rule otherwise
wins by specificity) a scoped `!important` override — the same pattern
already used for the resize handles — makes the same distinction when
that system is on, reusing the existing hand-cursor art since there's no
dedicated "grab" pixel asset. Second: `.cattipu-window-control` (the
three title-bar buttons) had no `cursor: pointer` of its own — most
browsers don't default `<button>` to a pointer cursor — so with the pixel-
cursor system off, hovering Minimize/Stack/Close showed a plain arrow.
Added explicitly.

**Pressed states on title-bar controls.** Two fixes. `WindowControl` used
to carry both `.cattipu-window-control` and a leftover `.cattipu-press`
class; the two disagreed on the `:active` transform/shadow, and
`.cattipu-window-control`'s own (higher-specificity) rule always won —
`.cattipu-press` was dead weight, removed. Separately, the transition
timing on hover/press used `var(--ease-spring)`, a snappy ease-out curve —
exactly the "easing-heavy transition" this milestone rules out. Changed to
`transition: none`: state changes now snap instantly, like a physical
toggle rather than a softened micro-interaction. Verified live: idle vs.
pressed `box-shadow` differs for all three controls.

## What was deliberately left alone

- Architect's own panels and `ArchitectureCanvas`/`ExportCenter`/
  `DatabasePanel` still use `.cattipu-window-glow` for their own internal
  accents — untouched, out of scope (this milestone is about the OS
  window chrome, not Architect's functionality).
- Resizing (drag-to-resize from the window edges/corners) — ungridded,
  unchanged. Only "dragging" (move) was named in scope.
- No changes to title bar height, control size, chamfer, window sizes, or
  app layouts — confirmed unchanged by diff.

## Validation

```
$ pnpm lint    → clean, 0 errors (1 unrelated warning in a scratch verify
                 script that isn't part of the shipped app or this commit)
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright):

```
spawn positions differ after close+reopen (want true): true
titlebar focus states: [{focused:"false", bg:"rgb(69, 76, 96)"},
                         {focused:"true",  bg:"rgb(3, 31, 86)"}]
focus states after clicking the background window: ["true","false"]
frame box-shadow: hard-edged only (.cattipu-raised's own bevel shadow;
  no separate blurred/floating shadow layered on top)
titlebar idle cursor: url(.../cursors/hand.png) 24 4, grab
window control cursor: url(.../cursors/hand.png) 24 4, pointer
Minimize/Stack/Close pressed differs from idle: true / true / true
drag delta on a diagonal move: 38, 22 (both even — grid-snapped)
window rect after a hard drag past the top-left: x >= 0, y >= 0 (clamped)
window rect after a hard drag past the bottom-right: still on-screen
minimize then re-click dock icon: window count 0 → 1 (restored)
maximize then un-maximize: restores to the exact original size
```

Screenshots in `m4-shots/`: `01-focus-contrast.png` / `02-refocused-
explorer.png` (active/inactive title bar contrast, before and after
switching focus), `04-drag-clamped-top-left.png` / `05-drag-clamped-
bottom-right.png` (viewport-bounded dragging).

## What's still open

- The dedicated "grab" cursor reuses the existing hand pixel-art asset
  rather than a purpose-drawn open-hand glyph — flagged rather than
  commissioning new cursor art for a one-class interaction fix.
- Resize (as opposed to move) drag is not grid-snapped — left out
  deliberately, but worth revisiting if a future milestone touches
  resizing specifically.
