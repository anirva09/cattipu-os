# Milestone 3 Report — Window Chrome Retrofit

Scope: window chrome and shared window/field/button primitives only. The
dock (`components/Dock/`, `store/useSettingsStore.ts`'s dock constants) was
not touched — verified by diff. Home Screen layout (`TopBar.tsx`, the
Milestone 1 cards, `Toolbox.tsx`'s visual treatment) was not redesigned;
`Toolbox.tsx`'s only change is its `CattipuButton` import path, see below.

## Files changed

- `components/Window/Window.tsx` — title bar height, controls, and frame
  corners retrofitted.
- `components/Architect/PromptBar.tsx` — prompt field and Generate button
  retrofitted ("Most Important" item).
- `components/Window/ProjectsApp.tsx` — "New Project" name field migrated
  onto the new shared `Input`.
- `components/UI/Button.tsx` (new) — relocated from
  `components/Desktop/CattipuButton.tsx`, same export name and behavior.
- `components/UI/Input.tsx` (new), `components/UI/Textarea.tsx` (new) —
  shared "workstation field" primitives.
- `components/UI/Panel.tsx` (new) — chamfered/raised panel with an
  optional navy header strip. Built and available; not force-adopted
  anywhere this milestone (see "Shared components" below).
- `components/Desktop/CattipuButton.tsx` — deleted (moved to
  `components/UI/Button.tsx`).
- `components/Desktop/Desktop.tsx`, `components/Desktop/Toolbox.tsx` —
  import path updated to the new `Button` location only; no visual change.
- `app/globals.css` — new Milestone 3 CSS block (`.cattipu-titlebar`,
  `.cattipu-window-frame`, `.cattipu-window-control`, `.cattipu-field`,
  `.cattipu-switch`) plus a scrollbar retrofit. Nothing in the Milestone 2
  dock block was edited.

### Note on file history — please read before reading the diff

`components/Window/Window.tsx`, `components/Window/ProjectsApp.tsx`, and
`components/Architect/PromptBar.tsx` are being committed here for the
**first time** — like `Desktop.tsx`/`TopBar.tsx`/`useWindowStore.ts` in the
Milestone 1 commit, they were never committed in any prior sprint despite
being fully built and running. Their diffs in this commit therefore carry
their entire pre-existing implementation (window drag/resize, the full
Projects CRUD list, the full Architect prompt/generate wiring), not just
this milestone's chrome changes. The actual Milestone 3 edits to each file
are small and are described item-by-item below; everything else in those
three files is prior, unmodified functionality now entering Git for the
first time as a side effect.

## Section-by-section

**1. Title Bar.** `Window.tsx`'s title bar: `h-11` (44px) → exactly
`var(--window-title-bar)` (40px, set via inline style so the token is
literally consumed rather than a same-numbered Tailwind class re-guessing
it). Bevel changed from the general-purpose `.cattipu-raised-navy` to a
new dedicated `.cattipu-titlebar` class with the spec's literal edge
weights: `border-bottom: 2px` dark lower edge, `inset 0 1px 0` white
highlight top edge (previously 1.5px/4px via the shared navy-raised
primitive, which is still used unchanged elsewhere — top bar, dock badge).
Spacing changed from `px-3`/`gap-3` (12px, off-grid) to `px-4`/`gap-4`
(16px, an 8px-grid multiple) between the icon+title group and the controls
group; the icon-to-title gap stayed `gap-2` (8px), already on-grid.
Pixel title text (`font-pixel-ui`) unchanged.

**2. Window Controls.** Minimize / Stack (workspace expand) / Close, same
order as before. Size: `h-6 w-7` (28×24) → `h-6 w-6`, exactly
`var(--window-control)` (24px) via the new `.cattipu-window-control` class,
which sets both dimensions directly off the token. Removed `bg-gold` /
`bg-blue` / `bg-red` fills entirely — all three buttons now share one
neutral molded-key treatment (cream `--color-bg-dim` face, `--color-ink`
icon) and are told apart only by icon glyph (Minus / Layers / X), never
color. Idle / hover / pressed are distinct: hover brightens the face
slightly, pressed (`:active`) sinks the button 1.5px and swaps to an
inset-only shadow — a small `WindowControl` wrapper component was factored
out inside `Window.tsx` so all three share exactly the same markup rather
than three near-duplicate buttons.

**3. Window Frame.** The outer frame previously mixed `rounded-md` (outer),
`rounded-t-[3px]` (title bar), and `rounded-b-[3px]` (content) — three
separate soft radii. All three are removed. A new `.cattipu-window-frame`
class applies one `clip-path: polygon(...)` to the outer frame only, built
from `var(--window-chamfer)` (4px) — a true flat-cut corner, which
`border-radius` cannot produce. The title bar and content area no longer
carve their own corners; the parent's clip-path is the single source of
the window's shape (the same role `overflow-hidden` + the old radii
played, not stacked on top of it). 2px outer border and the inset
highlight/shadow bevel were already present via `.cattipu-raised`, kept
unchanged. Content inset: the existing `.cattipu-recessed` border/bevel on
the content area is unchanged and reads as consistently recessed relative
to the frame — see the open item below on `--window-content-inset`.

**4. Content Surface.** The content wrapper (`.cattipu-recessed
bg-surface-solid`) already reads as molded cream plastic; this item is
mostly inherited once the field/button primitives below exist. No changes
made directly to the content wrapper itself beyond removing its now-
redundant `rounded-b-[3px]`.

**5. Architect Window (Most Important).** `PromptBar.tsx`'s textarea:
was `.cattipu-recessed` with `rounded-[5px]` — "looks like a modern
textarea." Migrated onto the new `Textarea` component
(`components/UI/Textarea.tsx`), which uses a new `.cattipu-field` class:
square corners (`border-radius: 0`), the same inset bevel depth as
`.cattipu-recessed`, plus one extra outer highlight line beneath the
border so the border itself reads as embossed/routed rather than a flat
CSS line. Placeholder text now renders in `font-code` (the pixel
monospace, VT323) instead of the default body sans-serif — "pixel
placeholder." The Generate button: was `.cattipu-btn` with `rounded-[5px]`
— "resembles a modern CTA." Now uses a new `.cattipu-switch` class:
square corners, same construction family as `.cattipu-btn` but with a
deeper 3px press-travel (vs. 2px) so the pressed state's bevel inversion
reads unmistakably as a physical switch throw rather than a button tap.
Verified live: idle vs. pressed `box-shadow` differ (Playwright). No
functional, spacing, or layout change — value wiring, keyboard shortcut
(Cmd/Ctrl+Enter), disabled-while-empty state, Build Playback segments, and
the empty-state illustration are all untouched.

**6. Shared Components.** Built in `components/UI/`: `Button.tsx`
(relocated `CattipuButton`, same export name — used by `Toolbox.tsx` and
`Desktop.tsx`'s Welcome card, unchanged behavior), `Input.tsx` and
`Textarea.tsx` (new — the `.cattipu-field` primitives), `Panel.tsx` (new
— a chamfered/raised wrapper with an optional navy title-bar-strip
header). Concrete adoption this milestone: `Textarea` in
`PromptBar.tsx`, `Input` in `ProjectsApp.tsx`'s "New Project" name field
(the one real in-window text input outside Architect). `Panel` is built
and available but **not** retrofitted into the Milestone 1 Home Screen
cards (`ArchitectPreviewCard`, `SystemStatusCard`, `DesktopShortcutCard`,
`Toolbox`, Desktop's Welcome card) — those already match the approved
Milestone 1 spec and Home Screen is out of this milestone's scope
("Refine every existing window component... only retrofit the chrome and
shared window behavior"); swapping their already-shipped markup for a new
component this pass would be a no-benefit rewrite risk, not a chrome
retrofit. `TopBar.tsx` was left alone for the same reason — it's desktop
shell chrome, not an application window, even though its construction
looks similar to a title bar. `SettingsApp.tsx`'s other custom controls
(toggles, wallpaper picker, volume slider) were not migrated onto `Input`
— they aren't text fields, migrating them is a different kind of work
than this pass's field retrofit, and is flagged below as a known gap
rather than silently skipped.

**7. Pixel Consistency Pass.** Scoped to the files actually touched this
milestone (`Window.tsx`, `PromptBar.tsx`, `ProjectsApp.tsx`, the new
`components/UI/*` files, the `globals.css` additions/scrollbar), matching
how Milestones 1 and 2 scoped their own consistency passes rather than
sweeping the whole app. Within that scope: bevel depth on the new
`.cattipu-field`/`.cattipu-switch`/`.cattipu-window-control` classes all
draw from the same inset-shadow vocabulary as the existing `.cattipu-
recessed`/`.cattipu-btn` primitives (same rgba opacities, same "hard,
zero-blur" rule — no new blur radii introduced anywhere in this pass).
Border weights are uniformly 2px. Icon alignment: all three window
controls and the title bar's app icon sit on the same `flex items-center`
baseline as before. Scrollbar thumb color rebased from the stale pre-
token-integration navy `rgb(11,61,145)` to the current chrome_navy
`rgb(3,31,86)`, and its `border-radius:999px` full pill reduced to a hard
2px — the one piece of "modern softness" found outside the window-chrome
files themselves, retrofitted since it's a global rule with no owner
component of its own.

## Validation

```
$ pnpm lint    → clean, no errors/warnings
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright, exact measurements):

```
title bar height (want 40): 40
window control size (want 24x24): 24 x 24
close btn has bg-red (want false): false
close btn has cattipu-window-control (want true): true
frame clip-path: polygon(4px 0px, calc(100% - 4px) 0px, ...)
frame border-radius (want 0px): 0px
Input field border-radius (want 0px): 0px
Architect textarea border-radius (want 0px): 0px
Generate button border-radius (want 0px): 0px
Generate idle box-shadow present (want true): true
Generate pressed box-shadow differs from idle (want true): true
dock well size unchanged (want 40x40): 40 x 40
scrollbar thumb background: rgba(3, 31, 86, 0.28)
```

The dock well measurement is included specifically to confirm "the dock is
frozen" held in practice, not just in the diff.

## Before / after

- Before: `m2-shots/before-after-03-active-collapsed.png` (a Projects
  window under Milestone 2's chrome — `h-11` title bar, colored `bg-blue`
  Stack control, rounded corners throughout).
- After: `m3-shots/01-projects-window.png` (Projects window, new chrome),
  `m3-shots/02-control-hover.png` / `03-control-pressed.png` (window
  control states), `m3-shots/05-architect-window.png` (Architect window,
  idle prompt field), `m3-shots/06-generate-pressed.png` (filled prompt +
  Generate mid-press), `m3-shots/07-dock-unchanged.png` (dock still 72px
  collapsed, unaffected).

## What's still open

- `--window-content-inset` (16px) remains defined but not consumed as
  literal padding — each app's own content still manages its own internal
  padding rather than a single standard inset the frame enforces. Adding
  it as real padding around every app's content this milestone would risk
  visually breaking already-built app layouts (Explorer, Settings,
  Architect's own internal panel spacing) that weren't designed expecting
  it — flagged rather than forced.
- `SettingsApp.tsx`'s toggle rows, wallpaper picker, and volume slider are
  not text fields and were not migrated onto `Input`/`Textarea` — a
  distinct retrofit, not attempted this pass.
- `Panel.tsx` exists but has no consumer yet outside this report's own
  description of it — the next window-scoped milestone that needs a
  bordered sub-panel (e.g., inside Architect) is the natural first real
  adopter.
- Icon in the title bar (`AppIcon`) is unchanged — Milestone 2 already
  normalized dock icon containment; the title bar's icon usage was already
  a simple fixed-height render and needed no equivalent change.
