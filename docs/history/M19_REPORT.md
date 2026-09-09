# M19 — Project Templates & Workspace Intelligence

**49/49 behavioural checks** against the production build (31 in
`m19-verify.py`, 18 in `m19b-verify.py`), **36 unit tests**
mutation-checked against sixteen deliberate breakages, and every earlier
harness re-run green: M16 27/27, M17 42/42, M18 40/40, boot 17/17.

The sprint ran in two passes. The first (commit `27b6b99`) covered the
clock, naming, the workspace title, the ten templates, the responsive
lock and the contrast pass. The second — this pass — covered the parts
the first did not reach: **Part C's browser-title synchronisation**,
**Part D's full project identity and folder structure**, and **Part E's
shared propagation**, which is where the real defect was.

Three defects were found across the two passes, all three mine.

---

## The defect Part E was hiding

**The RECENT PROJECTS widget had never shown a project created after
boot.** It rendered three hardcoded strings.

```
RightWidgetStack.tsx
  const DEFAULT_RECENT_PROJECTS = ['Banking Platform', 'AI SaaS Starter',
                                   'CATTIPU Website'] as const;
  ...
  recentProjects = DEFAULT_RECENT_PROJECTS,      <- default parameter
```

`InteractiveDesktop` rendered `<RightWidgetStack>` without passing the
prop at all, so the default fired on every render and the widget was
blind to the store. It is the **same trap** as the `workspaceTitle =
'Banking Platform'` default this milestone's first pass removed — a
hardcoded name that looks correct in the Golden Master render precisely
because the seed data agrees with it. Two instances, one cause.

Proven by reverting the one-line fix and re-running:

```
with recentProjects passed      created "Web App" -> widget lists it first
with the prop removed again     created "Web App" -> widget unchanged
                                18/18 -> 17/18, and only E2 fails
```

Only that check fails, which is the point: seventeen other assertions
about propagation were true while the widget was wrong.

**The Golden Master render is unchanged.** The widget now lists the three
seed projects ordered by recency, which produces the same three names in
the same order — identical output, no longer a literal.

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

## Part C (second pass) — the browser title

| State | Tab | Top bar |
|---|---|---|
| nothing opened | `CATTIPU OS` | `CATTIPU OS` |
| AI SaaS Starter opened | `CATTIPU OS — AI SaaS Starter` | `CATTIPU OS │ AI SaaS Starter` |
| switched to Banking Platform | `CATTIPU OS — Banking Platform` | `CATTIPU OS │ Banking Platform` |

Both read `activeProject`. They cannot disagree about **which** project is
active, because there is no second field saying so — only about how to
punctuate it, and that difference is deliberate: the tab is not a Golden
Master surface and spells the separator the way the sprint writes it (an
em dash), while the top bar keeps the frozen glyph its signed-off render
uses. Changing that glyph would edit a Golden Master component for
punctuation.

Set in an effect rather than in `metadata`, because the title depends on
client state that does not exist during SSR — the same reason the clock
renders empty on the server.

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

### The full project identity (second pass)

The sprint names eight fields: `template`, `targetPlatform`,
`stackPreference`, `artifactState`, `createdAt`, `lastOpened`,
`deploymentTarget`, `buildStatus`. All eight are provided, by
`projectIdentity(project)`. **Two of them are new stored fields.**

| Field | Stored? | Why |
|---|---|---|
| `template` | stored | chosen once; nothing can infer it |
| `createdAt`, `lastOpened` | stored | already were |
| `stackPreference` | **stored, nullable** | a Web App built in Rails is still a Web App |
| `deploymentTarget` | **stored, nullable** | a project can be retargeted after creation |
| `targetPlatform` | derived | a property of the KIND of thing, not the instance |
| `artifactState` | derived | literally a count of what the project contains |
| `buildStatus` | derived | the last Forge build, or none |

`null` on the two stored fields does not mean "unknown" — it means
"whatever the template says". So correcting `DEFAULT_STACK` for `web-app`
still reaches every Web App whose author never overrode it, and a project
written before these fields existed migrates to `null` rather than to a
frozen copy of the default that was current the day it was made.

`buildStatus` is the one worth spelling out. A **stored** build status
would let a project claim `success` with an empty Forge, and would go
stale the moment a build ran. Reading it from `forge.builds` means the
badge cannot disagree with the builds it describes, because it *is*
them. That is the same rule M15 exists to enforce, applied to a field the
sprint explicitly listed as metadata.

Schema bumped v3 → v4 for the two stored fields.

### Folder structure

Creating a project from a template also creates its workspace: one folder
at the OS root, holding one empty sub-folder per section the plan
actually has, plus a shortcut back to the project.

```
Web App/     Screens/  Services/  Environments/  [Web App]
API/                   Services/  Environments/  [API]
CLI Tool/              Services/  Environments/  [CLI Tool]
```

An API and a CLI Tool get no `Screens` folder, for the same reason their
plans declare no screens: a folder named for something the template never
intended is the folder equivalent of a plan that lies about the shape of
the thing.

**Empty folders and nothing else.** A folder is a place to put an
artifact, not an artifact, so `projectProgress` still reads 0% on a
project that has only just been created — verified for all ten templates.

The workspace folder is **linked**, not named. It carries the project's
id and resolves its label through `objectLabel`, exactly as a shortcut
does; the stored label is a fallback used only if the project is later
deleted, so the folder degrades into an ordinary named folder instead of
an unnamed one rather than being destroyed with the project. Renaming it
on the desktop renames the project:

