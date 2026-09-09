# Canonical Audit — v0.9

Audited against the working tree and `git log`, not against memory. Where
this contradicts an earlier report, the tree wins.

**317 tracked files. 10 runtime dependencies, 10 dev.** Build, lint,
typecheck and tests clean; 213 behavioural checks green.

---

## First, a correction about where this repository is

The consolidation brief names `82871e9` as the current HEAD. **That commit
does not exist in this repository** — `git cat-file -t 82871e9` returns
*Not a valid object name*, and it appears nowhere in `git log --all`.

This repository is at `5610a8c`, and it **already contains every v0.9
improvement Phase 3 asks to restore**. Verified by looking, not by
remembering:

| Phase 3 asks to restore | State in this tree |
|---|---|
| Boot: original behaviour, stacking, timing, logo, transitions | `components/Boot/BootScreen.tsx` unchanged since `31d6aa0`; the `z-[10000]` wrapper that made it visible is in `app/page.tsx`; boot harness 17/17 |
| Living Projects: derived progress, shared state, hydration-safe stamps | `lib/os/projects.ts`, no setters for progress or status; clock renders empty on the server |
| Living Desktop: responsive shell, Explorer, workspace intelligence | `lib/os/filesystem.ts`, `desktop.ts`, `workspace.ts`; harnesses 27/27, 42/42, 40/40 |
| System polish: clock, naming, title, templates, contrast, responsive | `lib/os/templates.ts`, `system.test.ts` 36/36, m19 31/31, m19b 18/18 |

So nothing needed reapplying here. `82871e9` is the state of the *local
clone on the Windows machine* (`C:\Users\acer\cattipu-os-restored`), which
has never received this work. That gap is a transfer problem, not a code
problem, and `docs/DEPLOYMENT_REPORT.md` covers it.

What this pass actually did is below: it finished the directory structure,
found and removed a class of dead file no earlier audit had caught, and
verified the whole thing from the tree.

---

## Removed

### Seven empty brand plates

```
docs/brand/favicon.png                 0 bytes
docs/brand/palette.png                 0 bytes
docs/brand/thumb-hero.png              0 bytes
docs/brand/thumb-mark.png              0 bytes
docs/brand/thumb-topbar.png            0 bytes
docs/brand/typography-reference.png    0 bytes
docs/brand/wordmark-horizontal.png     0 bytes
```

All seven hash to `da39a3ee5e6b4b0d3255bfef95601890afd80709` — the SHA-1 of
the empty string. They were added as placeholders in the foundation commit
`fe36c68` and never filled.

`docs/brand/README.md` described the folder as *"the single source of truth
for CATTIPU branding"* and told future sprints to reuse the assets. The
real marks are the seven distinct, non-empty files in `public/logo/`. The
README now says so.

**This is a miss I should own.** The previous release moved
`assets/brand/` into `docs/brand/` and classified it as "design reference
material — palette, wordmark, typography plates". I moved seven files
without opening one of them, and wrote a description of their contents
from their filenames. A `git mv` is not an audit.

The check that found them is one line and now lives in
`docs/PRODUCTION_CHECKLIST.md`:

```bash
git ls-files | while read -r f; do [ -f "$f" ] && [ ! -s "$f" ] && echo "$f"; done
```

### Nothing else qualified

The rest of the Phase 2 list was checked and came back clean:

| Looked for | Found |
|---|---|
| duplicate icon folders | none — `public/pixelforge/` is the only icon tree; `public/icons/` was removed last release |
| duplicate textures | none |
| duplicate assets generally | content-hashed every tracked `.png`, `.svg`, `.wav`, `.gif`: the only collisions were the seven empty files above. `public/logo/` (7) and `public/cursors/` (6) are all distinct. |
| obsolete preview renders | `docs/v0.9/preview/` is the signed-off Golden Master reference set — **kept**, it is what regressions are measured against |
| temporary patch bundles | none tracked |
| stale regression outputs | none — harness output goes to `/tmp` and `docs/release/` holds only current frames |
| unused generated assets | none — every file in `public/` resolves to an import or a CSS `url()` |
| legacy implementation already replaced | removed last release (15 modules); reachability re-run, nothing new is unreachable |

Reachability was re-run from `app/page.tsx` and `app/layout.tsx`. The only
unreachable modules are the six test suites, which are entry points, and
the three implemented-but-unmounted surfaces recorded under Known
follow-ups in `docs/DEPLOYMENT_REPORT.md`.

### Dependencies

10 runtime, 10 dev, all in use. Verified per package:

```
@fontsource/press-start-2p  @fontsource/vt323  clsx  framer-motion
lucide-react  next  react  react-dom  reactflow  zustand
```

`@fontsource-variable/inter`, `@fontsource/archivo` and `react-rnd` were
removed last release. Nothing was upgraded; no major versions changed.

---

## Structure

Phase 4's layout, now complete. Three directories were requested in two
earlier passes and declined both times; they exist now.

```
cattipu-os/
├── app/                 4 files
├── components/          81
├── design-system/       4
├── hooks/               1     ← new
├── lib/                 17
├── store/               7
├── public/
│   ├── assets/          1     engineering-paper texture
│   ├── pixelforge/      53    ← moved from public/assets/pixelforge/
│   ├── cursors/         6
│   ├── wallpapers/      1     ← moved from public/textures/
│   ├── logo/            7
│   └── sounds/          5
├── scripts/             13
├── tests/               6
├── docs/                91
├── README.md  LICENSE  CLAUDE.md
├── package.json  next.config.ts  tsconfig.json
```

