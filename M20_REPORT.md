# Milestone 20 — Native Feel Polish

**Baseline:** `main` == `origin/main` @ `d7af050` ("docs: establish canonical project
constitution"), clean working tree, Git identity `anirva09 <anirvavjit2023@gmail.com>`.
Verified before any change: `npm run verify` (typecheck → lint → test, 136/136) and
`npm run build` both clean.

## Scope

Per the sprint brief, this milestone audited the eight listed M20 surfaces (cursor
states/hotspots/reset, drag/resize cursor behavior, sound ownership and window
open/close wiring, mute/volume/preload, Toolbox actions, focus restoration,
hover/reset defects, native mechanical polish) and fixed only what the audit
confirmed as a live regression against already-documented/frozen behavior. Nothing
here adds a feature, restructures a store, or touches Canvas/Forge/Launch/Memory/
Project Memory/AI providers.

## Confirmed defects fixed

### 1. Title-bar drag cursor never applied (`app/globals.css`)

`DESIGN_CONSTITUTION.md` §8/§9 and the Milestone 4 and Milestone 12 reports describe
a window title bar as showing an idle `grab` / active `grabbing` cursor, and — with
Settings > Cursor's pixel-cursor mode on — a dedicated Move glyph
(`public/cursors/move.png`) instead of a plain CSS cursor. Both rules targeted
`.cattipu-window-titlebar` (hyphenated). The live title bar, rendered by
`components/Window/Window.tsx` and used as the drag target in
`components/WindowManager/ManagedWindow.tsx` (`target.closest('.cattipu-window__titlebar')`)
and styled in `components/WindowManager/WindowManager.css`, has carried the BEM class
`.cattipu-window__titlebar` since the InteractiveDesktop rebuild. The hyphenated
selector matched nothing in the current DOM, so neither cursor rule ever fired —
dragging a window showed the browser's default arrow, not `grab`/`grabbing` or the
Move glyph, regardless of the Settings > Cursor toggle.

**Fix:** corrected both selector blocks in `app/globals.css` (the M4 plain
grab/grabbing fallback and the M12 pixel-cursor Move mapping) to
`.cattipu-window__titlebar`, matching the class the live component tree actually
renders. No new CSS rule, no visual redesign — the same two rules the constitution
already documents, now pointed at the element that exists. Verified live: with
pixel cursors on, `getComputedStyle` on every open window's title bar now resolves
to `url(".../cursors/move.png") 32 32, grab`.

**Not touched:** `.cattipu-resize-handle` (also in the same globals.css block) is
vestigial CSS with the same era of naming — but there is no element anywhere in the
live tree that carries that class, because the current `WindowManager` reducer has
no resize action at all (windows are moved/snapped/tiled/maximized, never
free-resized by dragging an edge). `docs/COMPONENT_LIBRARY.md`'s claim of "8
edges/corners via `RESIZE_HANDLE_CLASSES`" describes the old `react-rnd`-based
`Desktop`/`Window` system, which no longer exists (`components/Desktop/` is gone).
Wiring an actual resize-handle interaction would be new capability, not polish —
out of scope for M20, flagged here as a documentation-vs-reality gap for the
constitution/roadmap reconciliation the sprint brief explicitly deferred.

### 2. Window-open/close sound never wired into the live path (`components/WindowManager/useWindowManager.ts`)

`DESIGN_CONSTITUTION.md` §9 and Settings > Sound's own copy ("Boot, window
open/close, and success/error chimes") both describe window-open/close as mapped to
the frozen "mechanical click" sound, gated by `useSettingsStore.soundEnabled` /
`soundVolume`. `lib/sounds.ts` and the `useUiSound()` hook that gates it already
exist and are already used live by `BootScreen.tsx` (boot fanfare) and
`BuildPlayback.tsx` (success chime). Grepping the entire live `WindowManager`
(`useWindowManager.ts`, `windowManager.reducer.ts`, `ManagedWindow.tsx`) found zero
sound calls. The only place `window-open`/`window-close` were ever triggered was
`store/useWindowStore.ts`'s own `chime()` helper — an orphaned, pre-InteractiveDesktop
window store whose only consumer, `CommandPalette.tsx`, is itself never mounted. In
the shipped app, opening or closing a window was silent.

**Fix:** wired `useUiSound()` directly into `useWindowManager.ts` — the one hook every
window action in the live app already funnels through — so `launchWindow` plays
`"window-open"` and `closeWindow` plays `"window-close"`, gated by the same settings
every other consumer respects. `useWindowStore.ts` was not touched, revived, or
extended; there is still exactly one canonical sound owner (`useUiSound` /
`lib/sounds.ts`), and it is now also the one live window-sound owner. Verified live:
instrumenting `HTMLMediaElement.prototype.play` and exercising the app confirms
`window-open.wav` fires on launch and `window-close.wav` fires on close, and that
turning Settings > Sound off suppresses both calls entirely.

**Scope note:** only `launchWindow` (the single call site used whenever a window is
opened, from the dock, a desktop shortcut, or Explorer) and `closeWindow` were
wired. Minimize, maximize, focus, snap, and restore were left silent — the frozen
vocabulary names only "window-open/window-close," and extending the sound map to
other transitions was not asked for and would be inventing behavior, not restoring
documented behavior.

## Audited and found correct (no change)

- **Cursor hotspots** — cross-checked every hotspot in `app/globals.css` against
  `scripts/gen_cursors.py`'s logical-grid hotspots × the 4px scale factor. All six
  (arrow, hand, text, resize, move, hourglass) match exactly; no defect.
- **Cursor reset behavior** — `CursorProvider.tsx` toggles `.cattipu-cursors` on
  `<body>` directly off the settings store; toggling off cleanly reverts to native
  cursors. No stale class or missed reset path.
- **Mute/volume** — `playSound()` re-reads `soundVolume` on every call (no stale
  cached volume), and the Settings slider is disabled whenever sound is off. No
  defect.
- **Focus restoration** — `windowManager.reducer.ts`'s `minimize`, `close`, and
  `restore` actions all recompute `activeWindowId` via `topmostVisibleWindowId()`
  when the closed/minimized window was the active one; `ManagedWindow.tsx` moves DOM
  focus to whichever window becomes active. Traced through minimize, close, restore,
  and restoreAll — all correctly hand focus to the next visible window, or to
  nothing if none remain. No defect found.
- **Toolbox actions** — traced `RightWidgetStack.tsx`'s eight tool buttons
  (Entity/Service/Flow/Screen/API/Job/Script/Config) to their `onToolSelect` prop,
  which `InteractiveDesktop.tsx` never receives from `CattipuShell.tsx` — every
  button is a confirmed no-op today. Checked whether a canonical target already
  exists for any of them: `lib/ai/types.ts`'s `ArchitectNodeKind` is only
  `client | gateway | service | datastore | queue`, and `useArchitectStore.ts` has no
  concept of entity/flow/screen/api/job/script/config at all. **Classification: all
  eight are disconnected with no existing canonical target.** Per the sprint brief
  ("fix disconnected actions only where the canonical target already exists... do
  not invent future milestone behavior"), none were wired — inventing an Architect
  node type or a new home-screen action to satisfy a button label would be new
  product behavior, not M20 polish. Left as-is; worth a product decision in a future
  milestone, not a fix here.

## Verification

- `npm run verify` (typecheck → lint → test): clean, 0 errors, 136/136 assertions,
  before and after the change.
- `npm run build`: clean production build, before and after, identical bundle size
  (no code-weight added by either fix).
- Manual regression in a live `next dev` session: pixel-cursor Move glyph confirmed
  via computed style on every window's title bar; `window-open.wav`/`window-close.wav`
  confirmed firing through the live dock → `launchWindow`/`closeWindow` path via an
  instrumented `HTMLMediaElement.play`; confirmed silent when Settings > Sound is
  off. No regressions observed in drag, snap, tile, minimize, maximize, or restore
  during manual exercise.

## Files changed

- [`app/globals.css`](app/globals.css) — corrected two cursor selector blocks
  (`.cattipu-window-titlebar` → `.cattipu-window__titlebar`) so the M4 grab/grabbing
  fallback and the M12 Move pixel-cursor glyph apply to the title bar that actually
  exists in the live DOM.
- [`components/WindowManager/useWindowManager.ts`](components/WindowManager/useWindowManager.ts) —
  wired `useUiSound()` into `launchWindow`/`closeWindow` so window-open/close plays
  the documented mechanical-click sound through the canonical live path, respecting
  `soundEnabled`/`soundVolume`.

## Explicitly not started

M20.5 and every deferred item from the earlier onboarding audit (mounting
`NotificationCenter`/`CommandPalette`, reviving or deleting `useWindowStore`,
Canvas/Forge/Launch/Memory implementation, AI provider layer, roadmap
reconciliation) — all out of scope per the sprint brief and left for their own
milestones.
