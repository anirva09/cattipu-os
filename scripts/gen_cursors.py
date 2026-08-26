"""
Generate 4 pixel-art cursor bitmaps (Arrow, Hand, Text, Resize) that
replace the browser's native cursors. Drawn on a small logical grid,
scaled with nearest-neighbor only (no anti-aliasing anywhere), navy
fill with a white 1px halo so they read on both the cream desktop and
the navy top bar / window chrome.
"""
from PIL import Image
import numpy as np

NAVY = (11, 61, 145, 255)
WHITE = (255, 255, 255, 255)
T = (0, 0, 0, 0)

GRID = 16
SCALE = 4  # -> 64x64 px, crisp at real-world cursor sizes


def new_grid():
    return np.zeros((GRID, GRID, 4), dtype=np.uint8)


def set_px(g, x, y, color):
    if 0 <= x < GRID and 0 <= y < GRID:
        g[y, x] = color


def halo(g):
    """Add a 1px white outline around every navy pixel (classic cursor look)."""
    out = g.copy()
    navy_mask = (g[:, :, 3] > 0)
    for y in range(GRID):
        for x in range(GRID):
            if not navy_mask[y, x]:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < GRID and 0 <= nx < GRID and not navy_mask[ny, nx]:
                        if tuple(out[ny, nx]) == (0, 0, 0, 0):
                            out[ny, nx] = WHITE
    return out


def render(g, out_path):
    g = halo(g)
    im = Image.fromarray(g, mode="RGBA")
    im = im.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
    im.save(out_path)
    print(out_path, im.size)


# ---------------------------------------------------------------------
# Arrow: classic angled pointer, hotspot at tip (top-left, 0,0 logical)
# ---------------------------------------------------------------------
g = new_grid()
rows = [
    (0, 0), (0, 1), (1, 1), (1, 2), (2, 2), (2, 3), (3, 3), (3, 4),
    (4, 4), (4, 5), (5, 5), (5, 6), (6, 6), (6, 7),
]
# filled triangle body
pts = [
    (0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (0, 7), (0, 8), (0, 9),
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
    (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7),
    (3, 3), (3, 4), (3, 5), (3, 6), (3, 7),
    (4, 4), (4, 5), (4, 8), (4, 9),
    (5, 5), (5, 9), (5, 10),
    (6, 10), (6, 11),
    (3, 8), (3, 9), (2, 8),
]
for x, y in pts:
    set_px(g, x, y, NAVY)
render(g, "public/cursors/arrow.png")
ARROW_HOTSPOT = (2, 2)  # scaled logical hotspot, see below

# ---------------------------------------------------------------------
# Hand: pointing-hand cursor for links/buttons, hotspot at fingertip
# ---------------------------------------------------------------------
g = new_grid()
# index finger
rect_pts = []
for y in range(1, 6):
    rect_pts.append((6, y))
    rect_pts.append((7, y))
# palm + other fingers stacked
for y in range(6, 12):
    for x in range(4, 11):
        rect_pts.append((x, y))
# thumb
for y in range(8, 11):
    for x in range(2, 4):
        rect_pts.append((x, y))
for x, y in rect_pts:
    set_px(g, x, y, NAVY)
render(g, "public/cursors/hand.png")
HAND_HOTSPOT = (6, 1)

# ---------------------------------------------------------------------
# Text: I-beam, hotspot dead-center
# ---------------------------------------------------------------------
g = new_grid()
for x in range(5, 11):
    set_px(g, x, 2, NAVY)
    set_px(g, x, 13, NAVY)
for y in range(2, 14):
    set_px(g, 7, y, NAVY)
    set_px(g, 8, y, NAVY)
render(g, "public/cursors/text.png")
TEXT_HOTSPOT = (7, 8)

# ---------------------------------------------------------------------
# Resize: diagonal double-headed arrow (nwse), hotspot dead-center
# ---------------------------------------------------------------------
g = new_grid()
diag = [(2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7), (8, 8), (9, 9), (10, 10), (11, 11), (12, 12), (13, 13)]
for x, y in diag:
    set_px(g, x, y, NAVY)
# top-left arrowhead
for x, y in [(2, 2), (2, 3), (2, 4), (2, 5), (3, 2), (4, 2), (5, 2)]:
    set_px(g, x, y, NAVY)
# bottom-right arrowhead
for x, y in [(13, 13), (13, 12), (13, 11), (13, 10), (12, 13), (11, 13), (10, 13)]:
    set_px(g, x, y, NAVY)
render(g, "public/cursors/resize.png")
RESIZE_HOTSPOT = (7, 7)

print("hotspots (logical grid coords, multiply by SCALE for css px):")
print("arrow", ARROW_HOTSPOT, "hand", HAND_HOTSPOT, "text", TEXT_HOTSPOT, "resize", RESIZE_HOTSPOT)
