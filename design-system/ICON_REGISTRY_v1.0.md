# CATTIPU OS — PixelForge `ICON_REGISTRY` v1.0

**Status:** Constitutional / normative  
**Owner:** CATTIPU Design Systems  
**Applies to:** Every production icon in CATTIPU OS, including future generated SVG assets  
**Master sizes:** 32×32 production master; 16×16 separately handcrafted compact master  
**Revision:** v1.0  
**Rule:** Existing approved icons are precedent. This document standardizes their manufacturing language; it does not redesign them.

> **Normative language:** **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are requirements terms. An icon that violates a MUST/MUST NOT rule is not PixelForge-compliant.

## Registry Principles

1. **Meaning before decoration.** The silhouette must communicate before color or internal detail.
2. **Manufactured, not illustrated.** Icons are physical workstation objects, modules, plates, tools, documents, devices, or topology components.
3. **Pixel-authored at target size.** 16×16 is never a naïve scale-down of 32×32.
4. **CATTIPU color grammar remains semantic.** Pigments reinforce meaning; they do not create a second visual language.
5. **IDs are permanent.** IDs are never renumbered or reused after release.

---

# Volume I — PixelForge Constitution

## I.1 Master Geometry

| Property | Permanent rule |
|---|---|
| Production master | **32×32 px** |
| Compact master | **16×16 px, handcrafted separately** |
| Coordinate system | Integer pixel coordinates only |
| Default structural outline | **2 px** at 32×32; **1 px** at 16×16 |
| Top-left highlight | **1 px** |
| Bottom-right shade | **1 px** |
| Outer silhouette safe zone | Normally x/y **2–29**; exceptional tool diagonals may touch x/y **1–30** |
| Internal-detail safe zone | Prefer x/y **5–26** |
| Minimum connector mass | **2 px** at 32; **1 px** at 16 |
| Minimum closed negative space | **2×2 px** at 32; **1×1 px** at 16 |
| Corner language | Square / stepped; **0 px radius** |
| Anti-aliasing | Forbidden |
| Subpixel coordinates | Forbidden |
| Gradients / blur / soft shadows | Forbidden |

### I.1.1 Pixel Zones

```text
32×32 master
┌────────────────────────────────┐
│  2px breathing / exception zone│
│  ┌──────────────────────────┐  │
│  │ silhouette construction  │  │
│  │  ┌────────────────────┐  │  │
│  │  │ internal detail    │  │  │
│  │  │ priority zone      │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

The bounding box is **not** a target to fill. Optical balance outranks mathematical symmetry.

## I.2 Layer Order

Every colored object follows this manufacturing stack when applicable:

1. **Structural outline** — `#4A4538`, normally 2 px.
2. **Body pigment** — Cream, Dark Cream, or one semantic accent.
3. **Top-left highlight** — 1 px white/warm-cream edge where a physical light catch is plausible.
4. **Bottom-right shade** — 1 px `#8C826B` or `#6F6652`.
5. **Functional detail** — ports, labels, code lines, hub, screen, indicator.
6. **Semantic accent** — only if it adds meaning at 16×16.

A highlight or shade must describe **material depth**, not decoration.

## I.3 Pigment Constitution

**Maximum active body pigments per icon: 4.** The mandatory outline and manufacturing highlight/shade channels do **not** count toward the four-pigment limit.

| Code | Token | Value | Role |
|---|---|---:|---|
| `O` | Outer Frame | `#4A4538` | Mandatory structural outline |
| `C` | Cream | `#E9DFC4` | Primary chassis/body |
| `DC` | Dark Cream | `#D8C8A2` | Recessed body / secondary metal |
| `N` | Navy | `#002A73` | System semantic accent |
| `R` | Projects Red | `#A40000` | Project semantic accent / hard alert where semantically correct |
| `G` | Status Green | `#0E7A3C` | Ready/success/status accent |
| `P` | Architect Purple | `#5B1B63` | Architecture semantic accent |
| `Y` | Welcome Gold | `#C6971F` | Warm attention/accent |
| `H` | Top Highlight | `#FFFFFF` / `#F7F0D8` | 1px top-left manufactured highlight |
| `S` | Shadow | `#8C826B` / `#6F6652` | 1px bottom-right manufactured shade |

Rules:

- `O` is mandatory on any freestanding object silhouette.
- A typical icon uses **1–2 body pigments**, not all four.
- Semantic color never compensates for a weak silhouette.
- Department owner color does not imply that every icon is filled with that color.
- Red, Green, Purple, and Gold keep their locked system meanings.
- New hex values require a design-system revision, not an icon-level exception.

## I.4 Silhouette-First Philosophy

A PixelForge icon MUST remain identifiable when rendered as a **one-color dark silhouette on cream**. If it only makes sense after inner lines or accent colors appear, the silhouette is under-designed.

Priority order:

1. Primary object class.
2. Physical orientation.
3. One semantic differentiator.
4. One state/detail differentiator.
5. Decorative texture — usually omitted.

## I.5 Optical Centering

- Heavy diagonal tools MAY sit 1 px opposite their visual mass.
- Folder tabs MAY offset the apparent top center.
- Bell, rocket, microphone, and person silhouettes SHOULD center by perceived mass.
- Asymmetric icons SHOULD have equal **visual pressure**, not equal transparent margins.
- Paired icons MUST share the same optical baseline.

## I.6 Spacing and Internal Rhythm

- Use 1, 2, 4, 8 px internal rhythms.
- Primary silhouette gaps: minimum 2 px at 32.
- Parallel mechanical bands: normally 2 px mass + 1–2 px gap.
- Connector-to-node joins: no 1 px hairline necks at 32.
- Two separate objects within one icon require at least 2 px negative space unless intentionally touching.
- Small badges occupy no more than **25%** of the master area.
- Internal letters are last-resort differentiators and MUST disappear cleanly at 16×16.

## I.7 Visual Weight Classes

| Weight | Use | Approximate silhouette occupancy |
|---|---|---|
| `L` Light | Window-control primitives only | 18–30% |
| `M` Medium | Utility actions, cursor/arrow, simple controls | 30–48% |
| `H` Heavy | Default production icon | 45–62% |
| `XH` Extra Heavy | Gear, crossed tools, clusters, multi-object machinery | 55–70% |

Sidebar and Toolbox icons should normally resolve to **H**. Thin line-art is never a valid method of reducing weight.

## I.8 Readability Rules

At 32×32:
- Recognizable at 100% scale without zoom.
- Primary object readable in peripheral vision.
- Maximum 3 internal detail groups.
- No semantic feature relies on a single isolated pixel unless it is an indicator lamp.

At 16×16:
- Re-author the silhouette.
- Preserve object class + one differentiator only.
- Convert 2 px outline → 1 px outline.
- Remove highlights before removing silhouette mass.
- Remove tiny ports, texture, tertiary bands, and internal labels.
- MUST NOT be made by browser/CSS scaling from 32×32.

