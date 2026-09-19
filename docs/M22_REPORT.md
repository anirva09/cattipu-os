# CATTIPU OS — M22 Report: Notification Center

## Objective

Make the existing notification system visible and usable through the live top-bar Bell, and
ship it production-ready. Search, the Command Palette and the Command Center (M22.5) are out of
scope and untouched.

## Baseline

- Repository `anirva09/cattipu-os`, branch `main`, level with `origin/main` at `2702bce`
  (`fix(window): keep cascaded windows reachable`). Working tree was clean.
- `npm run verify`: typecheck and lint clean, **274/274** across 14 suites.
- `npm run build`: passed. The only warning was the known parent-lockfile warning.

## Audit Findings

- **Store.** `store/useNotificationStore.ts` was the one notification owner. It was an M12 toast
  queue: ids were `notif-N` from a module counter at push time, `createdAt` came from
  `Date.now()` at push time, types were info/success/warning/error, and there was a `sticky`
  flag. Ordinary pushes auto-dismissed after 4s, the queue was capped at 3, and only `dismiss`
  existed. Nothing was persisted. `push` played the success/error chime, gated by
  `soundEnabled`. The store had no read state.
- **Producers.** The only producer is Settings → Notifications (Send Info/Success/Warning/Error),
  which pushes from click handlers, not effects. So Strict Mode, Fast Refresh and remounts
  cannot duplicate pushes. The only other reader is `diagnosticsService`.
- **Legacy renderer.** `components/System/NotificationCenter.tsx` was a bottom-right
  framer-motion toast stack. It used Lucide's `X` and the retired `components/Icons` set, and
  only the removed legacy `Desktop` mounted it. Classification: **C, architecturally stale**. A
  toast wall is not a history surface, and it used two forbidden icon sources. Its presentation
  was replaced **in the same file**, so there is still one renderer.
- **Bell.** `TopBar` already had `hasNotification` (turns the Bell Welcome gold) and
  `onNotifications`, but the shell passed neither.

## Canonical Ownership

| Concern | Owner |
|---|---|
| Notification data, ids, timestamps, read state, dismissal, clearing, sound | `store/useNotificationStore.ts` |
| Rendering | `components/System/NotificationCenter.tsx` |
| Open/closed (shell UI state) | `components/Shell/CattipuShell.tsx` (`useNotificationCenter`) |
| Placement in the shell layer, Bell props | `components/InteractiveDesktop/InteractiveDesktop.tsx` |
| Bell presentation | `components/TopBar/TopBar.tsx` / `TopBar.css` |

## Changes

1. **Store.** Entries no longer expire, and `sticky`/`durationMs` are removed. The 3-entry cap is
   now a bounded session history (`MAX_HISTORY = 100`, oldest dropped). Each entry has
   `read: boolean`. The store adds `markRead`, `markAllRead` and `clearAll`, plus the
   `newestFirst` and `unreadCount` derivations. No-op actions publish no new state. Nothing is
   persisted.
2. **Center.** A 320px panel, at most 416px tall, built from the right rack's widget grammar:
   a 2px frame, a 32px System navy header plate in Px437, an inset well that scrolls, rows of at
   least 48px with 8px padding and 16px PixelForge marks, the carved groove between rows, and a
   32px footer with MARK ALL READ and CLEAR ALL. Newest first. `NO NOTIFICATIONS` when empty.
   Each row shows a stored `HH:MM` stamp. Unread rows show a 6px Welcome gold lamp and act as
   a "Mark read" button. Each row has a dismiss key that reuses the window close glyph. Every
   action goes through the store.
3. **Bell.** Clicking toggles the center. While open, the Bell shows an inset pressed key (inset
   box-shadow, so its geometry does not move) and sets `aria-expanded`, `aria-haspopup` and
   `aria-controls`. When anything is unread it turns Welcome gold and shows a 6px lamp at its
   top-right corner. Its accessible name is "Notifications, N unread".
