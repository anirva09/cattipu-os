# CATTIPU OS — MVP-03 Report

## Objective

Architect → Canvas Foundation: Architect follows the active Project, and a
real Canvas window draws that project's architecture with positions the
person sets and that persist per project.

## Baseline

- `main` at `326fd45` (MVP-02), clean tree, verify and build passing.
- Audit findings: Architect's store was global and unsaved except when
  linked; `loadFromProject` had no caller; Canvas was a rail entry with no
  WindowManager window; `CanvasArtifacts` was a type slot only.

## Canonical Ownership

| Concern | Owner | Stored in |
| --- | --- | --- |
| Active project | `useProjectStore` (`lastOpenedAt`) | `cattipu-projects` |
| Architecture (what the system is) | Architect | `project.architect.data` |
| Node placement (where it is drawn) | Canvas | `project.canvas.layout` |
| Selection, in-progress drag | Canvas window (local) | not persisted |

Canvas stores `{ nodeId, x, y }` only. Labels, kinds and edges are read from
the architecture on every render, so a rename or delete in Architect reaches
Canvas with nothing to synchronise.

## Changes

- `lib/contracts/architect.ts`, `lib/services/architect/architectService.ts`
  — `ArchitectWorkspaceState` (`no-project` / `empty` / `ready`) and an
  `ArchitectureRepository` over the project store. The Architect store no
  longer imports the project store.
- `store/useArchitectStore.ts` — `syncToProject` loads the active project's
  architecture or clears to its empty state, and bumps `runId` so a
  generation started for another project is dropped. `generate()` keeps the
  linked project and saves the result to it immediately.
- `components/Architect/ArchitectApp.tsx` — follows the active project;
  explicit empty states for "no project" and "no architecture"; toolbar
  names the project.
- `components/Architect/BuildPlayback.tsx` — with no project open, the
  created project now also gets its filesystem workspace and is opened.
- `lib/contracts/canvas.ts`, `lib/services/canvas/canvasService.ts` —
  `CanvasView` projection, deterministic 8px-grid default layout, snapped
  placement that only accepts real node ids and prunes deleted ones, reset.
- `lib/project/types.ts`, `lib/project/migrate.ts` — `CanvasArtifacts.layout`;
  schema v4 → v5 with backfill.
- `store/useProjectStore.ts` — `placeCanvasNode`, `resetCanvasLayout`.
- `components/Canvas/CanvasApp.tsx` + `.css` — the Canvas window: toolbar,
  inset drawing surface on the drafting-paper grid, raised node plates,
  orthogonal links, instrumentation strip, pointer drag and arrow-key move
  (both snapped), Reset Layout, and the two empty states with a route to
  Architect or Projects.
- `components/WindowManager/windowManager.reducer.ts`,
  `components/InteractiveDesktop/InteractiveDesktop.tsx`,
  `components/Shell/CattipuShell.tsx` — Canvas registered as a managed
  window (400×240 floor, cascade default, closed at start); a saved session
  that predates Canvas loads with Canvas closed instead of being discarded.

## Visual Preservation

Canvas reuses `bevel.css`, the design tokens, `cattipu-drafting-paper` and
`ShellIcon`. No TopBar, sidebar, wallpaper, palette, typography, icon or
WindowManager geometry changed. `CanvasApp.css` is added to the visual-lock
list of token-migrated stylesheets.

## Data / Migration Impact

`cattipu-projects` v4 → v5 adds `canvas.layout`, backfilled to `[]`;
verified on a real v4 browser profile (5 projects kept). The window session
parser accepts a session without the new Canvas entry.

## Verification

- `npm run verify` — typecheck, lint, 17 suites: pass.
- `npm run build` — pass.
- `git diff --check` — pass.
- Browser (dev, 1440×900): Alpha's architecture projected into Canvas;
  dragged a node (snapped, persisted as `{nodeId,x,y}`); reload restored it
  and the Canvas window; Beta showed its own empty state, "Open Architect"
  raised Architect on Beta's empty state; generated Beta (same template, so
  identical node ids) and Beta's node stayed at its default while Alpha's
  stayed moved; switching back restored Alpha. No console errors.

## Known Issues

- P2 — after a reload the tab title reads `CATTIPU OS` (MVP-01 title effect).
- P3 — React Flow warns that Architect's `ArchitectureCanvas` recreates
  `nodeTypes` each render (pre-existing, untouched).
- P3 — Architect components still import `lucide-react` (documented drift,
  constitution §26).
- P3 — Canvas has no zoom; the surface scrolls instead.

## Next Milestone

MVP-04 — AI Gateway + Project Memory. Not started by this sprint.
