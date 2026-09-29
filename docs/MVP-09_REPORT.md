# CATTIPU OS — MVP-09 Report

## Objective

Floating desktop widgets, as the owner specified:

- The widgets on the right keep their own colours and contents.
- The area around them shows whatever wallpaper is applied, so they float
  on the desktop instead of sitting on a cream panel.
- Each widget can be minimized and closed, and closed widgets can be added
  back. The choices are remembered.
- The column fits the screen at every baseline viewport.
- Fonts stay the locked shell faces.
- The left rail is explicitly not touched.

## Baseline

- `main` at `77db0d1` (MVP-08), clean tree, 4 commits ahead of
  `origin/main` (unpushed), no divergence.
- `npm run verify` passing (22 suites, 478 cases).

## Audit findings

- The applied wallpaper was painted only on the window layer, which stops
  248px short of the right edge. Behind the widget column (and in the 8px
  above it) the desktop's own cream background showed. That was the cream
  strip.
- The widget header keys were `<span aria-hidden>` decorations: minimize,
  maximize and close did nothing. Welcome and Toolbox also drew a maximize
  key.
- The column already capped itself above the status bar and scrolled below
  900px. On the owner's screen it looked cut off because five full-height
  widgets (760px) do not fit short viewports and nothing could be folded or
  closed.
- The widget column already uses only the two locked shell faces: Px437
  IBM VGA8 for titles and Ark Pixel for text.

## Canonical ownership

| Concern | Owner |
| --- | --- |
| Which widgets exist, labels, stack order | `lib/os/widgets.ts` (new, pure data, like `lib/os/wallpapers.ts`) |
| Which are closed / folded (persisted) | `useSettingsStore` (`hiddenWidgets`, `collapsedWidgets`); same record as the wallpaper |
| Drawing widgets and their keys | `components/RightWidgetStack` |
| Desktop surface (wallpaper) placement | `components/InteractiveDesktop` (`desktopSurface` slot) |
| Menus | the one `ContextMenu`; labels in `menuCommands.ts` |

## Changes

- **Desktop surface.** A new `__surface` layer spans from the sidebar edge
  to the right edge of the screen, between the top bar and the status bar,
  beneath the window layer and the widgets. Its left and top edges are the
  window layer's, so the wallpaper tile's origin is unchanged. The window
  layer keeps its box, so every window bound, snap and tile is unchanged,
  but it no longer paints. The shell now passes `DesktopWallpaper` as
  `desktopSurface`. Engineering Paper remains the fallback.
- **Real keys.** Each widget has a minimize key (`[_]`, which becomes
  `[□]` Restore while folded) and a close key (`[X]`). They are real
  buttons with accessible names and `aria-expanded`, and are disabled
  without handlers. The decorative maximize is gone: a widget has nowhere
  larger to go.
- **Folded widget.** A folded widget is its header plate alone; its body is
  not rendered.
- **Adding widgets back.**
  - An ADD WIDGET key appears at the foot of the column while anything is
    closed. It opens the shared ContextMenu listing the closed widgets plus
    "Show All Widgets".
  - The desktop right-click menu gains "Widgets ▸", which lists every
    widget with ON/OFF; choosing one toggles it.
- **Persistence.** `hiddenWidgets` / `collapsedWidgets` live in the
  existing `cattipu-settings` record, kept in stack order. On load they are
  cleaned of unknown ids and duplicates, and a missing value means nothing
  closed, so no version bump is needed and pre-MVP-09 records load
  unchanged.
- **Hydration.** The shell reads widget state with the same
  `useSyncExternalStore` split the wallpaper uses: every widget is open in
  the server render and the hydration pass, and the saved layout applies on
  the first client render. No hydration warning was logged in the browser.

## Visual preservation

- Untouched: the left rail, top bar, status bar, windows and everything
  inside them.
- Widget sizes, tones, bodies and fonts are unchanged.
- The only intended visual changes: the wallpaper now shows around the
  widgets; Welcome and Toolbox lose their dead maximize key; the ADD WIDGET
  key appears only while something is closed.

## Verification (browser, real)

- Engineering Paper and CAD Dark both paint to the right edge, and the
  widgets float on them.
- Real clicks:
  - Close Architect Preview → gone; ADD WIDGET appears.
  - ADD WIDGET → menu lists "Architect Preview" and "Show All Widgets";
    choosing it restores the widget to its slot; ADD WIDGET disappears.
  - Close Toolbox, then a full reload → Toolbox is still closed and Welcome
    still folded.
  - The desktop menu's Widgets ▸ list showed Toolbox OFF; choosing it
    brought Toolbox back.
- Viewports, all widgets open:

  | Viewport | Column | Scroll | Wallpaper to right edge | Page overflow |
  | --- | --- | --- | --- | --- |
  | 1920×1080 | fits (ends 842) | none | yes | none |
  | 1600×900 | fits (842 < bar 850) | none | yes | none |
  | 1440×900 | fits (842 < bar 850) | none | yes | none |
  | 1366×768 | capped above the bar (710 < 718) | scrolls 132px | yes | none |

  At 1366×768, folding or closing any widget removes the scroll.
- Fonts in the column: Px437 IBM VGA8 and Ark Pixel 12px only.
- No new console errors after reload and no hydration warnings. Earlier
  `ERR_CONNECTION_REFUSED` entries came from a tab left polling while the
  dev server was stopped.

## Tests

`tests/desktopWidgets.test.ts`, 11 cases:
- the registry;
- two real keys per widget, and none decorative;
- disabled keys without handlers;
- the folded plate;
- closed widgets and ADD WIDGET, including when everything is closed;
- unchanged heights and bodies;
- the settings rules;
- a reload with saved, pre-MVP-09 and malformed records;
- the full-width surface, same origin, and a window layer that keeps its box;
- hydration-safe shell reading and the desktop menu's Widgets list;
- the left rail untouched.

The existing suites needed no changes.

## Verification commands

- `npm run verify`: 23 suites, 489 cases, all passing.
- `npm run build`: passing.
- `git diff --check`: clean.

## Known issues (P2/P3)

- P2: Right-clicking the strip beside the widgets (outside the window
  layer) shows the browser's own menu, not the desktop menu. ADD WIDGET
  covers adding widgets there.
- P2: At 1366×768 with every widget open the column scrolls 132px. That's
  the frozen widget heights, not clipping.
- P3: During testing, all five widgets were once found folded with no
  known writer. A write-logger then saw no spontaneous change and no code
  path clicks the keys. The most likely cause is clicks in the shared
  browser pane. It is noted here, not assumed away.
- P3: The browser pane mis-scales clicks when it emulates a viewport larger
  than itself (a click landed at x=2492 on a 1366px page). This is a
  testing-tool quirk; clicks were verified at the pane's native size.
- Out of scope, per the owner: the left rail (it scrolls when the screen is
  shorter than its nine keys); a full typography sweep outside the widget
  column.

## Git

Branch `main`, one commit, author `anirva09 <anirvavjit2023@gmail.com>`,
not pushed.
