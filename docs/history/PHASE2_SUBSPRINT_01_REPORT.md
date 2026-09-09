# Phase 2 — Sub-sprint 1 Report: Design Tokens (Foundation Layer)

Phase 2 as originally scoped is 10 subsystems in one continuous run, referencing 14 "single
source of truth" spec files. Those files did not exist anywhere in this repo or the Claude
Project when the sprint was requested. They were subsequently found in
`C:\Users\acer\Documents\cattipu-os\files\` on the Windows machine — this report starts by
documenting what was actually there, since it changes the sprint's premise, then covers the
first implementation increment.

## What was actually in `files/`

11 of the 14 referenced documents, added within about 30 minutes of each other:
`CATTIPU_FOUNDATION_TOKENS.json`, `TYPOGRAPHY_BIBLE.md`, `PHASE1_QA_FREEZE.md`,
`ICON_CONSTRUCTION_SHEET.svg`, `WINDOW_ANATOMY_SPEC.svg`, `BUTTON_COMPONENT_LIBRARY.svg`,
`DOCK_AND_SHORTCUT_SYSTEM.svg`, `CONTEXT_MENU_AND_DIALOG_SYSTEM.svg`,
`HOME_SCREEN_FINAL_SPEC.svg`, `EXPLORER_MASTER_SPEC.svg`, `FORGE_MASTER_SPEC.svg` (two of
these had accidental duplicate "(1)" copies — same file size, harmless).

**Missing, confirmed absent from both `files/` and `docs/`:** `REFERENCE_AUDIT.md`,
`ARCHITECT_MASTER_SPEC.svg`, `CANVAS_MASTER_SPEC.svg`. `PHASE1_QA_FREEZE.md` describes all
three in detail (they were reviewed at some point), so the written description below is used
where relevant, but the actual assets aren't available — **Architect and Canvas visual work
stays out of scope until they show up**, per direction already given.

**Also present, not a spec:** `useProjectStore.ts` — checked, it's byte-identical to the file
already shipped in Sprint 2. Not a new instruction, ignored.

## Token conflict: resolved in favor of the new file

The v1.0 Refinement Sprint had locked Navy `#0B3D91` / Electric `#1F5BFF` / Cream `#EFE7D2` as
non-negotiable. `CATTIPU_FOUNDATION_TOKENS.json` specifies different values and no "electric
blue" at all. `PHASE1_QA_FREEZE.md` — itself one of the found documents — explicitly rules on
this: it marks the JSON file **Approved** and instructs "treat these values as the primary
token API," and separately states the freeze-conflict rule: *"if any locked source conflicts
with a later generated sheet, stop and surface the conflict; do not silently 'improve' the
design."* The conflict was surfaced (previous message), direction to proceed was given, so the
newer, QA-approved JSON file is now authoritative.

## What this sub-sprint changed

**File:** `app/globals.css` only (`@theme` color/token block).

| Token | Old | New | Foundation name |
|---|---|---|---|
| `--color-navy` | `#0b3d91` | `#031f56` | `chrome_navy` |
| `--color-navy-identity` *(new)* | — | `#0c3c86` | `identity_navy` |
| `--color-electric` | `#1f5bff` | `#10227e` | `selection_blue` |
| `--color-cream` | `#efe7d2` | `#e7d7c3` | `cream_background` |
| `--color-surface-solid` | `#fffdf7` | `#e8d8c5` | `molded_panel` |
| `--color-ink` | `#17161a` | `#141110` | `outline` |
| `--color-outline` *(new)* | — | `#141110` | `outline` |
| `--color-success` *(new)* | — | `#196236` | `success_green` |
| `--color-warning` *(new)* | — | `#fac437` | `warning_yellow` |
| `--color-ai` *(new)* | — | `#7856ab` | `ai_purple` |
| `--color-border` / `-strong` | rgba base `(11,61,145)` | rgba base `(3,31,86)` | re-based on new chrome_navy |

