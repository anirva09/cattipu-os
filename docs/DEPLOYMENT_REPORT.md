# Deployment Report — v0.9

**Local status: release-ready and fully verified.**
**Remote status: not pushed, and not deployed — this environment cannot
reach the repository or the host.** The commands you need are at the
bottom, along with one thing about the branch history you should decide
before running them.

---

## Build

```
npm install         clean, 3 dependencies removed
npm run typecheck   0 errors
npm run lint        0 errors, 0 warnings
npm test            136 assertions across 6 suites
npm run build       clean
```

```
Route (app)                       Size     First Load JS
┌ ○ /                             165 kB          268 kB
└ ○ /_not-found                   993 B           104 kB
+ First Load JS shared by all     103 kB
○  (Static) prerendered as static content
```

The whole app is one statically prerendered route. There is no server-side
state — everything persists in the browser through `zustand/persist` —
so any Next-capable host serves it, and a deploy is a build plus a static
upload.

---

## Test status

| Suite | Result |
|---|---|
| `tests/project.test.ts` | 9/9 |
| `tests/projects.test.ts` | 18/18 |
| `tests/desktop.test.ts` | 16/16 |
| `tests/filesystem.test.ts` | 24/24 |
| `tests/workspace.test.ts` | 33/33 |
| `tests/system.test.ts` | 36/36 |

| Harness | Result |
|---|---|
| `scripts/m16-verify.py` — Living Desktop | 27/27 |
| `scripts/m17-verify.py` — File Explorer | 42/42 |
| `scripts/m18-verify.py` — Window manager | 40/40 |
| `scripts/m19-verify.py` — Templates, clock, responsive, contrast | 31/31 |
| `scripts/m19b-verify.py` — Titles, identity, propagation | 18/18 |
| `scripts/boot-verify.py` — Boot sequence | 17/17 |
| `scripts/production-verify.py` — **Release verification** | 38/38 |

**213 behavioural checks**, all against the production build in a real
browser.

`production-verify.py` is new and asks the question only a release asks:
it opens **all nine rail applications** at each of the four supported
viewports and then measures the shell with every one of them open —
scrolling, bleed, rail, top bar, status bar, widget column, window
placement, and the console.

---

## Files removed

31 files and 3 dependencies. Full reasoning in
[`REPOSITORY_AUDIT.md`](REPOSITORY_AUDIT.md).

| What | Count |
|---|---|
| Legacy desktop shell, superseded by `InteractiveDesktop` | 15 modules |
| Next.js starter placeholder SVGs | 5 |
| PNG icon set superseded by the M13 pixel-grid family | 11 |
| Unused dependencies (`inter`, `archivo`, `react-rnd`) | 3 |
| Duplicate `wallpaper` field on `useFilesystemStore` | 1 field |

35 files moved (sprint reports to `docs/history/`, brand plates to
`docs/brand/`, test suites to `tests/`). 331 tracked files → 301.

---

## Repository structure

```
cattipu-os/
├── app/                 routes, global stylesheet, boot mount
├── components/          shell, applications, frozen v0.9 package
├── design-system/       tokens, bevel primitives, icon registry
├── lib/                 OS state layer (os/, project/, ai/)
│   └── os/extensions.ts declared seams for what comes next
├── store/               zustand stores, persisted and versioned
├── tests/               6 unit suites
├── scripts/             7 verification harnesses, 3 asset generators
├── docs/                architecture, design system, roadmap
│   ├── history/         21 sprint and milestone reports
│   └── brand/           palette, wordmark, typography plates
├── public/              pixelforge marks, cursors, sounds, textures
├── next.config.ts  package.json  tsconfig.json
└── README.md  LICENSE  CLAUDE.md  AGENTS.md  CONTRIBUTING.md
```

Two requested directories were deliberately not created —
`public/pixelforge/` and `hooks/` — because both moves would have edited
working imports for cosmetic gain, and one of them would have invalidated
the boot patch's byte-identical guarantee. Reasoning in the audit.

---

## Golden Master

Same default state, built before the cleanup and after it:

```
59 changed pixels of 1,440,000   (0.0041%)
bounding box  x 1552-1558, y 31-40
```

Seven pixels wide inside the top bar — the live clock's minute digit,
which advanced between captures. The cleanup is visually inert.

Measured this way on purpose: diffing against the RC2 reference instead
reports 0.526%, but that number mixes M19's *intended* changes with any
the cleanup might have caused and cannot separate them.

---

## Deployment status — NOT DONE, and why

**Vercel was not updated. Nothing was pushed.** Both are outside this
environment's reach, and I would rather say so than report a deployment I
did not make.

```
$ git push --dry-run origin integration/v0.9-shell
remote: access denied by the git proxy: anirva09/cattipu-os is not in
this session's authorized repository set, so the proxy will not inject a
credential for it.
fatal: ... The requested URL returned error: 403
```

