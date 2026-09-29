# CATTIPU OS — MVP-07 Report

## Objective

Forge / Real Project Build: take a project's actual files and produce a real
build artifact through a real build process, with Forge as its own bounded
context.

```text
Forge window → useForgeStore → ForgeClient → /api/forge → ForgeService
  → materializer (this project's files → temp workspace)
  → esbuild (allowlisted native binary, fixed argument array, no shell)
  → artifact directory → BuildResult → project.forge.builds + one memory ref
```

## Baseline

- `main` at `1e12cf9` (MVP-06), clean tree, 2 commits ahead of
  `origin/main` (MVP-05, MVP-06, unpushed), no divergence.
- `npm run verify` passing (20 suites, 440 cases).

## MVP-01–06 regression audit (P0/P1 only)

No P0/P1 found. Checked in the browser on persisted data from earlier
sessions: projects load and migrate (v6 → v7) with conversations and file
proposals intact (also verified directly against `migrateProject`); project
creation provisions a workspace; Architect → Ask AI opens the AI Console; a
real local-model answer proposes files; Apply writes them; Explorer opens,
edits and saves them. All existing suites pass.

During acceptance I clicked through an overlapping window and hit the AI
Console's Clear button, which erased the MVP-06 "Task Demo" test
conversation. That was a testing error, not a code regression. Clear has no
confirmation (existing behaviour, P2).

## Reality check: can the server see the project's files?

No. The project filesystem is `localStorage` in the browser
(`cattipu-desktop`), and a Node process cannot read it. So there is an
explicit materialization boundary:

- The browser reads the active project's workspace from its owner
  (`projectFileService.snapshot`, new) and sends it as `BuildRequest.files`.
- `workspaceMaterializer` writes only those files, only beneath
  `<forge root>/work/<buildId>/project`. It re-validates every path
  (`normalizePath` plus a resolve-inside-root check) and never writes secret
  files (`.env*`, `.npmrc`, `*.pem`/`*.key`, `id_*`).
- The workspace is deleted when the build ends, success or failure. It is a
  staging copy, not a second filesystem; the project's files are never
  written by Forge.

## Forge architecture

| Concern | Owner |
| --- | --- |
| Contracts (request, result, errors, process boundary) | `lib/contracts/forge.ts` |
| Build lifecycle (validate → plan → materialize → run → check → artifact → cleanup) | `lib/services/forge/forgeService.ts` (server, framework-free) |
| The one target's rules (plan, HTML, diagnostics, redaction, summary) | `lib/services/forge/webAppTarget.ts` (pure) |
| Process boundary | `lib/adapters/forge/processRunner.ts` (the only `child_process` user) |
| Toolchain | `lib/adapters/forge/esbuildToolchain.ts` |
| Filesystem → disk bridge | `lib/adapters/forge/workspaceMaterializer.ts` |
| Server wiring and policy | `lib/services/forge/serverForge.ts`, `app/api/forge/route.ts` |
| Browser client | `lib/services/forge/forgeClient.ts` |
| In-flight state (not persisted) | `store/useForgeStore.ts` |
| Build history | the project: `project.forge.builds` via `useProjectStore.recordForgeBuild` |
| Build reference in memory | one `build` memory record (`lib/services/forge/buildHistory.ts`) |
| UI | `components/Forge/ForgeApp.tsx/.css`, a managed window (`forge`) |

Nothing in AI Gateway, AI Console, Explorer, Architect or Canvas knows about
Forge. The AI does not trigger builds and cannot supply commands.

## Supported build target

`web-app`, labelled WEB APPLICATION: `index.html` at the workspace root plus
the first of `src/main.ts`, `src/main.js`, `src/index.ts`, `src/index.js`,
`main.ts`, `main.js`. Imported CSS and assets are bundled; `public/**` is
copied. There are no packages and no install step: a bare import fails with
esbuild's own "Could not resolve" diagnostic. Configurations: `production`
(minified) and `development` (source maps).

The toolchain is esbuild 0.28.2, already installed with the repository (via
`tsx`). The native binary `node_modules/@esbuild/<platform>-<arch>/esbuild(.exe)`
is started directly, never through `npx`, `npm run` or a `.cmd` shim. Nothing
new was installed. `npm run build` was not used: projects are not npm
projects, and running a project's own scripts is exactly the arbitrary
execution this sprint forbids.

## Build process

- `spawn(executable, args[], { shell: false, windowsHide: true })`, with an
  environment allowlist (`SystemRoot`, `windir`, `TEMP`, `TMP`, `TMPDIR`), so
  no server key reaches the child. There is a 60s timeout (killed on
  expiry) and a 256 KB capture cap.
- The arguments are fixed. Only the entry (from the allowlist) and
  Forge-chosen output paths vary. Request fields such as `command`, `args`
  and `script` are dropped by `parseBuildRequest`; `package.json` scripts
  are never read.
