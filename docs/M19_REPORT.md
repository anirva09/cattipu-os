# M19 — Project Templates & System Polish

31/31 behavioural checks pass against the production build at four
viewports; 17 new unit tests, mutation-checked against seven deliberate
breakages. Two defects that predate this sprint were found and fixed
along the way, one of which had been reported as parity in M18.

---

## The rule the whole sprint follows

**Nothing new is stored that can be derived.**

Numbering is computed from the names in use right now, so renaming frees
a number with no code to free it. The active project is derived from
`lastOpenedAt`, so the title bar has no `activeProjectId` to keep in
step. A template stores only its id; the structure it implies is
recomputed from that id, so a template can be corrected in one place and
cannot leave a stale plan inside a project made a month ago.

---

## What was built

| File | Role |
|---|---|
| `lib/os/templates.ts` | **New.** Ten templates, their metadata and their derived plans. |
| `lib/os/filesystem.ts` | `nextNumberedName` — the one numbering rule both folders and projects use. |
| `lib/os/projects.ts` | `nextProjectName`, `activeProject`, `workspaceTitle`. |
| `lib/project/types.ts` | `template` field, schema v2 → v3. |
| `lib/project/migrate.ts` | Pre-template records migrate to `null`, not a guess. |
| `store/useProjectStore.ts` | `addProjectFromTemplate`; `addProject` names itself. |
| `components/Shell/CattipuShell.tsx` | Minute-aligned clock; title from the active project. |
| `components/DesktopObjects/` | `New Project ▸` with the ten templates. |
| `app/globals.css` | Two secondary-text tokens darkened (Part F). |
| `components/InteractiveDesktop/InteractiveDesktop.css` | Rail fits its box and scrolls at any height (Part E). |
| `components/WindowManager/WindowManager.css` | Suppresses a browser focus ring — see the bugs below. |
| `components/Explorer/ExplorerApp.css` | Grid on whole pixels. |
| `lib/os/__tests__/system.test.ts` | 17 tests, added to `npm test`. |
| `scripts/m19-verify.py` | Where every figure below comes from. |

---

## Part A — live system clock

Verified in a browser context pinned to **Asia/Kolkata**, a timezone this
container is not in, so a hardcoded or server-rendered time cannot
accidentally look right.

```
shown  "Tue, 8 Sept, 10:56 pm"   Asia/Kolkata was 10:56
```

- **Locale and timezone from the browser.** `Intl.DateTimeFormat` with no
  locale and no `timeZone` uses the viewer's. Nothing in the shell names
  either.
- **No hydration mismatch.** Empty on the server, filled on the client.
  Console watched across a full load: zero React #418/#423 errors.
- **Ticks ON the minute, not every 60 seconds.** A fixed interval started
  at :47 fires at :47 forever — on average half a minute stale, and never
  when the minute actually changes. The first timeout is sized to the
  remainder of the current minute. Measured: the text changed after
  13,974 ms, **at :00 seconds**.
- **The date is in the same formatted string**, so it cannot drift out of
  step with the time — there is nothing to keep in step.

## Part B — intelligent naming

```
Untitled Folder → Untitled Folder (2) → Untitled Folder (3)
Untitled Project → Untitled Project (2) → ...
```

The parenthesised form is deliberate: "Untitled Folder 2" reads as a name
someone chose, "Untitled Folder (2)" reads as the machine disambiguating,
which is what it is.

**Renaming frees the name.** Three folders made, the middle one renamed
to "Invoices", a fourth made — it takes `Untitled Folder (2)`, not `(4)`.
A stored counter passes every "the second one is (2)" test and fails only
here, which is why this is the case the tests are built around.

Folder numbering is per-parent; project numbering is global, because
projects live in one list. A second project from the same template is
`AI Agent (2)`, not `Untitled Project (2)` — the template already knew a
better name than "Untitled".

## Part C — dynamic workspace title

| State | Title bar |
|---|---|
| nothing opened | `CATTIPU OS` |
| Banking Platform opened | `CATTIPU OS │ Banking Platform` |
| switched to AI SaaS Starter | `CATTIPU OS │ AI SaaS Starter` |

