# Milestone 1 Report — Home Screen Refinement

Scope: refine Top Bar, Dock, Desktop Shortcuts, Welcome Card, Recent Projects, Architect
Preview, System Status, and Toolbox per the CATTIPU workstation language, plus a pixel
consistency pass. Layout position of the shell (dock, top bar, desktop-icon corner) is
unchanged; three of the eight named sections didn't exist before this milestone (see
`docs/HOME_SPEC.md`) and had to be built, not just restyled — flagged throughout below rather
than presented as if they were already there.

## Files changed (14)

**New:**
- `components/Desktop/DesktopShortcutCard.tsx`
- `components/Desktop/CattipuButton.tsx`
- `components/Desktop/ArchitectPreviewCard.tsx`
- `components/Desktop/SystemStatusCard.tsx`
- `components/Desktop/Toolbox.tsx`
- `public/icons/templates.png` + `scripts/draw-templates-icon.py`

**Edited:**
- `components/Desktop/TopBar.tsx`
- `components/Desktop/Desktop.tsx`
- `components/Desktop/DesktopIcons.tsx`
- `components/Dock/Dock.tsx`
- `components/Dock/AppIcon.tsx` (added `templates` to the icon `DIMS` table)
- `app/globals.css` (`.cattipu-drafting-paper`, `.cattipu-pixel-bar`)
- `lib/apps.ts` (added `TEMPLATES_APP`)
- `store/useWindowStore.ts` (added `"templates"` to `AppId`)

## Per-section notes

**1. Top Bar.** The bevel/emboss treatment was already in place (`.cattipu-raised-navy`,
`.cattipu-well-navy`, `.cattipu-emboss-text-inverted`); what changed is the item set — Sun and
Volume glyphs are gone, replaced with the exact 6 items requested. Three interpretation calls,
since none of these existed before: **Current Project** — there's no "active project" concept
anywhere in the app, so this shows the most recently edited project from the real store
(`projects[0]`), not invented data. **Search** — reuses the existing `CommandPalette` (⌘K)
rather than building a second search surface; the button dispatches the same keyboard event
its own listener already handles, so `CommandPalette.tsx` wasn't touched. **Bell** — no
notification system exists; left as a visual, non-interactive glyph rather than fabricating
fake notifications. **Menu** — opens Settings, the closest existing system-menu surface. Clock
text now uses `font-code` (VT323, tabular) instead of the default body font, for crisp bitmap
numerals.

**2. Dock.** Every icon now sits in a `.cattipu-recessed` well at rest, not just the active
one. The hover `whileHover={{ y: -1 }}` lift is removed entirely (no more animate-on-hover).
Active state now nudges the icon *down* into its well (`y: 1`, was `y: -2`, which had visually
read as the icon popping *up*) plus a navy tint, so pressed and idle are unambiguous at a
glance.

**3. Desktop Shortcuts.** New `DesktopShortcutCard` (72×72, 24×24 icon, centered
`font-pixel-ui` label) replaces the inline buttons in `DesktopIcons.tsx`. Default set is
exactly My Projects / Archive / Templates per the explicit list — **the previous CATTIPU/About
shortcut is dropped**, since it isn't in that list. The logo stays reachable via the top bar
badge. Templates needed a real icon asset that didn't exist anywhere in the repo
(`public/icons/` had no `templates.png`) — drew one at the same construction the other icons
use (navy outline, flat fill, hard pixel steps, no anti-aliasing), documented in
`scripts/draw-templates-icon.py`. "Templates" also needed a real `appId` to open — added
`"templates"` to `AppId` and a `TEMPLATES_APP` entry (same pattern as the existing `ABOUT_APP`
— a desktop-shortcut-only entry, not a dock app), which falls through to the existing
`PlaceholderApp` with zero new window code. Drag/rename/snap-to-grid are intentionally **not**
included — that's the separately-scoped "Desktop shortcuts (drag, rename, snap-to-grid)"
milestone, not this one.

**4. Welcome Card.** Illustration (`DeskScene`) unchanged. No decorative status pills existed
to remove — checked, none found, nothing to do there. The only real "button" on the card was
the "View all" text link; converted to a `CattipuButton` (small/secondary variant), which is
the closest match to "physical molded switches" for what actually existed. The card's outer
container changed from a soft `rounded-xl`/`border-border`/faint-shadow treatment (the kind of
"modern Tailwind appearance" this milestone targets) to `.cattipu-raised`.

