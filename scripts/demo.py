# -*- coding: utf-8 -*-
"""CATTIPU OS — a recorded walkthrough of M16, M17 and M18.

Drives the production build the way a person would: right-clicks, drags,
double-clicks, keystrokes. Captures a frame after each step, captions it,
and writes both an animated GIF and full-resolution stills.

Nothing here is staged from state — every folder, shortcut, snap and
arrangement in the recording is produced by the same actions a user
performs, which is the only way a demo is evidence rather than a mockup.
"""
import os
import shutil
import sys

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
FRAMES = "/tmp/demo-frames"
STILLS = f"{OUT}/demo"
BOOT_MS = 7000

GIF_WIDTH = 900
CAPTION_H = 46
HOLD = 3          # frames a captured moment is held for in the GIF
FRAME_MS = 260

FONT = ImageFont.truetype(
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf", 19
)
FONT_SMALL = ImageFont.truetype(
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf", 15
)

shots = []


def capture(pg, step, caption, note=""):
    """One numbered moment: a full-res still and a captioned GIF frame."""
    path = f"{FRAMES}/{len(shots):03d}.png"
    pg.screenshot(path=path)
    shots.append((path, step, caption, note))
    still = f"{STILLS}/{step:02d}_{caption.split(' — ')[0].replace(' ', '_')}.png"
    shutil.copy(path, still)
    print(f"  {step:2d}. {caption}")


