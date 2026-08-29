"""Milestone 1 — Desktop Shortcuts needs a 'Templates' icon that doesn't
exist as an asset anywhere in the repo (public/icons/ has no templates.png).
Rather than invent new UI design, this draws a document-with-folded-corner
glyph at the same hard-pixel, flat-fill, navy-outline construction already
used by archive.png/projects.png (see docs/COMPONENT_LIBRARY.md / the
Pixel Consistency Pass) — same techniques as the forge.png fix earlier this
session: draw at native low res, nearest-neighbor only, no anti-aliasing.
"""
from PIL import Image, ImageDraw

W, H = 48, 56
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)

NAVY = (3, 31, 86, 255)      # current --color-navy
PAPER = (232, 216, 197, 255)  # current --color-surface-solid (molded_panel)
BLUE = (16, 34, 126, 255)     # current --color-electric (selection_blue)
FOLD = (200, 184, 165, 255)   # slightly darker paper, for the folded corner

ear = 12  # dog-ear size

# page body (navy outline, paper fill), leaving room for the folded corner
d.rectangle([4, 4, W - 5, H - 5], fill=PAPER, outline=NAVY, width=2)

# cut the dog-ear: paint a folded-corner triangle over the top-right corner.
# Fill first, then stroke ONLY the inner diagonal edge (a manual stepped
# line, not PIL's line width — width>1 on a diagonal overshoots its
# endpoints and leaves a stray pixel poking past the page outline).
d.polygon([(W - 5 - ear, 4), (W - 5, 4), (W - 5, 4 + ear)], fill=FOLD)
steps = ear
for i in range(steps + 1):
    x = W - 5 - ear + i
    y = 4 + (ear - i)
    d.rectangle([x - 1, y - 1, x, y], fill=NAVY)

# three "information bars" — blue, stepped widths, hard rectangles
bar_x0, bar_x1_full = 10, W - 11
bars = [
    (bar_x1_full, 18),
    (bar_x1_full - 6, 27),
    (bar_x1_full - 14, 36),
]
for x1, y in bars:
    d.rectangle([bar_x0, y, x1, y + 4], fill=BLUE)

im.save("/home/claude/cattipu-os/public/icons/templates.png")
print("wrote public/icons/templates.png", im.size)
