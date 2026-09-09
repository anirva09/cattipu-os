# M16 — Living Desktop

Desktop icons are now real OS objects: they have identity, a position on a
grid, a link to what they point at, and they survive a refresh. Everything
below was measured by a harness driving the production build at 1600×900,
not judged by eye. 27/27 behavioural checks pass; the pure rules carry
16 unit tests of their own.

---

## What was built

| File | Role |
|---|---|
| `lib/os/desktop.ts` | Every rule that does not need a browser — grid maths, placement, collision, linking, naming. New; nothing existing was edited. |
| `store/useDesktopStore.ts` | The desktop slice of the OS state layer. Persists to `cattipu-desktop`. |
| `components/ContextMenu/` | The mechanical PixelForge menu — outer frame, raised bevel, VGA type, no new tokens. |
| `components/DesktopObjects/` | The icon layer: render, drag, snap, rename, open, three menus. |
| `components/InteractiveDesktop/` | One new optional prop, `desktopLayer`. Omitted, the component renders exactly as signed off. |
| `components/Shell/CattipuShell.tsx` | Wires the layer in and hands it `openWindow`. |
| `components/PixelIcon/shellIcons.ts` | Registers the frozen `folder` mark, copied from the family — not drawn. |
| `lib/os/__tests__/desktop.test.ts` | 16 tests, added to `npm test`. |

No component was forked, redesigned or replaced.

---

## Confirmations the sprint asked for

### Drag works

Pointer capture on the icon, so a drag continues correctly even when the
pointer passes over a window. Measured: an icon at cell (0,0) dragged to
cell (1,3) reports `left/top = 104/304`, which is exactly
`origin + col·88, origin + row·96`.

### Snap works

Positions are stored as **grid cells, not pixels**, so an icon cannot be
off-grid — snapping is not a rounding step applied after the fact.

The check that matters is the off-grid release: a drop deliberately
released 29px right and 31px below a cell origin still lands on
`(192, 208)`, the cell origin exactly. A harness that only ever released
on perfect coordinates would have proved nothing.

### Persistence works

Two icons were moved, the page was **fully reloaded**, and the positions
came back identical:

```
before  [('Untitled Folder', 16, 112), ('Untitled Folder 2', 192, 208)]
after   [('Untitled Folder', 16, 112), ('Untitled Folder 2', 192, 208)]
```

Folders, shortcuts and positions all persist through the same store.

### No overlap

Dropping an icon on an occupied cell **swaps** the two:

```
a (192,208) -> (16,112)     b (16,112) -> (192,208)
```

Refusing the drop would snap the icon back with no explanation; allowing a
stack would hide one behind the other. A swap is the only outcome where
nothing is lost and nothing is hidden. After every move the harness
asserts the set of occupied cells is the same size as the set of objects.

### Golden Master preserved

`Desktop_Empty.png` was diffed against the RC2 baseline
(`Desktop_1600x900_RC2.png`):

```
changed pixels                     319   (0.0222%)
changed below the top bar (y>=74)    0
changed outside the clock band       0
```

Every differing pixel is inside `x1450–1580, y25–50` — the top bar's
date/time text, which reads a different clock in the two captures. The
sidebar, window layer, widget column and status bar are pixel-identical.

The diff is not vacuous: the same comparison run between `Desktop_Empty`
and `Desktop_WithFolder` reports **2100 changed pixels below the top bar**,
so the method demonstrably detects desktop icons when they are there.

---

## The one rule everything else follows from

**A shortcut stores a `projectId`. It never stores a name.**

That single decision converts three of the sprint's requirements from
features that must be implemented and kept working into things that cannot
happen otherwise:

- *"Renaming the project updates the shortcut automatically"* — the
  shortcut never held a copy of the name to go stale. Verified live: the
  project was renamed and the desktop label followed, and the stored
  record still reads `label: "", projectId: "project-…"`.
- *"Creating a shortcut should not duplicate the project"* — there is
  nothing to duplicate.
- *"Deleting a shortcut must not delete the project"* — the shortcut owns
  no project data. Verified: 3 projects before removal, 3 after.

Renaming a *shortcut* renames the **project**, for the same reason. The
alternative — a per-shortcut display name — is precisely how the label
would go stale the first time the project were renamed anywhere else.

---

## Context menus