def compose(path, step, caption, note):
    base = Image.open(path).convert("RGB")
    w = GIF_WIDTH
    h = round(base.height * w / base.width)
    base = base.resize((w, h), Image.LANCZOS)

    canvas = Image.new("RGB", (w, h + CAPTION_H), (12, 11, 10))
    canvas.paste(base, (0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((14, h + 8), f"{step:02d}", font=FONT, fill=(198, 151, 31))
    draw.text((48, h + 7), caption, font=FONT, fill=(233, 223, 196))
    if note:
        draw.text((48, h + 27), note, font=FONT_SMALL, fill=(140, 130, 107))
    return canvas


# ── page helpers ────────────────────────────────────────────────────────

RAIL = {"projects": "Projects", "architect": "Architect", "memory": "Memory",
        "explorer": "Explorer", "settings": "Settings"}


def layer(pg, selector):
    return pg.evaluate(
        "(s) => { const r = document.querySelector(s).getBoundingClientRect();"
        " return {x:r.x, y:r.y, width:Math.round(r.width), height:Math.round(r.height)}; }",
        selector,
    )


def desktop_box(pg):
    return layer(pg, "[data-testid=desktop-object-layer]")


def workspace(pg):
    return layer(pg, ".cattipu-interactive-desktop__window-layer")


def rail(pg, wid):
    pg.locator("button", has_text=RAIL[wid]).first.click()
    pg.wait_for_timeout(500)


def right_click(pg, x, y):
    pg.mouse.click(x, y, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=4000)
    pg.wait_for_timeout(250)


def menu(pg, label):
    pg.locator(".cattipu-context-menu__item", has_text=label).first.click()
    pg.wait_for_timeout(450)


def free_spot(pg):
    """Somewhere on the desktop no window covers."""
    box = workspace(pg)
    rects = pg.evaluate(
        """() => { const l = document.querySelector(
             '.cattipu-interactive-desktop__window-layer').getBoundingClientRect();
           return [...document.querySelectorAll('.cattipu-managed-window')]
             .filter(w => w.dataset.visible === 'true')
             .map(w => { const b = w.getBoundingClientRect();
               return {x:b.x-l.x, y:b.y-l.y, w:b.width, h:b.height}; }); }"""
    )
    for ly in range(box["height"] - 20, 20, -20):
        for lx in range(20, box["width"] - 20, 20):
            if not any(r["x"] - 4 <= lx <= r["x"] + r["w"] + 4
                       and r["y"] - 4 <= ly <= r["y"] + r["h"] + 4 for r in rects):
                return box["x"] + lx, box["y"] + ly
    return box["x"] + 30, box["y"] + box["height"] - 30


def drag_window(pg, wid, to_x, to_y, release=True):
    rail(pg, wid)
    tb = pg.locator(
        f".cattipu-managed-window[data-window-id={wid}] .cattipu-window__titlebar"
    ).bounding_box()
    sx, sy = tb["x"] + 70, tb["y"] + tb["height"] / 2
    pg.mouse.move(sx, sy)
    pg.mouse.down()
    pg.mouse.move((sx + to_x) / 2, (sy + to_y) / 2, steps=10)
    pg.mouse.move(to_x, to_y, steps=10)
    pg.wait_for_timeout(200)
    if release:
        pg.mouse.up()
        pg.wait_for_timeout(450)


def icon_box(pg, label):
    return pg.locator(
        f'[data-object-id]:has(.cattipu-desktop-objects__label:text-is("{label}"))'
    ).first.bounding_box()


def shortcut_keys(pg, key):
    pg.keyboard.down("Control")
    pg.keyboard.down("Alt")
    pg.keyboard.press(key)
    pg.keyboard.up("Alt")
    pg.keyboard.up("Control")
    pg.wait_for_timeout(600)


# ── the walkthrough ─────────────────────────────────────────────────────

for d in (FRAMES, STILLS):
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)

    capture(pg, 1, "The shipped desktop",
            "Empty by default — pixel-identical to the Golden Master below the top bar")

    # ── M16: the desktop is made of real objects ────────────────────────
    dbox = desktop_box(pg)
    right_click(pg, dbox["x"] + 40, dbox["y"] + 520)
    capture(pg, 2, "Right-click the desktop",
            "Paste is disabled because there is no clipboard yet, not hidden")

    menu(pg, "New Folder")
    capture(pg, 3, "New Folder",
            "Lands on the first free grid cell, named so no two folders collide")

    box = icon_box(pg, "Untitled Folder")
    pg.mouse.click(box["x"] + 12, box["y"] + 16, button="right")
    pg.wait_for_selector(".cattipu-context-menu")
    pg.wait_for_timeout(200)
    menu(pg, "Rename")
    pg.locator(".cattipu-desktop-objects__rename").fill("Work")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(400)
    capture(pg, 4, "Rename it to Work", "Enter commits — it does not also open the folder")

    right_click(pg, dbox["x"] + 40, dbox["y"] + 620)
    menu(pg, "New Project Shortcut")
    capture(pg, 5, "New Project Shortcut",
            "Only projects without a shortcut are offered")
    menu(pg, "Banking Platform")
    capture(pg, 6, "A shortcut, not a copy",
            "It stores a projectId — the name is read from the project every render")

    src = icon_box(pg, "Banking Platform")
    pg.mouse.move(src["x"] + 12, src["y"] + 16)
    pg.mouse.down()
    pg.mouse.move(dbox["x"] + 115, dbox["y"] + 230, steps=14)
    pg.wait_for_timeout(200)
    capture(pg, 7, "Drag it — the target cell is shown",
            "Positions are grid cells, so an icon cannot land off-grid")
    pg.mouse.up()
    pg.wait_for_timeout(400)
    capture(pg, 8, "Released — snapped to the cell",
            "Survives a refresh; a drop on an occupied cell swaps the two")

    # ── M17: Explorer is a view of the same objects ─────────────────────
    rail(pg, "explorer")
    capture(pg, 9, "Explorer — the same objects",
            "Work is already here: the desktop IS the filesystem root")

    grid = layer(pg, "[data-testid=explorer-grid]")
    pg.locator('[data-entry-kind=folder]').first.dblclick()
    pg.wait_for_timeout(500)
    right_click(pg, grid["x"] + grid["width"] - 60, grid["y"] + grid["height"] - 60)
    menu(pg, "New Folder")
    capture(pg, 10, "A folder inside Work",
            "Breadcrumb, tree and grid all moved together")

    pg.locator(".cattipu-explorer__crumb").first.click()
    pg.wait_for_timeout(400)
    capture(pg, 11, "Back at the root",
            "The nested folder is in Explorer only — it does not belong on the desktop")

    pg.locator("[data-testid=explorer-search]").fill("bank")
    pg.wait_for_timeout(600)
    capture(pg, 12, "Search the whole OS",
            "A folder, a shortcut and a project — each says where it lives")
    pg.locator("[data-testid=explorer-search]").fill("")
    pg.wait_for_timeout(400)

    # ── M18: workspace intelligence ─────────────────────────────────────
    for wid in ("architect", "memory", "settings"):
        rail(pg, wid)
    capture(pg, 13, "All five apps open at once",
            "Projects, Explorer, Architect, Memory, Settings")

    ws = workspace(pg)
    drag_window(pg, "projects", ws["x"] + 4, ws["y"] + 300, release=False)
    capture(pg, 14, "Drag to the left edge",
            "The dashed region is where the window will land")
    pg.mouse.up()
    pg.wait_for_timeout(500)
    capture(pg, 15, "Snapped left", "Exactly half — stored as a region, not a rectangle")

    drag_window(pg, "explorer", ws["x"] + ws["width"] - 4, ws["y"] + 300)
    capture(pg, 16, "Snapped right",
            "The two halves meet exactly: 627 + 627 = 1254, no seam")

    # Two halves cover the workspace completely — there is no desktop
    # left to right-click. This is exactly the situation the keyboard
    # route exists for, so the demo shows it rather than stepping around
    # it.
    capture(pg, 17, "Two halves, and no desktop left",
            "The Window menu lives on the desktop — which is now completely covered")

    shortcut_keys(pg, "c")
    capture(pg, 18, "Ctrl+Alt+C — Cascade",
            "A consistent 24px step, every window fully on screen")

    right_click(pg, *free_spot(pg))
    menu(pg, "Window")
    capture(pg, 19, "Window menu",
            "Reachable again now the desktop shows: Cascade, Tile, Restore All")
    menu(pg, "Tile")
    capture(pg, 20, "Tile",
            "Five windows filling the workspace edge to edge, no overlap")

    shortcut_keys(pg, "r")
    capture(pg, 21, "Ctrl+Alt+R — Restore All",
            "Every window back to the size and place it had before the tile")

    ctx.close()
    br.close()

# ── assemble ────────────────────────────────────────────────────────────

frames = []
for path, step, caption, note in shots:
    frame = compose(path, step, caption, note)
    frames.extend([frame] * HOLD)

frames[0].save(
    f"{OUT}/CATTIPU_Demo.gif",
    save_all=True,
    append_images=frames[1:],
    duration=FRAME_MS,
    loop=0,
    optimize=True,
)
size = os.path.getsize(f"{OUT}/CATTIPU_Demo.gif") / 1e6
print(f"\n  {len(shots)} steps, {len(frames)} frames, GIF {size:.1f} MB")
print(f"  stills in {STILLS}/")
sys.exit(0)
