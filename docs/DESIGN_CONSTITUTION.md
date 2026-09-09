# CATTIPU OS — Design Constitution

**Status:** frozen as of Milestone 12 (Constitutional Foundation Retrofit). Previous versions of
this document described the implementation as reverse-engineered fact, inconsistencies included.
Milestone 12 resolved the shared-foundation inconsistencies that were reasonable to resolve at
the OS/application-window level (chrome hierarchy, font roles, window controls, notifications,
cursors, sound vocabulary, boot language) and this document now states those as frozen rules, not
just observations. Anything still marked "deferred" below is a real, disclosed gap — not silently
pretended-away.

## 1. What this system is

CATTIPU OS renders as a "molded plastic" desktop workstation: cream/tan surfaces, hard 2px
outlines, and a small set of reusable bevel primitives that make every panel read as one physical
object rather than a stack of flat cards. It is an original 90s-inspired software-building
operating environment — not a Windows, Mac, or BeOS replica, not a modern SaaS interface wearing
pixel fonts, not a Figma or VS Code clone, not a chat-bubble AI wrapper. The intelligence behind
it is modern; the interface is intentionally period-inspired. Nothing in the current CSS uses
blur, translucency-as-depth, or soft drop shadows as the primary depth cue — depth comes from
`box-shadow` bevels (inset highlight + inset shadow), not blur.

## 2. Source of truth

`app/globals.css`'s `@theme` block is the single place color, spacing, border, window, dock,
font, and motion values are declared. Components are supposed to consume these via Tailwind's
generated utilities (`bg-navy`, `text-ink-dim`, `font-label`, etc.) or the primitive classes
below, not hardcode their own values.

`docs/DESIGN_TOKENS.json` is a machine-readable extraction of an earlier state of that block; it
predates Milestone 12's token additions (`--color-app-titlebar`, the font-role tokens) and is not
itself authoritative — `globals.css` is.

## 3. Frozen chrome hierarchy (Milestone 12)

Two tiers, deliberately not one:

- **OS-level chrome** — the global top bar, the dock, the boot screen, the Command Palette. None
  of these render through `.cattipu-window-frame`. They stay `--color-navy` (chrome_navy), and
  this milestone does not touch them.
- **Application windows** — anything rendered through `components/Window/Window.tsx` (or the
  shared `components/UI/Panel.tsx` primitive, for future window-scoped work). Every window's
  title bar now reads `--color-app-titlebar`, a token that defaults to `--color-oxblood` — "the
  shared application-window rule," not a special case for one app. `--color-app-titlebar` is a
  distinct token from `--color-navy`, not a redeclaration of it: flipping it to oxblood recolors
  every window's title bar without silently recoloring that same window's own internal content
  accents (Settings' active tab, Explorer's active breadcrumb, and similar in-app `bg-navy`/
  `text-navy` usages are untouched and still intentionally navy).
- **The one documented exception: Architect.** Since Milestone 11, Architect additionally retints
  its own entire content subtree to oxblood (`--color-navy` itself, scoped via
  `.cattipu-window-frame[data-accent="oxblood"]`) — this is Architect's own accepted workstation
  identity, not something every app inherits. Milestone 12 removed the now-redundant title-bar
  half of that override (the shared rule already makes Architect's title bar oxblood) and kept
  the content half, which is still necessary and still Architect-only.
- `--color-electric` (blue) stays the one universal "interactive/selected" signal — dock LEDs,
  focus rings, Build Playback — regardless of which chrome material a window uses. Window
  controls (`.cattipu-window-control`) stay colorless (a molded cream-plastic key, told apart by
  glyph, not fill) under either material.

## 4. Frozen window controls (Milestone 12)

24×24 molded buttons — `--window-control` was already 24px; this was a glyph migration, not a
resize. Three controls, in order: Minimize (`[_]`), Maximize/Restore (`[□]`), Close (`[X]`). No
colored circles, no modern icon-button appearance. Lucide's `Layers` icon (previously used for
maximize, an inaccurate "stack" reading) is retired from this role; `Square` renders the `[□]`
glyph for both maximize and restore — one glyph, not four states. Behavior (`toggleMaximize`) is
unchanged; this only changed which icon renders.

## 5. Frozen font roles (Milestone 12)

Two period font families back the whole system: `--font-pixel-ui` ("Press Start 2P," a true
bitmap face, unreadable past a short label) and `--font-code` ("VT323," a pixel-style monospace
that stays legible at paragraph length). CATTIPU must never visibly mix modern UI typography with
bitmap typography. Six named roles, each mapped onto one of the two families — a component should
reach for the role (`font-menu` / `font-window-title` / `font-label` / `font-code` / `font-status`
/ `font-hero` utility classes) rather than a raw family or a hardcoded font-family:

| Role | Maps to | Use |
|---|---|---|
| Menu | Press Start 2P | Command Palette groups, dropdown/menu chrome |
| Window Title | Press Start 2P | Window.tsx / Panel.tsx title-bar text |
| Labels | Press Start 2P | Compact chrome labels, eyebrows, section headers |
| Code | VT323 | SQL/technical/mono readouts (also `--font-mono`) |
| Status Bar | VT323 | Smallest readable text — Press Start 2P's glyphs stop reading below ~0.4rem; VT323 stays legible smaller |
| Hero | Press Start 2P | Large bitmap display, used sparingly (boot screen caption) |