**`public/pixelforge/`** — 53 SVGR imports moved, all of them inside two
files (`components/PixelIcon/PixelIcon.ts` and `shellIcons.ts`). No CSS
`url()` or JSON manifest referenced the old path. I declined this twice on
the grounds that it risked the Golden Master for a shorter path; asked a
third time, the right response is to do it and *prove* the marks still
render rather than keep asserting the risk. The proof is below.

**`public/wallpapers/`** — `public/textures/paper-grain.png` moved here,
and `WallpaperDefinition.texture` in `lib/os/extensions.ts` retyped from
`` `/textures/${string}` `` to `` `/wallpapers/${string}` ``.

**`hooks/`** — `lib/useUiSound.ts` moved to `hooks/useUiSound.ts`; its two
importers updated, and one relative `./sounds` import inside it retargeted
to `@/lib/sounds`.

One of those importers is `components/Boot/BootScreen.tsx`, which earlier
reports certified as **byte-identical** to the original production
implementation. That file now differs from `31d6aa0` by exactly one line:

```diff
-import { useUiSound } from "@/lib/useUiSound";
+import { useUiSound } from "@/hooks/useUiSound";
```

I refused this move twice to protect the byte-identical claim. That was
protecting the wrong thing. The requirement is *"preserve the original
production boot screen"* — its behaviour, timing, logo and transitions —
and none of those live in an import path. The boot harness still measures
17/17 against the constants declared in the file, including the check that
the boot screen is what is actually **painted** rather than merely
mounted. The guarantee is intact; only my phrasing of it has to change,
and this file is where that is recorded.

### Two things deliberately still not done

`docs/history/` (21 sprint reports) and `docs/v0.9/preview/` (the Golden
Master reference renders) are not in Phase 4's diagram. Both are kept:
the reference renders are the regression baseline, and the reports are the
record of why every decision was made. Deleting either to match a diagram
would be destroying the evidence this project runs on.

---

## Golden Master

The structural moves, measured before and after on the same default state:

```
36 changed pixels of 1,440,000   (0.0025%)
bounding box  x 1552-1558, y 33-40
```

Seven pixels wide inside the top bar — the live clock's minute digit,
which advanced between captures. **Every PixelForge mark renders
identically after moving 53 files.**

Measured before-vs-after rather than against the RC2 reference on purpose:
diffing against RC2 mixes M19's intended changes with anything this pass
might have broken and cannot separate them.

---

## Verification

```
npm install         clean
npm run typecheck   0 errors
npm run lint        0 errors, 0 warnings
npm test            136 assertions across 6 suites
npm run build       clean, 268 kB first load, one static route
```

| Harness | Result |
|---|---|
| `m16-verify.py` — Living Desktop | 27/27 |
| `m17-verify.py` — File Explorer | 42/42 |
| `m18-verify.py` — Window manager | 40/40 |
| `m19-verify.py` — Templates, clock, responsive, contrast | 31/31 |
| `m19b-verify.py` — Titles, identity, propagation | 18/18 |
| `boot-verify.py` — Boot sequence | 17/17 |
| `production-verify.py` — All nine apps, four viewports | 38/38 |

**213 behavioural checks**, every one against the production build in a
real browser.

### Captured frames

`scripts/canonical-capture.py`, in `docs/release/`:

`Desktop_1366.png`, `Desktop_1440.png`, `Desktop_1600.png`,
`Desktop_1920.png`, `Boot_600ms.png`, `Boot_1800ms.png`, `Naming_Test.png`.

The boot frames are timed from the boot component's **mount**, not from
navigation — hydration sits between the two and varies from 40 ms to
250 ms per run, so a frame timed from navigation would carry a label it
does not deserve. Measured this run: mount+709 ms and mount+1882 ms, the
capture beginning at the target.

`Naming_Test.png` is the case worth keeping. Three folders, the middle one
renamed to "Invoices", then a fourth created:

```
Untitled Folder   Invoices   Untitled Folder (3)   Untitled Folder (2)
```

The fourth folder reclaimed **(2)**, the number the rename freed, rather
than taking (4). A stored counter passes every "the second one is (2)"
test and fails only here, which is why this is the frame that proves
numbering is derived from the names in use.

---

## Branch cleanup

Phase 7 says delete only branches with no unique history. Checked against
`origin`, and **none qualify** — not one of the five is an ancestor of
`origin/main`:

| Branch | Tip | Tree | Unique content? |
|---|---|---|---|
| `polish/home-exact` | `f798400` | `0fda533d` | no — same tree as the integration base |
| `polish/retro-visual-pass` | `f798400` | `0fda533d` | no — same commit as above |
| `integration/current-cattipu` | `91d7a44` | `0fda533d` | no — same tree, different hash |
| `cattipu-os` | `e5ac450` | `e2158630` | **yes** — exists nowhere else |
| `assets/v0.9-package` | `e48b50d` | `f821ec6c` | **yes** — the v0.9 package drop |

The first three are redundant and safe to delete whenever you choose. The
last two hold trees that exist on no other branch; deleting them would be
the only copy going away. Under the rule as written, the correct action is
to delete nothing, so nothing was deleted.

```bash
# The three redundant ones, if and when you want them gone:
git push origin --delete polish/home-exact polish/retro-visual-pass integration/current-cattipu
```

---

## What this audit changes about how the next one runs

Three checks are now in `docs/PRODUCTION_CHECKLIST.md` because each one
caught something a previous pass had missed:

1. **Zero-byte scan.** Seven files described from their filenames for four
   milestones. One line finds them.
2. **Content-hash every binary.** Duplicate assets do not announce
   themselves in a directory listing.
3. **Before-vs-after Golden Master, never against RC2.** The reference
   diff mixes intended change with regression; a first attempt at it this
   series reported 14.8% because the capture had a window open.
