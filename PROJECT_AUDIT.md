# CATTIPU OS — Project Audit

Date: 2026-08-27
Scope: full Next.js project at repo root (`app/`, `components/`, `store/`, `lib/`, `public/`).
Method: `npm run build`, `tsc --noEmit`, `next lint` / ESLint (flat config, all rules), manual
cross-reference of every asset/import against its usage, and a WCAG contrast check on the
color tokens actually shipped in `globals.css`.

No fixes were applied. This document is diagnostic only.

## Checklist verdict (at a glance)

| Area | Verdict |
|---|---|
| Build errors | None — `npm run build` completes clean |
| TypeScript errors | None — `tsc --noEmit` clean under `strict: true` |
| ESLint errors | None (0 errors). One suppressed warning found — see High-2 |
| Broken imports | None found — every component/module is referenced somewhere |
| Duplicate components | None — no duplicate `export function` names anywhere in the tree |
| Dead code | None inside app logic (no TODO/FIXME markers, no commented-out JSX, no leftover `console.log`). Dead **files** exist — see Low-1/2/3 |
| Unused assets | 5 unused Create-Next-App boilerplate SVGs — see Low-1 |
| Missing icons | None — every `icon:` value in `lib/apps.ts` resolves to a real file in `public/icons/` |
| Broken routes | N/A in the literal sense — this is a single-route app (`/`) with in-app "windows," not multi-page routing. Four dock apps (Canvas, Forge, Launch, Memory) resolve to a generic stub — see Medium-4 |
| Accessibility issues | Real findings — see Critical-1(related), High-2/3, Medium-1 |
| Responsive issues | Real finding — see Medium-2 |
| Performance issues | Real finding — see Medium-3 |
| Loading screen integration | Minor finding — see Medium-5 |
| Sound integration | Clean — both call paths (hook + imperative store) correctly gate on Settings before playing |
| State management consistency | ✅ Resolved (Sprint 2) — see Critical-1 |
| Folder structure | Mostly clean; scratch/session files at repo root — see Low-3 |

---

## Critical

### C-1. Projects and Architect output are never persisted — a page reload silently deletes them
**Status: ✅ RESOLVED — Sprint 2 (see `SPRINT_02_REPORT.md`).** `useProjectStore` now
persists `projects` to localStorage. Original finding kept below for record.

`store/useProjectStore.ts` and `store/useArchitectStore.ts` are plain in-memory Zustand
stores (`create<...>((set) => ...)`, no `persist` middleware). Of the five stores in
`store/`, only `useSettingsStore.ts` wraps itself in `persist(..., { name: "cattipu-settings" })`.

Concretely: a user runs Architect's Build Playback, gets a full generated system (the
product's headline feature), it's added to `useProjectStore` — and a refresh (or a crash,
or closing the tab) discards it with no warning, no confirmation dialog, and no recovery
path. `updateProjectArchitecture`'s own doc comment calls this "real persistence, not a
snapshot" — that's true only in the sense that Architect and Projects stay in sync with
each other *while the tab is open*; it does not mean anything survives a reload. This is
the single most product-damaging finding in the audit: it looks exactly like data loss to
anyone actually using the product for what it's for.

**Affected:** `store/useProjectStore.ts`, `store/useArchitectStore.ts`, `store/useWindowStore.ts` (open windows also don't survive reload, which is more defensible but compounds the same pattern).

---

## High

### H-1. Desktop icons are not operable by keyboard
`components/Desktop/DesktopIcons.tsx` opens an icon only via `onDoubleClick`. The `<button>`
is focusable and `onClick` only sets `selected` (visual highlight) — there is no
`onKeyDown` handling for Enter/Space to actually *open* the icon, and double-click has no
keyboard equivalent by default. A keyboard-only user can select "CATTIPU," "My Projects,"
or "Archive" but can never open them. This is a WCAG 2.1.1 (Keyboard) failure on a primary
navigation surface.

**Affected:** `components/Desktop/DesktopIcons.tsx` (all three `ICONS` entries).

### H-2. A real `react-hooks/exhaustive-deps` warning is suppressed, not fixed
`components/Boot/BootScreen.tsx` line 56 carries `// eslint-disable-next-line
react-hooks/exhaustive-deps` with an **empty justification string** (confirmed via
`eslint -f json`: `"suppressions":[{"kind":"directive","justification":""}]`). The
underlying warning is real: the effect closes over `playSound` and `skip` without listing
them as deps. Today this most likely doesn't misfire in practice (the effect only runs
once on mount), but suppressing a hook-deps warning with no comment explaining why is the
kind of thing that quietly breaks the next time someone edits this file, and it's the only
lint suppression in the entire codebase — worth resolving rather than carrying forward.

