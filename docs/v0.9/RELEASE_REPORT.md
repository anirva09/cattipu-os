# CATTIPU OS — v0.9 MVP Release Report

**Version:** `CATTIPU OS v0.9 MVP Candidate`

## Release Decision

This is an **MVP candidate artifact bundle, not yet a public-deployment build**. It packages the latest finalized production artifacts available in this conversation without redesigning, regenerating, or silently fabricating absent deliverables.

## Included Files

- `RELEASE_REPORT.md`
- `components/BottomStatusBar/BottomStatusBar.css`
- `components/BottomStatusBar/BottomStatusBar.tsx`
- `components/DetailsPanel/DetailsPanel.css`
- `components/DetailsPanel/DetailsPanel.tsx`
- `components/DividerGroove/DividerGroove.css`
- `components/DividerGroove/DividerGroove.tsx`
- `components/FolderTree/FolderTree.css`
- `components/FolderTree/FolderTree.tsx`
- `components/FolderTreeItem/FolderTreeItem.css`
- `components/FolderTreeItem/FolderTreeItem.tsx`
- `components/InteractiveDesktop/InteractiveDesktop.css`
- `components/InteractiveDesktop/InteractiveDesktop.tsx`
- `components/InteractiveDesktop/index.ts`
- `components/PixelIcon/PixelIcon.ts`
- `components/PixelIcon/PixelIcon.tsx`
- `components/ProgressBar/ProgressBar.css`
- `components/ProgressBar/ProgressBar.tsx`
- `components/ProjectCard/ProjectCard.css`
- `components/ProjectCard/ProjectCard.tsx`
- `components/ProjectsWindow/ProjectsWindow.css`
- `components/ProjectsWindow/ProjectsWindow.tsx`
- `components/RightWidgetStack/RightWidgetStack.css`
- `components/RightWidgetStack/RightWidgetStack.tsx`
- `components/Sidebar/Sidebar.css`
- `components/Sidebar/Sidebar.tsx`
- `components/SidebarButton/SidebarButton.css`
- `components/SidebarButton/SidebarButton.tsx`
- `components/TopBar/TopBar.css`
- `components/TopBar/TopBar.tsx`
- `components/Window/Window.css`
- `components/Window/Window.tsx`
- `components/WindowManager/ManagedWindow.tsx`
- `components/WindowManager/WindowManager.css`
- `components/WindowManager/index.ts`
- `components/WindowManager/useWindowManager.ts`
- `components/WindowManager/windowManager.reducer.ts`
- `design-system/ICON_REGISTRY_v1.0.json`
- `design-system/ICON_REGISTRY_v1.0.md`
- `design-system/bevel.css`
- `design-system/tokens.ts`
- `docs/README.md`
- `docs/VALIDATION.txt`
- `icons/32/api-32.svg`
- `icons/32/config-32.svg`
- `icons/32/entity-32.svg`
- `icons/32/flow-32.svg`
- `icons/32/job-32.svg`
- `icons/32/screen-32.svg`
- `icons/32/script-32.svg`
- `icons/32/service-32.svg`
- `preview/BottomStatusBar.png`
- `preview/Desktop_1600x900_latest_full_render.png`
- `preview/Desktop_EngineeringPaper.png`
- `preview/LeftNavigationRail.png`
- `preview/ProjectsWindow_v1.0.png`
- `preview/SidebarButton_v1.0.png`
- `preview/Toolbox_GoldenMaster_Comparison.png`
- `preview/TopBar_v1.0.png`
- `preview/WindowChrome_v1.0.png`
- `preview/WindowManager_v1.0_FinalFrame.png`
- `preview/WindowManager_v1.0_Interaction.gif`
- `public/assets/cattipu/engineering-paper-8px.png`
- `public/assets/pixelforge/toolbox/api-32.svg`
- `public/assets/pixelforge/toolbox/config-32.svg`
- `public/assets/pixelforge/toolbox/entity-32.svg`
- `public/assets/pixelforge/toolbox/flow-32.svg`
- `public/assets/pixelforge/toolbox/job-32.svg`
- `public/assets/pixelforge/toolbox/screen-32.svg`
- `public/assets/pixelforge/toolbox/script-32.svg`
- `public/assets/pixelforge/toolbox/service-32.svg`
- `textures/engineering-paper-8px.png`

