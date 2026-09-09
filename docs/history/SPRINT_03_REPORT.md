# Sprint 3 Report — Dock System

Scope: implement only the Dock, per the approved design system. No home-page redesign, no
unrelated components touched.

## Discrepancies flagged before implementation

- **`CATTIPU_FOUNDATION_TOKENS.json` doesn't exist in this repo.** The actual, currently
  shipped token source is the CSS custom properties in `app/globals.css`
  (`--color-navy`, `--color-electric`, `--grid-unit: 8px`, `--icon-grid: 24px`, etc.) — I
  bound the Dock to those instead of inventing a disconnected JSON file nothing would read.
- **"Archive" was never a dock item** — it only exists as a desktop icon (opens Explorer).
  Explorer was already in the dock; the only real change needed was its position (it sat
  after Settings, spec wants it before).

## Files changed (4 of 5 max)

1. `lib/apps.ts` — reordered `APPS`: Home, Projects, Architect, Canvas, Forge, Launch,
   Memory, **Explorer, Settings** (Explorer moved before Settings).
2. `store/useSettingsStore.ts` — `DOCK_ICON_SIZE_PX` sm/md/lg changed from 22/28/36 to
   **16/24/32** (default "md" now lands exactly on the 24×24 grid; every step is an 8px
   multiple). Added `DOCK_RAIL_WIDTH_PX = { collapsed: 72, expanded: 196 }`.
3. `components/Dock/Dock.tsx` — rail width now reads `DOCK_RAIL_WIDTH_PX` (72px collapsed,
   was 64); hover lift changed from `{y:-2, scale:1.08}` to exactly `{y:-1}`; 8px spacing
   throughout (rail padding, inter-icon gaps, icon-well padding); roving arrow-key focus
   (`ArrowUp`/`ArrowDown` move focus between items, `Enter`/`Space` activate natively since
   these are real `<button>`s); a portal-rendered tooltip that appears after a 400ms hover
   *or* focus delay (see bug note below); `role="toolbar"`/`aria-orientation="vertical"` on
   the list and `aria-label`/`aria-current` per item.
4. `app/globals.css` — added `--dock-width-collapsed`/`--dock-width-expanded` (documentation
   tokens mirroring the JS constants — Framer Motion needs a plain number for the width
   animation, so the JS constant is the actual source of truth, the CSS var documents it),
   `.cattipu-tooltip` (molded navy bubble, reuses existing bevel/shadow language), and
   `.cattipu-dock-item:focus-visible` (Electric Blue keyboard-focus ring).

Not touched: `AppIcon.tsx`, the home/desktop layout, boot screen, sounds, any other
component.

## Features implemented

| # | Requirement | Status |
|---|---|---|
| 1 | Molded vertical rail attached to shell | Already existed (`cattipu-raised`); preserved |
| 2 | 72px dock width | Done — token-driven, verified at exactly 72px |
| 3 | 24×24 icon grid | Done — default icon size now renders at exactly 24px |
| 4 | 8px spacing system | Done — verified inter-icon gap is exactly 8px |
| 5 | Recessed active state + blue indicator | Already existed (`cattipu-recessed` + `cattipu-led`, Electric Blue token); preserved |
| 6 | Hover lifts 1px | Done — was 2px+scale, now exactly `y: -1` |
| 7 | Keyboard nav (arrows + Enter) | Done — see bug note below on how this was verified |
| 8 | Tooltips after short delay | Done — 400ms, on both hover and keyboard focus (WCAG 1.4.13) |
| 9 | New dock order | Done |
| 10 | Archive → Explorer | N/A — Archive was never a dock item; Explorer already was, position fixed |

### Bug caught and fixed during verification
The first tooltip implementation rendered as a normal child of the dock rail, which has
`overflow-hidden` (needed for the width-collapse animation to clip cleanly). The tooltip
element existed in the DOM but was visually cropped at the rail's edge — invisible in
practice despite passing a naive "does the element exist" check. Fixed by portaling the
tooltip to `document.body`, positioned in fixed viewport coordinates read from the
button's `getBoundingClientRect()` at the moment the delay fires. Caught by actually
screenshotting the hover state rather than trusting the DOM-presence assertion alone.

## Test results

```
$ pnpm lint
> cattipu-os@0.1.0 lint
> eslint

(no errors, no warnings)

$ pnpm build
> cattipu-os@0.1.0 build
> next build

 ✓ Compiled successfully in 18.8s
 ✓ Generating static pages (5/5)

Route (app)                                 Size  First Load JS
┌ ○ /                                     141 kB         243 kB
```

Both clean. First Load JS essentially unchanged (140 kB → 141 kB).

### Runtime verification (Playwright, production server)
- Collapsed rail width: **72px** (measured)
- Default icon rendered height: **24px** (measured)
- Gap between consecutive dock items: **8px** (measured)
- Dock order matches spec exactly (measured via `aria-label` sequence)
- Tooltip: absent at 200ms, present at ~550ms (delay confirmed)
- `ArrowDown` from Home → focus moves to Projects → Architect (roving focus confirmed)
- `Enter` on focused Architect item opens the Architect window (keyboard activation confirmed)
- Active item carries both `cattipu-recessed` and `cattipu-led` (confirmed)

## Screenshot path

`dock-shots/` in the project root (not committed — verification output, same treatment as
prior sprints' screenshot scripts):
- `dock-shots/01-collapsed.png` — collapsed 72px rail
- `dock-shots/02-tooltip.png` — expanded rail with the Architect tooltip visible
- `dock-shots/03-keyboard-focus.png` — focus ring after two ArrowDown presses
- `dock-shots/04-enter-opens.png` — Architect window opened via Enter, focus ring visible
