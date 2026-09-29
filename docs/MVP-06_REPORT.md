# CATTIPU OS — MVP-06 Report

## Objective

AI File Changes: a person asks for something ("Create a simple task list."),
the AI understands the project, proposes file changes, the filesystem writes
them as real project files, and Explorer lets the person inspect and edit
them.

```text
prompt → AI Gateway (project memory + project files as context)
       → provider answer → file proposals (read by the gateway)
       → Apply (the person) → useFilesystemStore → workspace files
       → Explorer (open · edit · save) → next prompt carries the files
```

## Baseline

- `main` at `88b2dd6` (MVP-05), clean tree, one commit ahead of
  `origin/main` (MVP-05 unpushed), no divergence.
- `npm run verify` passing (19 suites, 423 cases).
- Audit findings: the shared filesystem (`useFilesystemStore`,
  `lib/os/filesystem.ts`) was the one owner of OS objects but had only
  `folder` and `project-shortcut` kinds: no file could exist. Workspaces
  (MVP-02) already tied one root folder to each project. The AI system
  prompt stated the assistant cannot read or change files. Explorer
  browsed folders only. A PixelForge `file` mark already existed, so no icon
  work was needed. The desktop treats any non-folder as a project shortcut.

## Canonical Ownership

| Concern | Owner | Stored in |
| --- | --- | --- |
| File records and their text | Filesystem (`useFilesystemStore`) | `cattipu-desktop` (v5), `kind: "file"` |
| Path ↔ record rules, atomic writes, AI file context | `projectFileService` | none (pure) |
| Which files a request carries | `useAIStore` → `projectFileService.contextFor` | request data |
| Provider context for files | `contextAssembly` (server, via `AIGateway`) | none |
| Reading proposals out of an answer | `fileProposals` (server, via `AIGateway`) | none |
| A turn's proposal | Project Memory (the assistant turn) | `project.memory.conversations` |
| Whether a proposal is written | derived from the filesystem | not stored |
| Which file Explorer has open, unsaved text | Explorer window state | not persisted |

No new store and no new persistence key. Files belong to the project's
workspace folder. Nothing copies a file into project data, and no proposal
stores an "applied" flag: the console derives NEW / UPDATE / WRITTEN from
the filesystem on every render.

## Changes

- `lib/contracts/filesystem.ts`: `FileWrite`, `FILE_LIMITS`, preview and
  apply result types, `ProjectFilesContext`, `ProjectFileService`.
- `lib/os/filesystem.ts`: `file` kind with `content`; listing order is
  folders, files, shortcuts; `findFile`; `canMoveInto` refuses moving a
  file to the OS root (the desktop has no file surface); Explorer and search
  entries for files.
- `lib/services/filesystem/projectFileService.ts` (new): path normalisation
  (no absolute paths, `.`/`..`, or characters a label cannot carry),
  `fileAt`, `pathOf`, `preview`, all-or-nothing `apply` (creates the folders
  a path needs; edits an existing file in place so its id survives), and a
  bounded `contextFor`.
- `store/useFilesystemStore.ts`: `applyFileWrites(projectId, writes)`,
  `writeFileContent(id, text)`; a file rename must stay one path segment.
  Persist v5 records the new kind; a file record without text is dropped on
  load.
- `lib/contracts/ai.ts`: `AIRequest.files`, `project-files` context source,
  `AIResponse.fileChanges`, `AIMessage.fileChanges`.
- `lib/services/ai/contextAssembly.ts`: `parseFilesContext` (same project
  only, bounded) and one `project-files` block after memory.
- `lib/services/ai/fileProposals.ts` (new): reads `FILE: <path>` + fenced
  block from any answer's text. It handles bold or backticked headers,
  `~~~` fences and code fences nested inside Markdown. Invalid paths and
  unterminated or oversized blocks are dropped. If a path repeats, the last
  block wins.
- `lib/services/ai/aiGateway.ts`: validates `files`; attaches
  `fileChanges` to successful answers. It writes nothing.