**Packaged files:** 72

## Missing Files / Infrastructure

- `design-system/VISUAL_CONSTITUTION.md` — No finalized VISUAL_CONSTITUTION.md artifact was created in this conversation.
- `docs/COMPONENT_FACTORY.md` — No finalized COMPONENT_FACTORY.md artifact was created.
- `icons/16/*` — No finalized handcrafted 16×16 PixelForge asset set was created.
- `icons/sprite.svg` — No finalized PixelForge sprite.svg was created.
- `icons/manifest.json` — No finalized icon manifest.json was created.
- `preview/Specimen Sheet 01` — No finalized artifact explicitly approved as PixelForge Specimen Sheet 01 exists.
- `fonts/*` — No finalized font pack was created/provided for release packaging.
- `tools/ComponentForge` — ComponentForge was referenced as desired infrastructure but no finalized production artifact was created.
- `storybook/*` — No finalized Storybook configuration/stories were created.
- `regression/*` — No finalized Regression Harness artifact was created.
- `sandbox/*` — No finalized Sandbox Bench artifact was created.
- `package.json` — No finalized package.json exists in the conversation artifacts.
- `tsconfig.json` — No finalized tsconfig.json exists in the conversation artifacts.
- `next.config.ts` — No finalized next.config.ts exists in the conversation artifacts.
- `pnpm-lock.yaml` — No pnpm lockfile exists in the conversation artifacts.

## Locked Components

- Window Chrome v1.0 — Window.tsx / Window.css — 920×612 reference chrome
- Sidebar Button v1.0 — SidebarButton.tsx / SidebarButton.css
- Top Bar v1.0 — TopBar.tsx / TopBar.css
- Left Navigation Rail — Sidebar.tsx / Sidebar.css
- Projects Window v1.0 — ProjectsWindow plus FolderTree, FolderTreeItem, ProjectCard, ProgressBar, DetailsPanel, DividerGroove
- Right Widget Pack / Toolbox — final Golden Master RightWidgetStack + PixelIcon integration + eight 32×32 Toolbox SVG assets
- Bottom Status Bar — BottomStatusBar.tsx / BottomStatusBar.css
- Window Manager v1.0 — ManagedWindow, reducer, session hook, stacking/controls behavior
- Interactive Desktop — latest finalized behavior TSX + engineering-paper CSS

### Toolbox Packaging Note

`components/Toolbox/` is intentionally empty because no standalone `Toolbox.tsx` was finalized. The approved Toolbox remains embedded in `components/RightWidgetStack/RightWidgetStack.tsx` and renders through `components/PixelIcon`. Moving or refactoring that implementation during release packaging would violate the no-redesign/no-refactor rule.

### Runtime Asset Mirrors

The eight approved 32×32 Toolbox SVGs are copied byte-for-byte to both `icons/32/` and `public/assets/pixelforge/toolbox/`. The second path preserves the immutable finalized `PixelIcon.ts` imports. The engineering-paper texture is likewise mirrored under `textures/` and `public/assets/cattipu/` so the finalized CSS URL remains valid.

### Preview Currency

`preview/Desktop_1600x900_latest_full_render.png` is the latest available finalized 1600×900 full-desktop render. A later icon-only Golden Master pass finalized the Toolbox artwork but produced only `preview/Toolbox_GoldenMaster_Comparison.png`, so no newer full-desktop screenshot exists to package without generating a new artifact.

## Remaining MVP Tasks Before Public Deployment

