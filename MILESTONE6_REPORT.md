# Mechanical Surface Consistency Report

A full audit of every `box-shadow`, `border`, and `border-radius` declaration
in `app/globals.css`, plus every ad hoc (non-shared-class) bevel/radius
value in the component tree, cross-referenced against the milestone's
named properties (outer bevel, inner bevel, border thickness, highlight
edge, shadow edge, recessed/raised state, chamfer size, surface
background) and its named inspect targets (Buttons, Inputs, Textareas,
Window frames, Cards, Dock buttons, Desktop shortcut tiles, Project rows,
Status panels, Toolbar controls, Small title-strip buttons). No panel was
redesigned — every fix below is a shadow-blur, border, or radius value on
a surface that already existed in its existing position. Screenshots:
`m6-audit-after/`.

## Files changed

- `app/globals.css` — the primary target. Zero-blur fix on every pressed
  or recessed state that still had a soft inset/drop shadow, a missing-
  border fix and radius unification across the three small navy-well
  primitives, a dropped floating drop-shadow on the window-focus glow, a
  hard pixel-offset shadow on the React Flow toolbar controls, and a new
  `.cattipu-chamfer` class merged onto the existing window-chamfer rule.
- `components/UI/Button.tsx`, `components/Dock/Dock.tsx`,
  `components/Desktop/DesktopShortcutCard.tsx`,
  `components/Desktop/Desktop.tsx`, `components/Window/ProjectsApp.tsx` —
  removed one-off `rounded-[5px]`/`rounded-lg`/`rounded-md` values from
  every control-tier element (buttons, dock wells, desktop shortcut
  tiles, project rows) so the whole tier is hard-square, consistently.
- `components/CommandPalette/CommandPalette.tsx` — the headline finding;
  see below.

## The headline finding: one surface built entirely outside the molded-plastic system

The Command Palette (⌘K) was the only visible cream/gray surface in the
whole app that didn't use any `cattipu-*` bevel class at all. It was a
plain Tailwind card: `rounded-xl` (12px — the largest radius anywhere in
the shell), a 1px `border-border-strong` keyline instead of the 2px
embossed border every other panel uses, the lighter `--color-surface`
background instead of the `--color-surface-solid` "molded_panel" token
every raised card/window/panel uses, and a `0 24px 60px` 60px-blur
floating drop shadow — precisely the "modern card shadow... glass effect"
this pass is supposed to remove everywhere else. It reads like a
component dropped in from a different, more generic design system,
sitting on top of a shell where every other surface is deliberately
built from the same six or seven bevel primitives. This is the M6
equivalent of Milestone 5's dock-font finding: one piece of UI rendering
in a completely different visual language from everything around it.

