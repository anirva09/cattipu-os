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
| Window Title | `font-window-title` | Press Start 2P | Window.tsx / Panel.tsx title-bar text |
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
type system would have.

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
