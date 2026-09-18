"""
Generate the six CATTIPU pixel-art cursors (Arrow, Hand, Text, Resize,
Move, Hourglass) that replace the browser's native cursors.

Each glyph is drawn on a 16x16 logical grid as an ASCII map ('#' = navy),
given a 1px white halo, and scaled with nearest-neighbor only (no
anti-aliasing anywhere). The result is a two-colour, fully opaque/fully
transparent PNG.

M20C1 (Cursor Artwork Fidelity):
- SCALE is 2, not 4. Chromium draws a url() cursor at its natural size in
  CSS px, so the old 64x64 PNGs rendered a 64px canvas, 2.5-3x an OS
  pointer. Art is laid out on the 16x16 grid (a 32x32 CSS px frame), and
  each PNG is then cropped to its glyph + outline. Chromium replaces a
  custom cursor with the native one whenever the whole image does not fit
  inside the viewport, so transparent margin only widens that fallback
  zone at the right/bottom edges.
- Arrow is redrawn, inset one cell so the halo wraps the tip, with a
  repaired stepped tail. Move is redrawn with a 1-cell shaft and legible
  5-cell arrowheads, and its outline no longer touches every canvas edge.
- Hotspots are computed from the final pixels (see hotspot()) instead of
  hand-kept constants, and printed in CSS px for app/globals.css.
- Uses only the Python standard library (zlib/struct), so the script runs
  from a clean checkout.

M20C1R1/R2/R3 (Hand and Hourglass shape corrections): see the comments
directly above HAND and HOURGLASS below for what changed and why. R3 was
driven by a supplied early-retro reference image — its SHAPE only, kept in
CATTIPU's own navy/white/no-antialiasing construction, not imported as-is.

Run from the repository root:  python scripts/gen_cursors.py
"""
import struct
import zlib

