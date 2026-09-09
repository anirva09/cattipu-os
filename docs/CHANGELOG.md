# CATTIPU OS — Changelog

## v0.9 — Living Desktop foundation

The shell moved from a themed page to an OS with real objects. Six
sprints, each measured against the Golden Master render and each verified
by a behavioural harness driving the production build in a browser.

### Added

* **Living Desktop (M16)** — desktop icons as OS objects with identity,
  grid position and a linked project. Drag, snap-to-grid, persistence,
  mechanical context menus. Shortcuts store a project id, never a name.
* **Real File Explorer (M17)** — folder tree, breadcrumbs, search, move,
  nesting. Explorer and the desktop are two views of one array; the OS
  root *is* the desktop.
* **Workspace Intelligence (M18)** — edge snapping with a drag preview,
  Cascade, Tile, and exact restore of size, position and z-order. Snaps
  store a region rather than a rectangle, so a snapped-then-maximised
  window unwinds one level at a time.
* **Project Templates (M19)** — ten templates, each declaring an eight
  field project identity and building its workspace folders. Two fields
  stored, six derived.
* **Live system clock** — the viewer's locale and timezone, ticking on
  the minute rather than every sixty seconds.
* **Intelligent naming** — `Untitled Folder (2)`, computed from the names
  in use, so renaming frees a number with no code to free it.
* **Dynamic workspace title** — top bar and browser tab, both derived
  from the most recently opened project.
* `lib/os/extensions.ts` — declared seams for the AI Workspace pipeline,
  deployment, plugins, wallpapers, cursor themes and the notification
  centre. Contracts only; no implementations.

### Fixed

* **The boot screen had been invisible since the v0.9 shell swap.** Its
  implementation was never changed — it was painted over, because
  `.cattipu-interactive-desktop` creates no stacking context and the
  shell's children outrank the overlay's `z-50`.
* **RECENT PROJECTS rendered three hardcoded names** and had never shown
  a project created after boot.
* **The workspace title was a hardcoded default parameter** —
  `'Banking Platform'` — which JavaScript reinstates on `undefined`.
* The rail overflowed its box at every height, clipping the node monitor
  away entirely at 900px and above.
* A browser focus ring was painted on the window chrome, accounting for
  9,212 pixels of difference from the reference render.
* Explorer's grid landed on half-pixels, rendering 2px selection borders
  as 3px of grey.

### Changed

* Two secondary text tokens darkened for contrast: 3.30:1 → 7.01:1 and
  1.94:1 → 4.67:1, measured against the surface they actually appear on.
* Project schema v2 → v4: template id, then stack and deployment
  overrides. Desktop persist schema v2 → v3, dropping a duplicate
  wallpaper field.

### Removed

* The legacy desktop shell, superseded by the v0.9 `InteractiveDesktop`
  and unrendered since the integration sprint.
* Unused Next.js starter assets, the PNG icon set superseded in M13, and
  three unused dependencies.

---

## v0.3.5 — Architect Intelligence

### Added

* Editable architecture graph
* Build Playback 2.0
* Live ER diagram
* API Catalog
* Infrastructure Mode
* Smart Recommendations
* Export Center
* Project Memory

### Improved

* Command Palette integration
* Roadmap system
* Architect interactions

### Fixed

* Lucide icon import
* React lint issues

---

## v0.2.5 — Identity Lock

### Added

* Beveled chrome
* Pixel typography
* Folder tabs
* Embossed logo treatment

### Changed

* Window controls
* Dock styling
* Wallpaper system
