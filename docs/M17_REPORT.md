# M17 — Real File Explorer

Explorer is no longer a window with a filesystem of its own. It is a view
of the OS state, sharing every object with the desktop. 42/42 behavioural
checks pass against the production build; the pure rules carry 24 unit
tests, mutation-checked against ten deliberate breakages.

---

## The decision the whole sprint rests on

**Every OS object carries a `parentId`, and `null` means the root. The
root IS the desktop.**

```
parentId === null    at the OS root → drawn on the desktop AND listed in
                     Explorer's root
parentId === "f1"    inside folder f1 → listed in Explorer under f1, and
                     nowhere on the desktop
```

"Creating a desktop folder should immediately appear inside Explorer" and
"creating a folder inside Explorer should immediately appear on the
desktop if it belongs there" are therefore not two synchronisations to
implement and keep working. There is one array and two views of it, and
"belongs there" is the single comparison `parentId === null`
(`desktopObjects` in `lib/os/desktop.ts` — three lines).

The same reasoning removes the refresh problem. Explorer caches nothing;
the listing is derived from state on every render, so "the grid must
automatically refresh whenever the OS state changes" has no mechanism
behind it and nothing to invalidate.

---

## What was built

| File | Role |
|---|---|
| `lib/os/filesystem.ts` | **New.** The object model and every rule about it: children, paths, descendants, move legality, deletion, listings, search. |
| `lib/os/desktop.ts` | Narrowed to the one thing only the desktop has — a grid. Re-exports the shared type rather than defining a second one. |
| `store/useDesktopStore.ts` → `store/useFilesystemStore.ts` | **Renamed.** It holds the filesystem now, and a name that says "desktop" is how a second store gets added later. Persist key unchanged; v1→v2 migration adds `parentId`. |
| `components/Explorer/` | **New.** The real Explorer — toolbar, breadcrumbs, search, folder tree, file grid, three context menus. |
| `components/Window/FileExplorerApp.tsx` | **Deleted.** The mock. |
| `components/DesktopObjects/` | Reads the shared store; draws root objects only. |
| `components/InteractiveDesktop/` | `windowContent` widened to accept a render function. |
| `components/Shell/CattipuShell.tsx` | Mounts `ExplorerApp` with `openWindow`. |
| `lib/os/__tests__/filesystem.test.ts` | 24 tests, added to `npm test`. |
| `scripts/m17-verify.py` | The harness every figure below comes from. |

No frozen package component was edited. `FolderTree`, `FolderTreeItem`,
`DividerGroove`, `Window` and `ProjectsWindow` are used exactly as they
were signed off.

---

## Confirmations the sprint asked for

### Folders sync

One `New Folder` in Explorer, then all three surfaces read in the same
render:

```
grid  ['Untitled Folder', …]      tree  ['CATTIPU OS', 'Untitled Folder']
desktop  ['Untitled Folder']
```

Renaming it in Explorer moves all three at once — there is one object and
one label.

### Desktop sync

Both directions, in one session:

- Folder made in Explorer's root → appears on the desktop.
- Folder made on the desktop → appears in Explorer's root.
- Folder made **inside** a folder → appears in Explorer under that folder
  and **not** on the desktop.

The middle case is checked with Explorer standing inside `Work`, so the
new root folder must be absent from that listing and present at the root
a moment later. Sync that showed everything everywhere would fail this.

### Breadcrumbs sync

Opening `Work` moves all three together:

```
crumbs  ['CATTIPU OS', 'Work']
tree    Work selected, Clients nested one level under it
grid    []  (Work is empty)
```

Breadcrumbs are **derived from `parentId` on every render**, never
accumulated as you navigate. The test that matters navigates first and
renames the ancestor after: a stored trail still says `Work`, a derived
one says `Consulting`. A location that no longer exists resolves to the
root rather than leaving the window pointing at nothing.

### Search works

Standing at the root, searching `clie` finds `Clients` — three levels
down, not in the current listing — and reports `CATTIPU OS / Work`.
A search scoped to the current folder would answer "no results", which is
worse than no search: it says something false.

`bank` returns all three kinds at once, prefix matches first:

```
folder            Bank Records
project-shortcut  Banking Platform
project           Banking Platform
```

An empty query returns nothing, not everything — otherwise clearing the
box silently replaces the folder you were looking at.

### No overlap

No two grid entries share any pixel, checked pairwise from the DOM: 0
overlaps at 5 entries and 0 at 47.

### No scroll bugs

Measured, not eyeballed:

