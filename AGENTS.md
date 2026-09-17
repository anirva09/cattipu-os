# CATTIPU OS — Agent Instructions

Before doing anything:

1. Read `/PROJECT_CONSTITUTION.md` completely. It is the permanent
   architectural and product authority.
2. Treat current `origin/main` as the implementation baseline.
3. Read `docs/DESIGN_CONSTITUTION.md` before visual work.
4. Read `design-system/ICON_REGISTRY_v1.0.md` before icon work.
5. Follow the Git identity, audit-first, verification,
   one-sprint/one-commit, and no-AI-attribution rules.
6. Execute only the explicitly requested sprint.

Install with `npm install` (never `pnpm install`). Verify with `npm run verify`.

Commits are authored by `anirva09 <anirvavjit2023@gmail.com>` only.

See `CLAUDE.md` for the short form of the working rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