NAVY = (11, 61, 145, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

GRID = 20  # M20C1R4: widened from 16 so Hourglass has room for a longer,
# more gradual taper (matching a supplied reference image more closely).
# Safe for every other cursor: they crop to their own content's bounding
# box regardless of how much unused grid capacity exists around them.
SCALE = 2  # 16x16 grid -> 32x32 CSS px frame, cropped per cursor

# Maximum visible silhouette (= PNG size), halo included, in CSS px.
LIMITS = {
    "arrow": (18, 28),
    "hand": (32, 32),  # M20C1R3: a 4-finger staircase + a protruding thumb
    "text": (16, 28),
    "resize": (28, 28),
    "move": (30, 30),
    "hourglass": (32, 40),  # M20C1R4: taller, slender hollow frame vs. the reference
}


def grid_from(rows, dx=0, dy=0):
    """ASCII map -> 16x16 grid of colours, offset by (dx, dy) cells."""
    g = [[CLEAR] * GRID for _ in range(GRID)]
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#":
                g[y + dy][x + dx] = NAVY
    return g


def halo(g):
    """Add a 1px white outline around every navy cell (8-neighbourhood),
    then fill any transparent cell the outline fully encloses, so a glyph
    reads as one solid white-backed object (e.g. Move's gaps between shaft
    and arrowheads) rather than one with pinholes."""
    out = [row[:] for row in g]
    for y in range(GRID):
        for x in range(GRID):
            if g[y][x] != NAVY:
                continue
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < GRID and 0 <= nx < GRID and out[ny][nx] == CLEAR:
                        out[ny][nx] = WHITE
    # Flood-fill the transparent cells reachable from the canvas border
    # (4-neighbourhood); anything transparent left over is enclosed.
    outside = set()
    stack = [(x, y) for x in range(GRID) for y in (0, GRID - 1)]
    stack += [(x, y) for y in range(GRID) for x in (0, GRID - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in outside or not (0 <= x < GRID and 0 <= y < GRID) or out[y][x] != CLEAR:
            continue
        outside.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    for y in range(GRID):
        for x in range(GRID):
            if out[y][x] == CLEAR and (x, y) not in outside:
                out[y][x] = WHITE
    return out


def bbox(g, colours):
    cells = [(x, y) for y in range(GRID) for x in range(GRID) if g[y][x] in colours]
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    return min(xs), min(ys), max(xs), max(ys)


def hotspot(g, kind):
    """Hotspot in CSS px, derived from the navy pixels of the final art.

    tip    - the top-left corner of the topmost-leftmost navy cell
    top    - the horizontal midpoint of the topmost navy row (fingertip)
    centre - the midpoint of the navy bounding box
    Midpoints of an even span fall between two device pixels; they are
    floored, which always lands on a navy-bounded pixel of the glyph.
    """
    x0, y0, x1, y1 = bbox(g, (NAVY,))
    if kind == "tip":
        tip_y = y0
        tip_x = min(x for x in range(GRID) if g[tip_y][x] == NAVY)
        return tip_x * SCALE, tip_y * SCALE
    if kind == "top":
        xs = [x for x in range(GRID) if g[y0][x] == NAVY]
        return (min(xs) * SCALE + (max(xs) + 1) * SCALE - 1) // 2, y0 * SCALE
    return (x0 * SCALE + (x1 + 1) * SCALE - 1) // 2, (y0 * SCALE + (y1 + 1) * SCALE - 1) // 2


def write_png(path, g, crop):
    """Write cells crop=(x0, y0, x1, y1) of the grid, SCALE px per cell."""
    cx0, cy0, cx1, cy1 = crop
    width, height = (cx1 - cx0 + 1) * SCALE, (cy1 - cy0 + 1) * SCALE
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: none
        for x in range(width):
            raw.extend(g[cy0 + y // SCALE][cx0 + x // SCALE])

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


# ---------------------------------------------------------------------
# Arrow: stepped 1990s workstation pointer. Inset one cell so the halo
# wraps the tip; the tail steps down-right, split from the stem by a notch.
# ---------------------------------------------------------------------
ARROW = [
    "#",
    "##",
    "###",
    "####",
    "#####",
    "######",
    "#######",
    "####",
    "##.##",
    "#..##",
    "....##",
    "....##",
]

# ---------------------------------------------------------------------
# Hand: pointing hand for links/buttons; the index fingertip is the hotspot.
# M20C1R1 fixed a silhouette that read as an obscene gesture (a single
# centred finger on a plain block). M20C1R2 gave the thumb its own lobe.
# M20C1R3 (shape correction against a supplied Win95/98-style reference)
# redraws the fingers as a genuine 4-finger staircase — index, middle,
# ring, pinky, each one row shorter than the last, separated by 1-cell
# gaps that halo() turns into white creases — which is the reference's
# single most recognizable cue and removes any remaining "how many
# fingers is that" ambiguity. The thumb is a plain rectangular block (the
# reference's is a block, not a rounded lobe): a 1-cell "web" gap at its
# top row, then it merges in and actually protrudes past the palm's own
# left edge for two rows (the reference's thumb visibly sticks out, it
# does not sit flush with the wrist) before retreating to the palm's
# inset edge and tapering into a cuffed base.
# ---------------------------------------------------------------------
HAND = [
    "....##........",
    "....##........",
    "....##.##.....",
    "....##.##.....",
    "....##.##.##..",
    "....##.##.##..",
    "###.##.##.##.#",
    "###.##.##.##.#",
    "###.##########",
    "##############",
    "..############",
    "...###########",
    "....#########.",
    ".....#######..",
]

# ---------------------------------------------------------------------
# Text: I-beam with serifs.
# ---------------------------------------------------------------------
TEXT = [
    "",
    "",
    ".....######",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".......##",
    ".....######",
]

# ---------------------------------------------------------------------
# Resize: diagonal double-headed arrow (nwse).
# ---------------------------------------------------------------------
RESIZE = [
    "",
    "",
    "..####",
    "..##",
    "..#.#",
    "..#..#",
    "......#",
    ".......#",
    "........#",
    ".........#",
    "..........#..#",
    "...........#.#",
    "............##",
    "..........####",
]

# ---------------------------------------------------------------------
# Move: four-way arrow (window drag). A 1-cell shaft with a true centre
# cell and 5-cell arrowheads, inset one cell from the top/left edges.
# ---------------------------------------------------------------------
MOVE = [
    "......#",
    ".....###",
    "....#####",
    "......#",
    "..#...#...#",
    ".##...#...##",
    "#############",
    ".##...#...##",
    "..#...#...#",
    "......#",
    "....#####",
    ".....###",
    "......#",
]

# ---------------------------------------------------------------------
# Hourglass: sand-timer silhouette (busy). M20C1R3 built a solid tapered
# diamond. M20C1R4 (traced directly off the supplied reference image's own
# pixels, not just its overall proportions) rebuilds it as the reference
# actually is: a HOLLOW frame — two thick flat caps, a straight-sided glass
# "shoulder" directly under each cap (the reference holds its walls flush
# for a couple of rows before the taper starts, not immediately), then a
# single-cell-wide diagonal wall (not the shoulder's full 2-cell
# thickness) tapering gradually — one column per row, the longest run the
# GRID budget allows — down to a solid neck, and a solid sand-pile bump
# sitting on the bottom cap instead of a mirrored top. The interior reads
# white/transparent through the frame: halo() fills any transparent cell
# an outline fully encloses, the same trick MOVE already uses, so the
# hollow chamber gets its own white body rather than turning into stray
# holes.
# ---------------------------------------------------------------------
HOURGLASS = [
    "##############",
    "##############",
    "##..........##",
    "##..........##",
    "..#........#..",
    "...#......#...",
    "....#....#....",
    ".....#..#.....",
    "......##......",
    ".....#..#.....",
    "....#....#....",
    "...#......#...",
    "..#........#..",
    "##..........##",
    "##..........##",
    "##...####...##",
    "##############",
    "##############",
]

CURSORS = [
    ("arrow", grid_from(ARROW, 1, 1), "tip"),
    ("hand", grid_from(HAND, 1, 1), "top"),
    ("text", grid_from(TEXT), "centre"),
    ("resize", grid_from(RESIZE), "centre"),
    ("move", grid_from(MOVE, 1, 1), "centre"),
    ("hourglass", grid_from(HOURGLASS, 1, 1), "centre"),
]

print("cursor     png (= silhouette)  hotspot (CSS px, in the PNG)")
for name, art, kind in CURSORS:
    fx, fy = hotspot(art, kind)  # in the 32x32 frame
    final = halo(art)
    assert final[fy // SCALE][fx // SCALE] == NAVY, f"{name} hotspot is not on the glyph"
    crop = bbox(final, (NAVY, WHITE))
    w, h = (crop[2] - crop[0] + 1) * SCALE, (crop[3] - crop[1] + 1) * SCALE
    max_w, max_h = LIMITS[name]
    assert w <= max_w and h <= max_h, f"{name} silhouette {w}x{h} exceeds {max_w}x{max_h}"
    hx, hy = fx - crop[0] * SCALE, fy - crop[1] * SCALE
    write_png(f"public/cursors/{name}.png", final, crop)
    print(f"{name:<10} {w}x{h:<16} {hx} {hy}")
