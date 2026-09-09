# Repository Audit — v0.9 production finalization

331 tracked files before, **301 after**. 31 deleted, 35 moved, 1 added.
Nothing renamed for cosmetics; nothing deleted that any live module can
reach.

The removals were decided by a static import graph rooted at
`app/page.tsx` and `app/layout.tsx`, not by reading filenames. The script
is reproduced at the bottom so the same question can be asked again after
any future sprint.

---

## Classification

| Class | What it means here | Count |
|---|---|---|
| **production** | reachable from `app/page.tsx` / `app/layout.tsx`, or an asset one of those references | 85 modules + 73 public assets |
| **documentation** | `docs/`, `README`, `LICENSE`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` | 89 |
| **development** | test suites, verification harnesses, asset generators | 17 |
| **temporary** | build output, editor state — all already git-ignored | 0 tracked |
| **obsolete** | superseded or never referenced | **31, removed** |

---

## Removed, with the reason

### The legacy shell — 15 modules

`components/Desktop/` (9), `components/Dock/` (2),
`components/Window/{LegacyWindow,WindowManager,AboutApp,ProjectsApp}.tsx`.

`app/page.tsx` has said since `df4f5cf`:

> The legacy `components/Desktop` tree stays in the repository,
> unrendered, until the new desktop is verified.

It is verified. The v0.9 `InteractiveDesktop` shell now carries **175
behavioural checks** across six harnesses (M16 27, M17 42, M18 40, M19 31,
M19b 18, boot 17), a four-viewport responsive audit, and a Golden Master
pixel comparison. The condition attached to keeping this tree has been
met, so it is an integration leftover rather than a fallback.

`components/Dock/AppIcon.tsx` went with it, but for a different reason and
after a correction: it is **reachable**, and the first pass deleted it by
over-broadening `git rm -r components/Dock` past what the import graph
actually said. It was restored, then removed properly. Milestone 13 had
left it as a pure re-export —

```ts
export { AppIcon } from "@/components/Icons/AppIcon";
```

— to spare six call sites an edit. Four of those call sites are now gone;
the remaining two (`PlaceholderApp`, `CommandPalette`) were pointed at the
real module and the shim deleted. One name, one file.

### Next.js starter placeholders — 5 files

`public/{file,globe,next,vercel,window}.svg`. Shipped by
`create-next-app`, referenced nowhere. The one apparent hit on `file.svg`
was a substring match inside `openfile.svg`.

### Superseded icon set — 11 files

`public/icons/*.png`. `lib/apps.ts` still describes `icon` as a
"filename in `public/icons/`", but Milestone 13 replaced the PNG-backed
`AppIcon` with a native pixel-grid family: `AppIcon` resolves through
`APP_ICONS` in `components/Icons/appIcons.ts` and never touches disk. The
PNGs have been unreachable since M13 and the comment was stale
documentation of a path that no longer existed.

### Duplicate state — 1 field

`useFilesystemStore.wallpaper`. Added in M16 with the note "M19 will give
it a manager; this is the field it will write to". M19 did not, and
`useSettingsStore.wallpaper` has owned the wallpaper the entire time — so
the field had two authors and **zero readers**. Persist schema bumped
v2 → v3; a record written by v2 drops the key.

This is the one removal that is not merely tidying. Two stores each
claiming the desktop wallpaper is precisely the duplicate state the OS
layer exists to prevent, and it would have been discovered by whoever
built the wallpaper manager, at the point where it costs the most.

### Unused dependencies — 3

| Package | Why |
|---|---|
| `@fontsource-variable/inter` | M12 removed Inter as the body voice. The only remaining mentions are comments explaining its removal. |
| `@fontsource/archivo` | Zero references in any source file or stylesheet. |
| `react-rnd` | Imported only by `LegacyWindow.tsx`. The v0.9 window manager does its own dragging and resizing. |

No versions were changed. No major upgrades.

---

## Moved, not deleted

| From | To | Why |
|---|---|---|
| 14 `MILESTONE*/SPRINT*/PHASE2*/PROJECT_AUDIT` files at the repo root | `docs/history/` | Sprint reports are history, not a landing page. The root should show what the project *is*. |
| 7 report files in `docs/` | `docs/history/` | Same rule applied consistently: `docs/` root is now reference material (architecture, design system, roadmap), `docs/history/` is the record of how it got here. |
| `assets/brand/` | `docs/brand/` | Design reference material — palette, wordmark, typography plates. Never imported by the app, so a top-level `assets/` next to `public/` was two places for "assets" with different meanings. |
| 6 test suites in `lib/**/__tests__/` | `tests/` | The requested structure. Nothing imports *from* a test, so the move is contained; their own relative imports were retargeted to `@/` aliases and `package.json`'s `test` script updated. All six pass from the new location. |

---

## Kept deliberately, though currently unmounted

Three modules are implemented but not reachable from the shell. They are
**not** legacy — nothing supersedes them — so deleting them would destroy
work rather than remove debt.

| Module | Status |
|---|---|
| `components/System/NotificationCenter.tsx` | Complete; `useNotificationStore` is live. Needs a mount point in the v0.9 shell. Named as an extension point. |
| `components/CommandPalette/CommandPalette.tsx` | Complete; needs a keyboard entry point in the v0.9 shell. |
| `components/UI/{Button,Input,Panel}.tsx` | Generic primitives. |

`public/textures/paper-grain.png` is likewise kept: the Settings wallpaper
picker is live and writes `useSettingsStore.wallpaper`, and the surface
that paints it is an extension point, not a regression introduced here —
the wallpaper was already unpainted in the v0.9 shell before this cleanup.

---

## Two deviations from the requested structure, and why

**`public/pixelforge/` was not created.** The PixelForge marks live at
`public/assets/pixelforge/{shell,toolbox}/` and are imported through SVGR
by ~47 static import statements in `components/PixelIcon/`. They are
already namespaced; moving them buys a shorter path and costs 47 edited
import lines through the icon layer that renders every mark in the Golden
Master. "Preserve working imports" and "do not rename files
unnecessarily" both point the same way.

**`hooks/` was not created.** The only app-level candidate is
`lib/useUiSound.ts`, and it is imported by `components/Boot/BootScreen.tsx`
— which the boot restoration patch certifies as **byte-identical** to the
original production implementation at `31d6aa0`. Moving the hook would
edit that file and invalidate a documented guarantee in exchange for a
directory. The repository's other hook,
`components/WindowManager/useWindowManager.ts`, is correctly co-located
with the component it serves.

---

## Reproducing the reachability check

```python
# Roots at app/page.tsx and app/layout.tsx, resolves @/ and relative
# specifiers against the real files on disk, and reports what nothing
# imports. Tests appear as unreachable because they are entry points.
import os, re
mods = {os.path.normpath(os.path.join(dp, f))
        for base in ["app","components","lib","design-system","store","tests"]
        for dp,_,fs in os.walk(base) for f in fs
        if os.path.splitext(f)[1] in (".ts",".tsx")}