Derived from `lastOpenedAt`, which M15 already stamps whenever anything
opens a project — the desktop, Explorer, the Projects tree, or creating
one from a template. So it updates immediately from every route with no
second field to keep in step.

The separator is the frozen TopBar's own glyph rather than the em dash in
the brief; changing it would edit a Golden Master component for
punctuation.

## Part D — project templates

All ten, in the brief's order, under `New Project ▸` in the desktop menu
— beside `New Folder` and `New Project Shortcut`, which is where they
belong and adds no new chrome.

A template sets what nothing else can infer (`type`, `icon`) and declares
a **plan**: the screens, services and environments that kind of project
is expected to grow.

**The plan is derived from the id, never written into the project.** This
is the whole design. Seeding `canvas.screens` with five named screens is
the tempting way to "initialize workspace structure", and it would make
`projectProgress` report a brand new project as partly built with nothing
built — exactly what M15 exists to prevent. Verified for all ten:

```
progress 0%   status New   canvas.screens 0   forge.sourceFiles 0   launch.releases 0
```

The plans are shaped like the things they describe: **API** and **CLI
Tool** have no screens, because listing one would be the template lying
about what is being built.

Schema bumped to v3. A record written before templates existed migrates
to `template: null` — not to a template guessed from its icon, because
its author never chose one.

## Part E — responsive lock

| | 1366×768 | 1440×900 | 1600×900 | 1920×1080 |
|---|---|---|---|---|
| workspace | 1020×644 | 1094×776 | 1254×776 | 1574×956 |
| rail | 98 | 98 | 98 | 98 |
| top bar | 74 | 74 | 74 | 74 |
| widget right edge | 1358/1366 | 1432/1440 | 1592/1600 | 1912/1920 |

Every guarantee holds at all four: no horizontal scroll, no vertical
scroll, nothing bleeding outside the viewport, no fractional geometry on
any bordered shell element, sidebar and top bar fixed, status bar flush
to both edges, widget column inside the viewport and clear of the window
layer, Projects and Explorer both inside the workspace.

Two changes were needed.

**The rail overflowed its own box by 8px at every height.** `Sidebar.css`
sets `min-height: 100vh` on the rail and `min-height: inherit` on four
nested chassis layers, two of which carry 2px of padding — so each
nesting started lower while still asking for a full 100vh. The rail is
positioned `top: 0; bottom: 0`, so `height: 100%` is already exactly the
viewport; binding the chain to it removes the overflow without changing a
single declared size.

**The node monitor was missing entirely at 900 and above.** The rail's
content runs to 986px, so the monitor at its bottom was not below a fold
— it was clipped away, with no scrollbar and nothing to suggest it
existed. The scroll rule had been scoped to `max-height: 899px`
specifically to leave the 1600×900 reference untouched, and what that
preserved was the gap. It is now unconditional.

Verified directly rather than inferred: at every viewport all nine rail
items are reachable and the node monitor is on screen.

**Explorer's grid now lands on whole pixels.** `minmax(104px, 1fr)`
divides leftover space and put items at x = 730.8, 855.59, which puts a
2px selection border on a half-pixel and renders it as 3px of grey. A
fixed 112px track keeps every item integral; the layout is still
responsive because auto-fill changes the column *count*.

## Part F — typography fidelity

Computed, not judged. Contrast of every text node against its own
background, across the shell with Architect, Settings and Memory open:

| token | before | after |
|---|---|---|
| `--color-ink-dim` | 3.30:1 | **7.01:1** |
| `--color-ink-faint` | 1.94:1 | **4.67:1** |

Those two carried the "ARCHITECT · PROMPT" and "TRY:" labels and the body
copy in Architect, Memory and Settings — the text that read washed out.
Each new value is its old colour scaled toward black, so the warm-grey
hue is identical and the hierarchy `ink < ink-dim < ink-faint` is
preserved: secondary text still recedes, it is simply legible while doing
it. No font, no size, no spacing changed.

Solved against the **drafting paper**, the darkest surface these tokens
appear on — a first attempt targeting the lighter cream left the
Architect labels at 4.38:1 on the surface where they actually live.