## I.9 Forbidden Patterns

PixelForge icons MUST NOT use gradients, blur, drop shadows, soft transparency shading, rounded modern containers, pills/circles as arbitrary backgrounds, thin SaaS line-art, sparkles as AI semantics, abstract blobs, smooth anti-aliased curves, more than four active body pigments, vendor glyphs redrawn from memory, perspective/isometric rendering, photoreal textures, emoji conventions, subpixel strokes, or automatic 32→16 downscaling.

## I.10 Permanent Approval Test

An icon passes constitutional review only if:

1. It works as a dark silhouette.
2. It is recognizable at 16×16.
3. Its outline mass matches neighboring approved icons.
4. Its highlight/shade describes physical material.
5. Its pigments obey semantic grammar.
6. Its optical center feels stable.
7. It reuses an approved visual metaphor where one exists.
8. It survives monochrome low-resolution print.

---

# Volume II — Department System

Department ownership assigns **semantic responsibility and ID namespace**. It does not authorize new colors.

| Prefix | Owner color | Semantic meaning | Allowed accents | Typical silhouettes |
|---|---|---|---|---|
| CAT-SHELL | Navy / System | Desktop shell, launch surfaces, global navigation | Cream, Dark Cream, Navy; Gold only for attention; Green only for status | house, rocket, magnifier, bell, terminal |
| CAT-PROJ | Red / Projects | Project identity, project lifecycle, project containers | Cream, Dark Cream, Red, Gold; Green only for status | folders, project boxes, archive containers |
| CAT-WIN | Navy / System | Window mechanics and chrome behavior | Cream, Dark Cream, Navy; Red only for close/destructive variants | bars, frames, pins, locks, resize corners |
| CAT-ARCH | Purple / Architect | Architecture modeling, services, topology | Cream, Dark Cream, Purple, Navy, Gold; Green for healthy runtime states | nodes, ports, modules, CRTs, storage devices |
| CAT-CANVAS | Navy / System | Drawing and spatial-editing tools | Cream, Dark Cream, Navy, Gold; Red/Green only when semantically necessary | cursor, pencil, frames, rulers, magnets, layers |
| CAT-FORGE | Navy / System | Build, test, deploy, source, automation | Cream, Dark Cream, Navy, Gold; Green success; Red failure/destructive | tools, gears, crates, pipelines, documents |
| CAT-MEM | Navy / System | Memory, indexing, recall, persistence | Cream, Dark Cream, Navy; Green for indexed/ready | chips, cartridges, card files, memory blocks |
| CAT-EXP | Navy / System | Filesystem and asset navigation | Cream, Dark Cream, Navy, Gold; Green/Red for transfer/delete states | folders, files, boxes, media carriers |
| CAT-AI | Navy / System | AI workspace actions and agent machinery | Cream, Dark Cream, Navy; Purple only for agent/architecture adjacency; Gold for attention | robot heads, index cards, machines, sensors |
| CAT-UTIL | Navy / System | Cross-system utility and status actions | Cream, Dark Cream, Navy; Green success; Red error; Gold warning | floppy, clock, calendar, speaker, switches |
| CAT-STATUS | Green / Status | Reserved for dedicated status-only icons | Cream, Dark Cream, Green; Red/Gold for severity escalation | lamps, meters, checks, diagnostic indicators |
| CAT-WELCOME | Gold / Welcome | Reserved for onboarding/welcome-only icons | Cream, Dark Cream, Gold | signage, greeting plates, starter objects |
| CAT-EXT | Navy / System | Third-party/vendor integrations; vendor marks never redefine CATTIPU geometry | Neutral CATTIPU chassis + vendor-required trademark colors only when legally/brand required | connector cartridges, branded modules, service adapters |

## II.1 ID Rules

- Core ID form: `CAT-<DEPT>-NNN`.
- Vendor/integration ID form: `CAT-EXT-<VENDOR>-NNN`.
- `NNN` is zero-padded and permanent.
- IDs are allocated monotonically inside their namespace, but gaps are allowed and encouraged for reserve blocks.
- A retired icon is marked **RETIRED**; its ID becomes a tombstone and is never reused.
- Renaming a user-facing label does not change the permanent ID.
- A semantic alias points to one existing permanent ID; it does not create duplicate artwork.
- State variants use metadata unless the silhouette itself changes materially.

---

# Volume III — Complete Icon Registry

**Frozen v1.0 production registry: 120 permanent icon IDs.**

Pigment codes are defined in Volume I. Visual weight uses `L`, `M`, `H`, `XH`.

## III.1 Desktop

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-SHELL-001 | Home | CAT-SHELL | Return to the desktop/home workspace | House with roof peak | Door cutout; one chimney pixel block | O,C,R,H,S | H | Roof owns the silhouette; body remains rectangular and squat. | Keep roof + door; remove chimney if crowded. |
| CAT-PROJ-001 | Projects | CAT-PROJ | Open project workspace | Tabbed folder | Folder tab; inner file edge | O,Y,C,H,S | H | Use the canonical thick folder body; tab reads before color. | Keep tab + rectangular body; drop inner file edge. |
| CAT-ARCH-001 | Architect | CAT-ARCH | Open architecture workspace | Connected node topology | Center hub with four attached nodes | O,P,Y,H,S | H | Match geometric node language used by architecture diagrams. | Keep center + three nodes minimum; no tiny labels. |
| CAT-CANVAS-001 | Canvas | CAT-CANVAS | Open visual canvas workspace | Framed drafting sheet | Corner registration marks; cursor corner | O,C,N,H,S | M | Frame reads as a physical drawing surface, not a modern image icon. | Keep frame + one registration mark. |
| CAT-FORGE-001 | Forge | CAT-FORGE | Open build/tooling workspace | Crossed heavy tools | Wrench jaw + screwdriver handle | O,DC,R,H,S | XH | Tools are chunky and diagonally opposed; Forge is mechanical, not magical. | Keep two crossed silhouettes; remove small jaw detail. |
| CAT-MEM-001 | Memory | CAT-MEM | Open memory/index workspace | Microchip package | Pins on four sides; green core | O,DC,G,H,S | H | Square IC silhouette with visible pins; center remains simple. | Keep square chip + four corner/side pin cues. |
| CAT-SHELL-002 | Launch | CAT-SHELL | Launch/run an application or process | Small rocket | Nose cone; exhaust block | O,C,N,R,H | H | Rocket is short and industrial, not cartoon tapered. | Keep nose + body + one exhaust pixel. |
| CAT-EXP-001 | Explorer | CAT-EXP | Open file explorer | Tabbed folder | Front lip; dark inner cavity | O,Y,C,H,S | H | Same family as project folders but more mechanical depth. | Keep tab + cavity line. |
| CAT-UTIL-001 | Settings | CAT-UTIL | Open operating-system settings | Chunky gear | Eight-ish teeth; square/round hub | O,DC,N,H,S | XH | Canonical mechanical gear; teeth are blocky, not radial hairlines. | Keep 6–8 coarse teeth + hub. |
| CAT-SHELL-003 | Search | CAT-SHELL | Search the desktop or workspace | Magnifying glass | Square-pixel lens; heavy handle | O,C,N,H,S | M | Lens must remain obvious at 16×16; avoid thin circular outline. | Use 6–8px lens mass + 2px handle. |
| CAT-SHELL-004 | Notifications | CAT-SHELL | Open alerts/notification center | Bell | Clapper; shoulder flare | O,Y,C,H,S | M | Bell uses a broad metal silhouette with a single clapper. | Keep bell body + clapper; drop rim highlight. |
| CAT-SHELL-005 | Terminal | CAT-SHELL | Open NODE/terminal | CRT terminal | Dark display; prompt block | O,DC,N,H,S | H | Physical monitor/terminal, not a floating code glyph. | Keep monitor body + dark screen + one prompt pixel. |

