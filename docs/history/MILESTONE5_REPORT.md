# Typography & Spacing Refinement Report

Audit of all 10 named screens (Top bar, Dock, Desktop shortcuts, Projects,
Architect, Welcome card, Recent Projects, Architect Preview, System
Status, Toolbox) against `/docs` (`TYPOGRAPHY.md`, `DESIGN_CONSTITUTION.md`,
`COMPONENT_LIBRARY.md`) and the screenshot history from Milestones 1–4.
No layout architecture changed — every fix below is a font-family, size,
padding, or gap value on an element that already existed in its existing
position. Before/after screenshots: `m5-audit-before/` and
`m5-audit-after/`.

## Files changed

- `components/Dock/Dock.tsx` — label and tooltip text font-family fix,
  icon-to-label gap.
- `components/Window/ProjectsApp.tsx` — two buttons migrated onto the
  shared `CattipuButton`, project-row icon-to-text gap.
- `components/UI/Button.tsx` — icon-to-label gap (affects every
  `CattipuButton` call site: Toolbox, Recent Projects' "View all",
  Projects window).
- `components/Desktop/TopBar.tsx` — outer padding, icon-to-wordmark gap.
- `components/Desktop/ArchitectPreviewCard.tsx`,
  `components/Desktop/SystemStatusCard.tsx`,
  `components/Desktop/Toolbox.tsx` — section-header padding.

## The headline finding: dock labels weren't using the pixel font at all

Every dock item's label ("Home", "Projects", "Architect", …) and the
tooltip bubble that shows the same text were rendering in the modern body
font at `text-[13px] font-medium` / `text-[11px] font-medium` — not
`font-pixel-ui`. This is the single most visible instance of "accidental
modern font fallback" in the app: the dock is otherwise the most
carefully retrofitted piece of chrome in the whole shell (Milestone 2),
sitting directly under a correctly-pixel-font "v0.2.5" badge, and every
other chrome text anywhere else — window titles, section headers,
buttons, the top bar — already uses the pixel font. Confirmed via a
before screenshot (`m5-audit-before/02-dock-expanded.png`) showing plain
sans-serif labels next to blocky-font `v0.2.5`.

Fixed to `font-pixel-ui text-[0.45rem] tracking-wide leading-none` for
both the label and the tooltip (same size for both, since they show the
same string). `leading-none` was added because "Press Start 2P" computes
to roughly 1.5× line-height by default at this size (measured: 8.8px
font, 13.2px line box) — tight enough to matter for a label sitting next
to a fixed-height icon well. Verified live at 184px expanded rail width:
the longest labels ("Explorer", "Settings") still fit on one line with no
clipping or wrap (`m5-audit-after/02-dock-expanded.png`,
`zoom-dock-tooltip.png`).

This is explicitly a Milestone 5 exception to the Milestone 2/3/4 "dock
is frozen" instruction — this milestone names the dock as an audit
target, and the fix touches only label/tooltip *text* (font-family, size,
tracking, one gap value); the well geometry, bevel states, hover/press
mechanics, rail widths, and keyboard behavior from Milestone 2 are
untouched, confirmed by diff (only the two text spans and one gap class
changed in `Dock.tsx`).

## Second finding: the same action rendered in two different voices

`ProjectsApp.tsx`'s "+ New Project" and "Create" buttons used the same
modern-font pattern (`text-[13px] font-medium`) instead of
`CattipuButton` — while the *same action*, "New Project", already
appears correctly pixel-fonted and uppercase on the Home Screen's
Toolbox. Opening the Projects window showed the identical action in a
completely different typographic register depending on which screen you
were looking at it from. Migrated both onto `CattipuButton` (`variant=
"primary"`), which brings font, case, size, padding, and bevel in line
with Toolbox's "NEW PROJECT" automatically, and shrunk the Plus icon from
`h-3.5` to `h-3` to match Toolbox's icon size. No functional change —
same `onClick`/`type="submit"` wiring.

## Spacing: icon-to-label gap and section-header padding

Catalogued every icon+label horizontal pairing and section-header strip
across the 10 screens; found three off-grid gap values and two
inconsistent header-padding values, both against 8px-grid multiples used
everywhere else:

- **Icon-to-label gap** was `gap-3` (12px) in the dock, `gap-2.5` (10px)
  in the top bar's logo/wordmark group, and `gap-1.5` (6px) in
  `CattipuButton` and the Projects window's project rows — three
  different values for the same kind of pairing. Unified to `gap-2`
  (8px) everywhere in this family. In the dock this *tightens* the rail
  (12px→8px), which cuts the right way against "preserve the dense 1998
  workstation character" rather than loosening it; in the buttons and
  top bar it's a barely-perceptible 2px change.
