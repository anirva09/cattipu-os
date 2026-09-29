# CATTIPU OS — MVP-08 Report

## Objective

Launch / run the built application: take a successful Forge build's artifact
and run it as a real local application on a real loopback endpoint that can
be opened, stopped and relaunched, with Launch as its own bounded context.

```text
Launch window → useLaunchStore → LaunchClient → /api/launch → LaunchService
  → Forge resolves projectId + buildId → artifact directory (or nothing)
  → RuntimeAdapter "local-web" → node staticServer.mjs <artifact dir>
  → 127.0.0.1:<OS-assigned port> → LaunchRuntime → project.launch.runs + one memory ref
```

## Baseline

- `main` at `5793e20` (MVP-07), clean tree, 3 commits ahead of
  `origin/main` (MVP-05..07, unpushed), no divergence.
- `npm run verify` passing (21 suites, 460 cases).

## MVP-01–07 regression audit

No P0/P1 found. In the browser: project creation provisions a workspace;
Forge built "Launch Alpha" (BUILD COMPLETE, 0.58s), built "Launch Beta"
with a syntax error (BUILD FAILED, `src/main.ts:1:47`, ARTIFACT NONE), then
built it again after a fix (BUILD COMPLETE); build history survived a full
reload; the two projects' artifacts are separate. Every existing suite
passes; the only test edits are characterization (below).

## What the artifact is

Forge writes a successful build to
`<os tmp>/cattipu-forge/artifacts/<projectId>/<buildId>/` (`index.html`
rewritten to `./main.js`, plus `main.js`, optional `main.css` and
`public/` files). Only a successful build creates that directory. The build
history lives in the browser (`project.forge.builds`); the server has no
ledger. So the server-side proof that "project P has a successful build B
whose artifact exists" is exactly the existence of that directory, and
Forge now answers that question itself: `ForgeService.locateArtifact`
(additive, server-only). Launch never builds a path.

## Launch architecture

| Concern | Owner |
| --- | --- |
| Contracts (request, runtime/result, errors, runtime boundary) | `lib/contracts/launch.ts` |
| Lifecycle (validate → resolve via Forge → start → watch → stop) | `lib/services/launch/launchService.ts` (server, framework-free) |
| Runtime adapter (the one runtime: local-web) | `lib/adapters/launch/localWebRuntime.ts` |
| Process boundary for long-lived children | `lib/adapters/launch/runtimeProcess.ts` |
| The runtime program (static server) | `lib/adapters/launch/staticServer.mjs` |
| Server wiring, policy, HMR-safe singleton | `lib/services/launch/serverLaunch.ts`, `app/api/launch/route.ts` |
| Browser client | `lib/services/launch/launchClient.ts` |
| Server-reported state + in-flight (not persisted) | `store/useLaunchStore.ts` |
| Launch history | the project: `project.launch.runs` via `useProjectStore.recordLaunch` / `reconcileLaunches` |
| Launch reference in memory | one `launch` memory record (`lib/services/launch/launchHistory.ts`) |
| UI | `components/Launch/LaunchApp.tsx/.css`, a managed window (`launch`) on the existing Launch rail key and PixelForge mark |

Forge, the AI Gateway, the AI Console, Explorer, Architect and Canvas know
nothing about Launch (tested). Launch never builds and never writes Forge's
builds (tested).

## Runtime adapter

`RuntimeAdapter { id, label, start({ root }) }` with exactly one
implementation, `local-web`. It runs the Node binary already running
CATTIPU (`process.execPath`) on the repository's own
`lib/adapters/launch/staticServer.mjs`, with one argument: the artifact
directory Forge resolved. No framework or dependency was added. A runtime
is RUNNING only when all three of these hold:

1. the child reported `CATTIPU-RUNTIME-READY {"host","port"}` on stdout,
2. the host is `127.0.0.1` and the port is an integer in 1024–65535,
3. `GET /` on it returned 200 with a body byte-identical to the artifact's
   `index.html`.

Otherwise the child is stopped and the launch is FAILED with the reason:
it exited, timed out (10s), bound another interface, or answered wrongly.

## Artifact → runtime boundary

A request is `{ projectId, buildId }`, both held to Forge's id alphabet.
Every other field (`path`, `url`, `command`, `executable`, `args`, `root`)
is dropped by `parseLaunchRequest`. The runtime root is the directory
`forge.locateArtifact` returns. A failed build, a nonexistent build,
another project's build, or a pruned artifact all resolve to nothing:
`build-not-found` (404), and no process starts. The browser also refuses
failed and unknown builds before sending anything, and the UI disables
FAILED BUILD and NOT ON DISK rows.