Three groups were measured as low and deliberately left alone, because
they are frozen Golden Master surfaces whose colours were signed off:
the widget headers (white on gold, 2.68:1), the window titles (4.93:1 on
the Projects red), and the status values, painted in the design system's
fixed Green. Changing those means changing the palette everywhere, which
is a redesign, not a contrast fix.

---

## Two bugs found, one of them mine

**A browser focus ring was painted on the window chrome.** M18 gave the
managed window `tabIndex={-1}` and focuses it when it becomes active, so
keyboard input follows the window you are working in. Chromium draws its
default ring on a programmatically focused container — a white line over
a near-black one, directly on top of the CATTIPU window's own bevel.

It accounted for **9,212 pixels** of difference between the RC2 reference
render and every build since M18. The M18 report claimed "0 changed
pixels below the top bar", and that claim was wrong: the comparison image
it used, `Desktop_Empty.png`, is regenerated by the M16 harness, so by
the time the check ran it had been produced from the same build it was
being compared against. The check compared a build with itself.

Fixed by suppressing the ring on the container, which is a focus target
for routing rather than a control anyone tabs to. Every real control
inside it keeps its own mechanical ring.

**The rail's bottom component was invisible**, covered under Part E.

Both were verified this time against a build of the actual previous
commit — `git stash`, rebuild, screenshot — rather than against an
artifact that could have been regenerated.

---

## Golden Master

Measured against `Desktop_1600x900_RC2.png`, same window state:

```
changed            4,974 px   (0.345%)
  workspace              0
  widget column          0
  status bar             0
  sidebar            2,864     the node monitor, now visible
  top bar            2,110     the workspace title and the clock
```

**Zero changed pixels in the workspace, the widget column and the status
bar.** The focus-ring fix restored exact parity there.

The two regions that did change are exactly the two this sprint was asked
to change:

- The **sidebar**, where the node monitor now appears instead of being
  clipped away. `Rail_Before_After.png` shows it.
- The **top bar**, where "BANKING PLATFORM" was a hardcoded default
  string in the component rather than a project. With nothing opened the
  brand now stands alone, which is what Part C asks for.

---

## One trap worth naming

`InteractiveDesktop` declares `workspaceTitle = 'Banking Platform'` as a
**default parameter**, and JavaScript applies a default when the value is
`undefined`. Passing `undefined` for "no active project" silently
reinstated the exact hardcoded name this milestone exists to remove — the
title looked correct and was a constant. The shell passes `title ?? ""`
instead: an empty string is a value, so the default does not fire.

---

## Verification

```
npm run typecheck   0 errors
npm run lint        0 errors, 1 pre-existing warning (ManagedWindow.tsx:329)
npm test            9/9 + 18/18 + 16/16 + 24/24 + 33/33 + 17/17
npm run build       clean
M19 harness         31/31
M16 harness         27/27   (re-run)
M17 harness         42/42   (re-run)
M18 harness         40/40   (re-run)
```

The 17 new tests were mutation-checked against seven deliberate
breakages: numbering by a stored counter, the un-parenthesised form,
numbering without trimming, `activeProject` returning the first project,
`activeProject` ignoring a null `lastOpenedAt`, an API template given a
screen, and migration guessing a template from the icon. Each is caught.

Four earlier tests and two harness assertions were updated rather than
worked around, and each says why in place: three pinned the old
un-parenthesised naming, and one pinned the literal `2` for the schema
version where it meant "the schema version".

A negative assertion is worth exactly what you have proved it can fail
on — including, this time, an assertion of my own that turned out to be
comparing a build with itself.

## Screenshots

- `Desktop_1366.png`, `Desktop_1440.png`, `Desktop_1600.png`, `Desktop_1920.png` — the four audited viewports
- `Naming_Test.png` — folders numbered (2), (3), and the freed number reused after a rename
- `Banking_Project_Title.png` — the title bar following the active project
- `Title_NoProject.png` — `CATTIPU OS` alone before anything is opened
- `Templates_Menu.png` — the ten templates
- `Rail_Before_After.png` — the node monitor, clipped away and then present
