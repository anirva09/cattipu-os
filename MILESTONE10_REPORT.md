# Architect Generated-State Prototype Report

## Discovery this milestone started with

Before writing anything, I re-read the current `ArchitectApp.tsx`,
`PlannerPanel.tsx`, `ArchitectureCanvas.tsx`, `DatabasePanel.tsx`,
`ApiCatalogPanel.tsx`, `RecommendationsPanel.tsx`, `RoadmapPanel.tsx`,
and `lib/ai/*` against the brief's required-content checklist. Almost
all of it was already built — a prior, entirely uncommitted sprint
(documented in this project's `v0.3.5-checkpoint.md`) had already
implemented an editable architecture graph, a live ER diagram, an API
catalog, a roadmap generator, smart recommendations, and a multi-format
export center. So this milestone's actual work was an audit against the
brief, not a build-from-scratch: confirm each required category is
covered, and fill the one gap that wasn't.

| Required output | Status before this milestone |
|---|---|
| Product summary | Covered — Planner's summary line |
| Features | Covered — Planner's feature grid |
| System architecture | Covered — Architecture tab (app + infra graphs) |
| Data/schema | Covered — Database tab (live-editable ER + SQL) |
| **Suggested stack** | **Missing — no field in the data model, no UI anywhere** |
| Build roadmap | Covered — Roadmap tab (phased, collapsible) |

"Suggested stack" was the one concretely missing piece, so this
milestone adds it end to end: data model, seed data, and a dedicated
section in the Planner tab — plus a persistent status strip, since the
brief's "status indicators" bullet had no non-transient instance either
(the existing "System Ready" banner is a one-time animation, not a
readout you can come back to).

## Files changed

- `lib/ai/types.ts` — added `StackTier`, `StackItem`, and a required
  `stack: StackItem[]` field on `GeneratedArchitecture`.
- `lib/ai/seedTemplates.ts` — added a 7-item `stack` array to each of
  the three seed templates (BANKING, ECOMMERCE, SAAS).
- `app/globals.css` — two new primitives: `.cattipu-hgroove` (a
  horizontal analog of the existing `.cattipu-vgroove` carved-seam
  divider) and `.cattipu-status-pill` (hard-edged pill, no fixed
  background — callers supply it, same pattern as `.cattipu-btn`).
- `components/Architect/PlannerPanel.tsx` — added a real-data status
  strip, a "FEATURES" section header, and a new "SUGGESTED STACK"
  table section.
- `lib/exportProject.ts` — `toMarkdown()` now includes a "Suggested
  Stack" table so the Markdown export stays consistent with what the
  UI now shows (see note below).

## Product summary / Features / System architecture / Data-schema / Build roadmap

All reviewed against the brief's specific requests ("dense panes,
section headers, tables/lists, mechanical separators, small diagrams,
status indicators") and found already satisfying them without changes:

- **Architecture tab** — a real node-graph (ReactFlow), not prose: typed
  node cards (client/gateway/service/datastore/queue), labeled edges,
  a separate synchronized Infrastructure view. This *is* the "small
  diagram" requirement.
- **Database tab** — live SQL (`CREATE TABLE` blocks that retype
  themselves as columns are edited) alongside an ER diagram and a
  relationships list — dense panes with real tables, not chat prose.
- **APIs tab** — a dense endpoint catalog: colored HTTP-method badges,
  request/response shape, auth, and owning-service links.
- **Roadmap tab** — phased, collapsible cards with per-phase item chips
  — a build plan, not a bulleted chat answer.
- **Ideas tab** ("Smart recommendations") — short, targeted, linked to
  the node they're about; already reads as engineering annotations, not
  conversational filler.

None of these needed edits — they were reviewed specifically to confirm
this milestone's changes don't duplicate or fight what's already there,
not skipped.

## Suggested stack (the actual gap)

Added `StackItem { id, category, name, reason, tier }` to the data
model. `tier: "core" | "supporting"` is an authored editorial category —
same status as `Recommendation.text` elsewhere in this file — not a
fabricated confidence score; it says which layer of the stack is
foundational vs. optional, decided at authoring time, not computed.

Seeded 7 items per template (Frontend/Backend/Database/Cache/one
domain-specific "why this fits" layer/Auth/Hosting), each with a
one-line rationale tied to the specific product being generated (e.g.
banking's Database row: "ACID transactions for the ledger —
non-negotiable for money movement," not a generic "reliable database").

Rendered in Planner as a real HTML `<table>` — LAYER / TECHNOLOGY / WHY
/ TIER columns — under a "SUGGESTED STACK" header, separated from the
Features grid above it by the new `.cattipu-hgroove` mechanical
divider. Tier reads as a hard-edged `CORE` (filled navy) or `SUPPORT`
(outline) pill via the new `.cattipu-status-pill` primitive. This is
the brief's "tables/lists where appropriate" instruction applied
literally — a table, not a card grid, because layer/technology/rationale
are columnar data, not prose.

## Status indicators

Added a persistent status strip above the feature grid: a "GENERATED"
pill (with the existing `.cattipu-led` glow dot) plus four live counts —
NODES, ENDPOINTS, TABLES, PHASES — each pulled directly from the
generated data (`data.nodes.length`, `data.apis.length`,
`data.tables.length`, `data.roadmap.length`). No invented metrics —
same "real state only" rule the Home Screen's System Status card
already follows. This exists so the workspace has a status readout that
stays visible, unlike the transient "System Ready." banner Build
Playback already shows once and dismisses.

## Not an AI chat conversation / resembles a CASE tool

Verified visually (screenshots below): the generated view is tabs +
tables + a node graph + status pills, with no message bubbles, no
"assistant said" framing, and no scrolling transcript. The Planner tab
in particular now reads top-to-bottom as: status strip → feature
checklist → mechanical divider → stack table — closer to a project
inspector pane than a conversation.

## Reviewed, no change needed

- The app shell (dock, top bar, window chrome, boot sequence) — not
  touched, per "do not redesign the app shell." Confirmed via a
  full-window screenshot after generation (`10-full-shell.png`).
- Canvas — not implemented, per "do not implement Canvas yet."
- `ArchitectureCanvas.tsx`, `DatabasePanel.tsx`, `ApiCatalogPanel.tsx`,
  `RecommendationsPanel.tsx`, `RoadmapPanel.tsx` — read in full, already
  satisfy their respective required categories; the new `stack` field
  on `GeneratedArchitecture` is purely additive and none of these
  construct or depend on it, confirmed by a clean build.
- `lib/ai/generateArchitecture.ts` — already gates on
  `USE_SEEDED_DATA = true` and returns realistic static mock data
  (450ms simulated delay + template selection by prompt keywords),
  satisfying "use realistic static/mock generated data if backend
  generation is not ready" with zero changes.

## A judgment call, disclosed: updating the Markdown export

The brief didn't ask for the Export Center to be touched, but leaving
`toMarkdown()` silently out of sync with a new UI section seemed like
the wrong kind of "not touching" — a user exporting a plan right after
looking at the Suggested Stack table would get a document missing the
section they just saw. Added a "## Suggested Stack" table to the
Markdown export only (JSON export already includes it automatically,
since it serializes the whole object; SQL/dbdiagram/OpenAPI/PDF exports
are schema- and API-specific formats where a stack table has no natural
place and were left alone). Verified live: generated a banking plan,
opened Export → Markdown, and confirmed the downloaded file contains
the new section with real stack rows.

## Validation

```
$ pnpm lint    → clean, 0 errors (same pre-existing unrelated warning
                 in a scratch verify script, not part of the shipped app)
$ pnpm build   → clean, First Load JS 144kB / 247kB
```

Live-verified against a production server (Playwright): submitted the
banking example prompt, let Build Playback run to completion (~8.6s),
then checked the Planner tab.

```
statCountLabelsFound: 4        (NODES / ENDPOINTS / TABLES / PHASES all present)
generatedPillPresent: true
stackHeaderPresent: true
stackRows: 7                   (Frontend/Backend/Database/Cache/Messaging/Auth/Hosting)
  tiers: CORE, CORE, CORE, CORE, SUPPORT, CORE, SUPPORT — matches seed data exactly
grooveHeight: 2px, boxShadow present, filter: none   (hard edge, zero blur)
statusPillStyle: borderRadius 0px, filter none        (hard-edged, no rounding)
Markdown export: contains "## Suggested Stack" with real rows
```

Regression pass (Architecture / Database / APIs / Ideas / Roadmap tabs,
and the full desktop shell) — all screenshotted post-generation, no
visual changes from before this milestone.

Screenshots in `m10-audit-after/`: prompt filled, post-playback
architecture view, full Planner tab, a zoomed Suggested Stack table,
the status strip alone, each of the other five tabs, the full desktop
shell with the Architect window open, and the Export Center panel.

## What's still open

- Canvas (explicitly deferred per the brief).
- The broader Architect subsystem (`ArchitectureCanvas.tsx`,
  `DatabasePanel.tsx`, `ApiCatalogPanel.tsx`, `RecommendationsPanel.tsx`,
  `RoadmapPanel.tsx`, `BuildPlayback.tsx`, most of `lib/ai/`, `Boot/`,
  `System/`, and others) remains uncommitted in git, as it was found —
  this milestone's commit only carries the specific files it touched,
  matching Milestone 9's precedent of not silently sweeping in an
  unrelated backlog of prior work under one milestone's commit.