`--font-body` (the ambient default — the `<body>` font-family and the pre-existing `font-body`
utility) is re-pointed from "Inter Variable" to the VT323 stack. **Inter Variable is no longer
the visible default UI/body voice** and is no longer imported anywhere in the app
(`app/layout.tsx`). This was done with the same var()-cascade technique Milestone 11 used for
chrome color: Tailwind utilities compile to `var()`, so one token edit changes every paragraph,
description, and prompt across the shell with zero per-component edits. Milestone 12 did not
sweep every existing `font-pixel-ui` call site onto the new named-role classes — that's a much
larger, purely-cosmetic diff with no visual change (the roles currently resolve to the same
values `font-pixel-ui`/`font-code` already did) and was left for organic adoption; the shared
OS-shell surfaces most worth using as the reference pattern (Window.tsx's title, Panel.tsx's
title, TopBar's labels, Command Palette's group headers) were switched over as the initial,
disclosed example set.

Corner-radius and one-off arbitrary text-size consolidation (documented in `docs/TYPOGRAPHY.md`)
remain open, separate from the font-role freeze above — a scale-consolidation pass, not a family
or role change, and out of this milestone's scope.

## 6. Frozen icon construction (Milestone 13)

Two canonical sizes: **16×16 Utility** (folder-closed, folder-open, document, search, new, save,
warning, error, ready, info, expand, collapse, run, build, edit, delete) and **24×24 Application**
(one per app: Home, Projects, Architect, Canvas, Forge, Memory, Launch, Explorer, Settings, plus
the two desktop-shortcut-only ids Archive and Templates). Construction rule: pixel-aligned,
roughly 2px silhouette weight, readable silhouette before internal detail, top-left lighting with
a darker bottom/right edge where dimensionality helps, a restrained low-color palette (existing
CATTIPU tokens only, one accent per icon), no outline-only/modern appearance. Historical pixel-icon
systems inform the construction principle only — every glyph is original CATTIPU artwork, not a
copied layout or asset.

**Source**: `components/Icons/` — the one place every surface imports icons from
(`import { AppIcon, UtilityIcon } from "@/components/Icons"`). `PixelIcon.tsx` renders a `Grid`
(one palette key per pixel, from `grid.ts`'s `rect`/`outline`/`line`/`triangleUp` helpers) as
inline SVG with `shapeRendering="crispEdges"` — vector, not raster, so every icon stays sharp at
every size the app actually uses it at (a 16px title-bar glyph, a 64px `PlaceholderApp` hero, a
resizable dock well) with no per-icon bitmap or DIMS table to hand-maintain. `appIcons.ts` and
`utilityIcons.ts` hold the two glyph sets; `palette.ts` is the closed color list.

**Color semantics** (silhouette must still read with color removed): green = ready/success,
amber = warning/pending, red = error/destructive, blue = selection/structure,
purple = AI-generated/inferred.

**Status**: migrated — Dock, desktop shortcuts, Projects, Explorer's folder rows, Settings'
and Architect's own app identity (title bar / dock / Command Palette glyph), and
`NotificationCenter`'s four status icons. Deliberately not swept: Architect's internal tool
panels, Command Palette, Home's Toolbox, and the top bar (its icons render on a dark navy strip;
the native set's ink/outline construction assumes a light surface, so a safe swap there is a
follow-up, not "trivial," per Milestone 13's own gate on top-bar changes) — see
`MILESTONE13_REPORT.md` for the full remaining-Lucide inventory.

## 7. Native notifications (Milestone 12)

`store/useNotificationStore.ts` + `components/System/NotificationCenter.tsx`, mounted once in
`components/Desktop/Desktop.tsx`. Four types — info, success, warning, error — each a hard-
bordered, cream/ivory molded body (`.cattipu-raised` + `.cattipu-chamfer`, the same primitives
every window and the Command Palette already use), a small bordered icon well tinted per type,
and bitmap label text. No rounded modern toast cards, no blur, no glass, no soft floating shadow.
Ordinary notifications auto-dismiss in ~4s (within the 3-5s spec); errors are sticky by default
and require manual dismissal. The queue is hard-capped at 3 visible entries — a burst of pushes
drops the oldest rather than growing an unbounded stack, so "multiple notifications" cannot become
a modern stacked-toast wall. This is also the first real consumer of the previously-declared-but-
unused `--color-success` / `--color-warning` tokens. A verification path is built in: Settings →
Notifications has one button per type, each firing a real sample through the real store. Wiring
the top-bar bell glyph to this system, and adding notification triggers elsewhere in the app, are
both explicitly deferred — "do not retrofit every feature onto notifications in this milestone."

## 8. Frozen cursor language

Six roles, all implemented: Arrow (`arrow.png`), I-Beam (`text.png`), Pointing Hand (`hand.png`),
Resize (`resize.png`) predate this milestone; Move (`move.png`) and Hourglass (`hourglass.png`)
are new in Milestone 12, generated by the same `scripts/gen_cursors.py` technique (16×16 logical
grid, 4× nearest-neighbor scale, navy fill with a 1px white halo). Move replaces a disclosed
Milestone 4 placeholder (window-titlebar drag used to reuse the Hand cursor); Hourglass is wired
to the one existing real "busy" state in the shell, the Architect Generate switch's
`data-busy` attribute — a pure `globals.css` addition, no Architect file touched. No novelty
cursors beyond these six.

## 9. Frozen sound vocabulary

Four vocabulary words, each mapped to an existing asset (`lib/sounds.ts` carries the full audit):
mechanical click (`window-open`/`window-close`), soft chime (`success`), relay launch (`boot`),
short buzzer (`error`). All are short (<1s), restrained-volume synthesized tones — none are
copies of a recognizable historical OS sound. The sound-off setting (`useSettingsStore.soundEnabled`)
already gates every consumer, confirmed rather than changed. The notification primitive above is
a new, minimal consumer: success/error pushes play their mapped sound; info/warning stay silent to
avoid hover-spamming a fast-arriving queue.

## 10. Frozen boot/shutdown vocabulary

`components/Boot/BootScreen.tsx`'s pre-READY label now stages through `INITIALIZING...` (first
half of the segmented bar) and `LOADING MODULES...` (second half) before `READY.` — replacing a
single static "BOOTING CATTIPU OS" string. Copy-only change; the segmented bar, timing, and every
other beat of the screen are untouched. `Saving workspace...` / `Indexing memory...` are frozen as
the shutdown/transition vocabulary for a future workspace-teardown flow — no such flow exists in
the app yet, so this is documented vocabulary for when one is built, not a fabricated screen.