def resolve(spec, src):
    cand = spec[2:] if spec.startswith("@/") else (
        os.path.join(os.path.dirname(src), spec) if spec.startswith(".") else None)
    if cand is None: return None
    for suffix in ("", ".tsx", ".ts", "/index.tsx", "/index.ts"):
        p = os.path.normpath(cand + suffix)
        if p in mods: return p

imp = re.compile(r"""(?:from|import)\s+['"]([^'"]+)['"]""")
graph = {m: {r for s in imp.findall(open(m, encoding="utf-8", errors="ignore").read())
             if (r := resolve(s, m))} for m in mods}

seen, stack = set(), ["app/page.tsx", "app/layout.tsx"]
while stack:
    cur = os.path.normpath(stack.pop())
    if cur in seen: continue
    seen.add(cur); stack.extend(graph.get(cur, ()))

for m in sorted(mods - seen): print("unreachable:", m)
```

Its answer is a starting point, not a verdict — it found
`components/Dock/AppIcon.tsx` reachable and I deleted it anyway. Read the
list, then check each entry before removing it.

---

## Verification after cleanup

```
npm run typecheck   0 errors
npm run lint        0 errors, 0 warnings
npm test            9 + 18 + 16 + 24 + 33 + 36  =  136 unit assertions
npm run build       clean

M16 27/27   M17 42/42   M18 40/40   M19 31/31   M19b 18/18   boot 17/17
```

**Golden Master, before cleanup vs after cleanup, same default state:**

```
59 changed pixels of 1,440,000  (0.0041%)
bounding box  x 1552-1558, y 31-40
```

That box is seven pixels wide inside the top bar: the minute digit of the
live clock, which advanced between the two captures. Everything else is
identical, so the cleanup is visually inert.

The comparison was run this way on purpose. Diffing against the RC2
reference instead reports 0.526%, but that figure mixes M19's *intended*
changes (the live clock, the workspace title, the restored node monitor)
with anything the cleanup might have broken, and cannot separate them. A
first attempt at that diff reported 14.808% — because the capture it used
had Explorer open and RC2 does not. Comparing the same build state before
and after the change is the only version of this check that answers the
question being asked.
