# CATTIPU OS — Roadmap

## Shipped — v0.9, Living Desktop foundation

* [x] Boot sequence, restored and verified frame by frame
* [x] v0.9 shell locked to the Golden Master render
* [x] Window manager — snap, cascade, tile, exact restore
* [x] Living Desktop — objects with identity, grid position, persistence
* [x] Real File Explorer — one filesystem, two views
* [x] Living Projects — progress and status derived, never stored
* [x] Ten project templates with a full project identity
* [x] Live clock, intelligent naming, dynamic workspace title
* [x] Responsive lock at 1366×768, 1440×900, 1600×900, 1920×1080
* [x] Professional repository structure and a launch-ready README

---

## Next — v1.0

### Finish the shell

The two pieces that are built but not mounted. Both are wiring, not
design.

* [ ] Mount the Notification Centre in the v0.9 shell
* [ ] Mount the command palette and give it a keyboard entry point
* [ ] Paint the wallpaper the Settings picker already writes

### AI Workspace

The pipeline the templates were built to feed. `lib/os/extensions.ts`
holds the contract.

* [ ] Architect — real LLM generation into the `architect` slot
* [ ] Canvas — screens derived from Architect features
* [ ] Forge — source files derived from Architect services
* [ ] Memory — indexing artifacts by reference, never by copied name

The rule every stage inherits: **write artifacts, never status.** Progress
and build state are computed from the slots and have no setters, so a
stage that records a build makes a project "Building" as a consequence.

### Persistence

* [ ] Authentication
* [ ] Project storage beyond `localStorage`
* [ ] GitHub integration

---

## Later

### Launch

* [ ] Deployment providers behind the `DeploymentProvider` seam
* [ ] Vercel, Docker, Railway

### Extensibility

* [ ] Plugins — apps, generators and providers, contributed at render
      time rather than copied into a registry at install time
* [ ] Wallpaper and cursor-theme packs

### Desktop

* [ ] Tauri shell
* [ ] Native filesystem behind the existing `OsObject` model
* [ ] System notifications