## 11. Historical-reference rule

Historical systems (Windows 3.1-era productivity software, CASE/UML tools, spreadsheet-cell
navigation) define **construction principles** — compact bitmap type, hard-edged boxes, dense
table-like information hierarchy — not copied layouts or assets. CATTIPU does not attempt to be
historically exact.

## 12. Conflict-resolution hierarchy

When design rules conflict, apply this priority: (1) existing accepted CATTIPU implementation,
(2) this Design Constitution, (3) product usability and workflow clarity, (4) app-specific visual
language, (5) historical construction references. Corollary: **when design rules conflict,
consistency with the existing implementation takes priority over historical accuracy.**

## 13. Forbidden modern patterns

Never: glassmorphism or blur-as-depth; glow/soft floating shadows; rounded SaaS-card panels
(`rounded-md`+ on chrome-tier surfaces); modern dashboard-card layouts; AI chat-bubble patterns;
oversized whitespace; colored-circle window controls; outline-only icons; a smooth gradient
progress bar (always discrete segmented cells, per `.cattipu-segments`/`.cattipu-pixel-bar`);
mixing modern UI typography with bitmap typography on the same surface; a modern stacked-toast
notification wall.

## 14. Surface primitives (the component vocabulary)

Every "molded plastic" surface is one of these CSS classes, defined once in `globals.css` and
reused rather than restyled per component: `.cattipu-raised` (convex/pressable), `.cattipu-recessed`
(concave/inset well), `.cattipu-raised-navy`/`.cattipu-recessed-navy`/`.cattipu-well-navy` (navy-
chrome variants), `.cattipu-badge` (embossed housing on navy chrome), `.cattipu-vgroove`/
`.cattipu-hgroove` (carved separators), `.cattipu-emboss-text`/`.cattipu-emboss-text-inverted`
(carved-label text-shadow), `.cattipu-led` (the active-state dot, always `--color-electric`),
`.cattipu-btn`/`.cattipu-switch` (tactile button/switch bevels), `.cattipu-press` (generic press
feedback), `.cattipu-tooltip`, `.cattipu-segments`/`.cattipu-pixel-bar` (discrete progress
readouts, never a gradient), `.cattipu-chamfer`/`.cattipu-window-frame` (the hard 4px corner-cut),
`.cattipu-window-control` (the colorless 24×24 window-control key), `.cattipu-field` (the shared
text-field bevel), `.cattipu-outline-item`/`.cattipu-icon-tile` (Architect's outline rail, scoped
to that app), `.cattipu-notification`/`.cattipu-notification-icon` (Milestone 12).

## 15. What "preserve" means going forward

Per explicit product direction: the Home screen, dock geometry, existing Framer Motion animation
character, current routing/component architecture, and Architect's own generated-workspace content
are not in scope for redesign by this document's rules. Any future work should extend the
primitive/token vocabulary above rather than inventing new bevel techniques, color values, or font
families. Explicitly deferred to later milestones: the remainder of the Lucide-to-native-icon
migration (§6) — Architect's internal tool panels, Command Palette, Home's Toolbox, and the top
bar are all still Lucide, by design, per Milestone 13's "bounded, high-visibility surfaces only"
scope — and a Command Palette retrofit onto the current chrome/font-role system (it already uses
the shared `.cattipu-raised`/`.cattipu-chamfer` primitives per Milestone 6, but has not been swept
onto the font-role classes beyond its group headers).