## III.2 Window Controls

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-WIN-001 | Minimize | CAT-WIN | Send window to minimized state | Horizontal mechanical bar | None | O,C,H,S | L | Glyph centered low in existing molded control. | Single 2px bar. |
| CAT-WIN-002 | Maximize | CAT-WIN | Fill available workspace | Square frame | Inner negative square | O,C,H,S | L | Hard square, 2px mass, no rounded corners. | Single square outline. |
| CAT-WIN-003 | Restore | CAT-WIN | Return maximized window to prior geometry | Overlapping square frames | Rear frame offset 2px | O,C,H,S | M | Front/rear frames overlap with clear depth ordering. | Use two corner brackets if full overlap crowds. |
| CAT-WIN-004 | Close | CAT-WIN | Close window | Heavy X | None | O,C,H,S | M | Two diagonal bars with equal mass; not an anti-aliased thin X. | Use four stepped pixels forming X. |
| CAT-WIN-005 | Pin | CAT-WIN | Keep window fixed/always-on-top | Pushpin | Head + vertical spike | O,C,R,H,S | M | Pin reads vertically; broad head, short spike. | Keep head + stem. |
| CAT-WIN-006 | Lock | CAT-WIN | Lock window or editing state | Padlock | Shackle + square body | O,C,Y,H,S | H | Shackle is squared/stepped, not smooth. | Keep U-shackle + body; drop keyhole. |
| CAT-WIN-007 | Resize | CAT-WIN | Resize window | Corner resize bracket | Two stepped diagonals | O,C,N,H,S | M | Corner-origin geometry, aligned to lower-right. | Use two 2px stair-step diagonals. |
| CAT-WIN-008 | Float | CAT-WIN | Detach/dock-independent window state | Window leaving frame | Small offset panel + arrow | O,C,N,H,S | M | Physical panel separation; arrow is secondary. | Keep offset panel; remove arrow at 16. |

## III.3 Architect

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-ARCH-002 | Entity | CAT-ARCH | Represent a domain/data entity | Four-way node/crosshair | Center hub + four square terminals | O,P,Y,H,S | H | Center hub dominates; connectors are 2px minimum. | Center + 3 terminals; remove inner hub accent. |
| CAT-ARCH-003 | Service | CAT-ARCH | Represent a service/microservice | Technician/person bust | Small badge/port square | O,C,Y,N,H | H | Human bust is broad and simple; no facial micro-detail. | Head + shoulders; remove badge. |
| CAT-ARCH-004 | Flow | CAT-ARCH | Represent workflow/process flow | Branching connected squares | One junction hub | O,P,G,Y,H | H | Squares and 2px connectors; direction readable without arrows. | Three nodes + one junction. |
| CAT-ARCH-005 | API | CAT-ARCH | Represent API endpoint/interface | Technical grid/table | Connection ports on edges | O,C,N,Y,H | H | Blueprint grid with side ports; avoid app-window metaphors. | 2×2 grid + two ports. |
| CAT-ARCH-006 | Screen | CAT-ARCH | Represent a UI screen/view | CRT monitor | Blue display + stand | O,DC,N,H,S | H | Physical CRT body with blue display. | Screen rectangle + stand only. |
| CAT-ARCH-007 | Database | CAT-ARCH | Represent persistent database | Stacked cylinder/drums | Two horizontal band lines | O,DC,N,H,S | H | Use stacked storage drum silhouette; no cloud/database modern glyph. | Top cap + two bands. |
| CAT-ARCH-008 | Auth | CAT-ARCH | Represent authentication/identity | Key entering lock | Key teeth + lock body | O,Y,C,H,S | H | Key and lock form one combined silhouette. | Use lock + one key tooth. |
| CAT-ARCH-009 | Queue | CAT-ARCH | Represent message/job queue | Stacked trays | Three queued blocks | O,DC,G,H,S | M | Physical inbox/tray stack, horizontal direction. | Keep two trays + one item. |
| CAT-ARCH-010 | Gateway | CAT-ARCH | Represent boundary gateway | Portal/door frame | Inbound/outbound arrows | O,DC,N,H,S | H | Mechanical portal frame; arrows secondary. | Keep frame + one directional notch. |
| CAT-ARCH-011 | Event | CAT-ARCH | Represent emitted system event | Bell/signal beacon | Two blocky signal rays | O,Y,R,H,S | M | Beacon/object first; rays must not dominate. | Keep beacon + one ray per side. |
| CAT-ARCH-012 | Cache | CAT-ARCH | Represent fast temporary storage | Small memory cartridge | Lightning notch + memory slots | O,DC,N,Y,H | H | Cartridge/block first; lightning is a cut/notch, not a modern bolt logo. | Keep cartridge + one notch. |
| CAT-ARCH-013 | Worker | CAT-ARCH | Represent background worker | Helmeted bust | Small gear badge | O,C,Y,G,H | H | Industrial worker silhouette; gear is secondary. | Bust only. |
| CAT-ARCH-014 | Cron | CAT-ARCH | Represent scheduled task | Clock with gear tooth edge | Two hands | O,DC,N,Y,H | H | Clock face is chunky; schedule semantics from hands. | Clock + two hands; remove gear edge. |
| CAT-ARCH-015 | Connector | CAT-ARCH | Represent system connector | Plug pair | Male/female pin geometry | O,DC,N,H,S | H | Physical plug connection, no chain-link metaphor. | Two plug heads + one connector line. |
| CAT-ARCH-016 | Route | CAT-ARCH | Represent routed path | Bent path with checkpoints | Two square checkpoints | O,N,Y,H,S | M | 90-degree orthogonal route, no curved navigation arrow. | One bend + two checkpoints. |
| CAT-ARCH-017 | Webhook | CAT-ARCH | Represent outbound callback | Wall jack + outgoing hook arrow | Socket ports | O,DC,N,R,H | H | Socket/port object first; callback arrow secondary. | Socket + one outgoing arrow. |
| CAT-ARCH-018 | Storage | CAT-ARCH | Represent object/file storage | Storage crate | Top lid + label plate | O,DC,Y,H,S | H | Physical crate/cabinet, not cloud bucket. | Box + lid line. |
| CAT-ARCH-019 | Function | CAT-ARCH | Represent executable function | Function block/module | Input/output pins + fx mark | O,DC,N,P,H | H | Module block with ports; mathematical mark secondary. | Block + two side pins; omit fx mark. |
| CAT-ARCH-020 | AI Agent | CAT-ARCH | Represent autonomous AI agent | Robot head/workstation | Two eyes + antenna nub | O,DC,P,N,H | H | Machine object, not sparkle/brain abstraction. | Robot head + eyes; remove antenna if needed. |
| CAT-ARCH-021 | Cluster | CAT-ARCH | Represent grouped compute nodes | Three linked machine blocks | Shared base/link | O,DC,N,G,H | XH | Three blocks must read as coordinated unit. | Three blocks, no internal details. |