## Process execution / security model

- `spawn(process.execPath, [staticServer.mjs, <artifact dir>], { shell: false, windowsHide: true })`.
  The executable, script and argument shape are fixed in the adapter.
- The environment is Forge's allowlist (`childEnvironment()`, reused, not
  copied), so no server key reaches the app.
- The working directory is the OS temp dir, not the artifact, so Windows can
  still prune it.
- The static server binds `127.0.0.1` on port 0 (hard-coded, not an
  argument) and serves GET/HEAD only (others 405). It refuses a Host header
  that is not its own loopback address (421, against DNS rebinding). It
  refuses `..`, dot-segments, dot-files, backslashes, drive/stream colons,
  NUL and undecodable paths before touching disk, then requires the real
  path to stay inside the real root. Its responses use
  `nosniff`, `no-store` and `no-referrer`.
- `/api/launch` accepts only `start` / `stop`. Policy mirrors Forge: on
  under `next dev`, off in production unless `LAUNCH_ENABLED=1`
  (`LAUNCH_ENABLED=0` always off). Process ids never leave the server.

## Port management

The OS assigns the port (listen on port 0), so ports cannot collide and
there is no port registry. The port is validated, then proven by the HTTP
probe, then stored on the runtime record. It is released when the process
exits.

## Launch lifecycle

`stopped → starting → running → stopping → stopped`; `starting → failed`;
`running → failed` on any exit Launch did not ask for (including the
artifact being pruned under it: the server answers 410 and exits with
code 3, and the reason says so). There is one runtime per project:
launching the running build returns the same runtime; launching another
build while one runs is `busy` ("Stop it first"); a concurrent duplicate
launch is `busy`. A limit of 8 runtimes applies across projects. The
record for a project's last runtime is kept, so its reason stays readable.

## Stop / cleanup

STOP closes the child's stdin, and the server shuts down and exits 0.
Launch waits for the exit (3s), then kills it and waits again. Orphans are
prevented structurally: every runtime exits when its stdin pipe closes, so
if CATTIPU's server dies, its runtimes die with it. This was verified by
stopping the dev server with a runtime running. The service lives on
`globalThis`, so a `next dev` hot reload cannot forget running children.
`stopAll` runs on `beforeExit`. Nothing kills a process Launch did not
start.

## Launch persistence