Reads succeed (`git fetch`, `git ls-remote`), so the branch analysis below
is real. Writes do not. There is no Vercel CLI here and no `.vercel`
project link in the repository, so no production URL could be verified
either — **the "active production URL" line in this report is one only you
can fill in.**

### One thing to decide before you push

`origin/main` and this branch **diverged at the integration commit**.

```
HEAD is 21 ahead of origin/main, and 2 behind.

origin/main has:   4e5d353  Revise README for v0.2.5 identity refactor
                   489f730  feat: integrate current CATTIPU implementation (#1)
local has:         31d6aa0  feat: integrate current CATTIPU implementation (#1)
```

`489f730` and `31d6aa0` are **the same content under different commit
hashes** — both point at tree `0fda533d`. GitHub squash-merged the
integration PR, which rewrote the hash, and this branch was built on the
pre-squash commit. So the two histories hold identical code and cannot
fast-forward into each other.

The README on `origin/main` is the v0.2.5 one that this release replaces,
so nothing on main needs preserving. Two ways forward:

```bash
# A — open a PR and let GitHub merge it (recommended: keeps main's history)
git push origin integration/v0.9-shell
# then open a PR into main and merge it

# B — make main match this branch exactly
git push --force-with-lease origin integration/v0.9-shell:main
```

B rewrites `origin/main`. It is safe here — the only thing it discards is
a superseded README — but it is your call, not mine, so I have not
prepared it as the default.

### Remote branch cleanup — none qualify

The instruction was to remove obsolete remote branches **after confirming
they are fully merged**. I confirmed, and **not one of the five is an
ancestor of `origin/main`**:

| Branch | Tip | Status |
|---|---|---|
| `polish/home-exact` | `f798400` | tree `0fda533d` — identical content to the base, different hash |
| `polish/retro-visual-pass` | `f798400` | same commit as above |
| `integration/current-cattipu` | `91d7a44` | tree `0fda533d` — identical content, different hash |
| `cattipu-os` | `e5ac450` | tree `e2158630` — **unique content**, not on any other branch |
| `assets/v0.9-package` | `e48b50d` | tree `f821ec6c` — **unique content**, the v0.9 package drop |

The first three carry content that is byte-identical to the integration
base and are safe to delete whenever you like. The last two hold trees
that exist nowhere else; deleting them would be the only copy going away.
Under the rule you set — delete only what is fully merged — **the correct
action is to delete nothing**, so I have deleted nothing.

```bash
# If you want the three redundant ones gone, after satisfying yourself:
git push origin --delete polish/home-exact polish/retro-visual-pass integration/current-cattipu
```

### Vercel

```bash
npm i -g vercel
vercel link            # connect this directory to the project
vercel --prod          # deploy the current build
```

Then confirm on the production URL: the boot sequence runs and hands off,
the desktop paints on engineering paper, all nine rail items open, and the
browser tab reads `CATTIPU OS`. `production-verify.py` runs against any
URL — change `URL` at the top of the file and it will check all 38 points
against the deployed site rather than localhost.

---

## Final verification checklist

| | Item | Status |
|---|---|---|
| ✅ | Repository professionally organized | 301 files, structure above |
| ✅ | Obsolete files removed | 31 files, 3 dependencies, 1 duplicate field |
| ✅ | Imports intact | typecheck clean, 0 lint problems |
| ✅ | Build passes | clean, 268 kB first load |
| ✅ | Tests pass | 136 unit assertions, 213 behavioural checks |
| ✅ | Boot sequence preserved | 17/17, byte-identical implementation |
| ✅ | Golden Master unchanged | 59 px, all inside the clock |
| ✅ | Responsive at four viewports | with all nine apps open |
| ✅ | Only your Git identity on commits | `git shortlog -sne` below |
| ✅ | No AI attribution anywhere | no trailers, no co-authors |
| ✅ | Extension points prepared | `lib/os/extensions.ts`, contracts only |
| ❌ | **GitHub mirrors local** | **blocked — push denied by the proxy** |
| ❌ | **Vercel serves the latest MVP** | **blocked — no CLI, no project link** |

```
$ git shortlog -sne
    24  anirva09 <anirvavjit2023@gmail.com>
     1  anirva09 <147125962+anirva09@users.noreply.github.com>
```

Both identities are yours — the second is GitHub's private-email form on a
commit made through the web interface.

---

## Known follow-ups

Not defects, and not introduced by this release — recorded so they are not
rediscovered as surprises.

**Three implemented surfaces are unmounted.** The Notification Centre, the
command palette, and wallpaper painting are all built and none is reachable
in the v0.9 shell. Each needs wiring, not design. They are first on the
v1.0 roadmap.

**Settings offers a Dock section.** It writes `dockMode` and
`dockIconSize`, which nothing reads — the v0.9 shell uses a fixed rail,
not a hover dock, and the dock component was unrendered well before this
cleanup removed it. The controls were already inert; removing the section
would be a UI change, which this release is not allowed to make. It should
either drive the rail or leave the Settings list in the next sprint that
is permitted to touch that surface.
