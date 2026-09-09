# Milestone 2 Report — Dock: 1998 Workstation Control

Scope: left dock only. No Home Screen layout changes — verified by diff (only
`components/Dock/Dock.tsx`, `components/Dock/AppIcon.tsx` (docstring only, no logic change),
`store/useSettingsStore.ts`, and `app/globals.css` changed).

## Files changed (3 code files + globals.css)

- `components/Dock/Dock.tsx` — full rewrite of the well/hover/press/expand/keyboard behavior.
- `store/useSettingsStore.ts` — `DOCK_RAIL_WIDTH_PX.expanded` 196 → 184.
- `app/globals.css` — new `.cattipu-dock-well` (idle/hover/active bevel states), flattened
  `.cattipu-tooltip` shadow, updated `--dock-width-expanded` comment.

## Build items

**1–2. Recessed wells + active sink.** Every icon (not just active — already true after
Milestone 1) now sits in a `.cattipu-dock-well`, a dedicated class separate from the general
`.cattipu-recessed` primitive so dock-specific depth tuning doesn't ripple into every other
recessed surface in the app. Active state sinks the icon **2px** inward (within the requested
1–2px range) via `animate={{ y: active ? 2 : 0 }}` — previously (Milestone 1) this was `y: 1`
with a spring transition; now a short mechanical tween (see item 8).

**3. Mechanical hover.** Restored a hover effect — Milestone 1 had removed hover lift entirely
per its own instructions, this milestone explicitly asks for one back, differently specified:
`whileHover={{ y: -1 }}` (1px lift, only when the item isn't already active — a pressed switch
doesn't lift), paired with `.cattipu-dock-well:hover`'s stronger inset box-shadow. No glow
anywhere in this rule — checked, zero `filter`/blurred-glow properties on the well.

**4. Rail widths.** Collapsed 72px unchanged. Expanded changed 196px → 184px — this resolves
the discrepancy flagged when Milestone 2 was first scoped (shipped 196px vs. the newer dock
spec's 184px); this instruction is read as the answer to that open question. Verified via
Playwright: 72px collapsed, 184px expanded, exactly.

**5. 40×40 wells.** Well size is now `iconPx + 16` instead of the previous `iconPx + 8`. At the
default "md" icon size (24px) that's exactly 40×40 — verified via Playwright
(`wellBox: 40 x 40`). This scales with the existing Settings > Dock icon-size preference
(sm/md/lg = 16/24/32px) rather than removing that feature — at "sm" the well is 32×32, at "lg"
48×48. Optical centering: icon wrapped in `flex items-center justify-center`, unchanged
mechanism, now sized to match.

**6. Keyboard navigation.** Arrow Up/Down (existing, unchanged). Enter — native `<button>`
activation, no new code needed (confirmed via Playwright: focus Home → ArrowDown → Projects →
Enter → Projects window opens). **Escape closing the expanded state is new functionality**,
not present before this milestone: the rail previously only expanded on mouse hover or
"Always expanded" mode — a keyboard user tabbing into the dock got tooltips but never saw the
rail expand. Added a `keyboardExpanded` state, set on focus entering the toolbar and cleared on
Escape (or focus leaving the toolbar entirely). Verified: focusing an item expands the rail to
184px; Escape collapses it back to 72px.

**7. Tooltip delay.** 400ms → 300ms (`TOOLTIP_DELAY_MS`). Verified: absent at 200ms, present at
~350ms.

**8. Expansion animation.** Rail width transition changed from a Framer Motion spring
(`stiffness: 340, damping: 32`) to a 140ms tween with a standard non-bouncy ease curve — within
the requested 120–160ms range, no spring, no bounce. Applied the same treatment to the icon
hover/press y-offset (was also a spring) for one consistent mechanical character rather than
springy micro-motion on top of a now-linear rail.

**9. Icon normalization.** Every icon now renders inside a fixed square box sized to `iconPx`
(24×24 at default), verified via Playwright. The 11 source PNGs have differing intrinsic aspect
ratios (documented in `docs/COMPONENT_LIBRARY.md`'s `AppIcon` `DIMS` table — e.g. forge is
64×48, home is 54×54) — redrawing all of them to true squares was judged out of scope for a
dock-only milestone (real redesign risk to approved icon art, not a dock refinement), so each
icon is instead *contained* within the 24×24 box via `max-height`/`max-width` + `width/height:
auto`, letterboxing narrower/wider icons rather than stretching or cropping them. Outline
weight and lighting direction are properties of the existing PNG assets, not something a dock
component change can alter — spot-checked several icons visually (they already share a
consistent ~2px outline and top-left highlight by original design) rather than claiming a
normalization that would require redrawing assets this milestone didn't touch.

## QA pass

- **Modern shadows removed:** `.cattipu-tooltip`'s box-shadow had an 8px blur radius
  (`0 3px 8px rgba(...)`) — flattened to a hard 2px/2px zero-blur offset shadow, matching the
  construction rules used everywhere else in the shell. The dock rail's own `.cattipu-raised`
  shadow was already zero-blur (unchanged). The active-state LED's glow (`box-shadow` with a
  blur radius) was **left as-is** — it's a pre-existing, deliberately-scoped exception
  documented in its own CSS comment ("the one place on the shell chrome that color is allowed
  to glow"), an indicator-light effect rather than a depth/bevel shadow, and this milestone's
  scope is the well/hover/press mechanics, not every existing decorative effect.
- **Bevel depth unified:** idle/hover/active wells now use one 3-state system
  (`.cattipu-dock-well` base/`:hover`/`[data-active]`) instead of the ad hoc single-state
  recessed styling from Milestone 1.
- **Expanded/collapsed alignment verified:** icon column position doesn't shift between states
  (confirmed visually in the before/after screenshots — the well stays left-aligned, only the
  label fades in/out and the rail's right edge moves).
- **Pixel snapping:** all new dimensions (40, 24, 72, 184, 16 padding) are integers; no
  fractional CSS values introduced.

## Validation

```
$ pnpm lint    → clean, no errors/warnings
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright, exact measurements):

```
collapsed rail width: 72
well size: 40 x 40
icon container size: 24 x 24
expanded rail width: 184
tooltip at 200ms (should be 0): 0
tooltip at ~350ms (should be 1): 1
rail width after keyboard focus (expanded): 184
rail width after Escape (collapsed): 72
focus after ArrowDown from Home: Projects
Enter opened Projects: true
```

## Before / after

- Before: `m1-shots/03-dock-expanded.png` (Milestone 1 state — 196px expanded, 32×32 wells,
  hover-lift removed, no keyboard-expand, 400ms tooltip).
- After: `m2-shots/before-after-01-collapsed.png`, `before-after-02-expanded-hover.png`,
  `before-after-03-active-collapsed.png`, `before-after-04-keyboard-expanded.png`.

## What's still open

- The Settings > Dock icon-size preference (sm/16px, md/24px, lg/32px) still exists and scales
  wells proportionally; at sm/lg the icon isn't exactly 24×24. Removing that feature to force a
  single fixed size wasn't requested and would be a functionality change, not a dock refinement
  — flagged here rather than decided silently.
- Icon outline weight/lighting direction consistency is asset-level and unverified beyond a
  visual spot-check; a real audit would mean opening all 11 PNGs pixel-by-pixel.
