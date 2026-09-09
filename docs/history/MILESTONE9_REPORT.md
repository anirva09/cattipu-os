# Architect Input State Polish Report

Refined the Architect app's initial prompt state only — `PromptBar.tsx`
and `ArchitectApp.tsx`'s idle empty-state block. No layout architecture,
data flow, or existing functionality changed; every fix below is a
class, a CSS rule, or a small markup restructuring on a surface that
already existed in its existing position. Screenshots: `m9-audit-after/`.

## Files changed

- `app/globals.css` — Generate switch hover/disabled/focus states, a new
  `.cattipu-architect-field` focus modifier (scoped to the Architect
  prompt field only), and a small `.cattipu-focus-ring` utility reused
  on the "Try" link.
- `components/Architect/PromptBar.tsx` — label hierarchy, field/button
  alignment, the busy/disabled split, and the example-prompt markup.
- `components/Architect/ArchitectApp.tsx` — the idle empty-state block
  (icon housing, copy spacing).
- `components/UI/Textarea.tsx` — placeholder tracking.

## Scope note: why `.cattipu-field` itself isn't touched

`.cattipu-field` is shared with `components/UI/Input.tsx`, whose only
consumer is `ProjectsApp.tsx`'s "New Project" name field — outside this
milestone's "initial prompt state only" scope. Rather than change the
shared primitive's `:focus` behavior (which would silently change that
field too), the Architect textarea gets a new `.cattipu-architect-field`
class applied only in `PromptBar.tsx`; ProjectsApp's Input is untouched,
confirmed by diff. `.cattipu-switch` is edited directly instead of
through a similar wrapper class, since the Generate button is its only
consumer (established in Milestone 3's own header comment, reconfirmed
by a fresh grep before editing).

## Input/textarea focus state

Was the shared `.cattipu-field:focus` rule: a 2px outline floating 1px
outside the field's own border — on a large multi-line field this reads
as a standard modern web focus ring, not a physical control lighting up.
`.cattipu-architect-field:focus` replaces it with a hard color change on
the field's own embossed border (electric blue, no floating outline at
all) plus a deeper inset bevel, so the well itself looks "engaged" under
the cursor rather than gaining a ring around its outside edge. Verified:
computed `outline-style: none`, `border-color: rgb(16, 34, 126)` on
focus (`m9-audit-after/02-field-focused.png`).

## Generate button: enabled / disabled / pressed / hover states, and a real bug

Audited all of Generate's states against the brief's list and found a
genuine functional-visual inconsistency, not just a styling gap: Generate
is disabled for two different reasons — busy (actively generating or
playing back a build; still doing something) and an empty prompt
(nothing to submit; genuinely inert) — but both used the exact same
native `disabled` attribute and the exact same flattened-bevel, 50%-
opacity CSS. The result: clicking Generate produced a spinner and
"Thinking…" sitting on a button that looked dimmed and switched off,
directly contradicting what it was telling you.

Fixed with a `data-busy` attribute set alongside `disabled` in
`PromptBar.tsx`, and two separate CSS rules:
`.cattipu-switch:disabled:not([data-busy])` keeps the old flattened,
faded treatment for the genuinely-inert empty-prompt case;
`.cattipu-switch:disabled[data-busy]` keeps the full raised bevel and
full opacity, so a working button still looks like it's on. Verified
live: clicking Generate with text in the field immediately shows
`data-busy="true"`, `opacity: 1`, and the same box-shadow as the idle
enabled state, while an empty field shows no `data-busy`, `opacity: 0.5`,
and the flattened shadow (`m9-audit-after/06-busy-generate-state.png`
vs. `01-idle-empty-state.png`).

Also replaced the `hover:brightness-105` CSS filter with a concrete
`.cattipu-switch:hover:not(:disabled)` rule using the same "stronger top
highlight, deeper lower edge" language `.cattipu-window-control:hover`
already uses — a uniform brightness filter is a soft, modern-feeling
effect; a bevel that visibly strengthens under the cursor reads as a
physical surface. Pressed state (`:active`) was already correct from
Milestone 3/6 (deep inset, zero blur) and is unchanged.

