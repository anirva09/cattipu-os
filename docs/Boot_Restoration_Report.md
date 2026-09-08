# Boot Screen Restoration

**Result:** the boot screen's implementation was never changed — every
file is byte-identical to the original. It had been **invisible since
M-series integration**, painted over by the shell mounted underneath it.
One wrapper in `app/page.tsx` restores it. 16/16 boot checks pass.

---

## Source commit used

`31d6aa0 feat: integrate current CATTIPU implementation (#1)` — the base
of the M15–M19 series and the last commit to touch any boot file.

It was not needed as a source to copy from. Every boot file at HEAD
already matches it exactly:

```
IDENTICAL  components/Boot/BootScreen.tsx   d625e05c76d5aa0d
IDENTICAL  components/Boot/PixelLogo.tsx    f9fe99b9b46a9d25
IDENTICAL  store/useBootStore.ts            f6b24a3271969eb1

git diff --stat 31d6aa0 HEAD -- components/Boot store/useBootStore.ts \
    lib/useUiSound.ts lib/sounds.ts public/sounds
(empty — no differences)
```

`git log --follow` confirms it from the other direction: no commit in the
M15–M19 series touches `components/Boot/`, `useBootStore`, `useUiSound`,
`sounds.ts` or `public/sounds/`.

**So nothing was restored by copying, because there was nothing to copy.**
Reverting those files to `31d6aa0` would have been a no-op dressed up as
a fix.

---

## What was actually wrong

The boot screen was mounted, animating, ticking its timers, playing its
sound — and completely painted over by the desktop.

`BootScreen` is `fixed inset-0 z-50`. That was above everything the
legacy `Desktop` painted, which is why it worked before. `df4f5cf
feat(shell): boot into the v0.9 InteractiveDesktop` swapped the shell
underneath, and `InteractiveDesktop` assigns its children far higher
z-indexes:

| Element | z-index |
|---|---|
| BootScreen overlay | **50** |
| window layer | 100 |
| right widgets | 8600 |
| top bar / status bar | 8800 |
| sidebar | 9000 |

`.cattipu-interactive-desktop` is `position: relative` with `z-index:
auto`, so it creates **no stacking context**. Its children therefore
compete directly with the boot overlay in the root stacking context, and
every one of them wins.

Measured during boot, before the fix:

```
elementFromPoint(800, 450)  ->  cattipu-project-card__title
boot overlay: present, opacity 1, bar filling  ->  and invisible
```

This is a regression I introduced in `df4f5cf` and did not catch, because
every check since then asked whether the boot screen was *mounted*, not
whether it was *painted*.

---

## Files restored

| File | Change |
|---|---|
| `components/Boot/BootScreen.tsx` | **none** — byte-identical to the original |
| `components/Boot/PixelLogo.tsx` | **none** |
| `store/useBootStore.ts` | **none** |
| `lib/useUiSound.ts`, `lib/sounds.ts`, `public/sounds/` | **none** |
| `app/page.tsx` | **one wrapper** — see below |
| `scripts/boot-verify.py` | **new** — the harness this report is measured with |

The whole fix:

```tsx
{phase === "booting" && (
  <div className="relative z-[10000]">
    <BootScreen />
  </div>
)}
```

A positioned element with a z-index creates a stacking context, so
BootScreen's own `z-50` is resolved *inside* the wrapper rather than
against the shell. The boot component itself is untouched, which is what
"copy the existing production implementation exactly" required — and
`app/page.tsx` is the file where the regression was introduced, so it is
the right place to undo it.

---

## Verification status

`scripts/boot-verify.py` samples the live production build frame by frame
and checks the sequence against the timing constants declared in
`BootScreen.tsx` — `START_DELAY 500`, `BAR_DURATION 2200`, `HOLD_AFTER
500`, `EXIT_DELAY 3200`.

```
t=  200ms  boot  0/20   INITIALIZING
t=  600ms  boot  0/20   INITIALIZING      <- bar has not started (START_DELAY)
t= 1200ms  boot  3/20   INITIALIZING
t= 1800ms  boot  9/20   INITIALIZING
t= 2400ms  boot 14/20   LOADING MODULES
t= 3000ms  boot 20/20   READY             <- full at START_DELAY+BAR_DURATION
t= 3400ms  boot 20/20   READY
t= 4200ms  desktop                        <- gone by EXIT_DELAY + exit animation
t= 6000ms  desktop
```

| Confirmation | Result |
|---|---|
| boot appears before desktop | present at first paint |
| **boot is what is actually painted** | `topAtCentre = boot` at 600ms and 1800ms |
| logo | renders, 223×248 |
| progress behaviour | 20 segments, fills monotonically, never backwards |
| timing | bar idle before 500ms, full by 2700ms, gone by 3700ms |
| typography / staged copy | INITIALIZING → LOADING MODULES → READY |
| colors | background `#e7d7c3`, the app's cream boot surface |
| transitions | fade in to opacity 1; exits with the scale/blur transition |
| sound behaviour | `/sounds/boot.wav` served, HTTP 200 |
| startup flow | desktop underneath, and on top after hand-off |
| skip path | a keypress ends the boot early |
| errors | none during the whole sequence |

**16/16 checks pass.**

The check that matters is the third one. "Is the boot screen in the DOM"
was true for four milestones while it was invisible, so the harness asks
`elementFromPoint` at the centre of the screen what is actually on top.
That is the assertion that would have caught this in M15, and the one
that keeps it caught.

## No regressions

```
npm run typecheck   0 errors
npm run lint        0 errors, 1 pre-existing warning
npm test            9/9 + 18/18 + 16/16 + 24/24 + 33/33 + 17/17
npm run build       clean

M16 harness   27/27      M18 harness   40/40
M17 harness   42/42      M19 harness   31/31
```

Nothing outside `app/page.tsx` changed, so PixelForge, the Window
Manager, the Living Desktop, M15–M19, responsive behaviour and the shared
OS state are untouched by construction, and the four harnesses confirm it.

## Screenshots

- `Boot_600ms.png` — logo up, bar not yet started
- `Boot_1800ms.png` — INITIALIZING, bar part-filled
- `Boot_3000ms.png` — READY, bar full, skip prompt
- `Boot_4200ms.png` — the desktop, after hand-off
