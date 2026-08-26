# CATTIPU OS

The operating system for software creators — v0.2.5, Identity Refactor.

This is not a website. It's a browser-based OS shell: a retro pixel boot
sequence that resolves into a warm, light desktop with a real window
manager, a hover-expanding dock, a `Ctrl+K` command palette, and a first
real AI app — Architect turns a one-line prompt into a feature plan, a
system architecture graph, a SQL schema, and a roadmap, inside native
CATTIPU windows. As of v0.2.5, every surface is styled to feel like it
was designed by CATTIPU, not borrowed from Windows — molded plastic,
pixel precision, the colorful thumb logo as the anchor.

## What's new in v0.2.5 — Identity Refactor

A visual-only sprint — no functionality changed, no store shape changed,
nothing removed. The mission was to make the shell feel like an OS that
never existed in 1998 (Mac OS 8 platinum depth, BeOS's playful industrial
design, Haiku, MenuetOS's pixel precision) instead of a generic modern
dashboard wearing retro colors.

- **Top bar** — beveled molded-plastic bar (`.cattipu-raised-navy`), the
  CATTIPU thumb sits inside a small embossed badge (`.cattipu-badge`)
  reusing the existing haloed logo asset at a larger size, and the date/
  time/volume cluster sits in a recessed pill instead of floating loose.
- **Window chrome** — `Window.tsx` rebuilt on the new depth system:
  raised outer frame, recessed content well, embossed pixel-font title.
  The Windows-style `[-][□][X]` controls are gone, replaced with
  CATTIPU's own: **yellow** minimize, **blue** "stack" (maximize, distinct
  layers glyph), **red** close — chunky, pixel-bordered, unique
  silhouettes, a real press-down animation via `.cattipu-press`.
- **Typography system** — two personalities, plus code: `--font-pixel-ui`
  (chrome/titles/buttons/tabs/labels), `--font-body` (paragraphs,
  descriptions, prompts), `--font-code` (a pixel monospace, VT323,
  self-hosted via `@fontsource/vt323`). Tailwind's built-in `--font-mono`
  is overridden to the same value, so every existing `font-mono` usage
  picked up the pixel monospace automatically, no per-component edits.
  Fonts are never hardcoded in a component — only these tokens.
- **Folder tabs** — Architect's Planner/Architecture/Database/Roadmap
  switcher is now physical file-folder tabs: raised inactive tabs sitting
  above the rack, the active tab pressed flush with the panel it opens
  onto (`.cattipu-folder-tab` / `.cattipu-folder-tab-active`).
- **Dock** — same hover-expand mechanic, byte-for-byte (nothing about
  when or how it expands changed), restyled as a molded plastic rail with
  recessed icon wells, a blue LED active-indicator instead of a flat bar,
  and a persistent 2px lift on the active app's icon (not just on hover).
- **Wallpapers, renamed and reworked** — Paper Grain (default, textured
  stationery), Blueprint Grid (fine navy engineering-paper grid), Sunrise
  Geometry (a hard-edged concentric-ring "sun" + crosshatch diamond
  field — deliberately built from `repeating-*-gradient` hard color
  stops, not a soft gradient wash, per the brief's "no modern gradients"
  rule).
- **Surface depth system** — one reusable set of primitives in
  `globals.css` (`.cattipu-raised`, `.cattipu-recessed`, `.cattipu-badge`,
  `.cattipu-emboss-text`, `.cattipu-screw`, `.cattipu-led`,
  `.cattipu-press`, `.cattipu-window-glow`) that every window, tab, dock,
  and panel builds on, instead of each surface inventing its own bevel.
- **Architect "Control Room"** — Planner, Database, Roadmap, and the
  Architecture graph's node/edge chrome all moved onto the depth system
  and pixel-ui headers; the graph stays the centerpiece, everything else
  reads as denser, more physical instrumentation around it. No
  functional change to generation, playback, or the graph itself.