Fixed by swapping its outer container onto `cattipu-raised cattipu-chamfer
bg-surface-solid` — the same hard-bevel, hard-4px-chamfer, molded-panel
background every window and Panel already uses — and dropping the ad hoc
border and shadow entirely. Size, position, entrance motion (the spring
tween — a motion property, out of this pass's surface-only scope), and
every child row/input/kbd-chip are unchanged. Verified live:
`box-shadow` on the container now reads as the zero-blur `cattipu-raised`
triple-shadow (`m6-audit-after/08-command-palette.png`), and
`background-color` reads `rgb(232, 216, 197)` (`--color-surface-solid`,
was the lighter `--color-surface`).

## Box-shadow blur: eleven violations flattened to hard pixel edges

Audited every `box-shadow` in `globals.css`; every *idle* raised/pressed
state was already zero-blur, but eleven *recessed or pressed* states
still carried a soft 2-5px blur radius — the one place "modern" softness
had survived in an otherwise hard-edged system. All flattened to the
same offset, same opacity, zero blur, matching `.cattipu-raised`,
`.cattipu-btn` (idle), `.cattipu-window-control` (idle), and every other
already-hard primitive:

- `.cattipu-recessed` (4px→0) — the single most-used recessed surface in
  the app: window content areas, tab panels, System Status's row group.
- `.cattipu-badge` (2px→0) — dock/window logo housing.
- `.cattipu-recessed-navy`, `.cattipu-well-navy` (2px→0 each) — top bar
  status glyph wells.
- `.cattipu-folder-tab-active` (3px→0) — Architect's active panel tab.
- `.cattipu-btn:active`, `.cattipu-window-control:active`,
  `.cattipu-switch:active` (3px/3px/5px→0) — every button/control's
  pressed state; idle and disabled states were already hard.
- `.cattipu-field:focus`'s base recessed shadow (3px→0) — Input/Textarea/
  the Architect prompt field.
- `.cattipu-segments > span`, `.cattipu-pixel-bar` (1px/2px→0) — Build
  Playback's progress readouts.
- `.cattipu-flow .react-flow__controls` (8px→0, "Toolbar controls") — the
  zoom/fit-view/lock cluster on the Architect canvas had a genuine
  floating drop shadow (`0 2px 8px`), not just a soft inset — replaced
  with the same hard `2px 2px 0` pixel-offset shadow `.cattipu-tooltip`
  already uses for a small chrome element sitting on top of content.
- `.cattipu-window-glow` — dropped its accompanying `0 16px 40px`
  40px-blur cast shadow entirely (not flattened — removed). A physical
  molded panel doesn't cast a soft floating shadow; the hard 1px focus
  ring stays as the real "this window is focused" cue.

Verified via computed `box-shadow` on `.cattipu-recessed`,
`.cattipu-badge`, and `.cattipu-dock-well` — all report a `0px` blur term
on every shadow layer.

## Border thickness, highlight/shadow edge, chamfer size: the small navy-well family

`.cattipu-badge`, `.cattipu-recessed-navy`, and `.cattipu-well-navy` are
"the same physical material" — a small recessed or raised glyph housing
on navy chrome (top bar icon wells, dock logo badge) — but disagreed on
every property this milestone names:

| | border | radius |
|---|---|---|
| `.cattipu-badge` | 2px | 6px |
| `.cattipu-recessed-navy` | none | 5px |
| `.cattipu-well-navy` | none | 4px |

Unified to one 2px border and one 4px radius across all three (added the
missing border to the two navy wells rather than removing `.cattipu-
badge`'s, since a border keyline is what makes the embossed edge read as
routed/molded rather than just a color transition — visible in the top
bar zoom, `m6-audit-after/09-topbar-zoom.png`, where the search/bell
wells now show a hard keyline they didn't have before).

## Chamfer size / corner-radius: a real two-tier system, made consistent within each tier

Auditing every `rounded-*` value across the component tree (not just
`globals.css`) surfaced a much larger, pre-existing pattern than the
brief's short inspect list implied: the app already has two legitimate
corner-radius tiers, and within one of them the same UI role was
rendered at three different values depending on which screen you were
looking at it from.

**Card tier (unchanged, confirmed consistent):** every raised/recessed
"card" surface — the Home Screen's Welcome card, Recent Projects
wrapper, Architect Preview, System Status, Toolbox, *and* every Architect
sub-panel card (Planner, Recommendations, API Catalog, Database, Roadmap,
canvas nodes, the empty-state card, Export Center) — already uses the
identical `cattipu-raised`/`cattipu-recessed` + `rounded-md` (6px) +
`bg-surface-solid` combination. This tier was already internally
consistent app-wide; moving only the Home Screen subset onto the window
chamfer (which is what I initially planned, before this broader audit)
would have *created* a fresh inconsistency between Home Screen and
Architect cards rather than fixed one, so the card tier is left exactly
as it was. Confirmed by computed style: System Status and Toolbox both
report `border-radius: 6px` after this pass, unchanged.

**Control tier (the actual fix):** buttons, project rows, tiles, and
wells — a materially different, smaller-scale role — were scattered
across `rounded-[5px]`, `rounded-lg` (8px), and `rounded-md` (6px), with
the same conceptual role rendered at different values in different
places. Most visibly: **"Project rows"** (explicitly named this
milestone) — the Projects app's own row list used `rounded-lg` while the
Home Screen's Recent Projects list, showing the *same* project data,
used `rounded-[5px]`. Squared every control-tier instance to hard 0,
which both resolves that specific inconsistency and matches this
milestone's "hard pixel edges... no rounded SaaS cards" instruction more
literally than any single non-zero value would:

- `components/UI/Button.tsx` (`CattipuButton`, used by Toolbox, Recent
  Projects' "View all", the Projects window's "New Project"/"Create")
- `components/Window/ProjectsApp.tsx` project rows + their icon-tint
  squares
- `components/Desktop/Desktop.tsx` Recent Projects rows + their
  icon-tint squares
- `components/Desktop/DesktopShortcutCard.tsx` ("Desktop shortcut
  tiles," explicitly named)
- `components/Dock/Dock.tsx`'s `.cattipu-dock-well` (see the dock
  exception below) and its matching `.cattipu-dock-item:focus-visible`
  ring radius, so the keyboard focus ring still hugs the well it
  surrounds
- `.cattipu-field`, `.cattipu-switch`, `.cattipu-window-control` were
  already 0 — confirmed, no change needed.

Verified via computed `border-radius`: `CattipuButton`, the Architect
`.cattipu-field` and `.cattipu-switch`, both Project-row implementations,
the desktop shortcut tile, and the dock well all report `0px`.

## Scoped exception: the dock's box-shadow blur and well radius

"The dock is frozen" has held since Milestone 2 for geometry, spacing,
and interaction mechanics — untouched again here (well size, rail width,
hover/press Y-translation, rail expand/collapse animation are all
unchanged). This milestone is the first to explicitly name "Dock
buttons" as an inspect target *and* "Chamfer size" as a normalized
property together, which — following the same disclosed-exception
pattern Milestone 5 used for the dock's label font — licenses touching
exactly those two cosmetic properties: `.cattipu-dock-well`'s box-shadow
blur (3-5px, the softest inset shadow in the file) and its Tailwind
`rounded-[5px]`. Left unsquared, the dock icon wells would be the one
remaining rounded-corner outlier sitting directly beside the now-square
Desktop Shortcut tiles — a near-identical "app launcher icon" role
rendered with two different corner treatments. Confirmed by diff: only
the well's `box-shadow` values and its own radius (plus the matching
focus-ring radius) changed in this file; nothing else in the Milestone 2
dock block was touched.

## Reviewed, no change needed

- **`.cattipu-window-frame`'s clip-path chamfer** (Window.tsx, Panel.tsx)
  — already the correct hard 4px chamfer this whole pass measures every
  other "should this be a chamfer or a radius" decision against; no
  change. Its selector now also serves the new `.cattipu-chamfer` alias
  (merged, not duplicated) for the Command Palette fix above.
- **Architect's sub-panels and Export Center** (PlannerPanel,
  RecommendationsPanel, ApiCatalogPanel, DatabasePanel, RoadmapPanel,
  ArchitectureCanvas node cards, ArchitectApp's empty state,
  ExportCenter) — audited; all already sit on the card-tier `cattipu-
  raised`/`cattipu-recessed` + `rounded-md` + `bg-surface-solid`
  combination, already mutually consistent with each other and with the
  Home Screen cards, and not named in this milestone's inspect list.
  Left untouched rather than expanding into a wider redesign than "do
  not redesign any panels" allows — they benefit for free from any
  `cattipu-raised`/`cattipu-recessed`/`cattipu-btn` CSS-level fix above,
  since they consume the same shared classes.
