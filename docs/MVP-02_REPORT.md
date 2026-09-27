# CATTIPU OS — MVP-02 Report

## Objective

Project Filesystem + Tree Integration: the active Project decides which
filesystem workspace Explorer's tree shows; the filesystem decides what the
workspace holds.

## Baseline

- Branch `main`, one local commit ahead of `origin/main` (`b4f3c5a`, MVP-01).
- Working tree held uncommitted MVP-02 groundwork (`workspaceForProject`,
  `isInWorkspace`, persisted `selectedObjectId`, filesystem store v4).
- `npm run verify` passed before any change.

## Audit Findings

- Explorer's `FolderTree` is the filesystem tree; the Projects window tree is
  a frozen project list and was not touched.
- The Projects window and template flows already provisioned a workspace
  folder, but creation was not idempotent and the record rules lived in the
  store.
- Explorer's tree ignored the active project, always listed the whole OS,
  and labelled workspace folders with the stored fallback instead of the
  project's live name. Its location was window-local and lost on reload.

## Canonical Ownership

| Concern | Owner |
| --- | --- |
| Project identity, active project | `useProjectStore` (`lastOpenedAt`, unchanged) |
| Workspace records, tree selection | `useFilesystemStore` |
| Project → workspace rules | `lib/services/filesystem/projectWorkspaceService.ts` |
| Contract | `lib/contracts/filesystem.ts` |

## Changes

- `lib/contracts/filesystem.ts` — `ProjectWorkspaceState`
  (`no-project` / `missing` / `ready`) and the service contract.
- `lib/services/filesystem/projectWorkspaceService.ts` — `provision`
  (idempotent, one workspace per project), `resolve`, `reconcileSelection`.
- `store/useFilesystemStore.ts` — `createProjectWorkspace` delegates to the
  service; `selectedObjectId` persisted (v4 migration), refused for unknown
  ids and cleared when its subtree is removed.
- `lib/os/filesystem.ts` — `workspaceForProject`, `isInWorkspace`.
- `components/Explorer/ExplorerApp.tsx` — tree rooted at the active
  project's workspace (whole OS when nothing is open; an explicit
  "has no workspace" line when the project has none); location read from
  and written to the filesystem selection; switching projects moves Explorer
  into the new workspace (or the OS root when there is none); tree and
  breadcrumbs use live project names. Tree derivation extracted into
  `explorerTreeNodes` / `explorerTreeSelection`.
- `components/Explorer/ExplorerApp.css` — inset for the no-workspace line.
- `tests/projectWorkspace.test.ts` (20 cases), registered in `npm test`.

## Architecture Impact

Selecting a project never writes filesystem objects; a missing workspace is
reported, not repaired. No project data moved into the filesystem store and
no filesystem data into the project store.

## Visual Preservation

No frozen component, token, icon or shell geometry changed. The only CSS is
one token-based margin for the new empty-state line.

## Data / Migration Impact

`cattipu-desktop` v3 → v4 adds `selectedObjectId`; objects are preserved, a
selection naming a missing object is dropped. Tested for v3 and malformed
input.

## Verification

- `npm run verify` — typecheck, lint, 16 suites: pass.
- `npm run build` — pass.
- `git diff --check` — pass.
- Browser (dev, 1440×900): created two projects, the tree followed each;
  switching via the Projects tree switched Explorer; a seed project showed
  "has no workspace" with the grid at the OS root; a folder created in the
  workspace appeared in the tree and not on the desktop; reload restored the
  active project, workspace and nested selection. No console errors.

## Known Issues

- P2 — after a reload the browser tab title reads `CATTIPU OS` while the top
  bar shows the restored project (MVP-01 title effect; out of scope).
- P3 — projects created by Architect or by Duplicate get no workspace (shown
  as "has no workspace"); provisioning them belongs with MVP-03.
- P3 — Explorer's search `location` text and Move To menu still print stored
  folder labels rather than live project names for workspace folders.
- P3 — Next.js warns about a second lockfile at `C:\Users\acer\package-lock.json`.

## Next Milestone

MVP-03 — Architect → Canvas. Not started by this sprint.