| Surface | Entries |
|---|---|
| Desktop | New Folder · New Project Shortcut ▸ · Paste *(disabled)* · Refresh · Change Wallpaper *(disabled, M19)* |
| Folder | Open · Rename · Delete |
| Shortcut | Open · Rename · Remove Shortcut |

Verified from the live DOM, in order, for all three.

Three deliberate choices:

- **Paste ships disabled rather than hidden.** There is no desktop
  clipboard yet. An item that vanishes teaches nothing; an item that is
  visibly unavailable says the machine has the concept and you have not
  copied anything.
- **"Remove Shortcut", not "Delete".** "Delete" is the wording that makes
  people believe they deleted the project. The row also carries a
  `KEEPS PROJECT` hint.
- **Nested choices drill down in place.** A hover flyout needs an intent
  timer, a safe-triangle and a touch story; a drill-down needs a back row.
  The project list is the only nesting the desktop has and it does not
  justify the other three.

**Refresh clears the selection and nothing else.** The desktop renders from
state and re-renders when state changes, so there is nothing to reload —
claiming otherwise would be theatre.

---

## Style inheritance

Every new element is built from the same three primitives as the rest of
the shell, with no new tokens, colours, shadows, radii or fonts:

- `.cattipu-edge--outer` + `.cattipu-bevel--raised` for the menu chassis
- `--cattipu-cream` / `--cattipu-dark-cream` / `--cattipu-outer-frame`
  surfaces, navy (`#002A73`) for highlight — all existing tokens
- `--cattipu-font-family` (VGA) throughout
- 4/8/16 spacing, 2px borders, 0 radius
- Icons are frozen PixelForge marks at their **native** size: 32px on the
  desktop, 16px in menus. Nothing is scaled.

The desktop grid (88×96, 16px origin) is a multiple of the engineering
paper's 8px tile, so an icon always lands on the grid the background is
drawn from.

Two marks are in play and they do not share a silhouette: `folder` is a
plain folder, `project-shortcut` uses the `projects` mark, a folder with a
document sheet behind it. Verified by cropping both from the live render.

---

## Defect found and fixed during the sprint

**Labels truncated to uselessness.** A single `nowrap` line in an 84px
cell rendered `Banking Pla…`, `AI SaaS Sta…`, `Untitled Fo…` — every icon
ending in the same three dots, none of them identifiable, which is the
entire job of a label. Changed to two clamped lines with the icon height
still fixed, so a long name can never push into the row below.

---

## Deliberately not done

- **No default desktop objects.** The desktop ships empty. Seeding
  `My Projects / Archive / Templates` to demonstrate the feature would put
  the shipped default out of parity with the approved render for everyone
  who never asked for them. Confirmed on a fresh browser profile.
- **Change Wallpaper is disabled.** The store already has the
  `wallpaper` field M19 will write to, so the shape will not change; the
  picker is M19's work, not this sprint's.
- **Folders do not open a folder window.** They open Explorer, the
  shell's file surface. A new window type is a feature addition.
- **Icons can sit beneath windows.** That is desktop behaviour, not a
  defect — it is why the harness aims 12px from an icon's left edge rather
  than its centre, which for a column-2 icon lands on the Projects window.

---

## Verification

```
npm run typecheck   0 errors
npm run lint        0 errors, 1 pre-existing warning (ManagedWindow.tsx:217)
npm test            9/9 + 18/18 + 16/16
npm run build       clean
harness             27/27
```

The 16 unit tests were mutation-checked: seven deliberate breakages of
`lib/os/desktop.ts` (stored label wins, move overwrites instead of
swapping, row cap ignored, truncation instead of rounding, no clamping,
dangling shortcuts shown, shortcut labels counted in folder numbering)
were each caught by at least one test. The seventh initially was **not** —
the original test used an empty shortcut label and passed against both the
correct and the broken implementation. It was replaced rather than kept
for the count.

A negative assertion is worth exactly what you have proved it can fail on.

## Screenshots

- `Desktop_Empty.png` — the shipped default, pixel-identical to the Golden Master below the top bar
- `Desktop_WithFolder.png` — two folders, default placement
- `Desktop_WithShortcuts.png` — folders and project shortcuts, labels reading in full
- `Desktop_ContextMenu.png` — the desktop menu, all five entries
