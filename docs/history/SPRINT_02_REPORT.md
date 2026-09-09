# Sprint 2 Report — Critical Audit Fixes

Source of truth: `PROJECT_AUDIT.md` (not regenerated — marked in place).
Scope: Critical issues only, per sprint rules. Desktop layout, boot screen, sounds, and
existing animations were not touched.

## Fixed — Critical

### C-1: Projects and Architect output were never persisted

**Root cause:** every Zustand store except `useSettingsStore` skipped the `persist`
middleware. `useProjectStore` (the actual project list, including any architecture Build
Playback generated) lived in memory only — a reload, crash, or closed tab silently
discarded it with no warning.

**Fix:** `store/useProjectStore.ts` now wraps its `create()` call in `persist(...)`
(same pattern already used by `useSettingsStore`), storing `projects` under the
localStorage key `cattipu-projects` via an explicit `partialize`.

**Scope decision — `useArchitectStore` was deliberately left non-persisted.** The audit's
implementation-order note said "at minimum" persist both stores. I traced
`useArchitectStore`'s `commit()` helper: every node/edge mutation, and Build Playback's
completion, already writes through to `useProjectStore.updateProjectArchitecture` /
`addProjectFromArchitecture` whenever a project is linked. So the data worth protecting
was already flowing into `useProjectStore` before this fix — persisting it was the
complete fix. Persisting `useArchitectStore`'s own state as well would add real risk
(a reload mid-`"generating"`/`"playing"` would restore a stuck animation state) for no
additional data safety, so I scoped it out rather than doing it reflexively.

**Bug caught and fixed in the same file:** project IDs were a module-level incrementing
counter (`seq`, reset to 0 on every load). Once `projects` survives reloads, that counter
would start reissuing IDs that already exist in the restored list (`project-1` colliding
with a prior `project-1`). Replaced with a time+random ID (`project-<time36>-<rand6>`) —
collision-safe regardless of reload timing.

**Files changed:** `store/useProjectStore.ts` (1 file).

**Verified:** built and ran the production server; generated a project via Architect
("Build a persistence-test app…"), confirmed it landed in `localStorage["cattipu-projects"]`,
reloaded the page, and confirmed the project was still listed in the Projects window and
the desktop's Recent Projects card afterward.

## Remaining — High (not touched this sprint, per scope)

- **H-1** — Desktop icons (`CATTIPU`, `My Projects`, `Archive`) are not keyboard-operable:
  `onDoubleClick`-only activation with no Enter/Space path. WCAG 2.1.1 failure.
- **H-2** — `components/Boot/BootScreen.tsx:56` suppresses a real
  `react-hooks/exhaustive-deps` warning with an empty justification instead of fixing it.
- **H-3** — `--color-ink-faint` (`#a39d8c`) fails WCAG AA contrast (2.20:1 / 2.66:1) at
  34 real text call sites across `components/Window/*` and `components/Architect/*`.

All three are scoped for a future sprint per "Critical issues only" — no code changes made
against them here.

## Build and lint results

```
$ pnpm lint
> cattipu-os@0.1.0 lint
> eslint

(no errors, no warnings)

$ pnpm build
> cattipu-os@0.1.0 build
> next build

 ✓ Compiled successfully in 19.9s
 ✓ Generating static pages (5/5)

Route (app)                                 Size  First Load JS
┌ ○ /                                     140 kB         243 kB
└ ○ /_not-found                            993 B         104 kB
+ First Load JS shared by all             103 kB
```

Both clean. First Load JS is unchanged from the pre-Sprint-2 baseline (140 kB / 243 kB) —
expected, since this fix only added a localStorage read/write path, no new dependencies
or components.
