# CATTIPU OS — RC2 Viewport Fit Audit

**Four viewports, measured in a real browser against the production build.**
Golden Master reference: 1600×900.

| Check | Result |
|---|---|
| Sidebar overlap | PASS |
| Window clipping | PASS |
| Pixel alignment | PASS |
| Responsive safety | PASS |
| Scrollbars | PASS |

Every row is a measurement, not an inspection. The harness reads
`getBoundingClientRect()` for each production component at each size and
compares boxes; nothing here was judged by eye.

---

## Phase A — Layout audit

| Check | 1366×768 | 1440×900 | 1600×900 | 1920×1080 |
|---|---|---|---|---|
| No horizontal scrollbar | PASS | PASS | PASS | PASS |
| No vertical scrollbar | PASS | PASS | PASS | PASS |
| Sidebar clear of window layer | PASS | PASS | PASS | PASS |
| Widgets clear of window layer | PASS | PASS | PASS | PASS |
| Status bar inside viewport | PASS | PASS | PASS | PASS |
| Widget stack inside viewport | PASS | PASS | PASS | PASS |
| Toolbox reachable | PASS | PASS | PASS | PASS |
| Projects window fully visible | PASS | PASS | PASS | PASS |
| Nothing bleeding past the edge | PASS | PASS | PASS | PASS |

### What was broken

**The desktop carried a 1600×900 floor.** `min-width` and `min-height` on
`.cattipu-interactive-desktop` forced the document larger than the viewport
on anything smaller than the reference: both scrollbars at 1366×768, a
horizontal one at 1440×900. The reference numbers still compose the layout —
every child positions from those variables — but they are a design
reference, not a size the browser has to honour. The layout beneath was
already fluid, so removing the floor let it meet the real viewport.

**The top bar and status bar overhung the right edge by 98px at every
size.** Both are given `left: <sidebar width>; right: 0` by the desktop, and
both set `width: 100%` in their own stylesheets. For an absolutely
positioned box a used width beats `right`, so each resolved to the full
width of its containing block *starting 98px in* — pushing the clock cluster
off screen at 1920 as surely as at 1366. Restoring `width: auto` hands
sizing back to the left/right pair. This was present in the earlier RC
screenshots and I had missed it: the audit is what caught it.

**The widget column ran off the bottom below 900px.** 760px of widgets at a
82px top offset ends at 842 — 74px past a 768 viewport. The widgets are
frozen, so nothing was resized: the *column* is capped at the room between
its own top offset and the status bar and scrolls inside that cap. At 900
the available height is exactly 760, so the reference layout is untouched
and no scrollbar appears.

**The rail clipped its last two items at 768px.** Nine buttons plus the
brand plate and node monitor come to 894px. That clears 900 by 6px and does
not fit 768 — Explorer and Settings ran off the bottom with `overflow:
visible` on the rail and `overflow: hidden` on the desktop, so they were not
below a fold, they were unreachable. The button list now scrolls, and only
the button list: brand plate and node monitor keep their fixed positions.

Two things about that fix worth recording. It is **scoped to
`max-height: 899px`**, because binding the rail's content-sized ancestor
chain to the rail height would have stretched the chassis from 894 to 900 at
the reference size and moved the node monitor 6px. And the buttons are
pinned `flex: 0 0 auto` — without that the column simply squeezed nine 86px
keys into 64px each, which is resizing the design rather than fitting it.
Measured after the fix: 86px at 1366×768 and 86px at 1600×900, identical.

---

## Phase B — Window constraints

Measured at 1366×768, the tightest case. Workspace = `98,48 1020×670`.

| Behaviour | Result |
|---|---|
| Drag +4000,+4000 → titlebar stays in workspace | PASS — clamped to 206,114 |
| Drag −4000,−4000 → titlebar stays visible | PASS — clamped to 106,56 |
| Maximize respects workspace, not viewport | PASS — exactly 98,48 1020×670 |
| Restore returns to previous position | PASS — position unchanged |
| Session survives refresh | PASS — position and mode kept |

No page errors. No animation was changed.

---

## Phase C — Pixel alignment

Fractional boxes across production components: **46 → 29**, and every
remaining one is text-metric or data-driven. **No bordered element in any
v0.9 package component sits on a fractional coordinate.**

### What was fixed

The Toolbox split 20px of slack three ways with `justify-content:
space-between` — 6.667px per gap. Every cell after the first landed on a
fraction, and the 38px icon plates, which carry a **2px border**, inherited
it as a half-pixel left edge: `1376.5, 1430.16, 1483.81, 1537.47`. A 2px
border straddling a pixel boundary is antialiased, which is the blurred
bevel.

Four equal tracks divide the 208px container exactly (52px), and a 38px
plate centred in 52 sits at +7 — integer both times, at every viewport, with
no fractional transform and nothing resized. Measured after:
`1379, 1431, 1483, 1535`.

### What was deliberately left alone

| Class | Fraction | Why it stays |
|---|---|---|
| `cattipu-progress__fill` | `w=114.8` | 82% of a bar. Rounding it would misreport the value. |
| `cattipu-bottom-status-bar__meter-fill` | `w=94.72` | Same — a measurement, not a box. |
| `cattipu-right-widget-stack__tool-label` | `x=1432.5` | 35px of text centred in 52. No border; text is subpixel-positioned anyway. |
| `cattipu-sidebar-button__label` | `x=26.5` | 45px of text centred in 98. Same. |
| `cattipu-emboss-text`, `cattipu-cursor-hand`, `cattipu-field` | `h=9.11`, `h=31.5` | Line-box heights from the font, inside re-hosted app content. |

The "Pixel alignment: PASS" in the summary table means **no bordered
production component is fractional**, which is the defect Phase C describes.
It does not mean the DOM contains zero fractional rectangles — it cannot,
while text is centred and progress bars show real percentages, and a table
row claiming otherwise would be false.

---

## Phase D — Responsive safety

No layout was redesigned. Every fix is a CSS constraint on the integration
layer (`InteractiveDesktop.css`), except the Toolbox grid, which is a
locked component whose own grid produced the half-pixels.

- Oversized columns clamped, never rescaled — the widget stack and rail cap
  their height and scroll; nothing inside them changes size.
- No text overflow observed at any of the four sizes.
- No widget overlap at any size (measured pairwise against the window layer).
- Icon crispness preserved: the frozen marks still render at native 32/16
  with no scaling, and the Toolbox plates are now integer-aligned.

---

## Phase E — Artefacts

```
docs/FIT_AUDIT.md
Desktop_1366x768_RC2.png
Desktop_1440x900_RC2.png
Desktop_1600x900_RC2.png
Desktop_1920x1080_RC2.png
```

Build: typecheck 0 errors, lint 0 errors, tests 9/9, `next build` clean.
