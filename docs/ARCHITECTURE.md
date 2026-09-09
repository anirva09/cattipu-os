# CATTIPU OS — Architecture

## Core principle

Every project is a living workspace, and **nothing visible is a literal.**

A window asks for a project's progress, status or location and gets a
value computed from what the project actually contains. There is no setter
for any of them. That is the whole architecture in one sentence: no screen
can be right while another is stale, because they are not kept in sync —
they are the same computation.

---

## Layers

```
                    app/page.tsx
                         │
              ┌──────────┴──────────┐
        BootScreen            CattipuShell
                                   │
                         InteractiveDesktop        ← frozen v0.9 package
                                   │
        ┌──────────────┬───────────┴────┬─────────────────┐
   DesktopObjectLayer  WindowManager  applications   RightWidgetStack
        │                   │              │
        └───────────────────┴──────────────┘
                            │
                       lib/os/*                    ← the derived layer
                            │
                        store/*                    ← the only stored state
```

**The frozen package.** `components/InteractiveDesktop` and the visual
components it composes are the signed-off v0.9 render. They take data and
render it; they own no application state. `CattipuShell` is the seam
between this repository and that package, and it is the only place
integration decisions are recorded.

**The derived layer.** `lib/os/` turns stored records into everything a
window needs. It has no state of its own and no side effects, which is why
its 136 unit assertions run without a browser.

**The stores.** `store/` holds what genuinely cannot be computed. Each is
persisted with an explicit `version` and a `migrate`, so a record written
by an older build is upgraded rather than guessed at.

---

## The derived layer

| Module | Owns |
|---|---|
| `lib/os/filesystem.ts` | The `OsObject` model — identity, `parentId`, grid cell — and every rule about it: children, descendants, paths, move legality, numbering, search. |
| `lib/os/desktop.ts` | Grid geometry. Cells to pixels and back, free-cell search, swap-on-drop. |
| `lib/os/projects.ts` | Progress, status, ordering, the active project, window projections. |
| `lib/os/workspace.ts` | Snap regions, cascade and tile layouts, boundary safety. |
| `lib/os/templates.ts` | The ten templates, their derived plans, and the eight-field project identity. |
| `lib/os/extensions.ts` | Declared seams for what comes next. Contracts only. |

### Three rules it enforces

**`parentId === null` is the OS root, and the OS root is the desktop.**
One array, two views. "A folder created in Explorer should appear on the
desktop" is not a synchronisation to implement — it is the comparison
`parentId === null`.

**Grid cells, not pixels.** A position cannot be off-grid, and a layout
saved on a 1920 screen lands correctly on a 1366 one. Snap regions follow
the same reasoning: a snapped window stores *which region*, not the
rectangle that region resolved to at the time.

**Links, never copies.** A shortcut stores a project id and resolves the
name at render time. So does a template's workspace folder. Renaming a
project renames both, with nothing to propagate — and nothing that can go
stale.

---

## Stores

| Store | Holds | Persist version |
|---|---|---|
| `useProjectStore` | Projects and their five artifact slots | schema v4 |
| `useFilesystemStore` | Desktop and Explorer objects | v3 |
| `useWindowStore` | Which applications are open | — |
| `useSettingsStore` | Wallpaper, cursor, sound | — |
| `useArchitectStore` | Architect's working graph | — |
| `useNotificationStore` | Notifications | — |
| `useBootStore` | Boot phase | — |

`useSettingsStore.wallpaper` is the **only** owner of the wallpaper. A
second field lived on `useFilesystemStore` from M16 until v0.9 with two
authors and zero readers; it was removed rather than given a manager. The
reasoning that put it there — "the wallpaper is a property of the desktop
surface" — is true and still leads to settings, because the desktop
surface reads it from there.

### The project artifact model

`CattipuProject` carries one slot per application: `architect`, `canvas`,
`forge`, `memory`, `launch`. Cross-slot references use `ArtifactRef`,
which states what *kind* of thing it points at, so a dangling reference is
detectable rather than mysterious.

Status is derived from the slots. `archived` is the single exception —
a real decision no artifact can imply.

A template's plan is derived from the template id at read time and is
never written into the slots. Seeding `canvas.screens` with five named
screens would make a brand new project report itself as partly built with
nothing built.

---

## Tech stack

| Technology | Purpose |
|---|---|
| Next.js 15 | Framework |
| React 19 | UI |
| TypeScript | Safety |
| Tailwind v4 | Styling |
| Zustand | State, persisted and versioned |
| React Flow | Architect's graph |
| Framer Motion | Boot and window animation |
| SVGR | PixelForge marks as components |

The window manager is this repository's own reducer
(`components/WindowManager/windowManager.reducer.ts`). `react-rnd` was
removed in v0.9 along with the legacy shell that used it.

---

## Extending it

`lib/os/extensions.ts` declares the contracts for the AI Workspace
pipeline, deployment, plugins, wallpapers, cursor themes and the
notification centre. It implements nothing and is imported by nothing —
it exists so each decision is made once, where the reasoning is written
down, rather than five times in five sprints.

AI generation enters through `lib/ai/`. Never scatter model calls across
components.
