# CATTIPU OS — Typography

**Status:** Milestone 12 (Constitutional Foundation Retrofit) froze six named font roles (§1) as
the authoritative system — components should reach for a role, not a raw family. §2-§4 below
remain a survey of what the code's actual arbitrary sizes/tracking/case do today; that part is
still observed fact, not a prescribed scale (see §5).

## 1. Font families and frozen roles

Two period font families, self-hosted via `@fontsource` (no external network calls), declared in
`app/globals.css`: `--font-pixel-ui` ("Press Start 2P," a true bitmap face — unreadable past a
short label) and `--font-code` ("VT323," a pixel-style monospace that stays legible at paragraph
length). Six roles map onto them; a component should use the role's utility class
(`font-menu`/`font-window-title`/`font-label`/`font-code`/`font-status`/`font-hero`), not
`font-pixel-ui`/`font-code`/a hardcoded family, so retuning a role later is a token edit:

| Role | Utility class | Maps to | Use |
|---|---|---|---|
| Menu | `font-menu` | Press Start 2P | Command Palette groups, menu/dropdown chrome |
| Window Title | `font-window-title` | Press Start 2P | Panel.tsx title-bar text (the live Window.tsx title uses the shell face, §1a) |
| Labels | `font-label` | Press Start 2P | Compact chrome labels, eyebrows, dock labels |
| Code | `font-code` | VT323 | SQL/technical/mono readouts (also `--font-mono`) |
| Status Bar | `font-status` | VT323 | Smallest readable text |
| Hero | `font-hero` | Press Start 2P | Large bitmap display, used sparingly |

`--font-body` (the ambient `<body>` default, and the pre-existing `font-body` utility class) is
now the VT323 stack — **"Inter Variable" is retired and no longer imported anywhere in the app.**
Before Milestone 12, `--font-body` pointed at "Inter Variable," a modern sans that was the
default voice for every paragraph, description, and prompt with no explicit font utility class;
that's the "modern UI typography" the constitution now forbids mixing with bitmap typography, so
it's gone. `font-pixel-ui`/`font-code` (the underlying family tokens) are still valid Tailwind
utilities and still appear at many existing call sites — Milestone 12 added the role layer on top
rather than rewriting every one of those call sites onto the new named classes (no visual
difference today; see `docs/DESIGN_CONSTITUTION.md` §5 for why that sweep was left for organic
adoption). `font-code`/`font-mono` usage stays narrow and specific:
`components/Architect/DatabasePanel.tsx`, `NodeInspector.tsx`, and `ApiCatalogPanel.tsx` — SQL
schema readouts, node property values, and API route listings. Nowhere else in the app.

## 1a. Shell face — the design-system stack (M20T1)

The v0.9 Golden Master shell does not use the role classes above. Its components — `Window`,
`Sidebar`, `SidebarButton`, `TopBar`, `RightWidgetStack`, `BottomStatusBar`, `ProjectCard`,
`DetailsPanel`, `FolderTree`, `FolderTreeItem`, `Explorer`, `ContextMenu`, `DesktopObjectLayer`,
`InteractiveDesktop` — set `font-family: var(--cattipu-font-family)`, defined in
`design-system/tokens.ts`:

```text
'Px437 IBM VGA8', 'VT323', 'Perfect DOS VGA', monospace
```

Content rendered inside a `Window` (for example Settings) inherits it. Sizes come from the same
token file (`desktopTitle` 26, `windowTitle` 18, `widgetHeader` 15, `body` 13, `status` 11) and the
component CSS.

- **Px437 IBM VGA8** is the intended face. Until M20T1 it was never shipped, so every shell
  surface fell back to VT323. It is now self-hosted from `public/fonts/Web437_IBM_VGA_8x16.woff`
  (VileR's *Ultimate Oldschool PC Font Pack* v2.2, CC BY-SA 4.0 — attribution in
  `public/fonts/README.md`). One `@font-face` in `app/globals.css` registers it under the
  token's family name. v2.x of the pack renamed "IBM VGA8" to "IBM VGA 8x16".
- Metrics: 1em = 16 font pixels; advance 0.5em; cap height 0.625em; x-height 0.4375em;
  ascent + descent = 1em. It is pixel-exact at 16px and 32px (at a device pixel ratio of 1).
  The 13/15/18/26px token sizes sit off that grid. M20T1 kept them anyway: measured at
  1366×768, 1440×900, 1600×900 and 1920×1080, nothing overflows.
- VT323 remains the second family (and the `--font-code` / `--font-body` face). `'Perfect DOS VGA'`
  is not shipped.
- **Weight:** every self-hosted face (IBM VGA 8x16, VT323, Press Start 2P) has weight 400 only.
  `body` sets `font-synthesis-weight: none`, so the `font-weight: 600/700` and
  `font-medium`/`font-semibold` declarations still in the code no longer render as Chromium faux
  bold. They render at the face's single weight.

## 1b. Shell role metrics and faces — final visual lock