| | 5 entries | 47 entries |
|---|---|---|
| Explorer overflow (x, y) | 0, 0 | —, 0 |
| Grid horizontal overflow | 0 | 0 |
| Grid scrolls internally | no | **yes** |
| Window height | 612 | **612** |
| Page scrollbars | none | none |

Overflow becomes the grid pane's own scroll. The window does not grow and
the page never gains a scrollbar.

---

## Migration

M16 shipped a flat desktop. The persisted key stays `cattipu-desktop` —
renaming it to something tidier would silently discard every folder made
under the old build — and version 2 adds `parentId: null` to each record,
since everything M16 saved was on the desktop by definition.

Verified end to end: a hand-written v1 payload reloads with the folder on
the desktop **and** in Explorer's root.

---

## Visual rules

Nothing new was introduced. The toolbar, grid and menus are built from
the existing primitives — 2px outer frame, raised/inset bevels
(`bevel.css`), cream and dark-cream surfaces, navy highlight, the VGA
type stack, 8/12px spacing, 0 radius. The tree pane is 248px and the
divider 16px, matching `CATTIPU_PROJECTS_WINDOW_REFERENCE`.

Emphasis uses the app's existing near-black `--color-ink` (#141110) for
the current breadcrumb and entry labels, as the Golden Master does — not
a new colour and not a new accent.

Golden Master parity is unchanged: `Desktop_Empty.png` still differs from
the RC2 baseline only in the top bar's clock text — **0 changed pixels
below y=74**.

### One icon changed, deliberately

Project shortcuts now use the frozen `openfile` mark (a folder with an
arrow leaving it) instead of `projects`. Explorer lists projects **and**
shortcuts in the same grid, so they need separate silhouettes — otherwise
two identically drawn, identically labelled entries sit side by side. The
desktop was moved with it: one object type with two different marks
depending on which window you are looking at would be worse than either
choice. Three kinds, three silhouettes, verified by cropping the live
render.

---

## Two real bugs found by the harness

**Renaming opened what you renamed.** Pressing Enter to commit a rename
bubbled to the row's own `keydown`, which opens the item — so renaming a
folder immediately navigated into it. Present in M16's desktop rename
too, where it opened Explorer. Fixed in both by stopping the event at the
input.

**Labels clipped instead of wrapping.** A grid item's automatic minimum
is `min-content`, so a long label grew its track and was cut off
mid-word ("Banking Platfor"). Fixed with `min-width: 0` on the grid item
and an explicit width on the label, which gives it something definite to
wrap against.

---

## Deliberate limits

- **Projects have no parent and are listed at the root only.** The
  project store has no folder concept; giving projects a `parentId` here
  would create a second place that decides where a project lives. The
  sprint's folder-tree verbs (Move, Nested) are folder verbs, and the
  project menu has no Move — this matches the spec.
- **Expand/collapse is one gesture, not a twisty.** The frozen
  `FolderTreeItem` has no disclosure control, and adding one would change
  the Projects window, which is Golden Master. Clicking a folder
  navigates to and expands it; clicking the folder you are already in
  collapses it. Ancestors of the current location are always open, so any
  route to a folder leaves the tree showing the same place. This is a
  real tradeoff, stated rather than papered over: with a twisty you could
  expand a folder without navigating to it, and here you cannot.
- **Deleting a folder deletes its contents**, and the menu says
  `AND CONTENTS` when there are any. A folder that vanished while its
  contents stayed would leave those objects in storage and out of every
  view.
- **Paste and Change Wallpaper stay disabled**, as in M16.

---

## Verification

```
npm run typecheck   0 errors
npm run lint        0 errors, 1 pre-existing warning (ManagedWindow.tsx:217)
npm test            9/9 + 18/18 + 16/16 + 24/24
npm run build       clean
M17 harness         42/42
M16 harness         27/27  (re-run, no regression)
```

The 24 filesystem tests were mutation-checked. Ten deliberate breakages —
desktop filter removed, cycle guard reduced to the immediate parent,
subtree deletion reduced to one object, flat search ranking, empty query
returning everything, folder numbering made global, breadcrumb chain
built leaf-first, projects listed in every folder, nested objects
occupying desktop cells, listing sorted by label only — were each caught
by at least one test.

One was **not**, at first: the search-ranking test used labels whose
alphabetical order happened to agree with the correct answer, so it
passed against a flat ranking. It was rewritten with labels where the two
orders disagree, rather than kept for the count.

A negative assertion is worth exactly what you have proved it can fail
on.

## Screenshots

- `Explorer_Empty.png` — the real OS root: the three actual projects, no mock filesystem
- `Explorer_WithFolders.png` — nested folders in the tree, folders and projects in the grid
- `Explorer_Search.png` — one query matching a folder, a shortcut and a project, each with its location
