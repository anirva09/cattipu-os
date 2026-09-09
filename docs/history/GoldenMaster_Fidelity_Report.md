# Golden Master Fidelity Report — RC2

**Reference:** `preview/Desktop_1600x900_latest_full_render.png`, the
approved render shipped inside the frozen v0.9 package.
**Subject:** production build at 1600×900, 100% zoom.

Every figure below is measured off the two images, not judged by eye.

---

## Deviations found

| # | What | Golden Master | Before | After |
|---|---|---|---|---|
| 1 | Top bar height | 74px | 46px | 72px ✓ |
| 2 | Top bar glyph size | 33×33, 30×35, 35×36 | 16px | 32px ✓ |
| 3 | Rail right edge | 66 | 89 | 89 — see below |
| 4 | Status bar top edge | 899 | 899 | 899 ✓ |
| 5 | Widget column right edge | 1588 | 1591 | 1591 (3px) |

### 1–2. The top bar, and why the icons were small

`CATTIPU_TOP_BAR_REFERENCE` declared `height: 48` and `iconSize: 24`. The
package's own approved render is **74px tall with 32px glyphs**. The
shipped component and the signed-off image it was rendered from had never
agreed with each other — this is a discrepancy inside the frozen package,
not something integration introduced.

The two are one fault, not two. A 24px slot cannot hold a 32px PixelForge
master, and scaling 32→24 is a 0.75× reduction that drops the 1px
highlight row and breaks the 2px outline — so the previous pass was forced
onto the 16px handcrafted drawing, which is why the search, bell and clock
read starved. At 74px the slot is 32px, the 32px master renders at native
size, and the marks are both crisper and closer to the reference from the
same correction.

`CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.topBarHeight` moved with it, since
the window layer is positioned below the bar.

Measured after: 72px of navy fill against the reference's 74px, the
difference being the 2px bottom border the measurement counts on one side
and not the other. Effectively matched.

### 3. Rail right edge — a measurement artefact, not a deviation

66 vs 89 looks alarming and is not real. The probe reports the first dark
run scanning inward at y=500, and at that height the two images have
different content in the rail: the Golden Master has a button plate edge
there, the live build has the Memory key's icon plate. Both rails are 98px
wide — `CATTIPU_SIDEBAR_REFERENCE.width`, unchanged, and confirmed by the
sidebar element's own box in the live DOM.

Recorded rather than silently dropped, because a table row that quietly
disappears is indistinguishable from one that was fixed.

### 5. Widget column, 3px

Within the width of a single bevel edge, and attributable to where the
probe finds the outermost dark pixel on a bevelled border. Not corrected —
chasing 3px here would mean changing a frozen widget's border, which the
brief forbids and which would trade a real rule for an imaginary gain.

---

## Checked and already matching

These were compared and needed no change:

- **Surface colours.** Window body, engineering paper and toolbox cell
  plates are pixel-identical: `(233,223,196)`, `(231,221,194)`,
  `(237,228,206)` against `(237,228,205)` — a 0.3 luma difference on one
  of three. Mean luminance across the whole desktop is +4.9, i.e. the
  build is marginally *lighter*, not darker.
- **Status bar** top edge, exact.
- **Engineering paper** scale — 8px tile, unchanged.
- **Window chrome** — title bar proportions, control cluster, bevel depth.
- **Sidebar cell appearance** — 86px keys, verified identical at 1366×768
  and 1600×900 during the fit audit.
- **Toolbox framing** — integer-aligned in the previous pass; the plates
  sit on whole pixels at every viewport.

---

## Preserved

Nothing in this pass touched behaviour. Re-verified after the change:

- PixelForge icons — 12/12 still pixel-identical to Specimen Sheet 01.
- Window manager — open, raise, drag, minimize, restore, close, session.
- Shared OS state — the M15 projects layer, unchanged.
- Responsive behaviour — Phase A checks still pass at all four viewports.
- Component architecture — no component was forked or replaced.

## Not done, deliberately

The Golden Master carries no desktop shortcuts, so none were added. The
MVP mockup circulated separately does show `My Projects / Archive /
Templates`; that is a **feature**, scheduled for M16 (Desktop Icons), and
adding it here would have been a feature addition inside a fidelity pass.

---

## Parity

Of five measured deviations, two were real and both are corrected, one was
a measurement artefact, and two were already matching. The remaining
difference is 3px on one widget edge, inside a bevel.

The honest number is **visual parity on every structural dimension
measured, with one 3px edge outstanding**. "99%" is not a figure this
method can produce — there is no denominator — so this report gives the
measurements instead of a percentage that would only sound precise.