**Affected:** `components/Boot/BootScreen.tsx:56`.

### H-3. `text-ink-faint` fails WCAG AA contrast everywhere it's used as text
`--color-ink-faint: #a39d8c` measures:
- **2.20 : 1** against the desktop's cream background (`#efe7d2`)
- **2.66 : 1** against window/panel surfaces (`#fffdf7`)

WCAG AA requires 4.5:1 for normal text (3:1 for large text) — this token fails both
thresholds, not just the strict one. It is not a decorative-only token: it's used as real,
readable copy in 34 places, including section labels (`SettingsApp.tsx`), the Explorer
empty state ("This folder is empty."), node-kind labels on every Architect graph node, and
sidebar row metadata. Low-vision users and anyone in a bright room will struggle to read
a meaningful fraction of the app's secondary text.

**Affected:** `app/globals.css` (`--color-ink-faint` token) and its 34 call sites across
`components/Window/*`, `components/Architect/*`.

---

## Medium

### M-1. `text-ink-dim` fails WCAG AA for normal-size text
`--color-ink-dim: #7a7566` measures 3.73:1 on cream, 4.52:1 on the lighter surface color.
That clears the *large-text* AA threshold (3:1) but fails the *normal-text* one (4.5:1) in
the cream context, and sits right on the edge even on the lighter surface. It's used 42
times, frequently at 11–13px (taglines, secondary metadata, timestamps) — sizes that
count as normal text under WCAG, not large text. Less severe than H-3, but worth folding
into the same pass since it's the same root cause (the ink-dim/ink-faint pair needs
darkening, or restricting to genuinely large/bold text and non-text UI).

### M-2. No responsive or small-viewport handling anywhere
The whole shell is built on `h-screen w-screen` (`Desktop.tsx`, `app/page.tsx`) with
fixed-pixel window defaults (react-rnd) and a fixed-pixel dock (64/196px). Across the
entire component tree there are only **11** uses of a `sm:`/`md:`/`lg:` Tailwind
breakpoint prefix, and zero touch/mobile detection (`matchMedia`, `ontouchstart`, etc.).
There's no small-screen guard or "use a bigger screen" message — on a phone or narrow
tablet viewport this will render as an unusable, clipped desktop rather than degrading
gracefully. This may be an accepted trade-off for a desktop-OS concept, but right now
there's no signal to the user that it's intentional versus broken.

### M-3. ReactFlow and the entire Architect module ship in the initial bundle
There is zero use of `next/dynamic` anywhere in the codebase (`grep` confirms 0 matches).
Architect — which pulls in `reactflow` (a genuinely heavy dependency) — is one of nine
dock apps and may never be opened in a session, but its code is not code-split; it loads
as part of the 140 kB route / 243 kB First Load JS on initial page load regardless.
Wrapping `ArchitectApp` (and arguably `FileExplorerApp`, `SettingsApp`) in
`next/dynamic(() => import(...), { ssr: false, loading: ... })` would let the boot
sequence and empty desktop paint before that weight is fetched.

### M-4. Four dock apps are unimplemented stubs
`Canvas`, `Forge`, `Launch`, and `Memory` all fall through `WindowManager`'s app-id switch
to a generic `PlaceholderApp`. This is very likely intentional (roadmap items — the
Founder Vision doc lists Canvas/Forge/Launch as later pipeline stages), but it's worth
stating explicitly in this audit rather than leaving it to be discovered by clicking, and
it's the concrete answer to the "broken routes" checklist item: nothing is *broken*, four
of nine are *not built yet*.