## III.4 Canvas

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-CANVAS-002 | Cursor | CAT-CANVAS | Select canvas objects | Pixel arrow cursor | Short tail notch | O,C,N,H,S | M | Classic arrow with stepped diagonal edge. | Arrow silhouette only. |
| CAT-CANVAS-003 | Move | CAT-CANVAS | Move selected object | Four-way move cross | Four arrowheads | O,C,N,H,S | M | Orthogonal cross; arrowheads square/stepped. | Cross + 3 directions if crowded. |
| CAT-CANVAS-004 | Pencil | CAT-CANVAS | Draw precise lines | Wooden pencil | Dark tip + eraser block | O,Y,R,H,S | M | Diagonal pencil with chunky shaft. | Tip + shaft; omit eraser seam. |
| CAT-CANVAS-005 | Brush | CAT-CANVAS | Paint freeform marks | Brush with bristle block | Ferrule band | O,Y,R,H,S | H | Physical brush object, heavy handle. | Handle + bristle block. |
| CAT-CANVAS-006 | Rectangle | CAT-CANVAS | Draw rectangle | Square frame | Corner handle pixels | O,C,N,H,S | M | Hard rectangle frame; no rounded corners. | Frame only. |
| CAT-CANVAS-007 | Circle | CAT-CANVAS | Draw ellipse/circle | Stepped pixel circle | Center crosshair optional | O,C,N,H,S | M | Deliberately pixel-stepped perimeter. | Coarse 8-sided loop. |
| CAT-CANVAS-008 | Arrow | CAT-CANVAS | Draw connector arrow | Straight shaft + block arrowhead | Tail anchor | O,C,N,H,S | M | 2px shaft minimum; triangular/stepped head. | Shaft + head. |
| CAT-CANVAS-009 | Frame | CAT-CANVAS | Create layout frame | Corner-bracket frame | Four corner handles | O,C,N,H,S | M | Open frame with strong corners. | Four L-corners. |
| CAT-CANVAS-010 | Grid | CAT-CANVAS | Toggle drafting grid | 3×3 technical grid | One highlighted cell | O,DC,N,H,S | M | Square technical grid, not spreadsheet app chrome. | 2×2 grid. |
| CAT-CANVAS-011 | Magnet | CAT-CANVAS | Toggle snapping | Horseshoe magnet | Contrasting poles | O,R,N,H,S | H | U-shaped physical magnet. | U silhouette; no pole labels. |
| CAT-CANVAS-012 | Duplicate | CAT-CANVAS | Duplicate selection | Two offset sheets | Front highlight edge | O,C,N,H,S | M | Offset physical layers. | Two rectangles; no plus badge. |
| CAT-CANVAS-013 | Group | CAT-CANVAS | Group objects | Bounding box around shapes | Two inner blocks | O,DC,N,H,S | M | Outer bounding box is primary semantic. | Box + two inner squares. |
| CAT-CANVAS-014 | Align | CAT-CANVAS | Align objects | Vertical datum line + blocks | Three staggered blocks | O,DC,N,H,S | M | Mechanical alignment to a ruler/datum. | Datum + two blocks. |
| CAT-CANVAS-015 | Layer | CAT-CANVAS | Manage stacking layers | Three offset plates | Edge highlights | O,DC,N,H,S | H | Physical stacked sheets, parallel offsets. | Two plates. |
| CAT-CANVAS-016 | Comment | CAT-CANVAS | Attach comment | Rectangular speech panel | Square tail + text ticks | O,C,Y,H,S | M | Square callout, no rounded chat bubble. | Panel + tail; omit text ticks. |

## III.5 Forge

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-FORGE-002 | Build | CAT-FORGE | Build project | Hammer over workpiece | Workpiece/base block | O,DC,Y,H,S | XH | Hammer silhouette must dominate. | Hammer + base. |
| CAT-FORGE-003 | Compile | CAT-FORGE | Compile source | Document into gear | Arrow/transfer slot | O,C,N,DC,H | H | Source document and gear joined physically. | Document + gear half; drop arrow. |
| CAT-FORGE-004 | Package | CAT-FORGE | Create package/artifact | Shipping crate | Tape/band + label | O,Y,C,H,S | H | Box/crate, not gift icon. | Box + center band. |
| CAT-FORGE-005 | Deploy | CAT-FORGE | Deploy artifact | Rocket leaving crate | Small exhaust | O,C,N,R,H | H | Launch is deployment action; keep industrial rocket. | Rocket + base; drop crate. |
| CAT-FORGE-006 | Publish | CAT-FORGE | Publish release | Broadcast tower | Two signal bars | O,Y,N,H,S | H | Physical transmitter first. | Tower + one signal each side. |
| CAT-FORGE-007 | Test | CAT-FORGE | Run tests | Clipboard with check | Two test rows | O,C,G,H,S | H | Clipboard/document is primary; check is secondary. | Sheet + one check. |
| CAT-FORGE-008 | Debug | CAT-FORGE | Debug runtime | Bug/insect with probe | Segmented body | O,DC,R,H,S | H | Blocky bug silhouette; no cute curves. | Body + four legs. |
| CAT-FORGE-009 | Pipeline | CAT-FORGE | Build/deploy pipeline | Connected machine stations | Direction markers | O,DC,N,G,H | H | Orthogonal production-line metaphor. | Three blocks + connectors. |
| CAT-FORGE-010 | Logs | CAT-FORGE | View build logs | Continuous-feed paper | Text line blocks | O,C,N,H,S | M | Paper/log strip, not terminal alone. | Sheet + 3 lines. |
| CAT-FORGE-011 | Rollback | CAT-FORGE | Rollback release | Crate with reverse arrow | Version notch | O,Y,R,H,S | H | Artifact first; reverse action secondary. | Box + left arrow. |
| CAT-FORGE-012 | Git | CAT-FORGE | Version control | Branch graph | Three node dots/squares | O,DC,R,H,S | M | Branch topology, not vendor logo. | One branch + 3 nodes. |
| CAT-FORGE-013 | Merge | CAT-FORGE | Merge branches | Two paths into one | Merge junction | O,DC,G,H,S | M | Two-to-one junction clearly visible. | Y-junction only. |
| CAT-FORGE-014 | Commit | CAT-FORGE | Create source commit | Stamped document | Square stamp/check | O,C,G,H,S | M | Physical stamp on file. | Document + stamp block. |
| CAT-FORGE-015 | Docker | CAT-FORGE | Container packaging | Stacked container crates | Small whale-free stack | O,DC,N,H,S | H | Generic containers only; vendor logo reserved for EXT. | Two crates + base. |
| CAT-FORGE-016 | Container | CAT-FORGE | Runtime container | Metal container box | Ribbed side panels | O,DC,N,H,S | H | Shipping/runtime container, strong rectangle. | Box + two vertical ribs. |

