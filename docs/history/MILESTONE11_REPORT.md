# Architect Retro Workstation Identity Report

Refined the Architect application's visual language — empty/input state and
the entire generated-result workspace — toward an original CATTIPU read on
"premium planning workstation, 1993-1998," with a deep oxblood/burgundy
chrome accent replacing navy inside Architect only. Home Screen, dock, top
bar, and every other app's chrome are untouched. Screenshots:
`m11-audit-after/`.

## Files changed

- `app/globals.css` — a new `--color-oxblood` token, a scoped
  `[data-accent="oxblood"]` override, and new primitives for the outline
  nav (`.cattipu-outline-item`, `.cattipu-icon-tile`).
- `lib/apps.ts` — new optional `titlebarAccent` field on `AppDef`, set to
  `"oxblood"` on the Architect entry only.
- `components/Window/Window.tsx` — stamps `data-accent={app?.titlebarAccent}`
  on the window frame; one line, no other change.
- `store/useArchitectStore.ts` — `ArchitectTab` gains `"summary"`,
  `"features"`, `"stack"` (replacing `"planner"`); default section is now
  `"architecture"`.
- `components/Architect/ArchitectApp.tsx` — full shell rewrite: left
  outline nav, center workspace, right inspector, bottom status strip,
  replacing the folder-tab row.
- `components/Architect/SummaryPanel.tsx`, `FeaturesPanel.tsx`,
  `StackPanel.tsx` — new; split out of the retired `PlannerPanel.tsx`
  (deleted) so Product Summary, Features, and Recommended Stack are each
  their own outline section, per the brief's required list.
- `components/Architect/NodeInspector.tsx` — rewritten from a floating
  overlay into a persistent docked right pane.
- `components/Architect/ArchitectureCanvas.tsx`, `DatabasePanel.tsx`,
  `ApiCatalogPanel.tsx`, `RecommendationsPanel.tsx`, `RoadmapPanel.tsx`,
  `ExportCenter.tsx` — one-line edits each, dropping `rounded-md`.

## The chrome-color mechanism (the one decision everything else follows from)

Rather than hand-editing `bg-navy`/`text-navy`/`border-navy` across every
Architect file — dozens of call sites — I checked how Tailwind v4 actually
compiles those utilities: `.bg-navy{background-color:var(--color-navy)}`,
confirmed directly against the build output, not assumed. Since it's a CSS
variable reference, not a literal hex, redeclaring `--color-navy` on an
ancestor element re-points every descendant utility that reads it. So:

```css
.cattipu-window-frame[data-accent="oxblood"] {
  --color-navy: var(--color-oxblood);
  --color-border-strong: rgba(92, 21, 36, 0.32);
  --color-border: rgba(92, 21, 36, 0.16);
}
```

placed on the Architect window's own frame (via `Window.tsx` stamping
`data-accent` from a new `titlebarAccent` field on `AppDef`, set only on
the `architect` entry) cascades automatically into: the title bar itself,
PromptBar's Generate button, the outline nav's active-row fill, every
`text-navy`/`.cattipu-emboss-text` heading, and — because
`ArchitectureCanvas.tsx`/`DatabasePanel.tsx` already reference
`var(--color-navy)` inline for ReactFlow edge/handle/label colors and the
gateway-node accent — the whole diagram canvas too. Zero per-component
color edits. This is also why the diff is smaller than a visual change
this size would suggest: one CSS rule plus a two-line `Window.tsx` change
did most of the work.

`--color-electric` (the blue used for LEDs and keyboard-focus rings) is
deliberately **not** overridden. One accent hue stays the universal
"interactive/selected" signal across every app; navy vs. oxblood is purely
each app's own chrome material. Same reasoning Milestone 3 used to keep
window controls colorless and differentiate states by icon, not fill.
Confirmed live: the prompt field's focus border and the "Try" link's
keyboard-focus ring both stay blue inside the oxblood window.

Every other app (Home, Projects, Canvas, Forge, Explorer, Settings…) has
`titlebarAccent` left `undefined` — `Window.tsx` renders `data-accent`
as nothing for them, so the selector never matches and their chrome is
byte-for-byte the pre-existing navy, confirmed live (`titlebarBg` computed
as `rgb(3,31,86)` unchanged for Projects; `rgb(92,21,36)` for Architect —
see Validation).

## Generated-state shell — outline / workspace / inspector / status strip

Replaced Milestone 10's top folder-tab row with the brief's four-region
layout:

- **Left outline** (`.cattipu-outline-item`, new primitive) — a vertical
  list of boxed rows reading as a CASE tool's project outline rather than
  a tab strip. Order follows the brief's required list (Product Summary,
  Features, Architecture, Data Model, Recommended Stack, Build Roadmap)
  with the two bonus sections from the earlier uncommitted sprint (APIs,
  Ideas) kept in between rather than dropped — nothing already built was
  removed, only relabeled and restyled. The active row is filled and
  pressed in, the same "selected = inverted block" language the existing
  Application/Infrastructure segmented toggle already used, rather than a
  fourth different "selected" convention.
- **Center workspace** — unchanged panel components underneath (each just
  restyled), swapped by outline selection exactly as tabs were before.
  Architecture is now the default (was Planner), per the brief.
- **Right inspector** — `NodeInspector.tsx` rewritten from an absolutely-
  positioned overlay that only existed once a node was clicked into a
  permanent docked column with a "No selection — click a node" placeholder
  state. It renders only for the Architecture section: that's the one
  place "central workspace + right inspector" describes literally (click
  a node, see its detail), and it's also the default view. Every other
  section already carries its own internal structure (Data Model's own
  SQL + ER + relationships split, for instance) and has no per-item
  selection concept, so those use the full center width instead of
  reserving an inspector column that would sit empty.