- **Pixel personality pass** — the focused window now carries a
  restrained 1px blue glow (`.cattipu-window-glow`); a new
  `CattipuSpinner` (four small squares in the thumb's own gold/red/blue/
  green, bouncing in a fixed mechanical sequence — no rotation, no blob
  easing) replaces every generic spinner in Architect; tiny embossed
  screws (`.cattipu-screw`) sit in the corners of the About panel and the
  Architect workspace.

**A deliberate deviation, called out rather than silently made:** the
brief's color table lists navy as `#083D91`; the codebase's actual value
(present since v0.1, used in every screenshot to date) is `#0B3D91`. Read
literally the difference is one hex digit — almost certainly a
transcription variance, not an intentional repaint. Given the instruction
to "use the established palette," the existing codebase value was kept
rather than perturbed to match a table that likely just mistyped it.

## What's new in v0.3 — Architect

Architect is CATTIPU's first working AI app, built to prove the product's
whole premise: describe what you want, watch the OS build it.

- **Prompt Bar** (`components/Architect/PromptBar.tsx`) — multiline input,
  `Ctrl+Enter` to generate, an example prompt, cream/pixel-border/navy-focus
  styling matching every other input in the app.
- **Build Playback** (`components/Architect/BuildPlayback.tsx`) — the
  signature moment. Generation doesn't just dump results; a ~7.5s staged
  reveal walks through Planner → Architecture → Database → Roadmap, each
  panel choreographing its own entrance (staggered feature cards, nodes
  appearing one by one then connections drawing, SQL typing in character
  by character, milestones fading in).
