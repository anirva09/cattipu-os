# CATTIPU OS — Bounded Context Audit (M20.5A)

**Status:** read-only audit. No code was changed to produce it.
**Baseline:** `origin/main` @ `4a6ad67` (`feat(cursor): animate retro hourglass busy state`)
**Verification at baseline:** `npm run verify` clean — typecheck, lint, 146/146 test
assertions (9 + 18 + 16 + 24 + 33 + 36 + 10 across 7 suites). `npm run build` succeeds (one
environment warning, see §6).

This document maps who owns what today, so M20.5B–E (diagnostics contracts, service, panel,
tests) can build on real owners instead of inventing new ones. It records findings. It fixes
nothing. Each finding is a separate, later decision.

---

## 0. Classification key

| Tag | Meaning |
|---|---|
| **CANONICAL** | The one owner of this responsibility. Extend it; never duplicate it. |
| **ACCEPTABLE DEPENDENCY** | Cross-domain coupling that is correct for an in-process MVP. Worth naming because a later service boundary will run through it. |
| **BOUNDARY VIOLATION** | A dependency or state that points the wrong way, duplicates an owner, or shows something that is not true. |
| **LEGACY / ORPHANED** | Code that nothing live renders or calls, or that a newer owner has replaced. |
| **FUTURE EXTRACTION CANDIDATE** | A seam where a physically separate service may later sit. |
| **DEFERRED** | A known gap that belongs to a named later milestone. Not a defect in M20.5 scope. |

---

## 1. Summary

The core OS domains have clear owners: Project, Filesystem, WindowManager, Settings, Boot,
Sound and Cursor. Each has one owner and no competing writable copy. Earlier consolidation
work (M15–M20) removed duplicate state deliberately, and it shows.

The debt is at the edges:

1. **The legacy window store still sets the app-ID vocabulary.** `store/useWindowStore.ts` is
   unmounted. Even so, `lib/apps.ts` and `lib/os/extensions.ts` still import their `AppId`
   type from it, and the unmounted Command Palette still calls it. Three separate lists name
   the apps: `AppId` (legacy store), `CATTIPU_WINDOW_IDS` (live reducer) and
   `CATTIPU_SIDEBAR_ITEMS` (Sidebar).
2. **Two health surfaces show hardcoded values.** SYSTEM STATUS always reads
   `MEMORY INDEXED: OK`, `BUILD: IDLE`, `SOUND: ON` and so on, and the bottom status bar says
   `PROJECT SAVED`. No state produces these values. Developer Diagnostics is their natural
   future owner, and M20.5 must not copy them.
3. **Some notifications are pushed but never displayed.** `useNotificationStore` is live, but
   `NotificationCenter` is not mounted anywhere, so a push plays a sound and never renders.
4. **There are two icon systems.** `components/PixelIcon` (the PixelForge SVG assets) drives
   the live shell. `components/Icons` (the M13 grid glyphs) is still used by Settings and
   PlaceholderApp. Both export a symbol named `PixelIcon`.
5. **Some dependencies point the wrong way.** `lib/os/projects.ts` imports types from three UI
   components. `lib/ai/types.ts` imports a type from a Zustand store, which closes a type-level
   cycle: `lib/project/types → lib/ai/types → store/useProjectStore → lib/project/types`.
6. **WindowManager state lives inside a React hook, not a store.** A diagnostics service outside
   the React tree cannot read live window state. This is a design constraint for M20.5C, not a
   defect.

There are no provider SDKs, network calls, API routes, environment-variable reads,
build-process spawns or deployment code anywhere in the tree. The target
UI → Service → Adapter → Infrastructure flow therefore has no existing violations to unwind.
The seams it needs are there to be formalised when the time comes.

---

## 2. Domain map

### 2.1 Project — CANONICAL

