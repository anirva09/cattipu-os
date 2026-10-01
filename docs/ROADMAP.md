# CATTIPU OS — Roadmap

Sprint-by-sprint detail, scope and "done when" for everything below live in
[`docs/HANDOFF.md`](HANDOFF.md) §7–8. This page is the overview.

## Shipped

### v0.9 — Living Desktop foundation

* [x] Boot sequence, restored and verified frame by frame
* [x] v0.9 shell locked to the Golden Master render
* [x] Window manager: snap, cascade, tile, exact restore
* [x] Living Desktop: objects with identity, grid position, persistence
* [x] File Explorer: one filesystem, two views
* [x] Living Projects: progress and status derived, never stored
* [x] Ten project templates with a full project identity
* [x] Notification Center, diagnostics, Wallpaper Studio, PixelForge icons
* [x] Responsive lock at 1366×768, 1440×900, 1600×900, 1920×1080

### MVP-01 → MVP-09 — the working pipeline (local)

* [x] MVP-01 Project creation and persistence
* [x] MVP-02/03 Project workspaces; Architect → Canvas
* [x] MVP-04 Project-scoped AI gateway (Ollama, Claude)
* [x] MVP-05 Project Memory: records, prompts, conversations
* [x] MVP-06 AI proposes files; Explorer edits them
* [x] MVP-07 Forge: real builds and artifacts
* [x] MVP-08 Launch: built apps run locally on 127.0.0.1
* [x] MVP-09 Floating widgets with working controls

## Next — the finished MVP (one sprint per session, in order)

* [ ] **Q · MVP-10** AI that answers like ChatGPT: streaming, no output cap,
      model picker, Claude verified
* [ ] **R · MVP-11** Projects saved on disk, not just the browser
* [ ] **S · MVP-12** Idea → plan: AI requirements interview into Architect
* [ ] **T · MVP-13** Real apps: React + TypeScript, safe npm packages
* [ ] **U · MVP-14** The AI builds, fixes and runs the app (agent loop + preview)
* [ ] **V · MVP-15** Guided Create flow for first-time users
* [ ] **W · MVP-16** Consistency sweep: fonts, responsive, truthful labels
* [ ] **X · MVP-17** Showcase-ready: demo projects, export, README, demo script

## After the MVP

### Native Windows application

* [ ] Tauri shell: native window, tray, Windows notifications
* [ ] Projects in a real folder on disk behind the existing `OsObject` model
* [ ] Native process management for Forge and Launch
* [ ] Installer and auto-update

### LLMs

* [ ] Provider adapters for Claude, OpenAI, Gemini and local models
* [ ] Project Memory as the shared context every model reads
* [ ] Multi-step agent work with explicit permissions

### Live and ecosystem

* [ ] Live: deploy, logs and runtime inspection behind Launch ownership
* [ ] Extensions and a marketplace (templates, blueprints, icon packs)
* [ ] Collaboration