## III.6 Explorer

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-EXP-002 | Folder | CAT-EXP | Folder object | Tabbed folder | Front lip | O,Y,C,H,S | H | Canonical folder; same tab geometry everywhere. | Tab + body. |
| CAT-EXP-003 | Open Folder | CAT-EXP | Opened folder | Folder with lowered front flap | Dark inner cavity | O,Y,C,H,S | H | Open state shown physically via flap/cavity. | Tab + cavity; simplify flap. |
| CAT-EXP-004 | File | CAT-EXP | Generic file | Document with folded corner | One metadata line | O,C,DC,H,S | M | Canonical folded-corner sheet. | Sheet + fold. |
| CAT-EXP-005 | Image | CAT-EXP | Image file | Document + mountain/photo panel | Small sun square | O,C,G,Y,H | M | File silhouette first, image cue second. | Document + one mountain notch. |
| CAT-EXP-006 | Video | CAT-EXP | Video file | Film strip/document | Play wedge optional | O,C,N,R,H | M | Film perforations imply video without modern play-button dominance. | Film strip with 2 holes. |
| CAT-EXP-007 | Audio | CAT-EXP | Audio file | Speaker/audio reel file | Two sound bars | O,C,N,Y,H | M | Physical speaker/reel cue. | Speaker + one bar. |
| CAT-EXP-008 | Code | CAT-EXP | Source-code file | Document with blue code lines | Bracket pair | O,C,N,H,S | M | Same document family as Script, fewer colors. | Document + 2 code lines. |
| CAT-EXP-009 | Archive | CAT-EXP | Archive object | Storage box | Dark lid + label | O,Y,DC,H,S | H | Physical archive box used elsewhere in desktop. | Box + lid. |
| CAT-EXP-010 | Upload | CAT-EXP | Upload file | Document + upward arrow | Arrow exits top | O,C,N,G,H | M | File remains primary. | Document + up arrow. |
| CAT-EXP-011 | Download | CAT-EXP | Download file | Document + downward arrow | Arrow enters tray | O,C,N,G,H | M | File + receiving tray. | Document + down arrow. |
| CAT-EXP-012 | Delete | CAT-EXP | Delete file/object | Waste bin | Lid + vertical ribs | O,DC,R,H,S | H | Mechanical bin, not X-only glyph. | Bin + lid. |
| CAT-EXP-013 | Favorite | CAT-EXP | Favorite item | Star badge on folder/file | Small star block | O,Y,C,H,S | M | Primary object + star; do not use heart. | Folder + coarse star. |

## III.7 AI Workspace

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-AI-001 | Generate | CAT-AI | Generate new output | Machine dispenser/robot producing sheet | Output sheet | O,DC,N,P,H | H | Creation is a machine action, not sparkle magic. | Robot/module + one sheet. |
| CAT-AI-002 | Remix | CAT-AI | Create variant from existing input | Two crossing feed paths | Output block | O,DC,P,N,H | H | Two inputs cross/mix into one machine. | Two arrows + output block. |
| CAT-AI-003 | Brainstorm | CAT-AI | Ideate options | Workbench lamp over idea cards | Three cards | O,Y,DC,N,H | H | Physical ideation board/lamp; avoid lightbulb-only cliché. | Lamp + two cards. |
| CAT-AI-004 | Analyze | CAT-AI | Inspect information | Magnifier over chart/grid | Two bars | O,C,N,G,H | M | Tool/object first, analysis secondary. | Magnifier + 2 bars. |
| CAT-AI-005 | Recall | CAT-AI | Retrieve remembered context | Card pulled from file box | Index tab | O,Y,DC,N,H | H | Physical index/retrieval metaphor. | Box + one card. |
| CAT-AI-006 | Suggest | CAT-AI | Offer recommendation | Pointer hand/tool to card | Small marker | O,C,Y,N,H | M | Recommendation shown as directed selection. | Pointer + card. |
| CAT-AI-007 | Expand | CAT-AI | Increase detail/scope | Frame expanding outward | Four corner arrows | O,C,N,H,S | M | Bounding frame primary; arrows square. | Frame + 2 diagonal arrows. |
| CAT-AI-008 | Simplify | CAT-AI | Reduce complexity | Large block collapsing to small block | Reduction arrow | O,DC,N,H,S | M | Two-state physical reduction. | Large + small block + arrow. |
| CAT-AI-009 | Compare | CAT-AI | Compare alternatives | Two side-by-side cards | Center balance/divider | O,C,N,Y,H | M | Parallel objects must be equal visual weight. | Two cards + divider. |
| CAT-AI-010 | Explain | CAT-AI | Explain selected content | Manual/page with pointer | Three text bars | O,C,N,Y,H | M | Instruction manual metaphor, not chat bubble alone. | Page + pointer notch. |
| CAT-AI-011 | Plan | CAT-AI | Create structured plan | Clipboard/checklist | Three steps | O,C,N,G,H | H | Physical plan board/checklist. | Clipboard + 2 rows. |
| CAT-AI-012 | Multi-Agent | CAT-AI | Coordinate multiple agents | Three robot heads linked | Center coordinator | O,DC,P,N,H | XH | Multiple machine heads, clear network hierarchy. | 3 heads + central link. |
| CAT-AI-013 | Voice | CAT-AI | Use voice input/output | Desk microphone | Base + grille | O,DC,N,Y,H | H | Physical microphone, not waveform-only. | Mic + stand. |
| CAT-AI-014 | Vision | CAT-AI | Use image/visual understanding | Camera/optical sensor | Lens square/circle | O,DC,N,P,H | H | Physical camera/sensor. | Body + lens. |
| CAT-AI-015 | Automation | CAT-AI | Automate repeated work | Gear driving conveyor | Small work block | O,DC,G,N,H | XH | Mechanical automation apparatus. | Gear + one output block. |
| CAT-AI-016 | Live | CAT-AI | Use live/real-time mode | Broadcast monitor with live lamp | Red indicator | O,DC,N,R,H | H | Device + explicit live indicator. | Monitor + red lamp. |
| CAT-AI-017 | Context | CAT-AI | Open/manage context | Stacked index cards | Bracket/clip | O,C,DC,N,H | H | Context is a physical stack of reference cards. | Two cards. |
| CAT-AI-018 | Memory | CAT-AI | AI memory store | Memory cartridge/index box | Green status lamp | O,DC,G,N,H | H | Separate from desktop Memory app but same storage vocabulary. | Cartridge + lamp. |