Added `.cattipu-switch:focus-visible` — a hard, zero-blur 2px outline
(reusing the dock's existing `:focus-visible` construction) — since the
button previously had no custom keyboard-focus treatment at all and
relied on the browser's inconsistent default. Verified: Tab from the
field lands on Generate and shows the ring
(`m9-audit-after/04-generate-focus-visible.png`).

## Alignment between prompt field and Generate control

Measured live before touching anything: the textarea (`rows={2}`, its
own padding/border) rendered at 64px, while the button's old fixed
`sm:h-[3.5rem]` (56px) combined with `sm:items-start` left its bottom
edge 8px short of the field's — a real, visible misalignment, not a
hypothetical one. Fixed by changing the row to `sm:items-stretch` and
letting the button's height follow the field's actual rendered height
instead of a second, independently-guessed magic number. Verified:
both elements now measure 64px and their bottom edges align to within
sub-pixel tolerance.

## Prompt label hierarchy

Was a single flat heading line ("What are we building?"). Added a small
uppercase eyebrow above it — "ARCHITECT · PROMPT" — in the same small-
label voice used for section headers elsewhere (`font-pixel-ui`,
`tracking-[0.15em]`, `ink-faint`), so the module name and the actual
instruction read as two distinct levels instead of one undifferentiated
line, echoing the module-header-plus-instruction pattern common to
period wizard/utility software.

## Placeholder styling

The pixel-monospace placeholder itself (`font-code`, distinct from the
`font-body` typed value) was already a deliberate, previously-disclosed
Milestone 3/5 decision and is kept. Added `tracking-wide` so it reads
more like an etched instruction plate stamped into the field and less
like an ordinary sentence sitting in an empty box — a small refinement,
not a reversal of the earlier call.

## Example prompt styling

Was a single line of body-font text with a dotted underline running
under the whole string, reading as a plain web hyperlink dropped under
the field. Split into a small pixel-ui "TRY:" label (matching the
eyebrow/section-header voice above) and the example text itself in
`font-code` — the same monospace the field's own placeholder uses — so
the suggestion visibly reads as "text that would go in the field," not
an unrelated caption. Kept the dotted underline on the quoted text only
(a hard, non-glowing affordance, not a modern effect) and added
`.cattipu-focus-ring` — the same hard outline construction as Generate's
— since this link had no custom keyboard-focus treatment before this
pass. Verified: Tab (with an empty field, where Generate is natively
skipped as a disabled control) lands directly on "Try" and shows the
ring (`m9-audit-after/07-try-example-focus-visible.png`); Enter
activates it and correctly populates the field with the example text.

## Empty-state icon treatment and copy spacing

The `Boxes` icon was a bare Lucide glyph floating on the panel
background with no housing — a generic modern-SaaS empty-state pattern
that didn't tie it to the rest of the shell's molded-plastic chrome.
Housed it in a small `.cattipu-recessed` plaque (56×56px) instead, the
same construction as the navy icon wells elsewhere, so it reads as
carved into the panel rather than dropped on top of it
(`m9-audit-after/01-idle-empty-state.png`). Icon shrunk from `h-8 w-8`
to `h-7 w-7` to sit with even padding inside the new housing.

Copy spacing: the gap between the icon and the two-line caption was
`gap-3` (12px, off the 8px grid established since Milestone 5) — changed
to `gap-4` (16px). Added `leading-relaxed` to the caption paragraph so it
doesn't read as tight web-caption text at this width.

## Keyboard interaction checks

- Tab from the prompt field reaches Generate when it's enabled (text
  present), and reaches "Try" directly when Generate is natively
  disabled (empty field) — disabled buttons are correctly skipped in
  tab order by the browser, no extra work needed.
- `Ctrl`/`Cmd`+`Enter` from the field still submits (unchanged wiring),
  confirmed live: the button flips to the busy/`data-busy` state
  immediately.
- Enter activates the focused "Try" link and populates the field with
  the example text (existing `useExample` wiring, unchanged).
- Generate and "Try" both now show a hard, zero-blur keyboard-focus ring
  where neither had a custom one before; the field's own focus state
  (border-color change) is distinct from both, consistent with it being
  a different kind of control.

## A test-methodology note, disclosed for the record

Early in verification, a `page.locator("button", { hasText: "Generate" })`
Playwright locator returned stale `text: "Generate"` / `disabled: false`
readings for several seconds after a real, successful submit — even
though a parallel raw `querySelectorAll` scan of the same DOM at the same
moment correctly showed `text: "Thinking…"`, `disabled: true`,
`data-busy: "true"`. Traced with a temporary console-log trail through
`submit()` → the store's `generate()` action → `PromptBar`'s own
re-renders, which confirmed the component, the store, and the CSS were
all behaving exactly as designed at every step — the stale locator read
was an artifact of the Playwright locator's `hasText` filter not being
re-evaluated the way expected across a text-changing element, not a
product defect. `verify-m9.mjs`'s busy-state check now uses a raw DOM
scan instead of a `hasText` locator to avoid the same artifact. Flagging
this explicitly rather than silently — the eventual "everything actually
works" conclusion is only as trustworthy as showing how a real-looking
false negative got run to ground instead of either being ignored or
triggering an unnecessary code change.

## Reviewed, no change needed

- Generate's pressed (`:active`) state — already correct from Milestone
  3/6 (deep inset, zero blur, `translateY(3px)`); untouched.
- `Ctrl`/`Cmd`+`Enter` submit wiring, `useExample`'s draft-fill wiring —
  functionally unchanged, only the surrounding markup/classes moved.
- The Architect window's own chrome (title bar, tabs, other tab panels,
  the "System Ready" overlay) — outside "initial prompt state," not
  touched.

## Validation

```
$ pnpm lint    → clean, 0 errors (same pre-existing unrelated warning in
                 a scratch verify script, not part of the shipped app)
$ pnpm build   → clean, First Load JS unchanged (142kB / 245kB)
```

Live-verified against a production server (Playwright):

```
alignment: textarea 64px, button 64px, bottom edges aligned
disabled (empty draft): opacity 0.5, flattened bevel, no data-busy
field focus: outline none, border-color rgb(16,34,126) (electric)
enabled: opacity 1, full raised bevel
Tab from field (filled) -> Generate; Tab from field (empty) -> Try
pressed: deep inset box-shadow
busy (data-busy) after real submit: "Thinking…", disabled, opacity 1,
  full raised bevel — not the flattened/faded disabled treatment
Try link: Enter activation fills the field with the example text;
  keyboard Tab shows a solid hard-edged focus outline
```

Full screenshot set in `m9-audit-after/`: idle empty state, field
focused, field filled with Generate enabled, Generate focus-visible,
Generate pressed, the busy/Thinking state, and the Try-link focus ring.

## What's still open

- The card-tier vs. control-tier corner-radius system established in
  Milestone 6 isn't touched here — the prompt field and Generate switch
  were already square (0-radius) before this pass, confirmed unchanged.
- `docs/TYPOGRAPHY.md`'s type-scale survey doesn't yet document the new
  eyebrow-label pattern introduced here; a documentation update, not a
  visual bug, and out of scope for this pass per the "docs are frozen"
  instruction from earlier milestones.
