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

# ---------------------------------------------------------------------
# Milestone 12 (Constitutional Foundation Retrofit) — "freeze cursor
# language: Arrow, I-Beam, Move, Resize, Hourglass, Pointing Hand." Arrow/
# Hand/Text/Resize above already cover four of the six; these two fill
# the gap (Window.tsx's titlebar drag previously reused hand.png as a
# disclosed placeholder — see globals.css for the M12 fix that points it
# at move.png instead).
# ---------------------------------------------------------------------

# ---------------------------------------------------------------------
# Move: four-way arrow (drag affordance), hotspot dead-center
# ---------------------------------------------------------------------
g = new_grid()
# vertical + horizontal bars, meeting at the center
for y in range(3, 13):
    set_px(g, 7, y, NAVY)
    set_px(g, 8, y, NAVY)
for x in range(3, 13):
    set_px(g, x, 7, NAVY)
    set_px(g, x, 8, NAVY)
# arrowhead tips — up / down / left / right
for x, y in [(7, 1), (8, 1), (6, 2), (7, 2), (8, 2), (9, 2)]:
    set_px(g, x, y, NAVY)
for x, y in [(7, 14), (8, 14), (6, 13), (7, 13), (8, 13), (9, 13)]:
    set_px(g, x, y, NAVY)
for x, y in [(1, 7), (1, 8), (2, 6), (2, 7), (2, 8), (2, 9)]:
    set_px(g, x, y, NAVY)
for x, y in [(14, 7), (14, 8), (13, 6), (13, 7), (13, 8), (13, 9)]:
    set_px(g, x, y, NAVY)
render(g, "public/cursors/move.png")
MOVE_HOTSPOT = (8, 8)

# ---------------------------------------------------------------------
# Hourglass: classic sand-timer silhouette, hotspot dead-center
# ---------------------------------------------------------------------
g = new_grid()
hourglass_rows = {
    2: range(3, 13),
    3: range(4, 12),
    4: range(5, 11),
    5: range(6, 10),
    6: range(6, 10),
    7: range(7, 9),
    8: range(7, 9),
    9: range(6, 10),
    10: range(6, 10),
    11: range(5, 11),
    12: range(4, 12),
    13: range(3, 13),
}
for y, xs in hourglass_rows.items():
    for x in xs:
        set_px(g, x, y, NAVY)
render(g, "public/cursors/hourglass.png")
HOURGLASS_HOTSPOT = (8, 8)

print("hotspots (logical grid coords, multiply by SCALE for css px):")
print(
    "arrow", ARROW_HOTSPOT,
    "hand", HAND_HOTSPOT,
    "text", TEXT_HOTSPOT,
    "resize", RESIZE_HOTSPOT,
    "move", MOVE_HOTSPOT,
    "hourglass", HOURGLASS_HOTSPOT,
)