```
folders  ['Dashboard']        -> ['Revenue Board']
cards    ['Dashboard', ...]   -> ['Revenue Board', ...]
```

That generalisation caught two latent bugs on the way in: Explorer built
folder entries from `object.label` directly, bypassing `objectLabel`, and
its rename handler tested the folder branch before the linked branch — so
a linked folder would have edited a fallback nobody can see while the
displayed name stayed put. Both now route through one rule.

## Part E — shared propagation

One creation, seven surfaces, measured separately after a single action:

| Surface | Result |
|---|---|
| Projects window | lists it |
| RECENT PROJECTS | lists it, first |
| Workspace title | follows it |
| Browser title | follows it |
| Desktop | its workspace folder appears |
| Explorer | shows the project **and** its folder |
| Search | finds it, with no separate index |

`Propagation.png` is all of it in one frame.

**No duplicated records**, asserted rather than assumed: exactly one
project card and exactly one workspace folder carry the name. Explorer
listing "Web App" twice is correct and is checked as exactly two — the
project record and its folder are different objects that share a name,
which is what two views of one state look like.

**Memory index.** There is nothing to propagate to. `project.memory` is
the per-project memory slot and it travels inside the record that every
surface already reads; the Memory *app* in this repository is a
placeholder with no index of its own. Writing records into that slot at
creation would fake content the same way seeding `canvas.screens` would,
so nothing is written. Stated plainly rather than ticked.

**Desktop shortcut (when enabled).** The workspace folder contains one.
A standalone desktop shortcut remains the explicit `New Project Shortcut`
command from M16 — that command is the "enabled".

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

## Three bugs found, all three mine

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

**The rail's bottom component was invisible**, covered under the
responsive audit.

**The RECENT PROJECTS widget was a constant**, covered at the top. It is
the third instance of one pattern: a frozen component declares a
plausible default parameter, the shell passes nothing, and the Golden
Master render looks right because the seed data happens to agree with the
hardcoded value. `workspaceTitle`, then `recentProjects`. Anything else
`InteractiveDesktop` defaults is worth the same suspicion.

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
npm test            9/9 + 18/18 + 16/16 + 24/24 + 33/33 + 36/36
npm run build       clean

M19  harness  31/31      M16 harness  27/27   (re-run)
M19b harness  18/18      M17 harness  42/42   (re-run)
boot harness  17/17      M18 harness  40/40   (re-run)
```

### What the report confirms

| The brief asks | Status |
|---|---|
| live clock verified | 5/5, pinned to a timezone this container is not in |
| automatic naming works | numbering, and a freed number reused after a rename |
| dynamic workspace title works | top bar and browser tab, one source |
| template metadata created | eight fields, two stored, six derived |
| shared state propagation works | seven surfaces from one action, no duplicates |
| responsive regression passed | four viewports, nine guarantees each |
| Golden Master preserved | 0 changed px in workspace, widgets and status bar |

### Mutation testing

The 36 unit tests were mutation-checked against sixteen deliberate
breakages — nine from the first pass, and eight added here:

```
recent projects fall back to updatedAt        -> 3 fail
recent projects keep archived ones            -> 1 fail
the tab always appends a name                 -> 1 fail
the identity ignores a stored override        -> 1 fail
buildStatus takes the first build             -> 1 fail
planSections always returns all three         -> 1 fail
objectLabel ignores folder links              -> 1 fail
visibleObjects hides linked folders too       -> 1 fail
```

The behavioural harness was mutation-checked too, at the build level: the
`recentProjects` prop was removed, rebuilt and re-run, and **E2 alone**
failed.

One of these caught a fault in the mutation harness rather than in the
code. The "keep archived" mutation first reported 36/36 — my pattern
`.filter((p) => !p.archived)` matched an **earlier** function in the same
file, so `recentProjectNames` was never touched and the test was never
challenged. Aimed correctly with surrounding context, it fails. A
mutation that does not reach the code under test proves the same nothing
a vacuous assertion does, and it is harder to spot because the number
looks better, not worse.

Four earlier tests and two harness assertions were updated rather than
worked around, and each says why in place.

Three faults in the new behavioural harness were fixed rather than
tolerated: it opened projects with a gesture the cards do not offer; it
reused one browser context across scenarios, so every "before" baseline
after the first inherited the previous scenario's projects; and it aimed
a right-click at an icon's centre, which sits under the Projects window.

Four earlier tests and two harness assertions were updated rather than
worked around, and each says why in place: three pinned the old
un-parenthesised naming, and one pinned the literal `2` for the schema
version where it meant "the schema version".

A negative assertion is worth exactly what you have proved it can fail
on — including, across these two passes, one assertion comparing a build
with itself, and one mutation that never reached the function it claimed
to break.

## Screenshots

- `Desktop_1366.png`, `Desktop_1440.png`, `Desktop_1600.png`, `Desktop_1920.png` — the four audited viewports
- `Naming_Test.png` — folders numbered (2), (3), and the freed number reused after a rename
- `Banking_Project_Title.png` — the title bar following the active project
- `Title_NoProject.png` — `CATTIPU OS` alone before anything is opened
- `Templates_Menu.png` — the ten templates
- `Rail_Before_After.png` — the node monitor, clipped away and then present
- `Propagation.png` — one creation reaching the Projects window, RECENT PROJECTS, the desktop folder and the title bar in a single frame
- `Template_Workspace.png` — an API's workspace folders, with no Screens