| | |
|---|---|
| Owner | `store/useProjectStore.ts` (state + verbs), `lib/project/types.ts` (schema, `PROJECT_SCHEMA_VERSION = 4`), `lib/project/migrate.ts` (migrations), `lib/os/projects.ts` (derived read layer), `lib/os/templates.ts` (template specs) |
| Persistence | `localStorage["cattipu-projects"]`, zustand `persist`, versioned, migrated |
| Consumers | `CattipuShell` (title, recents, Projects window), `ExplorerApp`, `DesktopObjectLayer`, `CommandPalette` (unmounted), `BuildPlayback`, `useArchitectStore` |
| Duplicate state | None. Progress and status are derived and have no setters. That was deliberate in M15, and it holds. |

Findings:

- **CANONICAL.** `CattipuProject` already has one artifact slot per pipeline stage: `architect`,
  `canvas`, `forge`, `memory` and `launch`. Typed mutation helpers exist for each
  (`setCanvasArtifacts`, `addForgeBuild`, `appendMemoryRecord`, `addLaunchRelease`). Only the
  Architect slot has a live writer.
- **BOUNDARY VIOLATION — domain imports UI types.** `lib/os/projects.ts` imports
  `ProjectDetails`, `ProjectsWindowProject` and `FolderTreeNode` from `components/DetailsPanel`,
  `components/ProjectsWindow` and `components/FolderTree`. The imports are type-only, so there
  is no runtime cost. The direction is still inverted: the derived project layer is shaped by
  the frozen v0.9 components' prop types. A future `lib/contracts/project/` should own these
  view-model shapes, and the components should import them from there.
- **DEFERRED (M24).** `project.memory.records` and `appendMemoryRecord` are the only Project
  Memory storage today. M24 must decide whether Project Memory extends this slot or supersedes
  it. The M24 schema must not be invented before then (Constitution §15).

### 2.2 Filesystem — CANONICAL

| | |
|---|---|
| Owner | `store/useFilesystemStore.ts`, `lib/os/filesystem.ts` (pure operations, naming, labels), `lib/os/desktop.ts` (grid placement) |
| Persistence | `localStorage["cattipu-desktop"]` (historical key name kept on purpose), version 3, migrated |
| Consumers | `DesktopObjectLayer`, `ExplorerApp`, `useProjectStore` (`nextNumberedName` only) |
| Duplicate state | None. There is one `objects[]`. The desktop is the `parentId === null` view of it, and Explorer is any folder's view. No `desktopFiles[]` or `explorerFiles[]` exists. |

Findings:

- **CANONICAL.** Project shortcuts store only a `projectId`. Their labels are resolved from the
  project at render time, so the Project → Filesystem direction is correct.
- **ACCEPTABLE DEPENDENCY.** Filesystem reads project types (`CattipuProject`) to resolve
  labels. The Project domain does not read filesystem state, apart from one naming helper.
- **DEFERRED (known issue).** The Explorer `data-entry-id` hydration mismatch
  (`components/Explorer/ExplorerApp.tsx:507`) is recorded and was not investigated further.
  It does not block diagnostics.

### 2.3 WindowManager — CANONICAL (with a LEGACY shadow)

| | |
|---|---|
| Owner | `components/WindowManager/*`: the pure reducer (`windowManager.reducer.ts`), the `useWindowManager` hook, `ManagedWindow`, and the geometry helpers in `lib/os/workspace.ts` |
| Persistence | `sessionStorage["cattipu-os:window-manager:v1"]`, best-effort |
| Window IDs | `CATTIPU_WINDOW_IDS = projects, architect, memory, explorer, settings` |
| Consumers | `InteractiveDesktop` (the one mount), which passes `openWindow` / `arrangeWindows` / `restoreAllWindows` to `CattipuShell` → `ExplorerApp` and `DesktopObjectLayer` through render-prop callbacks |

Findings:

- **CANONICAL.** All window behaviour goes through one reducer. Snap, arrange, restore and
  hydrate are actions on the same state, not a second store.
- **LEGACY / ORPHANED — `store/useWindowStore.ts`.** Nothing renders its windows. It survives
  in three ways:
  - `lib/apps.ts` imports `AppId` from it (type).
  - `lib/os/extensions.ts` imports `AppId` from it (type).
  - `components/CommandPalette/CommandPalette.tsx` calls `useWindowStore.openApp` at runtime.
    The palette is unmounted.

  It must not be revived or extended. See the handoff and CLAUDE.md.