- **SettingsApp, FileExplorerApp, AboutApp** — same reasoning: not named
  in the inspect list, not part of the mechanical-surface primitive
  system this pass touches, left untouched.
- **`.cattipu-led`, `.cattipu-segments[data-filled]`, the
  `cattipu-edge-pulse` keyframe, `.cattipu-construction-ring`** — glow
  effects on active-state/animated indicators, an established exception
  (LED-style feedback, not a static surface) carried forward from every
  prior milestone; still not touched.
- **`.cattipu-raised-navy`'s border-bottom-only construction** — relies
  on its parent's own border for the other three edges by design (top
  bar, title bars); not a missing-border bug.
- **`.cattipu-folder-tab`'s asymmetric tab-shape radius** (`5px 9px 0 0`)
  — a genuinely different shape (a file-folder tab), not an inconsistent
  card/control radius.
- **The Command Palette's ⌘K key-chip and its result-row `rounded-md`**
  — reviewed, deliberately left alone. The chip is a tiny, low-risk
  detail not named in scope; the rows already matched the card-tier
  radius and squaring them (unlike the outer shell) would be a
  standalone visual change to a component this milestone doesn't name,
  beyond the specific "different material system" bug the outer
  container had.

## Validation

```
$ pnpm lint    → clean, 0 errors (same pre-existing unrelated warning in
                 a scratch verify script, not part of the shipped app)
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright), computed styles:

```
.cattipu-recessed   box-shadow → 0px blur on both layers (was 4px)
.cattipu-badge       box-shadow → 0px blur; border-radius: 4px (was 6px)
.cattipu-dock-well   box-shadow → 0px blur; border-radius: 0px (was 5px)
DesktopShortcutCard  border-radius: 0px (was 5px)
Recent Projects row  border-radius: 0px (was 5px)
ProjectsApp row      border-radius: 0px (was 8px) — now matches the row above
CattipuButton        border-radius: 0px (was 5px)
.cattipu-field        border-radius: 0px (unchanged, confirmed)
.cattipu-switch       border-radius: 0px (unchanged, confirmed)
SystemStatusCard      border-radius: 6px (unchanged, confirmed — card tier)
Toolbox card          border-radius: 6px (unchanged, confirmed — card tier)
Command Palette shell box-shadow → cattipu-raised zero-blur triple shadow
                       (was 60px-blur drop shadow); background-color:
                       rgb(232,216,197) = --color-surface-solid (was
                       --color-surface)
```

Full screenshot set in `m6-audit-after/`: home screen, dock (expanded),
desktop shortcuts, the Projects window, the Architect window, System
Status, Toolbox, the Command Palette, and a top-bar zoom showing the
now-bordered status wells.

## What's still open

- The card tier's own radius value (`rounded-md`, 6px) is not derived
  from any documented token — `DESIGN_TOKENS.json`/`DESIGN_CONSTITUTION.md`
  don't name a control-radius or card-radius constant the way
  `--window-chamfer` names the window value. It's consistent everywhere
  it's used, which was this pass's job, but formalizing it as a real
  `--card-radius` token (the way `--window-chamfer` already is) is a
  documentation/token-cleanup item, not a visual bug, and out of scope
  for a surface-consistency pass.
- `SettingsApp.tsx` and `FileExplorerApp.tsx` still carry their own
  mix of `rounded-md`/`rounded-lg`/`rounded-xl` one-off values,
  independent of both the card and control tiers established here —
  flagged above as out of this milestone's named scope, not fixed.
