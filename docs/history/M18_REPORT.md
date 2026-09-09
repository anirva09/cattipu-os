# M18 — Workspace Intelligence

Windows now snap, cascade, tile and restore exactly, all through the
existing window manager. 40/40 behavioural checks pass against the
production build; the layout arithmetic and the restore contract carry 33
unit tests, mutation-checked against thirteen deliberate breakages.

---

## The two decisions the rest follows from

**1. A snap is stored as a REGION, never as a rectangle.**

`snap: "left"` rather than `{x:0, y:0, width:627, height:776}`. The
rectangle is recomputed from the current workspace on every render, so a
window snapped on a 1920 screen is still exactly half of a 1366 one and
resizing the browser cannot leave it a few pixels wrong. This is the same
reasoning M16 used for grid cells instead of coordinates.

**2. Every rectangle is integer-aligned, and halves add back up.**

`Math.round(n / 2)` used twice on an odd width is one pixel too many and
leaves a seam down the middle of the screen. Splitting is floor plus
remainder; tiling hands its division leftovers out one per tile. On a
pixel-art shell a fractional edge puts a 2px bevel on a half-pixel and
renders it as 3px of grey, which is why the RC2 fit audit exists.

---

## What was built

| File | Role |
|---|---|
| `lib/os/workspace.ts` | **New.** Snap rects, edge detection, cascade, tile, boundary safety, unsnap positioning. Pure. |
| `components/WindowManager/windowManager.reducer.ts` | `size`, `snap` and `restore` on window state; `snap`, `unsnap`, `restore`, `restoreAll` and `arrange` actions. **One reducer, one state.** |
| `components/WindowManager/ManagedWindow.tsx` | Resolves the rect, drives snap preview and unsnap-on-drag, moves keyboard focus with the active window. |
| `components/WindowManager/useWindowManager.ts` | Five new dispatchers. No new store. |
| `components/InteractiveDesktop/` | Renders the snap preview; keyboard route to the workspace commands. |
| `components/DesktopObjects/` | `Window ▸ Cascade / Tile / Restore All` in the desktop menu. |
| `components/ContextMenu/ContextMenu.tsx` | Portals to `<body>` — see the bugs below. |
| `lib/os/__tests__/workspace.test.ts` | 33 tests, added to `npm test`. |
| `scripts/m18-verify.py` | Where every figure below comes from. |

**No duplicate window state.** Snapping, tiling and restoring are actions
on the same reducer that already owned open/mode/position/z-order. A
snapped window is one of those windows with a region set on it.

---

## Confirmations the sprint asked for

Workspace measured live at **1254 × 776** (1600 − 98 rail − 248 widgets,
900 − 74 top bar − 50 status).

### Snapping works

| Drag to | Result |
|---|---|
| left edge | `x=0 w=627 h=776` |
| right edge | `x=627 w=627 h=776` |
| top edge | `y=0 w=1254 h=388` |
| bottom edge | `y=388 w=1254 h=388` |

The preview appears while dragging (`region=left, 0,0 627×776`) and is
gone on release. The two vertical halves meet exactly: **627 + 627 =
1254**, no seam, no overlap.

**Top is a half, not a maximize.** Maximize already exists on the title
bar; making the top edge a second trigger for it would give one behaviour
two names and leave the top half unreachable.

### Cascade works

Five windows, offsets measured between consecutive windows in stack
order: `(24,24) (24,24) (24,24) (24,24)`. Every window fully inside the
workspace. On a workspace too short to hold the whole run the cascade
starts a **new run** rather than letting the clamp pile windows against
the edge.

### Tile works

Five windows, no overlapping pair, tiles reaching `right=1254
bottom=776` — the exact workspace edges. Short last row spreads across
the full width rather than leaving a window-sized hole.

### Restore works

Position, size **and** z-order:

```
maximized  1254×776 at (0,0), z=19
restored    920×612 at (334,164), z=18   ← below Settings at z=20
```

Restore is the inverse of what put the window there, so it cannot leave
the window higher up the stack than it started. Clicking it afterwards
raises it the normal way.

Two levels, because one is not enough: **un-maximizing a snapped window
returns it to its half**, and restoring again sends it home. A single
restore point would either lose the snap or make it permanent.

### Boundaries work

Dragged far off-screen in three directions, the title bar stays fully
reachable every time:

```
far right      → (842, 273)
far below      → (532, 392)
above and left → (0, 0)
```

A window larger than the workspace pins to the origin, keeping its title
bar's drag handle on screen.

### No clipping

Every cascaded and tiled window is fully inside the workspace, and every
window's title bar and controls are whole. No window lands on a
fractional pixel.

### No layout regressions

Page gains no scrollbars. M16's harness re-run: 27/27. M17's: 42/42.

### Multi-window workflow

Projects, Explorer, Architect, Memory and Settings open together, tiled,
zero overlapping pairs, all inside the workspace, each still rendering
real content (440 / 294 / 99 / 79 / 141 characters of body text).

### Focus intelligence

Clicking a window's **body** — not its title bar — raises it above every
other (`z 26 → 33`), and `document.activeElement` ends up inside that
window. Focus only moves when it is not already inside the active window,
so typing in Explorer's search box is not interrupted by a re-render.

---

## Four real bugs found

**The context menu was trapped under windows.** `position: fixed` with
`z-index: 12000` is not enough: a fixed element is still confined to the
stacking context it is declared in, and the menu is opened from inside
the desktop layer (`z-index: 0`) and from inside managed windows
(`z-index: 1` upward). It rendered *under* any window stacked above its
host — visible, clickable-looking, every click landing on the window
covering it. This predates M18; it only surfaced now because M18 is the
first milestone that puts a window over the desktop menu. Fixed by
portalling the menu to `<body>`.