- **BOUNDARY VIOLATION — three app-ID vocabularies.**

  | List | Values |
  |---|---|
  | `AppId` (legacy store) | 11 IDs, including `about`, `templates`, `home`, `canvas`, `forge`, `launch` |
  | `CATTIPU_WINDOW_IDS` (live reducer) | 5 IDs |
  | `CATTIPU_SIDEBAR_ITEMS` (Sidebar) | 9 IDs |

  The live shell narrows sidebar → window IDs with `isLaunchableSidebarItem`, so Home, Canvas,
  Forge and Launch are silent no-ops on the rail. That is honest behaviour, since those apps do
  not exist. The shared vocabulary, however, is anchored in the orphaned store. A later sprint
  should move `AppId` / `AppDef` onto the live ID list, as a type move with no behaviour change.
- **Design constraint for M20.5C/D.** Live window state is held in `useReducer` inside
  `InteractiveDesktop`, not in a global store. So:
  - a diagnostics service can read window state only through the `sessionStorage` snapshot,
    or through a value that `InteractiveDesktop` passes down to window content;
  - no new window store may be created to make this easier.
- **Risk for M20.5D.** Adding a `diagnostics` window ID changes `CATTIPU_WINDOW_IDS`.
  `parseWindowManagerState` requires every listed ID to be present. A session saved before the
  change therefore parses to `null`, and the layout from that session is discarded once. The
  data is session-only, so the impact is low, but the sprint that adds the ID must state it
  and test it.

### 2.4 Settings — CANONICAL

| | |
|---|---|
| Owner | `store/useSettingsStore.ts`: wallpaper, dock mode and size, cursor, sound, volume |
| Persistence | `localStorage["cattipu-settings"]`, **unversioned** |
| Consumers | `SettingsApp` (writer), `useUiSound`, `CursorProvider`, `useNotificationStore`, `useWindowStore` (legacy) |

Findings:

- **CANONICAL.** There is one settings owner.
- **DEFERRED.** The persisted settings have no `version` and no `migrate`. The first change to
  their shape will have no migration hook. Add one when the shape first changes (for example
  in M21), not before.
- **DEFERRED — dead settings.** `dockMode` and `dockIconSize` are written by Settings. No
  consumer reads them in the live v0.9 shell.

### 2.5 Notifications — CANONICAL store, unmounted renderer

| | |
|---|---|
| Owner | `store/useNotificationStore.ts` (queue, cap of 3, timers, sound mapping); `components/System/NotificationCenter.tsx` (renderer) |
| Producers | `SettingsApp` → Notifications test buttons (the only producer) |
| Consumers | `NotificationCenter`, which **is not mounted anywhere** |

Findings:

- **CANONICAL.** This is the one notification engine. No second one exists.
- **BOUNDARY VIOLATION (user-visible).** A push from Settings plays the success or error sound
  and enqueues an entry, and nothing draws it. `docs/DESIGN_CONSTITUTION.md` §7 still says the
  renderer is "mounted once in `components/Desktop/Desktop.tsx`". That file was removed with the
  legacy shell.
- **DEFERRED (M22).** Mounting belongs to Notification Center. M20.5 diagnostics may report this
  state but must not mount the renderer as a side effect.

### 2.6 Architect — CANONICAL

| | |
|---|---|
| Owner | `store/useArchitectStore.ts` (working copy, playback, editing verbs); `components/Architect/*` (ArchitectApp + 12 panels) |
| Persistence | None of its own. Edits write through to `useProjectStore.updateProjectArchitecture` when `linkedProjectId` is set. |
| Consumers | Architect panels, `CommandPalette` (unmounted) |

Findings:

- **CANONICAL.** There is one architecture-planning system.
- **ACCEPTABLE DEPENDENCY → future service seam.** `useArchitectStore.commit()` writes straight
  into `useProjectStore.getState()`. That is correct for an in-process MVP. It is also exactly
  the call a future `ArchitectService` should own: UI → ArchitectService → Project.
- **ACCEPTABLE DEPENDENCY.** `PromptBar` reports busy state through `useBusyStore`
  (`architect-generate`), the canonical busy signal. It is the only producer today.
- **DEFERRED (known drift).** Twelve Architect files plus `CommandPalette`, `NotificationCenter`
  and `SettingsApp` import `lucide-react`. This drift was recorded in Constitution §26 and
  DESIGN_CONSTITUTION §15.

### 2.7 AI stubs (`lib/ai/`) — CANONICAL generation seam, misleadingly named

| | |
|---|---|
| Owner | `lib/ai/generateArchitecture.ts` (the single entry point), `lib/ai/types.ts` (the `GeneratedArchitecture` schema), `lib/ai/seedTemplates.ts` (seeded data), `lib/ai/layout.ts` (graph layout) |
| Behaviour | `USE_SEEDED_DATA = true`. `generateFromModel()` throws. There is no provider SDK, no `fetch` and no API route. |

Findings:

- **CANONICAL.** UI never calls a model. The flow is Architect UI → `useArchitectStore.generate`
  → `generateArchitecture()`. This already has the target shape (UI → service → provider), just
  without a real provider behind it.
- **BOUNDARY VIOLATION (naming and ownership).** Most of `lib/ai/` is Architect domain, not AI
  infrastructure. `types.ts` is the architecture schema. `layout.ts` is graph layout. The seed
  templates are Architect content. Only the `generateFromModel` seam is AI-gateway material.
  M23 should split them into Architect contracts on one side and the AI gateway/provider
  adapter on the other. They should not keep growing together under `lib/ai/`.
- **BOUNDARY VIOLATION — lib → store type import and cycle.** `lib/ai/types.ts` imports
  `ProjectIcon` from `store/useProjectStore`, which re-exports it from `lib/project/types`. That
  closes a type-level cycle:

  ```text
  lib/project/types → lib/ai/types → store/useProjectStore → lib/project/types
  ```

  It is harmless at runtime because the imports are type-only. The fix is a one-line import
  change to `@/lib/project/types` in a later refactor sprint.
- **FUTURE EXTRACTION CANDIDATE — AI Gateway.** `generateFromModel()` is where the
  AIService → ProviderRegistry → ProviderAdapter chain belongs (M23). Provider credentials must
  never reach the browser bundle.

### 2.8 CommandPalette — LEGACY / ORPHANED (not superseded)

| | |
|---|---|
| Owner | `components/CommandPalette/CommandPalette.tsx`: Ctrl/⌘+K, app, project and Architect commands |
| Mounted | **No.** |
| Dependencies | `useWindowStore` (legacy, runtime), `useProjectStore`, `useArchitectStore`, `lib/apps`, `components/Icons/AppIcon`, `lucide-react`, `framer-motion` |

Findings:

- **LEGACY / ORPHANED.** The palette is complete but unreachable. `docs/REPOSITORY_AUDIT.md`
  lists it as "kept deliberately". It is the constitutional seed of the Command Center, so it
  is not dead code.
- **BOUNDARY VIOLATION if mounted as it is.** Every `openApp` call would target the legacy
  store, which nothing renders. The palette must be re-pointed at WindowManager's
  `launchWindow` before it is mounted (M22.5). It must never be mounted beside a revived
  `useWindowStore`.
- **DEFERRED (M22.5).** Command routing (Constitution §73) has no owner yet. Commands are
  hardcoded per surface: Palette, context menu and sidebar.

### 2.9 Toolbox — DEFERRED

| | |
|---|---|
| Owner | `components/RightWidgetStack/RightWidgetStack.tsx` (frozen v0.9 visual) |
| Wiring | `onToolSelect` exists as a prop. `InteractiveDesktop` does not pass it. All eight tools are inert. |

Findings:

- **DEFERRED.** The eight tools are `entity`, `service`, `flow`, `screen`, `api`, `job`,
  `script` and `config`. None of them has a canonical target, which the M20 report already
  records. The vocabulary does not match Architect's node kinds (`client`, `gateway`,
  `service`, `datastore`, `queue`). Routing the tools should go through the future command
  owner, not through ad-hoc handlers.
- **BOUNDARY VIOLATION — fabricated health.** In the same widget, the default `statuses` shown
  as SYSTEM STATUS are seven hardcoded rows:

  | Row | Value |
  |---|---|
  | DESKTOP | READY |
  | ARCHITECT | READY |
  | BUILD | IDLE |
  | PROJECT | SAVED |
  | MEMORY INDEXED | OK |
  | SOUND | ON |
  | CURSOR | ON |

  `InteractiveDesktop` passes no `statuses`, so these always render.
  `components/BottomStatusBar/BottomStatusBar.tsx` does the same with its defaults
  (`PROJECT SAVED`, `MEMORY INDEXED`).
  - Sound and Cursor can read the wrong value today: turn sound off and the widget still says
    `ON`.
  - Memory has no index at all.

  Constitution §35 says "never return to demo/fake values when canonical project state
  exists". The diagnostics service (M20.5C) is the correct future source for these rows.
  Feeding them is a separate sprint decision, and the frozen widget itself must not be
  restyled.

### 2.10 Extensions — CANONICAL contract file, not yet implemented

| | |
|---|---|
| Owner | `lib/os/extensions.ts`: contracts only, imported by nothing, by design |
| Declares | `ArtifactSlot`, `SlotContribution`, `WorkspaceGenerator`, `GenerationRequest`/`Result`, `DeploymentTarget`, `DeploymentProvider`, `PluginManifest`, `PluginContributions`, `WallpaperDefinition`, `CursorTheme`, `NotificationSource` |

Findings:

- **CANONICAL (contract precedent).** This is the repository's existing service-contract file.
  When `lib/contracts/*` is introduced in M20.5B and later milestones, these declarations must
  be **moved** into their domain contract folders. They must not be re-declared alongside:
  - `DeploymentProvider` → `contracts/launch`
  - `WorkspaceGenerator` → `contracts/forge` or `contracts/architect`
  - `NotificationSource` → `contracts/notifications`

  A second `DeploymentProvider` would be exactly the duplication Constitution §84 forbids.
  M20.5B needs only the diagnostics contracts, so no move is due yet.
- **BOUNDARY VIOLATION (minor).** `PluginContributions.apps` is typed with the legacy `AppId`
  (see §2.3).
- **DEFERRED (M24.5).** The Extension SDK itself.

### 2.11 Boot — CANONICAL, PROTECTED

| | |
|---|---|
| Owner | `store/useBootStore.ts` (`booting` / `booted`), `components/Boot/BootScreen.tsx`, `components/Boot/PixelLogo.tsx`, plus the stacking-context wrapper in `app/page.tsx` |
| Consumers | `app/page.tsx`. `PixelLogo` is also reused by the shell's top bar and by Settings, which is acceptable asset reuse. |

Findings:

- **CANONICAL.** There is one boot state. The z-index wrapper fix is documented in place.
  Diagnostics may read `useBootStore.phase`. It must never write it or re-order mounting.

### 2.12 Wallpaper — CANONICAL owner, no renderer

| | |
|---|---|
| Owner | `useSettingsStore.wallpaper` (`paper-grain`, `blueprint-grid`, `sunrise-geometry`) |
| Writer | `SettingsApp` wallpaper picker |
| Reader | **None.** No live surface paints `wallpaper`. The desktop-context-menu entry "Change Wallpaper" is disabled with a stale hint, `M19`. |

Findings:

- **CANONICAL.** There is one owner. The duplicate `useFilesystemStore.wallpaper` was already
  removed (filesystem store v3).
- **DEFERRED (M21).** This is write-only state until Wallpaper Studio. It is recorded here so
  M21 wires the desktop surface to the existing owner rather than adding a new one.

