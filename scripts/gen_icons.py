"""
Generate two new nav/desktop icons (Explorer, Archive) that match the
existing hand-pixelled icon family: navy outline, flat retro fills,
slightly stepped pixel edges. Drawn on a small logical grid and scaled
with nearest-neighbor (no anti-aliasing), then lightly downsampled with
a box filter on just the outer silhouette to soften stair-stepping to a
degree comparable to the extracted icons (which come from raster art,
not perfectly blocky pixels).
"""
from PIL import Image
import numpy as np

NAVY = (11, 61, 145, 255)
CREAM = (237, 228, 199, 255)
WHITE = (255, 253, 247, 255)
BLUE = (60, 106, 216, 255)
GOLD = (240, 196, 25, 255)
GOLD_DARK = (196, 152, 20, 255)
TRANSPARENT = (0, 0, 0, 0)

GRID = 24
SCALE = 3  # logical grid -> raster px before trim


def new_grid():
    return np.zeros((GRID, GRID, 4), dtype=np.uint8)


def set_px(g, x, y, color):
    if 0 <= x < GRID and 0 <= y < GRID:
        g[y, x] = color


def rect(g, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            set_px(g, x, y, color)


def outline_rect(g, x0, y0, x1, y1, color):
    for x in range(x0, x1 + 1):
        set_px(g, x, y0, color)
        set_px(g, x, y1, color)
    for y in range(y0, y1 + 1):
        set_px(g, x0, y, color)
        set_px(g, x1, y, color)


def render(g, out_path, trim_pad=1):
    im = Image.fromarray(g, mode="RGBA")
    im = im.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
    bbox = im.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - trim_pad * SCALE)
        y0 = max(0, y0 - trim_pad * SCALE)
        x1 = min(im.width, x1 + trim_pad * SCALE)
        y1 = min(im.height, y1 + trim_pad * SCALE)
        im = im.crop((x0, y0, x1, y1))
    im.save(out_path)
    print(out_path, im.size)


# ---------------------------------------------------------------------
# Explorer: a small window pane split into a tree list (left) and a
# file grid (right) -- reads as "file browser" at a glance.
# ---------------------------------------------------------------------
g = new_grid()
# outer frame
outline_rect(g, 2, 3, 21, 19, NAVY)
rect(g, 3, 4, 20, 18, WHITE)
# title bar strip
rect(g, 3, 4, 20, 5, NAVY)
# vertical divider between tree + grid
for y in range(6, 19):
    set_px(g, 11, y, NAVY)
# tree rows (left pane)
for i, y in enumerate([8, 11, 14, 17]):
    rect(g, 4, y, 9, y, NAVY if i != 1 else BLUE)
# file grid dots (right pane)
for gx in (13, 17):
    for gy in (8, 12, 16):
        rect(g, gx, gy, gx + 2, gy + 2, BLUE)
render(g, "public/icons/explorer.png")

# ---------------------------------------------------------------------
# Archive: a crate / storage box -- lid seam + handle notch.
# ---------------------------------------------------------------------
g = new_grid()
# lid
outline_rect(g, 3, 5, 20, 9, NAVY)
rect(g, 4, 6, 19, 8, GOLD)
# handle notch on lid
rect(g, 10, 5, 13, 6, NAVY)
rect(g, 11, 6, 12, 6, CREAM)
# body
outline_rect(g, 2, 9, 21, 20, NAVY)
rect(g, 3, 10, 20, 19, GOLD_DARK)
# seam line
for x in range(3, 21):
    set_px(g, x, 14, NAVY)
# corner rivets
for (rx, ry) in [(4, 11), (19, 11), (4, 18), (19, 18)]:
    set_px(g, rx, ry, NAVY)
render(g, "public/icons/archive.png")