- `lib/services/ai/systemPrompt.ts`: the file format, whole files only, and
  that nothing is written until the person applies it (replaces "cannot
  read or change this project's files").
- `store/useAIStore.ts`: requests carry the workspace's files; replies file
  their proposals with the turn; `applyProposal(projectId, messageId)` is
  the one path from a proposal to the filesystem. It reports through the
  notification store and selects the written file's folder.
- `components/AIConsole/AIConsole.tsx/.css`: a FILE CHANGES block under a
  proposing turn, with per-path status plus Apply and Show in Explorer.
  `consoleProposals` derives it.
- `components/Shell/CattipuShell.tsx`: the console receives `openWindow`
  so Show in Explorer raises Explorer through the window manager.
- `components/Explorer/ExplorerApp.tsx/.css`: file entries (PixelForge
  `file`), a file menu (Open, Rename, Move To, Delete), and an in-window file
  pane (path bar, Revert/Save/Close, inset text well, Ctrl+S, line/char
  strip, SAVED/UNSAVED). Unsaved text is kept per file while the window is
  open.
- `tests/files.test.ts` (new, 17 cases); `package.json` runs it.

Adapters (Claude, Ollama) are unchanged. They already send each context
block as its own system block, and they know nothing about files.

## Architecture Impact

- Creation pipeline: this is the filesystem half of the future Forge. Its
  generated files go into the shared Project filesystem (constitution §64,
  §72), not into an AI panel.
- §80: provider output never silently overwrites a file. Every write is a
  person pressing Apply, the console says UPDATE before it overwrites, and a
  batch is written whole or not at all.
- Providers stay interchangeable: the proposal format is plain text read by
  the gateway, not a vendor tool-calling API.

## Visual Preservation

Golden Master surfaces untouched: desktop, dock, top bar, window chrome,
boot, Projects window, FolderTree. New UI reuses the existing vocabulary:
inset wells (`cattipu-bevel--inset`), raised pressable keys, body/status
role tokens, the navy label ink, and the PixelForge `file` mark. No new
colours, fonts, radii or icons. Files never render on the desktop.

## Data / Migration Impact

- `cattipu-desktop` v4 → v5: additive. No earlier build wrote files, so
  nothing converts. A file record without string text is dropped.
  Verified on a real v4 store in the browser, and in tests.
- `cattipu-projects` stays v6: `AIMessage.fileChanges` is optional and the
  v6 migration already keeps message objects whole.

## Verification

- `npm run verify` (typecheck, lint, test): 20 suites, 440 cases, all
  passing.
- `npm run build`: passing.
- Browser (dev server, local Ollama `qwen2.5-coder:1.5b`, 1366×768):
  1. Existing persisted data from earlier sessions loaded under v5.
  2. Created project "Task Demo", sent "Create a simple task list.". The
     model answered with a `FILE:` block and the console showed
     `NEW notes/tasks.md`, Apply enabled and Show in Explorer disabled.
  3. Apply wrote the file: the row reads WRITTEN, the button reads Applied,
     and the Bell shows the success notice.
  4. Show in Explorer opened `CATTIPU OS / Task Demo / notes` with
     `tasks.md`. Opening it showed the text; an edit showed UNSAVED, and
     Ctrl+S saved it.
  5. After a reload the edit persisted. No file sits at the OS root.
  6. A follow-up prompt ("Add a task called Review notes…") got an answer
     that included the line added in Explorer, so the model read the real
     file. It proposed an UPDATE, and applying it edited the same file id.
  7. No console or server errors.

## Regressions Checked

Explorer folder navigation, tree, breadcrumbs, search, move and rename; the
desktop object layer (files cannot reach it); workspace provisioning; AI
Console send, clear, error and memory strip; project memory persistence;
all existing suites.

## Known Issues (out of scope)

- Two sibling objects can share a label (existing behaviour for folders);
  path lookup then resolves to the first in listing order.
- Re-applying an older proposal after editing the file shows UPDATE and
  would overwrite the edit. The console says so, but there is no diff view.
- A small local model tends to echo the prompt's example path
  (`notes/tasks.md`); larger models follow the request more closely.
- Files are stored in localStorage with the rest of the filesystem; the
  per-file (50,000 chars) and per-request limits bound growth, but storage
  size is the eventual limit. Files are not yet on a real disk.
- Architect/Canvas artifacts are not yet sent as AI context; builds and
  running generated code remain Forge/Live milestones.

## Git

- Branch `main`, one commit, author `anirva09 <anirvavjit2023@gmail.com>`,
  not pushed.