**Un-maximizing a snapped window sent it home.** The first implementation
kept one restore point, so maximizing a window snapped to the left half
and un-maximizing dropped the snap entirely. Fixed by recording the snap
region on the restore point and leaving a home point behind when
restoring onto one.

**Restore All did nothing after a Tile.** `arrange` cleared every
window's restore point, on the reasoning that an arranged window has an
explicit place. Each piece was internally consistent and the result was
that `Restore All` silently did nothing at exactly the moment a person
reaches for it — tile, dislike it, press restore, nothing happens. Found
by recording the walkthrough rather than by a test, because every test
asserted about restoring a *snap* or a *maximize*. Arranging now records
a restore point; a window that was already snapped or maximized keeps the
one it had, so restoring still goes home rather than back to the
arrangement it was in a moment ago.

**A tiled workspace hides its own escape hatch.** After Tile, only
**1.5%** of the workspace is uncovered — the 8px seams between tiles.
The desktop context menu, which is where Cascade/Tile/Restore All live,
is technically reachable through an 8px crack and practically is not: the
arrangement that most needs undoing is the one that hides the way to undo
it. The top bar is a frozen component, so a menu bar is not available.
Added `Ctrl+Alt+C` / `Ctrl+Alt+T` / `Ctrl+Alt+R`, which add no chrome and
are always reachable. Ctrl+Alt rather than Ctrl alone because Ctrl+T and
Ctrl+R belong to the browser.

---

## Where the commands live, and why

`Window ▸ Cascade / Tile / Restore All` is in the **desktop context
menu**, not a menu bar. The top bar is a frozen component and bolting a
menu onto it would change the Golden Master; a right-click on the desktop
is where an operating system keeps workspace commands anyway. The entry
dims when there is nothing to arrange rather than disappearing.

---

## Visual rules

Nothing about window chrome, title bars, bevels, PixelForge icons or
spacing changed. The only new painted thing is the snap preview, and it
is deliberately the **same two cues as M16's desktop drop target** — a
dashed 2px frame in `--cattipu-outer-frame` over a barely-tinted fill.
A snap preview and a drop target are the same idea ("this is where it
will land"), and giving them two appearances would teach that they are
different things.

Golden Master parity is unchanged: the empty desktop still differs from
the RC2 baseline only in the top bar's clock text.

---

## One limitation, measured

Frozen window bodies are laid out at the 920×612 design size. Tiled to
roughly 413×384, **one element in one window** clips its own content:

```
elements clipping their own content, per window:
  projects 1   architect 0   memory 0   explorer 0   settings 0
```

That one is the Projects window's inner `248 / 16 / 640` fixed grid,
which the frozen component owns. Architect, Memory, Explorer and Settings
are fluid and adapt.

**Not fixed, deliberately.** The fix is either responsive window bodies
or a scroll-below-design-size rule, and both mean changing the internal
overflow of frozen components during a sprint that says not to redesign
them. What the sprint asked for — no window clipped, chrome whole — is
verified and holds. Responsive window bodies are their own milestone.

---

## Deliberate limits

- **Snap Bottom is implemented**, since the four halves are one coherent
  set once the arithmetic exists.
- **Restore All undoes a Cascade or a Tile**, as well as a snap or a
  maximize. See the bug above.
- **Arranging does not change z-order.** An arrangement decides where
  windows are, not which one you were working in. Asserted on the z
  *values* and the counter, not just on relative order — raising every
  window back-to-front preserves relative order and would pass a weaker
  test.
- **Corners resolve to the horizontal half.** A corner is ambiguous by
  construction; picking silently beats a third region the preview would
  have to explain.
- **No window resize handles.** Not asked for, and every size in this
  milestone is derived from the workspace rather than dragged.

---

## Verification

```
npm run typecheck   0 errors
npm run lint        0 errors, 1 pre-existing warning (ManagedWindow.tsx:329)
npm test            9/9 + 18/18 + 16/16 + 24/24 + 33/33
npm run build       clean
M18 harness         40/40
M16 harness         27/27   (re-run)
M17 harness         42/42   (re-run)
```

The 33 unit tests were mutation-checked against thirteen deliberate
breakages: halves rounded twice, tile remainder dropped, short last row
keeping the column width, cascade never wrapping, no boundary clamp,
snap threshold ignored, restore keeping the raised z-index, snap
re-recording its restore point, arrange raising every window, arrange
including minimized windows, the parser rejecting a pre-M18 session, and
maximize forgetting the snap. Each is caught by at least one test.

Three initially were **not**:

- the cascade-wrap test asserted "every window is on screen", which
  `cascadeLayout` guarantees by clamping its own output — so it passed
  against a cascade that walked off the bottom and came back squashed
  against the edge. Rewritten to assert the run *structure*.
- the snap round-trip test asserted position, which snapping never
  changes — z-order was the only discriminator. Rewritten.
- the arrange test compared relative stacking order, which survives
  raising every window back-to-front. Rewritten to compare z values and
  the counter.

All three were rewritten rather than kept for the count.

A negative assertion is worth exactly what you have proved it can fail
on.

## Session compatibility

A session saved by M17 has no `size`, `snap` or `restore`. The parser
reads all three leniently and falls back to the pre-M18 meaning, because
rejecting the whole state over a field that did not exist yet would close
every open window on the first load after an upgrade. Verified with a
hand-written M17 payload, and a snapped window is still snapped after a
full reload.

## Screenshots

- `Snap_Left.png` — the left half applied (`Snap_Left_preview.png` shows the preview mid-drag)
- `Snap_Right.png` — both halves, meeting exactly
- `Cascade.png` — five windows, consistent 24px offsets
- `Tile.png` — five windows filling the workspace, no overlap
- `MultiWindow.png` — all five apps coexisting