Also added as documented-but-not-yet-consumed tokens (needed by later sub-sprints, harmless to
define now): `--line-border-outer: 3px`, `--line-hairline: 1px`, `--window-title-bar: 40px`,
`--window-control: 24px`, `--window-chamfer: 4px`, `--window-content-inset: 16px` — all read
directly off `WINDOW_ANATOMY_SPEC.svg`'s measured values (verified visually, see below).
`--grid-unit: 8px` and `--icon-grid: 24px` already matched the spec exactly — no change needed.

Two hardcoded `rgba(31, 91, 255, ...)` glow values (`.cattipu-led`, `.cattipu-edge-pulse`) were
duplicating the old electric-blue as a literal instead of the token — updated to the new
selection_blue rgb so the LED glow and edge-pulse effect match the new accent color instead of
silently staying the old one.

### Headline visual changes (see screenshots)

1. Navy chrome is darker/deeper (top bar, dock, window title bars).
2. The active-state/selection accent (dock LEDs, active nav indicator, Build Playback pulses)
   is now a muted ink-blue instead of the bright electric blue.
3. Window and panel faces are now a deeper tan (`molded_panel`) instead of near-white — every
   open window's interior is visibly different.

Verified live against a production build (`pnpm build && next start`) — screenshots of the
desktop, an open Projects window, and Settings all render correctly with no layout breakage,
console errors, or clipped content.

## Deliberately deferred (not done in this pass)

- **Bevel/border construction technique.** The foundation spec defines raised/pressed/recessed
  states as solid two-tone edges (`top_left`/`bottom_right` colors) and hard flat 1/2/3px
  borders. The current `.cattipu-raised`/`.cattipu-recessed`/etc. classes use a different,
  softer technique (alpha-tinted inset shadows over a base fill). Recoloring the tokens without
  changing the technique gives a coherent result today (see screenshots), but a full rebuild of
  the bevel/border classes to match the spec's exact construction is a separate, sitewide,
  higher-risk pass — proposed as its own sub-sprint rather than folded in here.
- **Typography.** `TYPOGRAPHY_BIBLE.md` requires three custom bitmap font assets
  (`CATTIPU_DISPLAY_BLOCK`, `CATTIPU_UI_BITMAP`, `CATTIPU_MONO_BITMAP`) and explicitly forbids
  substituting modern fonts as a production fallback (open item `U-01`, unresolved — no such
  font files were found anywhere in the search). The app currently uses Press Start 2P / Inter
  Variable / VT323. Per the spec these are only acceptable as "engineering-sheet fallbacks," not
  approved product typography. **This is a real blocker, not a judgment call** — implementing
  the type scale correctly is straightforward (sizes/weights/line-heights are all specified),
  but doing so with the current fonts would not be the approved typography. Kept the existing
  fonts, documented the mapping, did not touch font tokens. Needs the actual bitmap font assets
  supplied before this can be resolved properly.
- **`--color-red` / `--color-green` / `--color-blue` / `--color-gold` / `--color-purple`**
  (project-icon and Architect node-type accent colors) — not present in the foundation token
  file at all (open item `U-03`). Left untouched rather than inventing a mapping.
- Per-component adoption of the new window/border primitive tokens (window chrome rewrite is
  Phase 2 item 2, its own sub-sprint).

## Validation

```
$ pnpm lint    → clean, no errors/warnings
$ pnpm build   → clean, First Load JS unchanged (141 kB / 243 kB)
```

Live-rendered screenshots (desktop, Projects window, Settings window) confirmed visually —
no layout regressions, all existing interactions (dock hover/tooltip, window open/close)
intact.

## Proposed next sub-sprint

Per the QA freeze document's own priority table, the natural next step is **Window System**
(Phase 2 item 2): wire the `--window-title-bar` / `--window-control` / `--window-chamfer` /
`--window-content-inset` tokens just added into an actual reusable window-chrome component,
matching `WINDOW_ANATOMY_SPEC.svg`'s measured 40px title bar / 24×24 controls / 3px outer frame
/ 4px hard chamfer / 16px content inset, replacing whatever duplicated title-bar chrome
currently exists per-window. Will propose a concrete scope before touching code, same as this
one.