- Create and approve VISUAL_CONSTITUTION.md.
- Manufacture and approve the handcrafted 16×16 PixelForge icon masters defined by ICON_REGISTRY v1.0.
- Create the canonical PixelForge sprite.svg and icons/manifest.json.
- Produce/approve PixelForge Specimen Sheet 01 using the final approved icon masters.
- Capture a new full 1600×900 desktop screenshot after the final Golden Master Toolbox icon pass; the latest available full-desktop render predates that final icon-only pass.
- Finalize the font pack or define a deployment-safe font-loading strategy.
- Build and finalize ComponentForge and COMPONENT_FACTORY.md.
- Build the Storybook production catalog.
- Build the visual Regression Harness.
- Build the Sandbox Bench.
- Create the real application package.json, tsconfig.json, next.config.ts, and pnpm-lock.yaml, then run a clean install/build.
- Run end-to-end browser QA on drag/focus/minimize/maximize/restore/session persistence against the assembled production app.
- Resolve release-time SVG module handling for the imported PixelForge SVGs in the final Next.js build configuration.

## Final Folder Tree

```text
CATTIPU_OS_v0.9_MVP/
├── components/
│   ├── BottomStatusBar/
│   │   ├── BottomStatusBar.css
│   │   └── BottomStatusBar.tsx
│   ├── DetailsPanel/
│   │   ├── DetailsPanel.css
│   │   └── DetailsPanel.tsx
│   ├── DividerGroove/
│   │   ├── DividerGroove.css
│   │   └── DividerGroove.tsx
│   ├── FolderTree/
│   │   ├── FolderTree.css
│   │   └── FolderTree.tsx
│   ├── FolderTreeItem/
│   │   ├── FolderTreeItem.css
│   │   └── FolderTreeItem.tsx
│   ├── InteractiveDesktop/
│   │   ├── index.ts
│   │   ├── InteractiveDesktop.css
│   │   └── InteractiveDesktop.tsx
│   ├── PixelIcon/
│   │   ├── PixelIcon.ts
│   │   └── PixelIcon.tsx
│   ├── ProgressBar/
│   │   ├── ProgressBar.css
│   │   └── ProgressBar.tsx
│   ├── ProjectCard/
│   │   ├── ProjectCard.css
│   │   └── ProjectCard.tsx
│   ├── ProjectsWindow/
│   │   ├── ProjectsWindow.css
│   │   └── ProjectsWindow.tsx
│   ├── RightWidgetStack/
│   │   ├── RightWidgetStack.css
│   │   └── RightWidgetStack.tsx
│   ├── Sidebar/
│   │   ├── Sidebar.css
│   │   └── Sidebar.tsx
│   ├── SidebarButton/
│   │   ├── SidebarButton.css
│   │   └── SidebarButton.tsx
│   ├── Toolbox/
│   ├── TopBar/
│   │   ├── TopBar.css
│   │   └── TopBar.tsx
│   ├── Window/
│   │   ├── Window.css
│   │   └── Window.tsx
│   └── WindowManager/
│       ├── index.ts
│       ├── ManagedWindow.tsx
│       ├── useWindowManager.ts
│       ├── WindowManager.css
│       └── windowManager.reducer.ts
├── design-system/
│   ├── bevel.css
│   ├── ICON_REGISTRY_v1.0.json
│   ├── ICON_REGISTRY_v1.0.md
│   └── tokens.ts
├── docs/
│   ├── README.md
│   └── VALIDATION.txt
├── fonts/
├── icons/
│   ├── 16/
│   └── 32/
│       ├── api-32.svg
│       ├── config-32.svg
│       ├── entity-32.svg
│       ├── flow-32.svg
│       ├── job-32.svg
│       ├── screen-32.svg
│       ├── script-32.svg
│       └── service-32.svg
├── preview/
│   ├── BottomStatusBar.png
│   ├── Desktop_1600x900_latest_full_render.png
│   ├── Desktop_EngineeringPaper.png
│   ├── LeftNavigationRail.png
│   ├── ProjectsWindow_v1.0.png
│   ├── SidebarButton_v1.0.png
│   ├── Toolbox_GoldenMaster_Comparison.png
│   ├── TopBar_v1.0.png
│   ├── WindowChrome_v1.0.png
│   ├── WindowManager_v1.0_FinalFrame.png
│   └── WindowManager_v1.0_Interaction.gif
├── public/
│   └── assets/
│       ├── cattipu/
│       │   └── engineering-paper-8px.png
│       └── pixelforge/
│           └── toolbox/
│               ├── api-32.svg
│               ├── config-32.svg
│               ├── entity-32.svg
│               ├── flow-32.svg
│               ├── job-32.svg
│               ├── screen-32.svg
│               ├── script-32.svg
│               └── service-32.svg
├── regression/
├── sandbox/
├── storybook/
├── textures/
│   └── engineering-paper-8px.png
├── tools/
└── RELEASE_REPORT.md
```