4. **Dismissal of the panel.** One capture-phase `pointerdown` + `keydown` pair on `window`,
   installed only while open. Escape closes and returns focus to the Bell. A press outside both
   the panel and the Bell closes it. Opening moves focus into the panel, and actions that remove
   their own control park focus on the panel.
5. **Diagnostics.** The notifications service now reports `ready`, and its history check
   reports unread. The `notifications.center-unmounted` drift check is removed because it is no
   longer true, and the tests assert that it stays gone.
6. **Docs.** `DESIGN_CONSTITUTION.md` §6a/§7/§7a, `architecture/BOUNDARY_AUDIT.md` §1/§2.5/§2.6
   and the `lib/os/extensions.ts` contract note are updated.

## Existing Systems Reused

The notification store, the PixelForge shell registry (`info`, `ready`, `warning`, `error`), the
bevel primitives (`cattipu-edge--outer`, `cattipu-bevel--raised|inset|pressable`,
`cattipu-focus--mechanical`), the window close glyph, the rack widget construction, the
design-system type roles and colour tokens, the TopBar's `hasNotification` and `onNotifications`,
the settings-gated sound path, and the ContextMenu listener pattern.

## Architecture Impact

- No new store. Open/closed is ephemeral shell UI state; every piece of notification data lives
  in the one store.
- The center is not a managed window: it has no window id, no `APP_MAP` entry and no
  WindowManager involvement.
- There are zero new `useWindowStore` consumers. Nothing routes through CommandPalette, and
  Search is not wired.

## Visual Preservation

With the center closed and nothing unread, the shell is unchanged: the top bar is 74px, and the
sidebar, rack, status bar, windows, fonts, icons and wallpaper were measured identical with the
center open and closed at all four baseline viewports. The only closed-state addition is the
Bell's unread indication when something is unread. No new colours: navy, cream, bevel tokens,
outer frame and Welcome gold are all existing tokens.

## Data / Migration Impact

None to migrate. The store was never persisted, and it still is not.

## Verification

- `npm run verify`: typecheck ✓, lint ✓, tests **302/302** across 15 suites (274 before, plus the
  28 in `tests/notifications.test.ts`). Diagnostics assertions were updated to the resolved state.
- `npm run build`: ✓. Only the known parent-lockfile warning.
- Live QA in the built-in browser covered the empty state, Info, Success, Warning and Error
  through Settings with the correct marks, newest first, internal scrolling, read/unread, mark
  one, mark all, dismiss, clear all, Escape with focus return, outside click, Bell toggle, Tab
  into the panel, Sound OFF, and reload. The only chimes were one per success/error push; opening
  the center played nothing. With sound off, nothing played and the notification still appeared.
  After reload the history was empty, as a session history should be, and the console showed no
  hydration warnings.
- Viewports 1366×768, 1440×900, 1600×900 and 1920×1080: the panel sits at top 78 and right 8,
  is 416px tall at its cap, stays fully inside the viewport and above the status bar, causes no
  page scroll, keeps the Bell reachable, and leaves the chrome rectangles unchanged.
- The QA host runs at devicePixelRatio 1.25, so 2px borders measure 1.6 CSS px on every shell
  surface. This is not specific to M22.
- The browser tool delivered Enter and Space with an empty `key`, so keyboard activation of the
  Bell was not driven live. The Bell is a native `<button>` with `onClick`, so browsers activate
  it from the keyboard themselves. Escape and Tab were verified live.

## Known Issues

None in M22 scope. Out of scope, recorded only: the `filesystem.explorer-hydration-mismatch`
drift check is still listed although `75bd309` fixed that defect.

## Git

Branch `main`, author `anirva09 <anirvavjit2023@gmail.com>`, three commits:

- `feat(notifications): add canonical read-state actions`
- `feat(notifications): mount notification center behind the bell`
- `test(notifications): lock notification center behavior`

The working tree is clean after the last commit. Nothing has been pushed.

## Next Milestone

M22.5 Command Center (Search / Command Palette). Not started.