## III.8 System & Utilities

| Permanent ID | Name | Dept | Meaning | Primary silhouette | Secondary details | Pigments | Wt | 32×32 manufacturing note | 16×16 simplification |
|---|---|---|---|---|---|---|:---:|---|---|
| CAT-UTIL-002 | Save | CAT-UTIL | Save current work | Floppy disk | Label + shutter | O,DC,N,H,S | H | Physical 3.5-inch disk, deliberately period-correct. | Disk + label block. |
| CAT-UTIL-003 | Refresh | CAT-UTIL | Reload state | Two mechanical chase arrows | Center gap | O,C,N,H,S | M | Blocky arrows, not smooth circular spinner. | Two bent arrows. |
| CAT-UTIL-004 | Undo | CAT-UTIL | Undo last action | Bent left arrow | Squared elbow | O,C,N,H,S | M | Single stepped return arrow. | Arrow only. |
| CAT-UTIL-005 | Redo | CAT-UTIL | Redo last action | Bent right arrow | Squared elbow | O,C,N,H,S | M | Mirror of Undo. | Arrow only. |
| CAT-UTIL-006 | Help | CAT-UTIL | Open help/manual | Printed manual with ? | Page tabs | O,C,N,Y,H | M | Manual/book first; question mark secondary. | Book + ? block. |
| CAT-UTIL-007 | Info | CAT-UTIL | Show information | Information plate | Lowercase i block | O,DC,N,H,S | M | Physical plaque/plate, not floating circle. | Plate + i. |
| CAT-UTIL-008 | Warning | CAT-UTIL | Warning condition | Industrial hazard triangle | Exclamation block | O,Y,R,H,S | H | Hard triangular sign, stepped corners. | Triangle + !. |
| CAT-UTIL-009 | Error | CAT-UTIL | Error/failure condition | Stop plate | X/alert block | O,R,C,H,S | H | Mechanical stop sign/plate, not modern toast icon. | Square plate + X. |
| CAT-UTIL-010 | Success | CAT-UTIL | Successful condition | Status lamp with check | Green lamp | O,G,C,H,S | M | Physical indicator lamp/check. | Lamp + check. |
| CAT-UTIL-011 | Clock | CAT-UTIL | Time | Analog clock | Two hands + center pin | O,C,N,H,S | M | Stepped circular/clock case. | Case + two hands. |
| CAT-UTIL-012 | Calendar | CAT-UTIL | Date/schedule | Desk calendar | Top binder blocks | O,C,N,R,H | H | Physical calendar page. | Page + top binder + 2 cells. |
| CAT-UTIL-013 | Filter | CAT-UTIL | Filter list/data | Industrial funnel | Output chute | O,DC,N,H,S | M | Funnel/chute object, not abstract sliders. | Funnel silhouette. |
| CAT-UTIL-014 | Sort | CAT-UTIL | Sort list/data | Stacked bars with direction arrow | Three bar lengths | O,C,N,H,S | M | Bars imply ordering; one direction arrow. | 3 bars + arrow. |
| CAT-UTIL-015 | Link | CAT-UTIL | Create link/connection | Two joined chain plates | Center overlap | O,DC,N,H,S | H | Chunky chain/connector, no thin loops. | Two interlocked blocks. |
| CAT-UTIL-016 | Unlink | CAT-UTIL | Break link/connection | Separated chain plates | Break gap | O,DC,R,H,S | H | Same Link silhouette with explicit gap. | Two blocks + gap. |
| CAT-UTIL-017 | Network | CAT-UTIL | Network status/topology | Three machines connected | Central switch | O,DC,N,G,H | H | Physical devices with orthogonal connectors. | 3 blocks + 2 lines. |
| CAT-UTIL-018 | Sound | CAT-UTIL | Audio status | Speaker cabinet | Cone + two sound bars | O,DC,N,Y,H | H | Physical speaker object. | Speaker + one bar. |
| CAT-UTIL-019 | Power | CAT-UTIL | Power/session control | Rocker switch/power unit | Power mark secondary | O,DC,N,R,H | H | Physical power control, not naked circle-slash. | Switch body + notch. |
| CAT-UTIL-020 | User | CAT-UTIL | Single user/account | Person bust | Badge square | O,C,Y,N,H | H | Same bust grammar as Service, no role badge emphasis. | Head + shoulders. |
| CAT-UTIL-021 | Team | CAT-UTIL | Multiple users/team | Three busts | Rear pair offset | O,C,Y,N,H | XH | Three readable bust masses. | Two heads + shared shoulder block. |

# Volume IV — Silhouette Grammar

Silhouette grammar is the shared visual vocabulary. New icons MUST begin by choosing an approved noun shape from this volume before adding a semantic modifier.

## IV.1 Canonical Shape Rules

| Concept | Immediate recognition invariant | Approved secondary modifiers | Forbidden substitutions | 16×16 anchor |
|---|---|---|---|---|
| Folder | **Raised tab + rectangular body** | cavity, front flap, badge | rounded folder, cloud folder | tab + body |
| Document | **Portrait sheet + folded top-right corner** | code lines, image panel, status stamp | floating text lines without page | sheet + fold |
| Person | **Head + shoulder/bust mass** | helmet, badge, second/third person | circular avatar container | head + shoulders |
| Screen | **Physical CRT/frame + display** | stand, title strip, status lamp | borderless rectangle | frame + display |
| Tool | **Heavy handle + unmistakable head** | second crossed tool | thin outline tool | handle + head |
| Gear | **Coarse teeth + central hub** | small state lamp | fine radial teeth, cog emoji | 6-ish teeth + hub |
| Data/entity | **Square nodes + orthogonal connectors** | center hub, ports | bubbles connected by hairlines | 3 nodes + junction |
| API/module | **Rectangular module/grid + ports** | rows, labels | globe, generic app window | block + 2 ports |
| Storage | **Physical crate/cartridge/drum** | label plate, bands | generic cloud | container + one band |
| Network | **Multiple physical nodes + orthogonal links** | switch/router hub | curved mesh | 3 blocks + 2 links |
| Audio | **Speaker/microphone physical object** | one/two signal bars | waveform-only icon | object + one signal cue |
| AI agent | **Machine/robot/workstation object** | antenna, linked peers | sparkles, abstract brain | machine head + eyes |
| Warning | **Industrial sign/device** | !, lamp | free-floating emoji symbol | sign + mark |
| Time | **Clock/calendar physical instrument** | hands, binder | abstract timer ring | case + hands/binder |