- **Section-header horizontal padding**: Architect Preview, System
  Status, and Toolbox's navy header strips were all `px-3` (12px) —
  consistent with each other, but not with their closest sibling in the
  same card column, Recent Projects' header, which was already `px-4`
  (16px) and with the window title bar's own header padding set in
  Milestone 3 (also 16px). Standardized the three navy strips to `px-4`
  so every chrome-header row in the app now shares one padding value.
  Visible effect: "ARCHITECT PREVIEW" now starts at the same x-position
  as "RECENT PROJECTS" directly above it (compare
  `m5-audit-before/04-home-card-column.png` and
  `m5-audit-after/04-home-card-column.png`).
- `SystemStatusCard`'s `StatusRow` used `px-3.5` (14px) — a one-off value
  matching nothing else in the app. Changed to `px-4` to match its own
  card's header directly above it.

**Deliberately left alone:** `DesktopShortcutCard`'s icon-to-label gap
(`gap-1.5`, vertical stack) sits inside a fixed 72×72px button; tightening
or loosening it risks either overlap or overflow in a footprint that
can't grow ("do not enlarge everything"), so it stays as its own,
self-consistent value. `CattipuButton`'s own internal horizontal padding
(`px-2.5`/`px-3`, off-grid) was left untouched — every button using it is
already internally consistent with every other button via the shared
component, so there's no cross-element inconsistency to fix, and
adjusting it would change button width/density for a size class the
brief didn't flag as broken.

## Reviewed, no change needed

- **Section-header heights**: Architect Preview / System Status / Toolbox
  were already a consistent `h-7` (28px) before this pass. Recent
  Projects' header has no fixed height and sits on a plain background
  rather than a navy strip — a deliberately different structural role
  (an inline sub-header with an action button, embedded in the same card
  as its list, not a standalone card's title strip) rather than a bug;
  forcing it into the navy-strip treatment would be a structural change,
  out of scope for a typography/spacing pass. Its horizontal padding was
  already `px-4`, i.e. already at the value the other three headers are
  being brought up to.
- **Architect prompt field's placeholder vs. typed-value font split**
  (`font-code` placeholder, `font-body` value) — reviewed and left as
  Milestone 3 shipped it. This is a deliberate, previously-disclosed
  decision ("pixel placeholder" requirement), not an accidental leak, and
  the typed value is user prose — the same category of content
  (project names, descriptions) that correctly uses the body font
  everywhere else in the app.
- **Window title bar text, section-header text, "Generate" button,
  Toolbox button text**: all already `font-pixel-ui` with correct visual
  centering against their icons (checked at 3–4× zoom,
  `m5-audit-before/zoom-titlebar-text.png`,
  `zoom-toolbox-btn.png`) — no baseline drift found once the dock and
  Projects-window fixes above brought the rest of the app in line with
  what these elements were already doing correctly.
- **SVG node labels in the Architect Preview card** (API/AUTH/CORE/DATA)
  already use `font-code` inline — appropriate for a technical-diagram
  readout, consistent with the real Architecture Canvas.
- **Text wrapping**: `DesktopShortcutCard`'s "My Projects" (2-line,
  `line-clamp-2`) vs. "Archive"/"Templates" (1-line) — each shortcut is
  its own independently centered 72×72 button, so the differing wrap
  doesn't create any visible misalignment between them; not a defect.

## Validation

```
$ pnpm lint    → clean, 0 errors (1 unrelated warning in a scratch verify
                 script that isn't part of the shipped app or this commit)
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright):

```
tooltip font-family: "Press Start 2P", ui-monospace, monospace
dock rail expanded — longest labels (Explorer, Settings) fit, no clipping
```

Full before/after screenshot sets in `m5-audit-before/` and
`m5-audit-after/`, covering all 10 named screens plus targeted zooms.

## What's still open

- `docs/TYPOGRAPHY.md`'s own survey (the arbitrary 0.4rem–0.75rem
  `font-pixel-ui` size ramp, and the `text-sm`/`text-[13px]` body-size
  split) is unchanged and still accurate as a description of the code —
  this pass fixed specific font-family and spacing defects, not the
  broader "no single canonical type scale" condition that document
  already flags as a known, undecided question for future work.
- `CattipuButton`'s own internal padding scale (`px-2.5`/`px-3`) remains
  a one-off pair not derived from the 8px grid — flagged above as
  deliberately out of scope this pass, not fixed.
