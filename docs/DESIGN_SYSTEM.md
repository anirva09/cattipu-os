# CATTIPU OS — Design System

**Version:** Identity Locked (v0.2.5)

## Philosophy

CATTIPU should feel like an operating system that never existed in 1998.

Three principles:

* Playful
* Tactile
* Inventive

Every surface should feel molded from late-90s plastic.

---

## Colors

| Token  | Value   |
| ------ | ------- |
| Navy   | #0B3D91 |
| Blue   | #3C6AD8 |
| Cream  | #EDE4C7 |
| Paper  | #F5F1DE |
| Yellow | #F0C419 |
| Red    | #D6403A |
| Green  | #2BA24C |
| Purple | #6E3BA8 |
| Ink    | #111111 |

Never introduce competing primary colors.

---

## Typography

### Tokens

* `--font-pixel-ui`
* `--font-body`
* `--font-code`

### Usage

| Element       | Font     |
| ------------- | -------- |
| Top Bar       | Pixel UI |
| Window Titles | Pixel UI |
| Buttons       | Pixel UI |
| Labels        | Pixel UI |
| Body          | Body     |
| Code          | VT323    |

---

## Logo Rules

Official variants:

* Hero
* Mark
* Topbar (white halo)

Top bar logo always sits inside an embossed cream badge.

Never place it directly on navy.

---

## Window Chrome

* Raised outer frame
* Recessed content well
* Pixel shadows
* Blue focus glow (1px)

Controls:

* Yellow = Minimize
* Blue = Stack
* Red = Close

Never imitate Windows controls.

---

## Dock

Behavior is locked.

* Hover expands
* Active LED
* Recessed icon wells
* Icons lift 2px

---

## Wallpapers

Official wallpapers:

1. Paper Grain
2. Blueprint Grid
3. Sunrise Geometry

No soft modern gradients.

---

## Motion

Mechanical.

* 120–180ms
* Spring easing
* Pixel movement

Examples:

* Dock jump
* Button press
* Window snap
* Build Playback

---

## Review Checklist

Before merging UI changes:

* [ ] Uses color tokens
* [ ] Uses font tokens
* [ ] Preserves tactile depth
* [ ] Doesn't resemble Windows
* [ ] Doesn't resemble a SaaS dashboard
* [ ] Keeps the thumb visible