`design-system/tokens.ts` owns the shell's role sizes, whole-pixel line heights, weight and
faces. They reach components through `cattipuCssVariables`. Components reference
`var(--cattipu-type-<role>-size|line)`, `var(--cattipu-type-weight)` and one of three face
tokens, never a literal family.

CATTIPU uses two coordinated typefaces. This title/body split is part of the permanent identity:

| Role | Face token | Face | Size / line |
|---|---|---|---|
| Desktop title | `--cattipu-font-family` | Px437 IBM VGA8 | 26 / 28 |
| Window title | `--cattipu-font-family` | Px437 IBM VGA8 | 18 / 20 |
| Widget header | `--cattipu-font-family` | Px437 IBM VGA8 | 15 / 16 |
| Body, menu, sidebar, button, input | `--cattipu-font-ui` | Ark Pixel 12px Proportional | 13 / 16 |
| Compact / status | `--cattipu-font-compact` | Ark Pixel 10px Proportional | 11 / 12 |

- **Display face** (Px437 IBM VGA8) keeps the DOS/VGA personality for titles and plates.
- **GUI face** (Ark Pixel Proportional, OFL 1.1, `public/fonts/README.md`) is a crisp,
  proportional bitmap sans with late-1990s GUI character, for everything a person reads or
  operates. Shell containers set the GUI face; title-role rules reassert the display face.
- **Pixel-exact rendering.** A bitmap face is only crisp at its design size. Each GUI cut's
  `@font-face` carries `size-adjust` (12/13 and 10/11), so the 13px and 11px roles draw the
  12px and 10px designs at exactly 1:1. The role tokens keep their Golden Master sizes.
- Weight is 400 everywhere; no shipped face has another weight. `body` sets
  `font-synthesis: none`.

Measured before the GUI face was added: Px437 IBM VGA8 is pixel-exact only at 16/32px (46% of
its ink anti-aliased at 13px), VT323 never, Press Start 2P only at 8/16/24/32px.

## 2. `font-pixel-ui` sizes in use

All arbitrary rem values (no standard Tailwind size is used with this font). Sorted by
frequency across the codebase:

| Size | rem→px | Occurrences | Typical use |
|---|---|---|---|
| `text-[0.5rem]` | 8px | 5 | Dock labels, small chrome text |
| `text-[0.55rem]` | 8.8px | 3 | Window titles, badges |
| `text-[0.4rem]` | 6.4px | 4 | Smallest chrome labels (tab strips) |
| `text-[0.45rem]` | 7.2px | 2 | Secondary chrome labels |
| `text-[0.7rem]` | 11.2px | 1 | Larger emphasis chrome text |
| `text-[0.75rem]` | 12px | 1 | Largest chrome text observed |
| `text-[0.6rem]` | 9.6px | 2 | Top bar wordmark ("CATTIPU OS") |
| `text-[0.42rem]` | 6.7px | 1 | One-off |

Tracking is applied ad hoc via `tracking-wide`, `tracking-wider`, `tracking-[0.1em]`, and
`tracking-[0.15em]` — no single tracking value is standard across chrome text.

## 3. Body/UI text sizes in use

A genuine mix of Tailwind's standard scale and one-off arbitrary pixel values — there is no
single consolidated scale today:

**Standard Tailwind classes:** `text-sm` (14px, 16 occurrences — the most common body size),
`text-xs` (12px, 4), `text-base` (16px, 3), `text-lg` (18px, 1 — used once, for the "Welcome
back, Creator." heading).

**Arbitrary pixel values**, most-used first: `text-[13px]` (23 occurrences — the de facto
"secondary UI text" size: project names, button labels), `text-[11px]` (20 — timestamps,
descriptions, tooltips), `text-[12px]` (10), `text-[10px]` (5), `text-[12.5px]` (5),
`text-[14px]` (3), `text-[11.5px]` (2), plus a handful of single-use values (15px, 13.5px).

If this gets consolidated later, `text-sm`/14px and `text-[13px]` are the two real anchor
points to reconcile first — they're both extremely common and sit one pixel apart for no
documented reason.

## 4. Case and weight

No enforced case rule exists in code — headings and labels appear in whatever case their
source string is (`"Welcome back,"`, `"Your projects"`, `"CATTIPU OS"` are all authored
directly, not transformed via CSS `text-transform`). Weight is set per-element via Tailwind's
`font-medium`/`font-semibold` utilities; there's no fixed weight-per-role table like a formal
type system would have. Since M20T1 those weights are not synthesized (see §1a): with only a 400
face available, they render at regular weight.

## 5. What this means for future work

Milestone 12 decided the *family/role* half of this question: option (b) below is now frozen
policy, not just an observed pattern — every element resolves to one of the six named roles in
§1, and mixing a modern sans into any of them is forbidden. The *size scale* half is still open:
any future consolidation pass has two honest options: (a) formally consolidate around the
most-used real values in §2-3 (`text-sm`/`text-[13px]` for body, the 0.5rem/0.55rem cluster for
chrome), documenting the reduction as an intentional change, or (b) leave the organic arbitrary-
size scale as-is, since the family/role rule it sits on top of is now enforced regardless of which
exact size a given label uses. Neither has been decided for sizing — this document only records
what exists there.