## IV.2 Non-Production Silhouette Sketches

These sketches define **shape grammar only**. They are not production icons and MUST NOT be shipped as assets.

### Folder

<svg width="96" height="64" viewBox="0 0 48 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9h13l3-4h9l3 4h12v18H4z" fill="#4A4538"/>
  <path d="M6 11h36v14H6z" fill="#C6971F"/>
</svg>

### Document

<svg width="64" height="64" viewBox="0 0 32 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 2h14l6 6v22H6z" fill="#4A4538"/>
  <path d="M8 4h11l5 5v19H8z" fill="#E9DFC4"/>
</svg>

### CRT Screen

<svg width="72" height="64" viewBox="0 0 36 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="4" width="30" height="20" fill="#4A4538"/>
  <rect x="6" y="7" width="24" height="14" fill="#002A73"/>
  <rect x="15" y="24" width="6" height="4" fill="#4A4538"/>
  <rect x="11" y="28" width="14" height="2" fill="#4A4538"/>
</svg>

### Person

<svg width="64" height="64" viewBox="0 0 32 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <rect x="11" y="4" width="10" height="11" fill="#4A4538"/>
  <path d="M6 29v-7l5-5h10l5 5v7z" fill="#4A4538"/>
</svg>

### Data Nodes

<svg width="80" height="64" viewBox="0 0 40 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <rect x="17" y="13" width="6" height="6" fill="#4A4538"/>
  <rect x="2" y="12" width="8" height="8" fill="#4A4538"/>
  <rect x="30" y="12" width="8" height="8" fill="#4A4538"/>
  <rect x="16" y="1" width="8" height="8" fill="#4A4538"/>
  <rect x="16" y="23" width="8" height="8" fill="#4A4538"/>
  <rect x="10" y="15" width="7" height="2" fill="#4A4538"/>
  <rect x="23" y="15" width="7" height="2" fill="#4A4538"/>
  <rect x="19" y="9" width="2" height="4" fill="#4A4538"/>
  <rect x="19" y="19" width="2" height="4" fill="#4A4538"/>
</svg>

### Heavy Tool

<svg width="64" height="64" viewBox="0 0 32 32" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 4h8l4 4-4 4 16 16-4 4L8 16l-4-4z" fill="#4A4538"/>
</svg>

## IV.3 Modifier Grammar

| Modifier | PixelForge representation |
|---|---|
| Add/new | Small plus plate or outward physical motion; never green circle badge by default |
| Remove/delete | Red destructive part, bin, stop plate, or physical subtraction |
| Active/live | Small Red indicator lamp only when “live” is semantically correct |
| Ready/success | Green status lamp/check |
| Warning | Gold industrial sign/lamp |
| Locked | Physical shackle |
| Selected | UI state handled by container/bevel, not a different icon drawing |
| Open | Physical state change of noun (folder flap, door, tray), not an arbitrary arrow |
| Upload/download | Noun remains primary; vertical arrow is secondary |
| AI-enabled | Machine/agent attachment; no sparkle badge |
| External/vendor | CATTIPU adapter/module chassis may contain official vendor mark; never redraw mark |

## IV.4 Family Resemblance Test

Place a new icon beside **Home, Projects, Architect, Memory, Launch, Explorer, Settings** with labels removed. It passes only if outline mass, object-like silhouette, light direction, pigment count, and detail density belong to the same family and it does not resemble a modern icon-library import.

---

# Volume V — Manufacturing Matrix

## V.1 Complexity Classes

| Class | Typical use | Max semantic groups | Allowed internal detail | Minimum stroke/mass | Required negative space | Example |
|---|---|---:|---|---|---|---|
| `C0` Primitive | window controls | 1 | none | 2 px @32 | n/a | Minimize |
| `C1` Simple object | search, cursor, arrow | 1–2 | 0–1 detail | 2 px | 2 px between limbs | Search |
| `C2` Standard object | folder, document, screen | 2–3 | 1–2 detail groups | 2 px | 2×2 minimum cavity | Projects |
| `C3` Mechanical object | gear, crossed tools, API grid | 3 | up to 3 groups | 2 px; 3–4 px heavy handles | 2 px around hub/ports | Settings |
| `C4` Compound system | cluster, multi-agent, pipeline | 3 primary objects max | 1 detail/object | 2 px connectors | 2 px between independent objects | Multi-Agent |

**C5 does not exist.** If an icon needs more than C4 complexity, the concept must be decomposed or its semantics moved to label/context.

## V.2 Contrast Matrix

| Situation | Requirement |
|---|---|
| Cream body against cream UI | Mandatory dark outline fully encloses silhouette |
| Dark Cream body | Outline remains Outer Frame; highlight must remain visible |
| Navy/Purple/Red/Green body | Cream/white highlight allowed; outline never changes to black |
| Gold body | Dark outline mandatory; highlight kept short to avoid glare |
| Internal Navy line on Cream | Minimum 2 px if semantic at 16; otherwise omit in compact master |
| Indicator lamp | May be 1–3 px, but must be attached to a physical object |
| Adjacent semantic colors | Separate with outline or at least 1 px neutral material; never blend directly |

## V.3 Negative-Space Rules

- Closed holes: minimum **2×2 px** at 32.
- Tool jaws: minimum 2 px open gap.
- Gear hub: minimum 4×4 px at 32.
- Folder tab step: minimum 3 px horizontal run.
- Node connectors: physically meet nodes; no ambiguous 1 px floating gaps.
- Document fold: minimum 4×4 logical triangle/step at 32.
- CRT bezel: minimum 2 px shell around display.
- Compound systems: independent objects need 2 px breathing space unless a mechanical joint is intentional.

## V.4 Manufacturing Failure Cases

| Rejected construction | Why rejected | Required correction |
|---|---|---|
| 1 px outline gear at 32 | Too light; fails Settings-family comparison | Rebuild with 2 px tooth/hub mass |
| 14 tiny gear teeth | Visual noise; turns to gray at 16 | Use 6–8 coarse teeth |
| Folder without tab | Loses object-class invariant | Add tab before any detail |
| AI sparkle/star cluster | Introduces modern “magic” vocabulary | Use robot, machine, sensor, or physical output |
| Rounded app-card Screen icon | Modern dashboard metaphor | Use physical CRT/frame |
| API shown as globe | Ambiguous web/network semantic | Use technical grid/module + ports |
| Gradient blue monitor | Violates flat manufactured pigment rule | Use one flat Navy display |
| Soft shadow under document | Modern floating elevation | Use 1 px bottom/right material shade |
| 32×32 automatically scaled to 16×16 | Produces inconsistent masses | Hand-author compact master |
| Vendor logo approximated from memory | Trademark + consistency failure | Integrate official provided asset only |
| More than four body pigments | Muddy, toy-like, hard to print | Reduce to semantic essentials |
| 1 px architecture connectors at 32 | Too fragile beside sidebar icons | Increase to 2 px |
| Perfect math-centering of diagonal Forge tools | Visually off-center | Optical shift 1 px against mass |
| Tiny text inside nodes | Unreadable at target size | Remove; rely on noun silhouette |
| Colored circular badge behind every utility | Creates a second modern icon family | Remove container; render object directly |

