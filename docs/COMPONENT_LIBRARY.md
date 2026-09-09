# CATTIPU OS — Component Library (as implemented)

**Status:** an inventory of what exists in `components/` today, extracted by reading the
files, not a target architecture. File paths are exact.

## 1. Shell (always mounted, `components/Desktop/Desktop.tsx` composes all of it)

| Component | File | Role |
|---|---|---|
| `Desktop` | `Desktop/Desktop.tsx` | Root shell. Mounts Wallpaper, TopBar, Dock, DesktopIcons, the "Welcome back" card, WindowManager, and CommandPalette in one `motion.div`. |
| `Wallpaper` | `Desktop/Wallpaper.tsx` | Background texture layer. |
| `TopBar` | `Desktop/TopBar.tsx` | 44px (`h-11`) navy bar: logo badge + "CATTIPU OS" wordmark (left), date/time + sun/volume glyphs in a recessed navy pill (right), separated by `.cattipu-vgroove` seams. |
| `Dock` | `Dock/Dock.tsx` | Left rail, 72px collapsed / 196px expanded on hover (or pinned via Settings). Renders `lib/apps.ts`'s `APPS` list in order: Home, Projects, Architect, Canvas, Forge, Launch, Memory, Explorer, Settings. Roving arrow-key focus, 400ms portal-rendered tooltips, `.cattipu-led` active indicator. |
| `AppIcon` | `Dock/AppIcon.tsx` | Renders `public/icons/{icon}.png` at its per-icon intrinsic size (see `DIMS` table), `image-rendering: pixelated`. Shared by the dock, window title bars, and desktop icons. |
| `DesktopIcons` | `Desktop/DesktopIcons.tsx` | Fixed column (not draggable) of 3 icons — CATTIPU (opens About), My Projects (opens Projects), Archive (opens Explorer). Click selects, double-click opens. |
| `DeskScene` | `Desktop/DeskScene.tsx` | Inline SVG illustration (drafting mat, keyboard, mug, pencil, plant) shown inside the Welcome card. |
| `WindowManager` | `Window/WindowManager.tsx` | Maps open windows in `useWindowStore` to a component by `appId`: `home`/`projects` → `ProjectsApp`, `explorer` → `FileExplorerApp`, `settings` → `SettingsApp`, `about` → `AboutApp`, `architect` → `ArchitectApp`, everything else (`canvas`, `forge`, `launch`, `memory`) → `PlaceholderApp`. |
| `Window` | `Window/Window.tsx` | The actual window chrome — see §3. |
| `CommandPalette` | `CommandPalette/CommandPalette.tsx` | Overlay command list (⌘K-style), keyed off a `Command` interface. |
| `BootScreen` | `Boot/BootScreen.tsx` | Loading screen — a segmented bar, 5 color groups × 4 segments, filling left to right. Preserved per explicit product direction; not touched by any sprint this session. |
| `PixelLogo` | `Boot/PixelLogo.tsx` | The CATTIPU thumbs-up mark, with `mode`/`variant` props for the different contexts it's used in (boot, top bar badge, dock badge). |
| `CattipuSpinner` | `System/CattipuSpinner.tsx` | Reusable loading spinner. |
| `CursorProvider` | `System/CursorProvider.tsx` | Toggles the `.cattipu-cursors` class on `<body>` per the Settings > Cursor preference, activating the pixel-cursor CSS in globals.css. |

## 2. App windows (`components/Window/` + `components/Architect/`)

| App | File | Status |
|---|---|---|
| `ProjectsApp` | `Window/ProjectsApp.tsx` | Real. Doubles as both the "Home" and "Projects" dock entries (see WindowManager above) — there is currently no separate Home-specific window content. Project list, inline "New Project" form, opens Architect for projects that have generated architecture. |
| `SettingsApp` | `Window/SettingsApp.tsx` | Real. Appearance (wallpaper picker), Dock, Cursor, Sound, About tabs. Contains the `ToggleRow` pattern — see §4. |
| `FileExplorerApp` | `Window/FileExplorerApp.tsx` | Real, built against a `StaticFile` interface (static/mock file tree, not a live filesystem). |
| `AboutApp` | `Window/AboutApp.tsx` | Real, static content. |
| `ArchitectApp` | `Architect/ArchitectApp.tsx` | Real and the most developed app: `ArchitectureCanvas` (React Flow blueprint canvas), `BuildPlayback`, `PromptBar`, `NodeInspector`, `DatabasePanel`, `ApiCatalogPanel`, `PlannerPanel`, `RoadmapPanel`, `RecommendationsPanel`, `ExportCenter` all live under `components/Architect/`. |
| `PlaceholderApp` | `Window/PlaceholderApp.tsx` | Fallback for any `appId` WindowManager doesn't special-case. Currently the actual implementation behind the Canvas, Forge, Launch, and Memory dock entries — despite dock icons and window titles suggesting real apps. |

## 3. Window chrome (`Window/Window.tsx`)

Built on `react-rnd` (`Rnd`) for drag/resize. Structure: an outer `.cattipu-raised` frame
(`rounded-md`, 3px padding, drop shadow, plus `.cattipu-window-glow` when focused) containing a
44px `.cattipu-raised-navy` title bar (`cattipu-window-titlebar` drag handle class, app icon +
title, three 28×24px square buttons — gold Minimize, blue "Stack"/maximize, red Close, each
`.cattipu-press`) and a `.cattipu-recessed` content area (`bg-surface-solid`). Resize handles
on all 8 edges/corners via `RESIZE_HANDLE_CLASSES`, all mapped to the same `.cattipu-resize-handle`
class (which also drives the custom resize cursor from the pixel-cursor system). `minWidth`
360px / `minHeight` 260px enforced by `Rnd`.

## 4. Reusable interaction patterns (not separate files — patterns repeated in place)

- **ToggleRow** (`Window/SettingsApp.tsx`) — a labeled switch: `.cattipu-recessed` track
  (`h-6 w-11`, navy when checked), `.cattipu-raised` knob (`h-4 w-4`, translates via
  `translate-x-0.5` ↔ `translate-x-[22px]`), `role="switch"` + `aria-checked`. The only toggle
  implementation in the app; not extracted to a shared component file yet.
- **Icon-tinted project row** (`Desktop.tsx`'s Recent Projects list, `ProjectsApp.tsx`'s full
  list) — a `lucide-react` icon (chosen from a `ProjectIcon → Component` map: `banking`→
  Building2, `saas`→Cpu, `website`→Globe2, `generic`→Sparkles) inside a bordered square whose
  `borderColor`/`color` are set inline from the project's stored `color` string — the one place
  in the app where color comes from data rather than a CSS class.
- **Folder-tab switcher** — used in Architect for Planner/Architecture/Database/Roadmap;
  styled entirely by `.cattipu-folder-tab` / `.cattipu-folder-tab-active` (see
  DESIGN_CONSTITUTION.md §4).

## 5. CSS-only primitives

See `docs/DESIGN_CONSTITUTION.md` §4 for the full list of `.cattipu-*` surface classes — they
are the actual reusable "component library" for visual treatment, since React components don't
wrap most of them (e.g. any element can opt into `.cattipu-raised`, there's no `<Raised>`
wrapper component).