**5. Recent Projects.** Each row is now `.cattipu-recessed`. There is no progress field
anywhere on `Project` (checked `store/useProjectStore.ts` — id/name/icon/color/editedLabel/
architecture only), so rather than invent a percentage, each row shows a real two-state signal
via the new `.cattipu-pixel-bar`: full when the project has generated Architecture data,
a short starter sliver when it doesn't. Spacing normalized to 8px-multiple padding
(`px-3 py-2`, `gap-1.5`) in place of the previous `px-3.5 py-2.5`.

**6. Architect Preview.** Didn't exist before this milestone. There was no "existing graph" to
keep, so this is a new, small, non-interactive preview — a static 4-node diagram using the same
node-accent colors as the real Architect app, on the new `.cattipu-drafting-paper` background
(a CSS blueprint-grid lookalike, not a copy of `ArchitectureCanvas.tsx` — the real component is
untouched). No blur/glow anywhere. Clicking it opens the real Architect app via the existing
`openApp` action.

**7. System Status.** Also didn't exist before. Rather than fabricate uptime/metrics, every row
reflects real state already in `useSettingsStore` (sound on/off, cursor on/off, dock mode) plus
one static "Desktop: Ready" row — embossed label + status dot + `font-code` value, no invented
numbers.

**8. Toolbox.** Also new. Built the shared `CattipuButton` component first (wraps the existing
`.cattipu-btn` bevel — already used ad hoc elsewhere — in one component with `primary`/
`secondary` variants) and used it for all four Toolbox actions (New Project, Architect,
Explorer, Settings) plus the Welcome card's "View all". Every button on the refined Home
Screen now shares this one implementation.

## Layout note

Adding Architect Preview / System Status / Toolbox to a screen that previously only had a
Welcome card necessarily grows that floating region — it went from a fixed `22rem` card to a
`min(90vw, 26rem)` column containing all five sections stacked. The dock, top bar, and
desktop-icon corner position are unchanged; this is the one place "keep the existing layout"
and "refine these components" were in tension, resolved in favor of actually building the
sections that were explicitly listed.

## Pixel consistency pass

Within the files touched this milestone: corner radius normalized to two values —
`rounded-md` (6px) for panel-level containers (Welcome card, Recent Projects panel, Architect
Preview, System Status, Toolbox), `rounded-[5px]` for small interactive elements (buttons,
shortcut cards, project-row items, icon badges) — matching the radius already used by the dock
items and existing buttons elsewhere. Bevel depth: every new panel uses the existing
`.cattipu-raised`/`.cattipu-recessed` primitives rather than inventing new shadow values.
Shadows: no new soft/blurred shadows introduced anywhere in this milestone's files. Icon
outlines: the new Templates icon uses the same 2px navy outline as the existing icon set.
Bitmap text: every label added this milestone uses `font-pixel-ui` (chrome/labels) or
`font-code` (numeric/technical), never the default body font, matching
`docs/TYPOGRAPHY.md`'s documented family rule. This pass was scoped to Home Screen files only,
per "refine these components only" — it is not a site-wide normalization (the six-radius
inconsistency documented in `docs/DESIGN_TOKENS.json`'s corner-radius survey still exists
elsewhere in the app).

## Validation

```
$ pnpm lint    → clean, no errors/warnings
$ pnpm build   → clean, First Load JS 141kB → 142kB (+1kB)
```

Live-verified against a production server (`next start` + Playwright): full desktop screenshot,
top bar close-up, dock expanded state, desktop shortcuts close-up. Functional checks: Search
button opens the real command palette (confirmed), Menu opens Settings (confirmed), Templates
shortcut opens a window via the existing `PlaceholderApp` with no console errors (confirmed).
Canvas, Forge, Explorer, and Architect's actual functionality were not touched — verified by
diff (only the files listed above changed).

## What's still open

- Window chrome (title bar height/controls/chamfer) still doesn't match the tokens defined in
  the previous sub-sprint — out of scope for this milestone, unchanged.
- Bell has no real notifications behind it; Menu's mapping to Settings is a placeholder
  decision, not a designed "system menu."
- Site-wide (non-Home-Screen) pixel consistency — corner radii, bevel depth — is untouched.