## V.5 Acceptance Checklist

Before an SVG is admitted to the registry asset pack:

```text
[ ] Permanent ID exists
[ ] Meaning matches registry
[ ] 32×32 authored at integer coordinates
[ ] 16×16 separately authored
[ ] 2px master outline / 1px compact outline
[ ] 1px top-left highlight where material permits
[ ] 1px bottom-right shade where material permits
[ ] <= 4 active body pigments
[ ] No gradient / blur / filter / anti-aliasing
[ ] No rounded modern container
[ ] Monochrome silhouette passes
[ ] Optical centering reviewed
[ ] Neighbor test passed against canonical sidebar icons
[ ] Department owner approves
[ ] SVG contains no raster image
[ ] SVG contains no embedded font
```

---

# Volume VI — Future Expansion

## VI.1 Expansion Law

The v1.0 IDs above are frozen. Future work MUST allocate from reserved namespaces; no released ID is renumbered to create cleaner ordering.

Each future namespace receives at least 100 addresses before artwork begins.

## VI.2 Reserved Namespaces

| Domain | Reserved prefix/range | Intended concepts | Owner-color rule |
|---|---|---|---|
| Cloud | `CAT-CLOUD-001…199` | cloud account, region, VM, object store, serverless, CDN, DNS | Navy/System; Green for healthy status |
| Kubernetes | `CAT-K8S-001…099` | cluster, node, pod, service, ingress, deployment, namespace, secret | Navy/System; official vendor art only when required |
| Analytics | `CAT-ANL-001…099` | chart, metric, funnel, cohort, query, report | Navy/System; Green only for status |
| Security | `CAT-SEC-001…199` | shield, key, certificate, secret, audit, firewall, policy, scan | Navy/System; Red violation, Gold warning |
| Payments | `CAT-PAY-001…099` | card, transfer, payout, refund, invoice, settlement, terminal | Navy/System; Green success, Red failure |
| Banking | `CAT-BANK-001…199` | account, ledger, branch, vault, loan, deposit, withdrawal, reconciliation | Navy/System; Red only when project-semantic ownership applies |
| SAP | `CAT-EXT-SAP-001…099` | SAP connector/modules | CAT-EXT; official vendor mark only |
| Salesforce | `CAT-EXT-SFDC-001…099` | Salesforce connector/modules | CAT-EXT; official vendor mark only |
| MuleSoft | `CAT-EXT-MULE-001…099` | MuleSoft connector/modules | CAT-EXT; official vendor mark only |
| Kafka | `CAT-EXT-KAFKA-001…099` | topic, broker, partition, connector | CAT-EXT; official vendor mark only |
| GitHub | `CAT-EXT-GH-001…099` | repository, issue, PR, Actions adapter | CAT-EXT; official vendor mark only |
| CI/CD | `CAT-CICD-001…199` | runner, stage, artifact, environment, approval gate | Navy/System |
| AI Tools | `CAT-AITOOL-001…199` | model, prompt, tool call, eval, dataset, fine-tune, guardrail | Navy/System; Purple only for Architect-owned meaning |

## VI.3 Reserved Growth Inside Existing Departments

| Department | Current highest | Next general allocation | Strategic reserve |
|---|---:|---|---|
| CAT-SHELL | 005 | 020–199 | 006–019 reserved for core desktop expansion |
| CAT-PROJ | 001 | 020–199 | 002–019 reserved for project lifecycle |
| CAT-WIN | 008 | 020–099 | 009–019 reserved for window-manager controls |
| CAT-ARCH | 021 | 040–299 | 022–039 reserved for near-term architecture primitives |
| CAT-CANVAS | 016 | 040–199 | 017–039 reserved for editing tools |
| CAT-FORGE | 016 | 040–299 | 017–039 reserved for build/source expansion |
| CAT-MEM | 001 | 020–199 | 002–019 reserved for memory/index surfaces |
| CAT-EXP | 013 | 040–199 | 014–039 reserved for filesystem/media expansion |
| CAT-AI | 018 | 050–299 | 019–049 reserved for AI workspace near-term features |
| CAT-UTIL | 021 | 050–299 | 022–049 reserved for system utilities |
| CAT-STATUS | 000 | 001–199 | entire namespace available |
| CAT-WELCOME | 000 | 001–099 | entire namespace available |
| CAT-EXT | namespace | vendor sub-prefixes | never consume core IDs for vendors |

## VI.4 Roadmap Priority

### Phase F1 — Infrastructure
Cloud, Kubernetes, CI/CD, Security.

### Phase F2 — Enterprise Integration
GitHub, SAP, Salesforce, MuleSoft, Kafka.

### Phase F3 — Product Domains
Payments, Banking, Analytics.

### Phase F4 — AI Platform
Models, prompts, evals, datasets, tools, guardrails, orchestration.

## VI.5 Future-Manufacturing Request Template

Every request to manufacture a new PixelForge asset MUST provide:

```yaml
permanent_id: CAT-...
name: ...
department: CAT-...
meaning: ...
primary_silhouette: ...
secondary_details: ...
approved_pigments: [...]
visual_weight: H
complexity_class: C2
master_32:
  outline_px: 2
  highlight_px: 1
  shadow_px: 1
compact_16:
  separately_authored: true
  retained_semantics:
    - primary noun
    - one differentiator
forbidden:
  - gradients
  - blur
  - anti_aliasing
  - new_palette_values
```

Claude or any future manufacturing agent must treat the registry entry as the **specification source**, not infer a new style from generic icon libraries.

---

# Appendix A — Registry Governance

1. Constitutional changes require a new registry revision.
2. New icon additions that obey v1.0 do not require a constitutional revision; they require a registry minor revision.
3. Existing approved artwork is never silently cleaned up.
4. If an approved icon conflicts with this document, record it as a **legacy precedent exception** until deliberate review.
5. PixelForge source SVGs are production assets; generated previews are not source.
6. The 16×16 compact master is a first-class asset with the same permanent ID and size metadata.
7. Vendor marks come from official supplied assets only; no model may redraw them.
8. Every registry addition must pass Volume V before release.

# Appendix B — v1.0 Totals

- **120 permanent icon IDs**
- **13 department/namespace definitions**
- **8 registry categories**
- **13 future namespace blocks**
- **32×32 + handcrafted 16×16 dual-master policy**