### 2.13 Sound — CANONICAL

| | |
|---|---|
| Owner | `lib/sounds.ts` (asset map, `playSound`), `hooks/useUiSound.ts` (settings-gated trigger for React) |
| Consumers | `BootScreen`, `BuildPlayback`, `useWindowManager` (window open/close), `useNotificationStore` (its own gated `chime`), `useWindowStore` (legacy, its own gated `chime`) |
| Assets | `public/sounds/` (5) |

Findings:

- **CANONICAL.** There is one playback owner.
- **ACCEPTABLE DEPENDENCY.** The settings gate (`soundEnabled` / `soundVolume`) is
  re-implemented in two non-hook places: the notification store and the legacy window store.
  Stores cannot call hooks, so the duplication is understandable. A plain
  `playSoundIfEnabled()` beside `playSound` would remove it. This is a later cleanup, not
  M20.5 work.

### 2.14 Cursor — CANONICAL

| | |
|---|---|
| Owner | `components/System/CursorProvider.tsx` (the one subscriber), `lib/os/busyCursor.ts` (delay and minimum-visible timing, which is pure), `store/useBusyStore.ts` (the busy-reason set, the reporting surface), `app/globals.css` cursor rules, `public/cursors/` (10 assets) |
| Producers | `PromptBar` (`architect-generate`) |

Findings:

- **CANONICAL.** The busy signal is reason-counted and has one producer today. Forge, Launch
  and Live are expected to report through the same store (`forge-build`, `launch-deploy`).
  They must not add their own cursor logic.