- After a successful run, esbuild's metafile is checked. If the build read
  any input outside the project workspace (e.g. `../../outside.js`), the
  build fails and its output is discarded.
- The policy is on under `next dev`, and off in a production server unless
  `FORGE_ENABLED=1` (`FORGE_ENABLED=0` always disables it). One build per
  project at a time (`busy`).

## Artifact handling

On success only: the output is copied to
`<os tmp>/cattipu-forge/artifacts/<projectId>/<buildId>/` (`FORGE_ROOT`
overrides the root), which is outside the repository. `index.html` is the
source page with its development entry `<script>` removed and the bundle's
`./main.js` (and `./main.css`) put in. The result carries a
`forge://<projectId>/<buildId>` reference, the directory, and the file list
with sizes. `GET /api/forge?projectId=&buildId=` re-checks that the
artifact still exists, and the window shows ON DISK or NO LONGER ON DISK
after a reload. The newest 5 artifact directories per project are kept.
A failed build creates no artifact directory.

## Build history persistence

`project.forge.builds` (schema v7) stores id, projectId, target,
configuration, status (the existing `success` / `failed` vocabulary),
startedAt, completedAt, durationMs, summary, bounded diagnostics (≤20),
artifact (or null), whether a process ran, and the source-file count. The
redacted output tail (≤4,000 chars) is kept for failed builds only. History
is bounded at 20 per project.

The v6 → v7 migration drops malformed builds, turns a stored `pending`
build into `failed` ("Interrupted"), and re-stamps projectId. Memory gets
one `build` record per project, replaced each build, with a `forge-build`
ref. It holds the id, target, result, time, artifact and summary, never the
log. It isn't writable from the Memory window's kind picker. The
"Built" progress milestone now requires a successful build.

## Successful build (browser, real)

"Forge Alpha": its source came from the AI (MVP-06 flow) and was repaired
in Explorer. BUILD showed BUILDING…, then BUILD COMPLETE in 0.51s with
2 source files. Artifact `forge://project-mum7izla-4-5qvg27/build-mum7njsz-2-i5ok`,
ON DISK. Read from disk: `main.js` is minified esbuild output with the
TypeScript annotations compiled away, and `index.html` has `./main.js` in
place of `src/main.ts`.

## Failed build (browser, real)

The AI's first version imported `./Task`, which it never wrote. BUILD FAILED
in 0.36s: `src/main.ts:1:21 Could not resolve "./Task"`. ARTIFACT NONE, no
artifact directory on disk, temp workspace deleted, and the source files
were byte-identical before and after. The failure is in the history. Forge
did not modify source.

## Project isolation

"Forge Beta" was built from its own AI-written files: BUILD COMPLETE,
`forge://project-mum7p4xl-4-6xjj5o/…`. On disk the two artifacts sit in
separate project directories; neither bundle contains the other's code.
Back on Alpha, the history is still exactly its two builds, its artifact is
still ON DISK, and Beta has one build. The tests repeat this with marker
strings (unit and store level).

## Tests

`tests/forge.test.ts`: 20 cases covering the 20 required areas. The builds
in it are real: esbuild runs against a throwaway root, and the assertions
read the artifact from disk. Only one case wraps the process boundary, to
capture exactly what would execute. Adjusted existing tests: `system`
(typed build fixture gains the v7 fields), `projects` ("Built" means a
successful build), and `workspace` (eighth window: tile fallback counts and
cascade characterization recomputed from the real geometry).

## Verification

- `npm test` / `npm run verify`: 21 suites, 460 cases, all passing.
- `npm run build`: passing (`/api/forge` dynamic route). One pre-existing
  environmental warning: Next infers the workspace root because of a stray
  `C:\Users\acer\package-lock.json` outside the repository.
- `git diff --check`: clean. No secrets, `.env`, build output or artifacts
  in the tree.

## Known Issues (P2/P3)

- The artifact runtime was not exercised in a browser. Opening `index.html`
  from `file://` blocks module scripts; serving it is Launch (MVP-08).
- esbuild is a transitive dev dependency (via `tsx`), not declared
  directly. Forge reports `toolchain-unavailable` if it is absent (e.g. a
  production install without dev dependencies).
- The System Status widget and bottom bar still say
  "BUILD: NOT IMPLEMENTED". Diagnostics does not probe the server
  toolchain; its message was corrected, its status kept (the MVP-04/05
  precedent).
- The injected script tag keeps the removed tag's indentation (cosmetic).
- The AI Console's Clear has no confirmation (pre-existing).
- A build takes the saved workspace; unsaved Explorer edits are not
  included (they are not saved yet, which is correct but unannounced).
- Deferred as instructed: Launch, Live, deployment, AI-triggered builds and
  build diagnosis.

## Git

Branch `main`, one commit, author `anirva09 <anirvavjit2023@gmail.com>`,
not pushed.
