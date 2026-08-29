# CATTIPU OS — Home Screen (as implemented)

**Status:** describes exactly what renders today, extracted from `components/Desktop/Desktop.tsx`
and the components it mounts. This is not a target design — see DESIGN_CONSTITUTION.md §6 for
where this is known to fall short of what a "Home Screen" implies (no distinct Home window
content, no System Status or Architect Preview panels, desktop icons aren't a real shortcut
system).

## 1. Layout, top to bottom

The Home Screen is not one component — it's `Desktop.tsx` composing five always-mounted layers
plus whatever window is currently open:

1. **`Wallpaper`** — full-bleed background, `z`-index below everything else.
2. **`TopBar`** — 44px navy bar, full width, `z-30`. Logo badge + wordmark left; date/time +
   sun/volume glyphs right.
3. **`Dock`** — left rail, `z-20`, 72–196px wide depending on hover/pinned state, full
   remaining height.
4. **`DesktopIcons`** — absolutely positioned at `left-5 top-6` (20px/24px from the corner),
   a vertical stack (`gap-1`) of three 80px-wide (`w-20`) icon buttons: CATTIPU, My Projects,
   Archive.
5. **The "Welcome back" card** — absolutely positioned at `right-8 top-8`, width
   `min(90vw, 22rem)` (352px on desktop). Contains: a heading (`"Welcome back, "` +
   `<span className="text-purple">Creator.</span>`), a subheading ("What will we build
   today?"), the `DeskScene` illustration (64×80px, top-right of the card), and a nested
   "Recent Projects" panel listing the first 3 projects from `useProjectStore` (icon + name +
   relative-edited-time + overflow menu glyph, each row opening the Projects window) with a
   "View all" link.
6. **`WindowManager`** — renders whatever windows are open, on top of everything above.
7. **`CommandPalette`** — overlay, rendered last, hidden until invoked.

## 2. What opening "Home" from the dock actually does

The dock's Home entry and Projects entry both open the same component: `ProjectsApp`
(`WindowManager.tsx`: `win.appId === "home" || win.appId === "projects" ? <ProjectsApp /> : ...`).
There is no Home-specific window content — "Home" and "Projects" are the same screen with two
different launch points and two different window titles.

## 3. Desktop icons in detail

Three fixed entries, `components/Desktop/DesktopIcons.tsx`:

| Icon | Opens | Render |
|---|---|---|
| CATTIPU | `about` window | `PixelLogo` mark, retro mode |
| My Projects | `projects` window | `AppIcon icon="projects"` |
| Archive | `explorer` window | `AppIcon icon="archive"` |

Interaction: single click selects (dashed navy border + tinted background); double-click opens.
Not draggable — position is fixed by DOM order in a `flex flex-col` stack. No rename, no
snap-to-grid (nothing to snap, since nothing moves), no right-click menu, no multi-select.

## 4. Recent Projects data

Sourced live from `useProjectStore` (Zustand, persisted to `localStorage` under
`cattipu-projects`) — both the Welcome card's 3-item preview and the full Projects window read
the same store. Each project has an `icon` (one of `banking`/`saas`/`website`/`generic`,
mapped to a `lucide-react` glyph) and a `color` string used inline for that glyph's border/tint.

## 5. Explicitly out of scope for this document

Per product direction, the loading screen (`BootScreen`) that precedes the Home Screen on
first mount, and all existing sounds/animations, are unchanged and undocumented here beyond
noting they exist — they're covered by their own files (`Boot/BootScreen.tsx`, `lib/sounds.ts`)
and weren't touched while producing this spec.