- The busy reasons are a genuine read-only input for diagnostics ("what is CATTIPU doing right
  now").

---

## 3. Cross-cutting findings

### 3.1 Icons — two systems

| System | Source | Used by |
|---|---|---|
| `components/PixelIcon/` (`ShellIcon`, `PixelIcon`, `PIXEL_ICON_REGISTRY`) | PixelForge SVG assets in `public/pixelforge/shell/{16,32}` and `public/pixelforge/toolbox` | The live shell: Sidebar, TopBar, DesktopObjectLayer, Explorer, ContextMenu |
| `components/Icons/` (`AppIcon`, `UtilityIcon`, `PixelIcon`) | M13 hand-coded pixel grids | `SettingsApp`, `PlaceholderApp`, and the unmounted `CommandPalette` and `NotificationCenter` |

- **BOUNDARY VIOLATION.** Constitution §19 and §25 allow one icon owner. PixelForge is
  canonical. `components/Icons` is legacy that is still in use, and both modules export a
  component named `PixelIcon`. Consolidating them is a later icon sprint, gated by the
  PixelForge review protocol (Constitution §79). The diagnostics UI (M20.5D) should use
  PixelForge (`ShellIcon`) only.

### 3.2 Version — three sources

`package.json` says `0.1.0`, `lib/version.ts` says `0.2.0` / `living-desktop.0226`, and the
release documents say `v0.9`.

- **DEFERRED, but it blocks M20.5C.** A diagnostics "SYSTEM" section needs one version value.
  M20.5B/C should read `lib/version.ts`, the only runtime source today, and report this
  discrepancy honestly. Choosing the canonical number is a product decision.

### 3.3 Infrastructure coupling

| Mechanism | Where | Notes |
|---|---|---|
| `localStorage`, via zustand `persist` | project (v4), filesystem (v3), settings (unversioned) | Persistence lives inside the stores. A later `adapters/persistence` is possible but not justified yet. |
| `sessionStorage` | `useWindowManager` | Best-effort, wrapped in `try` |
| Network, `fetch`, API routes, `process.env` | none (apart from two `NODE_ENV` dev-warning checks in `components/PixelIcon`) | Nothing needs to be moved behind an adapter today. |
| Provider SDKs, child processes, deploy APIs | none | |

### 3.4 Documentation drift (recorded, not fixed)

- `docs/ARCHITECTURE.md` "Stores":
  - lists `useWindowStore` as live ("Which applications are open");
  - lists `useSettingsStore` as not persisted (it is: `cattipu-settings`, unversioned);
  - omits `useBusyStore`.
- `docs/DESIGN_CONSTITUTION.md` §7 names a mount point (`components/Desktop/Desktop.tsx`) that
  no longer exists.
- `PROJECT_CONSTITUTION.md` §75 describes `npm run test` as running `lib/*/__tests__` suites.
  The current script runs 7 files under `tests/`.
- `app/page.tsx` comment says "the legacy `components/Desktop` tree stays in the repository".
  It has since been removed (`docs/REPOSITORY_AUDIT.md`).

### 3.5 Unused primitives

`components/UI/Button.tsx`, `Input.tsx` and `Panel.tsx` are imported by nothing, and only
`Textarea.tsx` is used. `docs/REPOSITORY_AUDIT.md` already lists them as "kept deliberately".
They remain **LEGACY / ORPHANED (kept)**. The diagnostics panel may adopt them if they fit the
live chrome. It must not fork them.

---

## 4. Future physical extraction candidates

| Candidate | Existing seam today | Blocker before extraction | Milestone |
|---|---|---|---|
| **AI Gateway** | `lib/ai/generateArchitecture.ts` → `generateFromModel()` | Split Architect schema from gateway (§2.7); provider credentials must stay server-side | M23 |
| **Forge Worker** | `CattipuProject.forge` slot, `addForgeBuild`, `WorkspaceGenerator` contract (`lib/os/extensions.ts`), `useBusyStore` reason | No implementation exists. Generated files must land in the canonical filesystem (Constitution §72). | M26 |
| **Live Runtime** | None | Nothing exists. Do not stub it. | M27 |
| **Launch Worker** | `CattipuProject.launch` slot, `addLaunchRelease`, `DeploymentProvider` / `DeploymentTarget` contracts | No implementation exists. Deployment credentials must never reach the UI (Constitution §80). | M28 |

## 5. Must remain in-process for MVP

These domains have no latency, isolation or credential reason to leave the browser process:

Project, Filesystem, Settings, Notifications, WindowManager, Shell / Desktop / Explorer,
Boot, Sound, Cursor / Busy, Architect's editing state.

Architect's generation call goes through the AI Gateway when that exists. Its graph editing
stays local.

---

## 6. Environment note

`npm run build` warns that Next.js inferred the workspace root from `C:\Users\acer\package-lock.json`,
a lockfile **outside** this repository, in the parent directory of the checkout. This is local
machine state, not repository state. Removing that stray file, or setting
`outputFileTracingRoot`, would silence the warning. Neither was done in this sprint.

---

## 7. What M20.5B–E can safely rely on

Read-only inputs a diagnostics service can take **without creating state**:

| Input | Source |
|---|---|
| Project count and schema version | `useProjectStore.getState()`, `PROJECT_SCHEMA_VERSION` |
| Filesystem object count and orphaned shortcuts (a `projectId` with no project) | `useFilesystemStore` + `useProjectStore` |
| Sound and cursor settings | `useSettingsStore` |
| Boot phase | `useBootStore` |
| Busy reasons | `useBusyStore` |
| Notification queue length, and the fact that its renderer is unmounted | `useNotificationStore` + this audit |
| Window state | the `sessionStorage` snapshot only (§2.3), or a value passed down from `InteractiveDesktop` |
| Version | `lib/version.ts` |
| Pipeline services (AI, Memory, Forge, Live, Launch) | Must report **NOT IMPLEMENTED / PLANNED**. The seeded Architect generator must report as seeded, never as a connected AI provider. |

Git status, lint, typecheck and test results are **not** available at runtime. They are
build-time facts. Constitution §56 lists them as potential diagnostics. They may be shown only
if a build step writes them into a static artifact, never by running shell commands from the
browser.

---

## 8. Scope of this sprint

- Changed: `docs/architecture/BOUNDARY_AUDIT.md` (new). Nothing else.
- Code, tests, styles, stores, assets: untouched.
- Every finding above is recorded, not fixed (Constitution §47, §70).