Schema v8 adds `project.launch.runs` (bounded to 20): id, projectId,
buildId, artifact reference, runtime, startedAt, endpoint, endedAt,
`result: "stopped" | "failed" | null`, and reason. A stored run has no
status field and cannot say "running". `null` means only "not seen to
end". The view's status comes only from the server (`useLaunchStore`,
never persisted): CHECKING… until the server answers. On every server
report, runs the server does not vouch for are closed as stopped ("CATTIPU's
server has no process for this launch"). Polls that change nothing write
nothing. The v7 → v8 migration adds `runs: []`, drops malformed entries,
re-stamps projectId, and never makes an entry look alive. A duplicated
project starts with no launch history. Memory gets one `launch` record,
replaced in place, with `launch-run` and `forge-build` refs; it is not
writable from the Memory window.

## Successful launch result (browser, real)

"Launch Alpha" was built by Forge (`build-mumjg8ao-1-5o2r`). In Launch, the
build was auto-selected and checked ON DISK through Forge. LAUNCH was
observed as `stopped → starting → running`, at `127.0.0.1:63749`.
`netstat` showed the listener on 127.0.0.1 only, owned by `node.exe`
PID 7560, whose parent was the Next dev server, running exactly
`node …\lib\adapters\launch\staticServer.mjs <artifact dir>`.

## HTTP / browser verification

- curl `GET /`: 200 `text/html`, byte-identical to the artifact's
  `index.html`. `GET /main.js`: 200 `text/javascript`, byte-identical to the
  artifact's compiled bundle.
- `/../../package.json`, `/%2e%2e/%2e%2e/package.json`,
  `/..%5c..%5cpackage.json`, `/src/main.ts` and `/.env` each returned 404.
- OPEN is a real `<a href>` to the endpoint. The browser pane navigated to
  it: page "Launch Alpha App", text "ALPHA-BUNDLE-RAN: compiled main.js
  executed", console `ALPHA-BUNDLE-RAN`. The compiled JS ran.
- A full CATTIPU reload with the runtime alive: storage held the run with
  `result: null` and no "running". The view showed RUNNING because the
  server did.
- STOP was observed as `running → stopping → stopped` in 143ms. Afterwards
  curl got connection refused, there was no listener, and PID 7560 was gone.
  The run and memory were closed as stopped.
- RELAUNCH: Alpha again on a new port, `:60812`.

## Failure handling (browser, real)

- Failed Forge build: listed FAIL / FAILED BUILD, row and LAUNCH disabled.
  Forced through the API: 404 `build-not-found`.
- Invalid build id: 404. Alpha's build under Beta: 404. `../..` in the id:
  400. Unknown action with a `command`: 400.
- Missing artifact (directory deleted): NOT ON DISK, disabled; forced: 404.
- Unexpected exit (runtime killed from outside): FAILED with "exited
  unexpectedly", history FAIL, Diagnostics `degraded: LAUNCH: FAILED — …`,
  and an "Application stopped unexpectedly" notification.
- Runtime start failures (missing script, root without index.html, never
  reports an address, reports 0.0.0.0) are covered with real processes in
  `tests/launch.test.ts`; each is FAILED with its reason.
- No case produced a RUNNING state or a runtime record.

## Project isolation (browser, real)

Alpha `:60812` and Beta `:52281` ran at once as separate processes. Each
served its own title and bundle and none of the other's marker. STOP on
Alpha: Alpha refused, its process gone. Beta still returned 200 and was
still RUNNING. Switching projects shows each project's own state and
history only.

## Tests

`tests/launch.test.ts`: 18 cases covering the 22 required areas. Every
launch is a real Node process serving a real esbuild artifact built by the
real ForgeService, checked over real HTTP (raw, un-normalised paths for
traversal). The spawner is wrapped, never replaced, to capture the exact
executable and arguments and every pid. The suite ends by proving every
process it started (17) has exited.

Characterization updates to existing tests:
- `workspace`: ninth window; the tile/fallback counts were recomputed from
  the real geometry (256 / 46 / 37 / 0); two cases close Launch to keep
  testing Tile rather than its fallback.
- `diagnostics`, `diagnostics-ui`, `architecture`: four planned services,
  not five.
- `project`: the empty launch slot has `runs`.
- `forge`: schema ≥ 7.

## Verification

- `npm test` / `npm run verify`: 22 suites, 478 cases, all passing.
- `npm run build`: passing (`/api/launch` dynamic route). The only warning
  is the pre-existing stray `C:\Users\acer\package-lock.json` workspace-root
  warning.
- `git diff --check`: clean. No secrets, `.env`, artifacts, runtime output
  or temp directories in the tree.

## Diagnostics

The Launch row is real now. It reads only what the server last reported to
`useLaunchStore`: `unknown` until observed, `LAUNCH: STOPPED`,
`LAUNCH: RUNNING <project> :<port>`, `LAUNCH: FAILED — <reason>`
(degraded), offline or unavailable. A `launch.deployment` check stays
not-implemented (M28). The registry's M28 milestone is unchanged.

## Known Issues (P2/P3)

- P2: No in-OS browser window exists, so OPEN is a real link. In a normal
  browser it opens a new tab; the Claude browser pane navigated the same tab.
- P2: Forge still prunes to 5 artifacts per project with no knowledge of
  Launch. A running build that gets pruned ends as FAILED ("removed from
  disk") on its next request rather than being protected.
- P2: While no Launch window is open nothing polls, so Diagnostics shows
  the last server report (with its observation time in the check detail)
  or `unknown`.
- P2: The source files for the acceptance projects were put into the
  workspace through the filesystem's own `applyFileWrites` (the operation
  the AI's Apply uses) from the browser console, because the local AI
  (Ollama) was not running and Explorer has no "new file" command. Every
  step after that (Forge, Launch, Open, Stop, isolation) used the real UI.
- P3: STARTING is shown while the start request is in flight. The
  server's own `starting` phase exists but is not streamed.
- P3: A force-killed process on Windows reports exit code 4294967295
  (TerminateProcess's −1, unsigned); it is shown as-is.
- P3: A duplicated project keeps the source's `launch` memory record (as
  it already keeps the `build` record), pointing at a run it does not have.
- P3: The System Status widget and bottom bar still say
  "BUILD: NOT IMPLEMENTED" (pre-existing, MVP-07).
- Deferred as instructed: Live, deployment, public URLs, containers, remote
  runtimes.

## Git

Branch `main`, one commit, author `anirva09 <anirvavjit2023@gmail.com>`,
not pushed.
