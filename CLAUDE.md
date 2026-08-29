# CLAUDE.md

Before making changes, always read:

1. `docs/FOUNDER_VISION.md`
2. `docs/DESIGN_SYSTEM.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ROADMAP.md`

## Working Rules

Never:

* Redesign working UI.
* Imitate Windows.
* Create unnecessary stores.
* Introduce modern SaaS styling.

Always:

* Reuse existing components.
* Preserve the tactile CATTIPU identity.
* Touch only the requested files.
* Explain every changed file.
* Stop after the requested sprint.

## Tooling

Dependencies are installed with `npm install` — `package-lock.json` (npm-format) is the
tracked, authoritative lockfile. Scripts (`lint`, `build`, `dev`) are invoked with `pnpm run
<script>`; pnpm is fine for running scripts once `node_modules` exists, but do not run `pnpm
install` on a fresh clone — it generates a mismatched `pnpm-lock.yaml` and an incomplete
`node_modules` (missing `@eslint/eslintrc`), which breaks `pnpm lint`. Do not regenerate or
swap lockfiles casually; if `pnpm-lock.yaml` ever appears, delete it and reinstall with `npm
install`.

## Commit Style

Use Conventional Commits.

Examples:

* `feat(architect): add editable graph`
* `fix(explorer): restore persistence`
* `docs: update roadmap`
* `style(shell): refine chrome`
