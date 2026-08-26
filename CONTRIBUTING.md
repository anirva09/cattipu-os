\# Contributing to CATTIPU OS



Thanks for considering a contribution. A few things to know before opening a pull request.



\## Before you start



\- Read `docs/FOUNDER\_VISION.md` first — it's the permanent constitution for this project. A

&#x20; change that turns CATTIPU into a generic dashboard, a Windows clone, or that imitates the

&#x20; locked visual identity won't be merged regardless of code quality.

\- Check `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` for context on how the codebase is

&#x20; structured and why past choices were made.

\- For anything nontrivial, open an issue first to discuss the approach before writing code.



\## Workflow



1\. Fork the repo and clone your fork.

2\. Create a branch off `main`: `git checkout -b your-change-name`.

3\. Make your change, kept scoped — one logical change per pull request.

4\. Run `npm run build` and `npm run lint` locally; both must pass clean.

5\. Commit with a short, conventional-style message (`feat: ...`, `fix: ...`, `chore: ...`,

&#x20;  `docs: ...`) — see the existing commit history for examples.

6\. Push to your fork and open a pull request against `main`.



\## What won't be merged



\- Anything that redesigns the shell's visual identity (locked as of v0.2.5) — colors,

&#x20; typography tokens, the depth-system primitives, or motion timing.

\- Anything that recreates, redraws, distorts, or substitutes the CATTIPU logo — see

&#x20; `assets/brand/README.md`, the single source of truth for brand assets.

\- New apps or stores that duplicate something an existing store or component already does.

&#x20; Extend, don't reinvent — see `docs/DECISIONS.md`.



\## Code style



\- TypeScript, the existing Zustand store patterns, Tailwind utility classes — match what's

&#x20; already there rather than introducing a new pattern.

\- Reuse the existing depth-system primitives (`.cattipu-raised`, `.cattipu-recessed`,

&#x20; `.cattipu-badge`, etc. in `app/globals.css`) instead of writing new bespoke CSS for chrome.



\## License



By contributing, you agree your contribution is licensed under this project's MIT license (see

`LICENSE`). The CATTIPU name and logo are not covered by that license — see the note in the

main `README.md`.

