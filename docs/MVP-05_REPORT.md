# CATTIPU OS — MVP-05 Report

## Objective

Project Memory + Prompt System: AI context belongs to the Project. Each
project keeps persistent memory records, prompts and AI conversations; the
server assembles project-aware provider context from them; nothing leaks
between projects; everything survives a reload.

## Baseline

- `main` at `41038c1` (MVP-04), clean tree, level with `origin/main`.
- `npm run verify` passing (18 suites, 400 cases).
- MVP-01–04 audit: no P0/P1 regressions found in code or in the browser run
  (project creation, tree selection, Architect → Canvas/AI Console, local
  Ollama answers).
- Audit findings: `CattipuProject.memory` (schema v5) already existed as a
  typed slot (`records`, `decisions`, `relationships`, `conflicts`) written
  by nothing live; a Memory window existed as a `PlaceholderApp`; MVP-04 AI
  conversations lived only in `useAIStore` memory; both adapters built the
  system prompt themselves.

## Canonical Ownership

| Concern | Owner | Stored in |
| --- | --- | --- |
| Memory records, prompts, conversations | Project (`useProjectStore`) | `project.memory`, key `cattipu-projects` (v6) |
| What a valid memory change is | `memoryService`, `promptService` | — (pure) |
| Which memory an AI request carries | `memoryService.contextFor` (browser) | request data |
| Provider context (system / prompt / memory text) | `contextAssembly` (server, via `AIGateway`) | — |
| In-flight status, last error | `useAIStore` | not persisted |

No new store and no new persistence key. Memory references Architect,
Canvas and files by `ArtifactRef` only; nothing is copied from them.

## Changes

- `lib/contracts/memory.ts` — record kinds, limits, `ProjectMemoryContext`
  (the request payload), `MemoryService`, `PromptService`.
- `lib/project/types.ts` — schema v6: `MemoryRecord.kind/updatedAt`,
  `ProjectPrompt`, `ProjectConversation`, `memory.prompts/activePromptId/
  conversations`. `lib/project/migrate.ts` — deterministic v5 → v6
  (records kept as `context`; prompts and conversations re-owned by their
  containing project; malformed entries dropped).
- `lib/services/memory/memoryService.ts`, `promptService.ts` — pure rules.
- `store/useProjectStore.ts` — memory verbs through one helper that writes
  only the named project; `duplicateProject` re-owns memory and does not
  copy conversations.
- `lib/contracts/ai.ts` — `AIRequest.memory`, `AIContextBlock`,
  `AIProviderRequest.context`. `lib/services/ai/contextAssembly.ts` —
  validates memory against the request's project (mismatch → 400) and
  assembles `system`, `project-prompt`, `project-memory` blocks.
  `aiGateway.ts` wires both. Ollama sends one system message per block;
  Claude one system text block per block.
- `store/useAIStore.ts` — turns filed in project memory; only session state
  kept here. `components/AIConsole` — reads the persisted conversation;
  status strip shows `MEMORY nn · PROMPT name`.
- `components/Memory/MemoryApp.tsx/.css` — the existing Memory window now
  shows and edits the active project's prompts and records.
- `lib/services/diagnostics/diagnosticsService.ts` — the memory row's text
  corrected; status unchanged (M24 remains planned).
- Tests: `tests/memory.test.ts` (23 cases); `tests/ai.test.ts` store cases
  moved onto project memory; schema-shape assertions updated.

## Verification

- `npm test`, `npm run verify`: 19 suites, 423 cases, all passing.
- `npm run build`: passing.
- Browser (dev server, local Ollama `qwen2.5-coder:1.5b`, 1366×768): created
  Alpha and Beta; added distinct memory and prompts; real AI answers used
  each project's own memory and prompt ("ALPHA: BLUE-HERON / Go", "BETA
  CODENAME: RED-FALCON / Kotlin"); the captured request body carried only
  that project's structured memory; a mismatched request was refused (400);
  after a reload both projects restored their own memory, prompt and
  conversation, and switching showed zero cross-project content. Existing
  persisted v4/v5 projects migrated to v6 without loss.

## Known Issues (out of scope)

- Per-project `version` fields keep their old number after migration (the
  store version is authoritative); pre-existing behaviour.
- Conversations are unbounded in storage (requests send the latest 40
  turns); localStorage size is the eventual limit.
- `PlaceholderApp` no longer has a live consumer.
- Deferred as instructed: Vercel production provider, tab title, React Flow
  warning and zoom controls, rail highlight, local model latency, Architect
  AI generation.

## Git

- Branch `main`, one commit, author `anirva09 <anirvavjit2023@gmail.com>`,
  not pushed.