## Integrity

Release packaging copied selected finalized source files byte-for-byte. No component source, design token, icon SVG, or texture was rewritten during packaging.

### SHA-256 — immutable packaged artifacts

```text
bf5e755c4afbfa7259536e75435c6754d043da88043c518a6c53a22019b02482  components/BottomStatusBar/BottomStatusBar.css
8b24b1c43366e0a94aa9de69310737692e92eeed208cbd3ef1ba49a3a188357f  components/BottomStatusBar/BottomStatusBar.tsx
4a28c536e7ea1451878f71488f49208f5f9c77f1df6112d854c6aedb44aade6b  components/DetailsPanel/DetailsPanel.css
798b8ccc5fbbdf713f3b9f52d71c5c5e4ec4e18e8da2fc3a654fd4aec1af3af0  components/DetailsPanel/DetailsPanel.tsx
592bf8f4a7616f1226ce9bf3b8fcbb075e7b74df0c9e0d92fad2677805e42a05  components/DividerGroove/DividerGroove.css
12275ac2d3332b6a79d567cca4625d031314aeaf8e356f1b43c7787419d477f0  components/DividerGroove/DividerGroove.tsx
5311c0d807cea7221ced47abc49393a5eea29e95134c540a0c18e428d65f4e71  components/FolderTree/FolderTree.css
08bc2ce72d2a34720c6344e4b6aa625422fb6e37953f4c54a29770bd8f2b057f  components/FolderTree/FolderTree.tsx
a70730218803d5c332a873285f6e402315d6bda3e9b7256e1aa241c6959a2df7  components/FolderTreeItem/FolderTreeItem.css
8f1db93415e7dbf81b9e1ae4ca12dc3b9c231ca438f1a94c66155d31cb66a4f7  components/FolderTreeItem/FolderTreeItem.tsx
6a0d4e5bdb6ab7343b5c262773ab35a625f7df17f2af9fbfe30cfb6e12b19932  components/InteractiveDesktop/InteractiveDesktop.css
d8acf453b26aae4bcf68f607a4e6bcca1753109a387f6e51c59b865dd3d0120f  components/InteractiveDesktop/InteractiveDesktop.tsx
d69426ed4f52deb3f46c9dbcf6dc9fe61f1201342b9b3429bda64dd52613dc75  components/InteractiveDesktop/index.ts
c7462ab635348e92fc4266e01f2d7264ae79a3d717113321ca18bc64608cc203  components/PixelIcon/PixelIcon.ts
d7ef54a12b0016ffa3f12b67f1816426062c6fd4aba4cafec72f2b18c1e30c90  components/PixelIcon/PixelIcon.tsx
cdc2a2c118492dba216d7a80f34f3591492c40f5cd3267fa3c6304bc381c6899  components/ProgressBar/ProgressBar.css
cccf1e60c54185579b28291d10d5cd37d67806ebba158723187ddeaeb39914ea  components/ProgressBar/ProgressBar.tsx
07133373f75d410ceb7d1abd5e91e49e24c3fc9e30fc53271b6d2c9cc8eaab13  components/ProjectCard/ProjectCard.css
4a73e5294379d5cd4dad90ee467ecd409f8ae97151902f0fb32232617dbe4af1  components/ProjectCard/ProjectCard.tsx
fd0b188873358b59d89a82d88622a4e7e204345d3f3efaedfe9b15cd970cc977  components/ProjectsWindow/ProjectsWindow.css
2bbba3a2f427781b2399e33ec311a071d90f4b16829ddd9edb4d7d03d6eedb6e  components/ProjectsWindow/ProjectsWindow.tsx
7bf990e5443df3a1a60a3dc7206958af5af1e4960c95fa0be227b5e24c0ea8b1  components/RightWidgetStack/RightWidgetStack.css
13b717b0b93f8eec4e5ee527df5d700a7945fb8e17b9bf498835418b2469bbf2  components/RightWidgetStack/RightWidgetStack.tsx
daca4ac0b8cf7b685a094235e358a79b1695aeed04b60f7cbea0414d1861ed07  components/Sidebar/Sidebar.css
eefe90a7c0ba9667fa7eb4921918c58977cfa6560acb63c6ec1288056ce92693  components/Sidebar/Sidebar.tsx
18ef81ddfc14b2defd688159ad181350d6360f9cd0ef14a9f9e99567afb314ff  components/SidebarButton/SidebarButton.css
de9ee6b47b43b167065e8ce1b5ff81315158918e86171cbc1cb0299bbcac88ab  components/SidebarButton/SidebarButton.tsx
10be5e9cb6c9d04d793ebfc79294e0aae127e873a897fe25acd5f0e470f50888  components/TopBar/TopBar.css
e6c017d0c98ed9c388f2d4cac639528b9309d2ce51b3f143662a255023df8875  components/TopBar/TopBar.tsx
30520e8f1a3fb64278afd7f85a114a2bfae36731243d6224949ce5f7abb8b79a  components/Window/Window.css
16a5456f7876522d1af8477f6f8050d577bc6359163594be0fa2ba8f984babc5  components/Window/Window.tsx
7100597aeb98754a95da1ac611322f9419f49457137b7ec71fe9073423080640  components/WindowManager/ManagedWindow.tsx
f42129c8494a64f046c3963c4f046fb97bec276090456b29b8096e8ceb91f5dd  components/WindowManager/WindowManager.css
67fe577fbb497a317b0bf157bd13f95683f36c8c61d4ecf0430fc1535ac5484a  components/WindowManager/index.ts
5241be5fe8a037318127ea6d2e62a088ef685feb18d0201367ee20a96d8195c8  components/WindowManager/useWindowManager.ts
2f7e700025a57b07334092d2cbffad8601a8eb1e78a3c217dddbc8b011e5ce6e  components/WindowManager/windowManager.reducer.ts
6e4ae374f201f17ec22720f2d34f4c4fa99139d649ea8a031ad56f5210ebaa20  design-system/ICON_REGISTRY_v1.0.json
df96bed7d658295de4938fd59095e84b5619cd95d1ec647d20a289b6ef6d01c3  design-system/ICON_REGISTRY_v1.0.md
18581358eb9b36cd1d6e3aba2695fb04a9ea92542911a8f82e432321d3dd2aa3  design-system/bevel.css
1a66f2f82c9d4d3466be5e16ee4382abe837d7c42417acd4e41c84de4b936ccf  design-system/tokens.ts
2cb16d03257ea279dffce2c77dc260fd9b29db8dfd9a98b4c8a8ef1b0df5897a  docs/README.md
2a0657e47a06d5ff1cb14af7470f3bee15fd6421a680cad64dfec85316d0b6ae  docs/VALIDATION.txt
be4db6273cf6ec4372ab86871fcad7094bdd3779cc878f5108dcd87d36ffef47  icons/32/api-32.svg
10c4d8bffda1ec4485330dfd2e009eeebaf3ff234abff292b9dfead5cc4f07a0  icons/32/config-32.svg
22d50299d5070ed34c3ac2f63ab540a290cb0374e9183d467c7f0321c51028fd  icons/32/entity-32.svg
89314f60c971345a15a1fc10a1727e3cf4d005d35a857269ae612b82cb1dfcd5  icons/32/flow-32.svg
9d7ec5ce93070b795a8765943c7bc8d93cc10dc8eb0215b54691ee63a6e8372b  icons/32/job-32.svg
c311a1cab2de8ae1eaac45584032a91fb5b2f745fcedccd87a0b27df1ea057f8  icons/32/screen-32.svg
7aa152a4e1a1bc0b8e1d1b0ed984805da54000d8dfa1aa38efcf62538db27850  icons/32/script-32.svg
9def905537fd41c4055158e85a04416ed53fcccca4cf17041bccfc754bb28cb7  icons/32/service-32.svg
a0a469ee2a2128b9e57383fab56af496859d14ec4d68f23b77707fdc693d0a26  preview/BottomStatusBar.png
01e2c6fe140e7bed4eaf46309d19aa63e5e9aa01d66d4414ef06169e2b236031  preview/Desktop_1600x900_latest_full_render.png
093eb6f62b79c4baec52e1ebbea5159e5aee193476afa528c7542d60ce66e61a  preview/Desktop_EngineeringPaper.png
93d7b0520abf20a710c244a77b75399c59929b3db40df3cd707a8167a7fdd8f2  preview/LeftNavigationRail.png
ae605e27eee3b895a5828f95e5904e449e10a29298784623d0b75a9ed3f2d5a2  preview/ProjectsWindow_v1.0.png
823e55624faf9d1ab9f4925294e185604ff46b95f1390d5bd278575744067bce  preview/SidebarButton_v1.0.png
bdfa10e423fef1b291296b295a29b1c78ee29a7bfe74782c789ff1d1b3c2508d  preview/Toolbox_GoldenMaster_Comparison.png
ee66c7b735eb330b02494d1ae42eaeab2377943248eff69d2d3d317eb2eb1ad8  preview/TopBar_v1.0.png
e2e17c1fa58c38a37f13c6fc50d1ac45f0cf8a13ddbefdc2f1faabc5b0fece70  preview/WindowChrome_v1.0.png
122036c797926afbb93a4196d61fba43445adcf32888cb45c6ad261fc88a8450  preview/WindowManager_v1.0_FinalFrame.png
495ac7742305c82e094676c281abbb3c7d688918a644d77edb04b20521490753  preview/WindowManager_v1.0_Interaction.gif
6ab04eeab3fd3b5fc65e5d911a280714406fb521b12f98c40221c0e16dde5aaa  public/assets/cattipu/engineering-paper-8px.png
be4db6273cf6ec4372ab86871fcad7094bdd3779cc878f5108dcd87d36ffef47  public/assets/pixelforge/toolbox/api-32.svg
10c4d8bffda1ec4485330dfd2e009eeebaf3ff234abff292b9dfead5cc4f07a0  public/assets/pixelforge/toolbox/config-32.svg
22d50299d5070ed34c3ac2f63ab540a290cb0374e9183d467c7f0321c51028fd  public/assets/pixelforge/toolbox/entity-32.svg
89314f60c971345a15a1fc10a1727e3cf4d005d35a857269ae612b82cb1dfcd5  public/assets/pixelforge/toolbox/flow-32.svg
9d7ec5ce93070b795a8765943c7bc8d93cc10dc8eb0215b54691ee63a6e8372b  public/assets/pixelforge/toolbox/job-32.svg
c311a1cab2de8ae1eaac45584032a91fb5b2f745fcedccd87a0b27df1ea057f8  public/assets/pixelforge/toolbox/screen-32.svg
7aa152a4e1a1bc0b8e1d1b0ed984805da54000d8dfa1aa38efcf62538db27850  public/assets/pixelforge/toolbox/script-32.svg
9def905537fd41c4055158e85a04416ed53fcccca4cf17041bccfc754bb28cb7  public/assets/pixelforge/toolbox/service-32.svg
6ab04eeab3fd3b5fc65e5d911a280714406fb521b12f98c40221c0e16dde5aaa  textures/engineering-paper-8px.png
```