### M-5. Boot screen doesn't gate the shell's mount — it only visually covers it
In `app/page.tsx`, `<Desktop />` and `<BootScreen />` are siblings, both always mounted;
`BootScreen` sits on top only via `fixed inset-0 z-50` CSS. That means `TopBar`'s clock
`setInterval`, the Dock's hover/motion state, `CommandPalette`'s window-level keydown
listener, and all five Zustand store initializations are already live *during* the boot
animation, not gated behind it. Harmless today only because the overlay happens to be a
fully opaque `bg-bg` div — if that ever becomes translucent, or the z-index ever
regresses, the desktop underneath is already fully interactive. Not a bug in the current
build; a fragile assumption worth making explicit (e.g. gate the mount, not just the
paint).

---

## Low

### L-1. Five unused Create-Next-App boilerplate assets
`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — confirmed zero
references anywhere in `app/` or `components/`. Leftover scaffolding from
`create-next-app`, safe to delete.

### L-2. Empty `hooks/` directory at the repo root
Scaffolded, never populated, never imported from. Either remove it or, if it's reserved
for planned custom hooks, say so with a `.gitkeep` + comment so it doesn't read as debris.

### L-3. Session scratch files sitting in the working tree
`screenshot-5.mjs`, `verify-refinement.mjs`, `handoff-shots/`, `refinement-shots/`,
`verify-shots/`, and `cattipu-v1.0-desktop-refinement.zip` are all present at the repo
root. None of these are committed to git (`git status` shows them all untracked), so
they're very likely artifacts of prior working sessions in this sandbox rather than
something that made it into your actual Windows copy — but if any did get copied over,
they should move to a gitignored `scratch/` folder or be deleted; a Playwright verification
script and its screenshot output don't belong in the same directory as the app source.

### L-4. Window drag/resize has no keyboard path
`react-rnd`-based windows (`components/Window/Window.tsx`) can only be moved or resized
with a mouse/pointer — there's no keyboard equivalent (e.g. arrow keys while focused on
the title bar). This is a common, generally-accepted limitation of desktop-simulation UIs
and of react-rnd itself, not something specific to CATTIPU's implementation — flagging it
for completeness against the audit's accessibility item, not as a regression.

---

## Implementation order

1. **C-1** — ✅ Done, Sprint 2. Add `persist` (localStorage, or a real backend once one exists) to
   `useProjectStore` and `useArchitectStore` at minimum; decide deliberately whether
   `useWindowStore` should restore open windows on reload or intentionally reset. This is
   the one item that materially damages the product's core promise, so it goes first.
2. **H-1** — Add keyboard activation (Enter/Space → same handler as `onDoubleClick`) to
   `DesktopIcons.tsx`. Small, contained, fixes a real WCAG failure.
3. **H-3 + M-1** — Darken `--color-ink-faint` and `--color-ink-dim` (or split them into a
   "text" pair that meets 4.5:1 and a separate "decorative/icon-only" pair that doesn't
   need to) in `globals.css`. One token change fixes both findings everywhere at once.
4. **H-2** — Fix the actual `react-hooks/exhaustive-deps` warning in `BootScreen.tsx`
   (wrap `skip`/`playSound` in `useCallback` or add them to the deps array) instead of
   suppressing it.
5. **M-3** — Code-split `ArchitectApp` behind `next/dynamic` (and evaluate the same for
   `FileExplorerApp`/`SettingsApp`) to cut initial JS weight.
6. **M-5** — Gate `Desktop`'s mount (or at least its timers/effects) behind
   `useBootStore`'s `phase`, instead of relying on `BootScreen` staying opaque forever.
7. **M-2** — Decide and document the intended small-viewport behavior (block with a
   message vs. a real responsive mode) rather than leaving it undefined.
8. **M-4** — No code change; document Canvas/Forge/Launch/Memory as "not yet
   implemented" somewhere user-facing (e.g. the placeholder window copy already hints at
   this — confirm it says so clearly) so it reads as roadmap, not bug.
9. **L-1, L-2, L-3** — Housekeeping pass: delete the five unused SVGs, remove or repurpose
   `hooks/`, move/gitignore the session scratch files.
10. **L-4** — No action required; documented as an accepted limitation.