- **Bottom status strip** — new, persistent regardless of which outline
  section is open: SERVICES (a real count of `kind === "service"` nodes),
  TABLES, ENDPOINTS, PHASES (all live `data.*.length` reads, no invented
  metrics — same rule the Home Screen's System Status card and Milestone
  10's stat readout already followed), and a PLAN READY / BUILDING state
  pill. Matches the brief's example field list exactly.

A slim toolbar above the three-column row replaced the old tab-row's
trailing Export button: project name (from `data.projectName`) on the
left, Export on the right — the same Export Center modal, untouched
functionally, just missing its old `rounded-md` (see below).

## Content sections

- **Summary** (new file, split out of the old `PlannerPanel`) — a boxed
  project-record plaque (name + the verbatim original prompt in the same
  quoted `font-code` treatment as the "Try" example) plus the summary
  paragraph, separated by the existing `.cattipu-hgroove` divider. No
  duplicate stat readout — those already live in the bottom status strip.
- **Features** (new file) — was a two-column grid of rounded checkbox
  cards; now a real `<table>` (# / FEATURE / DESCRIPTION), matching the
  brief's "spreadsheet-like… table-like rows" instruction literally
  rather than approximating it with cards.
- **Recommended Stack** (new file) — the Milestone 10 stack table,
  promoted to its own outline entry and renamed to the brief's exact
  wording (was folded into the combined Planner panel).
- **Architecture** (default) — the existing ReactFlow diagram, now with
  the API Gateway node's accent (which reads `var(--color-navy)`) coming
  through oxblood, plus a permanent right inspector instead of a fly-out.
- **Data Model** — the existing SQL + live ER diagram + relationships
  split, untouched in structure, restyled by the color cascade only.
- **APIs, Ideas, Roadmap** — untouched in structure; each lost its
  `rounded-md` (see below) and inherits the oxblood cascade like
  everything else.

## Hard edges — where the line was drawn

The brief asks for "hard-edged boxes and dividers" and to avoid "rounded
SaaS panels." Rather than a blanket sweep of every radius in every
Architect file, I drew the line at `rounded-md` (Tailwind's 6px) — the
scale that reads as a modern card — and flattened all eight instances of
it across `ArchitectureCanvas.tsx` (node cards), `DatabasePanel.tsx` (ER
table card), `ApiCatalogPanel.tsx`, `RecommendationsPanel.tsx`,
`RoadmapPanel.tsx` (their card rows), and `ExportCenter.tsx` (the modal
shell and format tiles). Left the pre-existing sub-4px micro-radii on
small form controls alone (a `<select>`'s 2-3px corner, for instance) —
at that size they read as a hard mechanical chamfer, the same scale as
the window frame's own established 4px `--window-chamfer`, not as a
rounded panel. Every new primitive built this milestone
(`.cattipu-outline-item`, `.cattipu-icon-tile`, the Summary/Features/
Stack panels) was written with zero radius from the start.

## "Small pixel-style icons" — a disclosed scope decision

No new bitmap art was generated this pass. Instead, existing Lucide
glyphs (already used throughout Architect) sit inside a new
`.cattipu-icon-tile` — an 18×18px hard-edged square well, same
construction family as the existing `.cattipu-badge` icon housing — in
the outline nav. This reads as a compact toolbar glyph rather than a
floating modern icon, which is what the brief's underlying ask seems to
be after ("small pixel-style icons," "compact utility-software
interfaces"), without literally producing new pixel-art assets. Flagging
this as a deliberate scope call, not a silent gap.

## Empty state

Kept Milestone 9's layout and copy structure exactly (icon housing,
spacing, "TRY:" example) — the brief said "keep the layout structure
broadly the same." Added `.cattipu-drafting-paper` (the faint blueprint-
grid texture already used by the Home Screen's Architect preview card) as
the panel's background, so the empty state itself reads as a blank
drafting sheet rather than a plain cream panel — a small, reused-not-
invented cue toward "technical planning software." Updated the copy's
section list ("summary, features, architecture, data model, stack, and
roadmap") to match the new outline's actual section names; the sentence
structure is otherwise unchanged. Generate's enabled/disabled/pressed/
focus states, the field's focus treatment, and the "Try" link's styling
are all Milestone 9's work, untouched in code — they simply render in
oxblood now via the same cascade as everything else.

## Reviewed, no change needed

- Home Screen, dock, top bar, boot sequence — not touched; confirmed via
  a full-desktop screenshot with Architect open and focused
  (`11-full-desktop-architect-focused.png`) and one with Projects open on
  top of an unfocused Architect (`10-architect-over-projects.png`), both
  showing dock/top-bar navy exactly as before.
- Canvas — still not implemented, per "do not implement Canvas yet."
- Build Playback's own timers/stages (`BuildPlayback.tsx`) — not edited;
  its `setActiveTab("architecture"/"database"/"roadmap")` calls already
  used ids this milestone kept, so the staged reveal sequence needed no
  changes.
- Command Palette's `setArchitectTab("apis"/"roadmap")` calls — same
  reason, confirmed still valid against the updated `ArchitectTab` type.
- `.cattipu-field` (shared with `ProjectsApp.tsx`'s Input) — still not
  touched, same reasoning as Milestone 9: Architect's own
  `.cattipu-architect-field` modifier carries this milestone's changes
  instead.

## Validation

```
$ pnpm lint    → clean, 0 errors (same pre-existing unrelated warning in
                 a scratch verify script, not part of the shipped app)
$ pnpm build   → clean, First Load JS 145kB / 247kB
```

Live-verified against a production server (Playwright): generated a
banking plan and walked every outline section plus a full regression
pass.

```
titlebarAccent (Architect window): "oxblood"
titlebarBg (Architect):  rgb(92, 21, 36)   — the new oxblood token
generateBtnBg (Architect): rgb(92, 21, 36) — cascaded automatically, no
                                              PromptBar.tsx edit
defaultSection after generate: "ARCHITECTURE"
status strip: SERVICES / TABLES / ENDPOINTS / PHASES / PLAN READY all present
dock background: unaffected by the scoped override (dock markup isn't a
                  descendant of any window frame)
```

Screenshot set in `m11-audit-after/`: empty state, prompt filled, the
generated Architecture default view (diagram + inspector + status strip),
a node selected in the inspector, Summary, Features, Data Model, Stack,
Roadmap, APIs, Ideas, Architect window layered over an open Projects
window (confirming Projects' own title bar stays navy while Architect's
unfocused title bar dims independently), and a full-desktop shot with
dock/top bar visible and Architect focused.

## What's still open

- The broader Architect subsystem remains split between tracked and
  untracked files, as it has been since Milestone 9 first surfaced this —
  `BuildPlayback.tsx`, `lib/ai/generateArchitecture.ts`,
  `lib/ai/layout.ts`, and others this milestone read but did not edit
  stay uncommitted. This milestone's commit carries only the files it
  actually touched (16 total: 5 already-tracked files modified, 10
  untracked files that were edited or newly created, 1 file deleted),
  matching Milestone 9 and 10's precedent rather than sweeping in
  unrelated prior work.
- `.cattipu-drafting-paper`'s texture is hardcoded to a navy-tinted rgba
  rather than reading `var(--color-navy)`, so it doesn't itself shift to
  an oxblood tint inside Architect — at 0.07 alpha the practical
  difference is negligible (confirmed by eye against the screenshots),
  and duplicating the primitive for one faint texture wasn't judged worth
  the added surface area. Noted here rather than left undisclosed.