- **Architecture Canvas** (`ArchitectureCanvas.tsx`) — an interactive
  [React Flow](https://reactflow.dev) graph, restyled to match CATTIPU's
  pixel chrome (no glass, no rounded blobs): draggable, zoomable,
  pannable nodes for clients/gateways/services/datastores, with labeled
  edges (HTTP / Events / Database writes).
- **Node Inspector** (`NodeInspector.tsx`) — click a node, a Finder-style
  panel slides in from the right with its responsibilities, endpoints,
  dependencies, events, and tables.
- **Database Panel** (`DatabasePanel.tsx`) — a typed-in SQL schema viewer
  plus a compact ER diagram (also React Flow) and a relationship list.
- **Planner** and **Roadmap** panels — a pixel checklist of generated
  features, and week-by-week milestone cards.
- **Project integration** — once playback finishes, Architect
  automatically creates a real project (prompt, summary, full generated
  architecture, timestamp) via the existing project store. It shows up
  immediately in the desktop's Recent Projects card, the Projects app,
  and Explorer's My Projects folder — no new plumbing in any of those
  three surfaces, they just react to the same store.

**The AI is seeded, on purpose, behind one file.** `lib/ai/generateArchitecture.ts`
is the single integration point — everything downstream depends only on
the `GeneratedArchitecture` shape it returns, never on how it was
produced. Today it resolves seeded template data (`lib/ai/seedTemplates.ts`,
picked by keyword match on the prompt) after a short artificial delay, so
the whole app can be built, demoed, and reviewed without a model API key.
Wiring a real OpenAI/Claude call later means implementing one function in
that one file — no component, store, or window needs to change.

## What's new in v0.3.5 — Architect Intelligence

Per the founder brief: *"Architect is the hero."* This sprint didn't touch the shell, the dock,
Explorer, Settings, the command palette's mechanics, typography, the depth system, the logo, the
color palette, or motion timing — it only extended Architect itself, turning it from a template
generator into an interactive AI systems architect. Every new surface reuses the v0.2.5
primitives (`.cattipu-raised`, `.cattipu-recessed`, `.cattipu-badge`, `.cattipu-press`,
`.cattipu-folder-tab`, `.cattipu-emboss-text`, the pixel-ui/body/code font tokens) — no new
design language was introduced.

- **Editable architecture graph** — nodes can now be dragged, renamed (double-click the label),
  duplicated, and deleted, and edges can be drawn between nodes by dragging from one handle to
  another or removed with the delete key. Every node's position is baked into the data itself
  (`ArchitectNode.position`) instead of being recomputed on every render, so a drag is a real,
  persisted edit — not a visual-only interaction. A toolbar (`+ Service` / `+ Database` /
  `+ Queue`) adds new nodes directly onto the canvas.
- **Build Playback 2.0** — the signature moment got more cinematic and more precisely staged: a
  blueprint grid materializes, the first service fades in, the API Gateway arrives, connections
  draw themselves, the database grows column by column as SQL types itself in, event edges pulse,
  the roadmap fills in, and a `SYSTEM READY.` badge caps the sequence. Still 5–8 seconds, still
  mechanical rather than magical — no easing that reads as "AI thinking," just parts arriving in
  engineered order.
- **Live ER diagram** — tables in the Database tab are now fully editable: rename a table inline,
  add or delete a column, change a column's SQL type from a dropdown, and draw a new relationship
  between two tables from a small form at the bottom of the panel. The typed-SQL view stays wired
  to the live schema, so it re-types itself whenever the schema actually changes.
- **API Catalog** (new "APIs" tab) — every generated architecture now includes a real endpoint
  inventory: method, route, request shape, response shape, authentication, and dependencies.
  Clicking an endpoint jumps back to the Architecture tab and highlights the service that owns it.
- **Infrastructure Mode** — a second graph, toggled from the same Architecture tab
  (Application / Infrastructure), showing Docker, Kubernetes, PostgreSQL, Redis, Kafka, S3, and
  the API Gateway as their own topology. It's generated alongside the application graph from the
  same template data, so the two stay in sync by construction rather than by manual bookkeeping.
- **Smart Recommendations** (new "Ideas" tab) — CATTIPU now surfaces a short list of proactive,
  architecture-specific suggestions (e.g. *"Payment service should publish Kafka events"*,
  *"Redis cache would reduce database load"*), each one a click away from the node it's about.
- **Roadmap Generator** — the roadmap is now phase-based and collapsible (Phase 1, Phase 2, …),
  each phase grouping the features that belong to it, instead of a flat week-by-week list.
- **Export Center** — one "Export Project" button opens a panel with six real export formats:
  Markdown, JSON, SQL, a dbdiagram.io-ready `.dbml`, an OpenAPI 3.0.3 spec, and a print-ready PDF
  architecture report (rendered as real HTML and handed to the browser's own print-to-PDF, no PDF
  library dependency).
- **Command Palette integration** — `Ctrl+K` now includes an "Architect" group (New Service, Add
  Database, Add Queue, Generate APIs, Generate Roadmap, Export Project) whenever a workspace is
  open, reusing the existing palette rather than building a second one.
- **Project Memory** — every edit — a drag, a rename, a new column, a new relationship — is
  written straight into the linked project record as it happens (`updateProjectArchitecture`),
  not snapshotted only on close. Reopening a project from Explorer or the Projects app restores
  the exact workspace: same graph, same positions, same schema, same roadmap.

**One honest caveat, not swept under the rug:** drag-to-reposition is implemented the same way
window-dragging already works in this app (position lives in the store, the drag handler commits
it on release) and reads correctly by inspection — but automated browser verification for this
specific sprint could not reliably simulate a held-mouse-button drag over the React Flow canvas in
its sandbox, while every other interaction (click, double-click rename, toolbar actions, tab
switches, exports) verified cleanly. Worth a manual drag-and-drop check in a real browser as a
final confirmation.

## What's built in v0.1

- **Boot sequence** — cream/navy retro boot screen with the real CATTIPU
  logo, a segmented five-color pixel loading bar, and a status line. Click,
  tap, or press any key to skip.
- **Desktop shell** — light cream desktop with a subtle halftone gradient,
  a navy top bar (mark, product badge, clock, sun/volume glyphs), and a
  "Welcome back" card with a live Recent Projects list.
- **Dock** — a compact icon rail on the left that expands to show labels on
  hover, using the real hand-pixelled nav icon set. Shows an active-app dot
  for every open window.
- **Window manager** — real floating windows (`react-rnd`): drag, resize,
  minimize, maximize/restore, close, and z-index focus layering, all
  Zustand-backed. Navy title bar with the same blue min/max + red close
  controls as the design sheet.
- **Command palette** (`Ctrl+K` / `⌘K`) — search-filtered Suggestions and
  Recent sections, arrow-key navigation, keyboard shortcuts shown per row.
- **Projects app + creation flow** — a real (if simple) app: lists projects,
  creates new ones by name, and stays in sync with the desktop's Recent
  Projects card via a shared store. Every other dock item (Architect,
  Canvas, Forge, Launch, Memory, Settings) opens a real window with honest
  placeholder content — the window chrome is real, the app content is
  future-scope per the founder's brief.

## What's new in v0.2

A continuation sprint on the same shell, not a redesign — every v0.1
decision (cream desktop, navy top bar, hover-expanding dock, window
chrome, the pixel icon family) is preserved as-is.

- **File Explorer** — a real file manager: left folder tree, right file
  grid, breadcrumbs, double-click navigation. Five default folders (My
  Projects, Apps, Assets, Templates, Downloads); "My Projects" reads
  live from the same project store the Projects app uses, so the two
  stay in sync.
- **Settings** — Appearance (switch wallpapers), Dock (hover vs. always
  expanded, icon size), Cursor (on/off), Sound (on/off + volume), and
  About — all in the existing window chrome, all persisted to
  `localStorage` via a Zustand `persist` store.
- **About CATTIPU OS** — version/build badge and the "Ideas become
  software." tagline. Click the thumb 5 times for a Developer Mode
  Easter egg.
- **Desktop icons** — exactly three (CATTIPU, My Projects, Archive) on
  the desktop surface, with a real pixel-style selection rectangle.
- **Pixel cursor system** — hand-pixelled Arrow/Hand/Text/Resize
  cursors replace the browser default across the whole shell, toggled
  from Settings > Cursor.
- **System sounds** — short (<1s), synthesized chiptune blips for
  boot, window open/close, and project create success/error.
- **Polish** — raised-bevel window chrome and dock, an active-app rail
  indicator, hover shadows, and a subtle paper-grain texture on every
  wallpaper variant.
- **Windows remember where you left them.** `useWindowStore` now keeps
  a per-app last-known rect, so reopening an app (from the dock, the
  desktop, or the command palette) restores its previous position and
  size instead of always cascading.

New assets (two nav icons, four cursors, five sounds, one grain
texture) are hand-generated, not sourced from the moodboard — see
`scripts/gen_icons.py`, `scripts/gen_cursors.py`, and
`scripts/gen_sounds.py` for the exact, reproducible pipeline (small
logical pixel grid, nearest-neighbor scaling only, no anti-aliasing).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Boot takes ~3.5s and
can be skipped with any key/click/tap.

```bash
npm run build   # production build + typecheck + lint
npm run lint    # eslint only
```

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion ·
Zustand · react-rnd · React Flow (`reactflow`) · lucide-react

Fonts are self-hosted via `@fontsource` (Press Start 2P for `--font-pixel-ui`,
Inter Variable for `--font-body`, VT323 for `--font-code`/`--font-mono`) —
no runtime dependency on Google Fonts.

## Project structure

```
cattipu-os/
├── app/
│   ├── layout.tsx        # fonts, metadata, root shell
│   ├── globals.css       # design tokens (@theme): one shared palette, fonts
│   └── page.tsx           # orchestrates Boot -> Desktop
├── components/
│   ├── Boot/
│   │   ├── BootScreen.tsx # retro boot sequence + skip logic
│   │   └── PixelLogo.tsx  # brand mark (mode x variant, see below)
│   ├── Desktop/
│   │   ├── Desktop.tsx    # shell composition, welcome + recent projects card
│   │   ├── Wallpaper.tsx  # cream base + halftone/grid/sunrise variants + grain
│   │   ├── TopBar.tsx     # navy bar: mark, badge, sun/date/time/volume
│   │   └── DesktopIcons.tsx # CATTIPU / My Projects / Archive, select + open
│   ├── Dock/
│   │   ├── Dock.tsx       # hover-expanding icon rail (+ always-expanded, icon size)
│   │   └── AppIcon.tsx    # renders one of the nav icons (public/icons/)
│   ├── Window/
│   │   ├── Window.tsx     # react-rnd wrapper + bevelled title bar chrome
│   │   ├── WindowManager.tsx # renders all open windows, routes content by appId
│   │   ├── ProjectsApp.tsx   # real: list + create projects
│   │   ├── FileExplorerApp.tsx # folder tree + file grid + breadcrumbs
│   │   ├── SettingsApp.tsx     # Appearance / Dock / Cursor / Sound / About
│   │   ├── AboutApp.tsx        # version badge + 5-click easter egg
│   │   └── PlaceholderApp.tsx # honest "not in scope yet" stub for other apps
│   ├── CommandPalette/
│   │   └── CommandPalette.tsx # Ctrl+K, search, suggestions + recent
│   ├── System/
│   │   ├── CursorProvider.tsx # toggles the pixel-cursor stylesheet on <body>
│   │   └── CattipuSpinner.tsx # thumb-colored 4-square pixel loading indicator
│   └── Architect/
│       ├── ArchitectApp.tsx      # composition root: prompt bar, tabs, panels
│       ├── PromptBar.tsx         # multiline input, Ctrl+Enter, example prompt
│       ├── BuildPlayback.tsx     # stage-timing controller, no visual output
│       ├── PlannerPanel.tsx      # staggered feature checklist cards
│       ├── ArchitectureCanvas.tsx# React Flow graph (hero) + node click -> inspector
│       ├── NodeInspector.tsx     # Finder-style slide-in panel for a selected node
│       ├── DatabasePanel.tsx     # typed-in SQL + mini ER graph + relationships
│       └── RoadmapPanel.tsx      # week-by-week milestone cards
├── store/
│   ├── useBootStore.ts     # boot phase
│   ├── useWindowStore.ts   # open windows: position, size, z-index, min/max, lastRects
│   ├── useProjectStore.ts  # projects list + create (+ addProjectFromArchitecture)
│   ├── useSettingsStore.ts # wallpaper, dock, cursor, sound — persisted (localStorage)
│   └── useArchitectStore.ts# prompt, generation/playback status, data, selected node
├── lib/
│   ├── apps.ts            # the app registry (id, label, icon, tagline)
│   ├── sounds.ts           # WAV playback (public/sounds/)
│   ├── useUiSound.ts       # settings-aware sound-trigger hook
│   ├── version.ts          # shared version/build/tagline constants
│   ├── utils.ts            # cn() class helper
│   └── ai/
│       ├── generateArchitecture.ts # the ONE file to swap for a real model
│       ├── seedTemplates.ts        # banking / e-commerce / SaaS sample data
│       └── types.ts                # GeneratedArchitecture + friends
├── scripts/
│   ├── gen_icons.py        # Explorer/Archive nav icons (pixel-grid, no AA)
│   ├── gen_cursors.py      # Arrow/Hand/Text/Resize cursor bitmaps
│   └── gen_sounds.py       # synthesized system sound WAVs
```

## The logo

`components/Boot/PixelLogo.tsx` renders the real brand mark (sourced from
provided logo artwork, processed into transparent PNGs at `public/logo/`).
`mode="retro" | "mono"` × `variant="lockup" | "icon" | "mark" | "topbar"`:

- `lockup` — full mark (thumb + "CATTIPU" lettering + "CATTIPU OS®" wordmark
  + color bar). The boot-screen hero.
- `icon` — thumb + lettering, no wordmark. Legible from ~40px up.
- `mark` — solid one-color silhouette, no interior lettering. The lettering
  turns to mush under ~32px, so the favicon and any tiny badge use this.
- `topbar` — colorful icon with a white halo outline, sized for sitting
  directly on the navy top bar (a navy-outlined mark would vanish into the
  navy background; this is retro-only, no mono variant needed).

The favicon (`app/favicon.ico`) is generated from the solid-navy `mark`.

## Nav icon set

`public/icons/*.png` are the 10 nav/desktop icons (Home, Projects,
Architect, Canvas, Forge, Launch, Memory, Settings, Explorer, Archive),
rendered via `components/Dock/AppIcon.tsx` and shared by the dock, window
title bars, the command palette, the desktop icons, and File Explorer so
every surface uses the same glyphs. The original 8 are cropped directly
from the provided design sheet (background-distance alpha masking +
row/column gap detection, not redrawn); Explorer and Archive (added in
v0.2, no source art existed for them) are hand-built pixel art in the
same navy-outline / flat-fill family — see `scripts/gen_icons.py`.
lucide-react is used only for generic UI chrome (window buttons, settings
section icons, breadcrumb chevrons) — never for OS navigation glyphs.

## Design decisions worth knowing

- **One shared palette, not boot vs. desktop.** The exact hex values from
  the design sheet (`navy #0B3D91`, `cream #EDE4C7`, plus red/green/blue/
  gold/purple/black) are defined once in `app/globals.css` and used
  everywhere — boot and desktop are the same warm, light system now, not a
  dark-desktop / light-boot split.
- **Placeholder app content is intentional, not a shortcut.** Canvas,
  Forge, Launch, and Memory still render a real window with the correct
  chrome, icon, and tagline, plus a small "on the roadmap" badge — honest
  about what's scoped in vs. out, per the founder's brief ("do not build
  everything"). Settings, File Explorer, and About graduated out of
  placeholder status in v0.2; Architect graduated in v0.3 — those four
  remain future-scope.
- **Each sprint is a continuation, not a redesign.** Every new feature
  reuses the existing window system, stores, and pixel styling — no
  component gets rebuilt from scratch. The hover-expanding dock's core
  mechanic, the window chrome's structure, and the shared palette are
  all still exactly what they were in v0.1.
- **Windows have memory.** `useWindowStore.lastRects` keeps a per-app
  rect, updated live as you drag/resize and on close, so reopening any
  app restores it where you left it instead of re-cascading. Architect
  also gets a larger first-open size (`DEFAULT_SIZES` in the store) since
  a graph + SQL viewer needs more room than a placeholder window did.
- **React Flow custom nodes need explicit `<Handle>` elements.** Easy to
  miss: without them, edges compute no anchor point and simply don't
  render (no error, no warning — they're just invisible). Both
  `ArchNodeCard` and `ErTableNode` render a target/source `Handle` pair
  even though they're visually near-invisible pixel squares, styled in
  `globals.css` to match the rest of the chrome.
- **"Focused" is derived, not stored.** `Window.tsx` didn't need a new
  store field for the v0.2.5 active-window glow — it just selects whether
  its own `zIndex` is the highest among non-minimized windows. Keeps
  `useWindowStore`'s shape exactly as it was through a purely visual
  sprint.
- **One depth system, reused everywhere.** The v0.2.5 identity refactor
  added exactly one new set of CSS primitives (`.cattipu-raised` /
  `.cattipu-recessed` / `.cattipu-badge` / etc., see above) and every
  surface — top bar, dock, windows, folder tabs, Architect's panels —
  composes from that set rather than each getting its own bespoke
  bevel. That's what keeps the whole shell reading as one physical
  object instead of a pile of separately restyled components.
