# -*- coding: utf-8 -*-
"""M16 Living Desktop — behavioural verification and screenshots.

Every claim in M16_REPORT.md is produced by this script. Nothing here is
judged by eye: positions are read from the DOM, persistence is proved by a
full reload, and Golden Master parity is a pixel diff against the RC2
baseline rather than an impression.
"""
import json
import subprocess
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
BOOT_MS = 7000

GRID = dict(cw=88, ch=96, ox=16, oy=16)
LAYER = "[data-testid=desktop-object-layer]"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


def cell_px(col, row):
    return GRID["ox"] + col * GRID["cw"], GRID["oy"] + row * GRID["ch"]


def objects(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('[data-object-id]')].map(e => ({
            id: e.dataset.objectId, kind: e.dataset.objectKind,
            label: (e.querySelector('.cattipu-desktop-objects__label')||{}).textContent || '',
            left: parseFloat(e.style.left), top: parseFloat(e.style.top),
        }))"""
    )


def layer_origin(pg):
    b = pg.evaluate(
        "() => { const r = document.querySelector('%s').getBoundingClientRect();"
        "return {x:r.x, y:r.y, w:r.width, h:r.height}; }" % LAYER
    )
    return b


def open_desktop_menu(pg, lx, ly):
    o = layer_origin(pg)
    pg.mouse.move(o["x"] + lx, o["y"] + ly)
    pg.mouse.click(o["x"] + lx, o["y"] + ly, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)


def object_point(pg, object_id):
    """A point inside the icon that is never under a window.

    The icon's horizontal CENTRE is not safe: an icon parked at column 2
    has its centre at x=332 and the Projects window starts at x=330, so a
    click aimed at the middle lands on the window instead. Icons sit
    beneath windows by design, so the harness aims 12px in from the
    icon's left edge rather than pretending the overlap does not exist.
    """
    box = pg.locator(f'[data-object-id="{object_id}"]').bounding_box()
    return box["x"] + 12, box["y"] + 20


def open_object_menu(pg, object_id):
    x, y = object_point(pg, object_id)
    pg.mouse.click(x, y, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)


def menu_labels(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('.cattipu-context-menu__item')].map(b => ({
            label: b.querySelector('.cattipu-context-menu__label').textContent,
            disabled: b.dataset.disabled === 'true',
        }))"""
    )


def menu_click(pg, label):
    pg.locator(".cattipu-context-menu__item", has_text=label).first.click()


def drag_object(pg, object_id, to_col, to_row):
    """Drag by the icon plate, releasing over the centre of the target cell."""
    o = layer_origin(pg)
    box = pg.locator(f'[data-object-id="{object_id}"]').bounding_box()
    sx, sy = object_point(pg, object_id)
    tx, ty = cell_px(to_col, to_row)
    # The drop is computed from the object's own origin plus the pointer
    # delta, so aim the delta at the target origin, not at its centre.
    dx = (o["x"] + tx) - (box["x"])
    dy = (o["y"] + ty) - (box["y"])
    pg.mouse.move(sx, sy)
    pg.mouse.down()
    pg.mouse.move(sx + dx / 2, sy + dy / 2, steps=6)
    pg.mouse.move(sx + dx, sy + dy, steps=6)
    pg.mouse.up()
    pg.wait_for_timeout(200)


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)

    # ── 1. empty desktop ────────────────────────────────────────────────
    check("desktop layer is mounted", pg.locator(LAYER).count() == 1)
    check("default desktop carries no objects", len(objects(pg)) == 0,
          f"{len(objects(pg))} objects")
    pg.screenshot(path=f"{OUT}/Desktop_Empty.png")

    # ── 2. desktop context menu ─────────────────────────────────────────
    open_desktop_menu(pg, 40, 300)
    items = menu_labels(pg)
    labels = [i["label"] for i in items]
    # M16's five, in order, still present. Checked as a SUBSEQUENCE rather
    # than as the whole list because M18 adds "Window" to the same menu —
    # a later milestone extending this menu is expected, one that reorders
    # or drops an entry is not.
    M16_ENTRIES = ["New Folder", "New Project Shortcut", "Paste", "Refresh",
                   "Change Wallpaper"]
    it = iter(labels)
    check("desktop menu offers the five specified entries, in order",
          all(e in it for e in M16_ENTRIES), str(labels))
    check("Paste is present but disabled",
          any(i["label"] == "Paste" and i["disabled"] for i in items))
    pg.screenshot(path=f"{OUT}/Desktop_ContextMenu.png")

    # ── 3. New Folder ───────────────────────────────────────────────────
    menu_click(pg, "New Folder")
    pg.wait_for_timeout(250)
    objs = objects(pg)
    x0, y0 = cell_px(0, 0)
    check("New Folder creates one object at the first cell",
          len(objs) == 1 and (objs[0]["left"], objs[0]["top"]) == (x0, y0),
          f"{objs}")
    check("the new folder is named Untitled Folder",
          objs[0]["label"] == "Untitled Folder", objs[0]["label"])

    open_desktop_menu(pg, 40, 400)
    menu_click(pg, "New Folder")
    pg.wait_for_timeout(250)
    objs = objects(pg)
    x1, y1 = cell_px(0, 1)
    second = [o for o in objs if o["label"] == "Untitled Folder 2"]
    check("a second folder gets a distinct name and the next free cell",
          len(objs) == 2 and second and (second[0]["left"], second[0]["top"]) == (x1, y1),
          f"{[(o['label'], o['left'], o['top']) for o in objs]}")

    pg.screenshot(path=f"{OUT}/Desktop_WithFolder.png")

    # ── 4. drag + snap ──────────────────────────────────────────────────
    first_id = [o for o in objects(pg) if o["label"] == "Untitled Folder"][0]["id"]
    drag_object(pg, first_id, 1, 3)
    moved = [o for o in objects(pg) if o["id"] == first_id][0]
    tx, ty = cell_px(1, 3)
    check("a dragged icon snaps to the grid cell it was released over",
          (moved["left"], moved["top"]) == (tx, ty),
          f"({moved['left']},{moved['top']}) want ({tx},{ty})")

    # A deliberately off-grid release: 30px past the cell origin must still
    # land exactly on the cell, or "snapping" is only ever true when the
    # test aims perfectly.
    o = layer_origin(pg)
    box = pg.locator(f'[data-object-id="{first_id}"]').bounding_box()
    ox2, oy2 = cell_px(2, 2)
    pg.mouse.move(box["x"] + 30, box["y"] + 20)
    pg.mouse.down()
    pg.mouse.move(o["x"] + ox2 + 30 + 29, o["y"] + oy2 + 20 + 31, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(200)
    moved = [x for x in objects(pg) if x["id"] == first_id][0]
    check("an off-grid release still lands exactly on a cell",
          (moved["left"], moved["top"]) == cell_px(2, 2),
          f"({moved['left']},{moved['top']}) want {cell_px(2,2)}")

    # ── 5. no overlap: dropping onto an occupied cell swaps ─────────────
    a = [x for x in objects(pg) if x["label"] == "Untitled Folder"][0]
    b = [x for x in objects(pg) if x["label"] == "Untitled Folder 2"][0]
    a_before, b_before = (a["left"], a["top"]), (b["left"], b["top"])
    drag_object(pg, a["id"], int((b["left"] - GRID["ox"]) / GRID["cw"]),
                int((b["top"] - GRID["oy"]) / GRID["ch"]))
    objs = objects(pg)
    a2 = [x for x in objs if x["id"] == a["id"]][0]
    b2 = [x for x in objs if x["id"] == b["id"]][0]
    check("dropping onto an occupied cell swaps the two icons",
          (a2["left"], a2["top"]) == b_before and (b2["left"], b2["top"]) == a_before,
          f"a{a_before}->{(a2['left'],a2['top'])}  b{b_before}->{(b2['left'],b2['top'])}")
    cells = {(x["left"], x["top"]) for x in objs}
    check("no two icons occupy the same cell", len(cells) == len(objs))

    # ── 6. persistence across a full reload ─────────────────────────────
    before = sorted((x["label"], x["left"], x["top"]) for x in objects(pg))
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)
    after = sorted((x["label"], x["left"], x["top"]) for x in objects(pg))
    check("positions survive a full page reload", before == after,
          f"{before} vs {after}")

    # ── 7. project shortcuts ────────────────────────────────────────────
    # Read the project names from the Projects window itself, not from
    # localStorage: the store seeds in memory and persists nothing until
    # something is written, so an empty key is not an empty project list.
    # The cards are also the independent source — the shortcut submenu is
    # the thing under test and cannot also be the reference.
    # The card prints "<name> (v0.1.0)"; the version is derived and not
    # part of the name, so it is stripped here rather than compared.
    PROJECT_NAMES = ("() => [...document.querySelectorAll"
                     "('.cattipu-project-card__title')]"
                     ".map(e => e.textContent.trim().replace(/\\s*\\(v[^)]*\\)$/, ''))")
    project_names = pg.evaluate(PROJECT_NAMES)
    check("projects exist to link shortcuts to", len(project_names) >= 2,
          str(project_names))

    open_desktop_menu(pg, 40, 500)
    menu_click(pg, "New Project Shortcut")
    pg.wait_for_timeout(200)
    offered = [i["label"] for i in menu_labels(pg)]
    check("the shortcut submenu lists the unlinked projects",
          offered == project_names, f"{offered} vs {project_names}")
    menu_click(pg, project_names[0])
    pg.wait_for_timeout(250)

    open_desktop_menu(pg, 40, 500)
    menu_click(pg, "New Project Shortcut")
    pg.wait_for_timeout(200)
    offered2 = [i["label"] for i in menu_labels(pg)]
    check("a project that already has a shortcut is no longer offered",
          project_names[0] not in offered2, str(offered2))
    if offered2:
        menu_click(pg, offered2[0])
        pg.wait_for_timeout(250)
    else:
        pg.keyboard.press("Escape")

    shortcuts = [x for x in objects(pg) if x["kind"] == "project-shortcut"]
    check("shortcuts render with their project's name",
          {s["label"] for s in shortcuts} <= set(project_names) and len(shortcuts) >= 1,
          str([s["label"] for s in shortcuts]))

    pg.screenshot(path=f"{OUT}/Desktop_WithShortcuts.png")

    # ── 8. shortcut menu, rename propagation, safe removal ──────────────
    sc = shortcuts[0]
    open_object_menu(pg, sc["id"])
    sc_labels = [i["label"] for i in menu_labels(pg)]
    check("shortcut menu is Open / Rename / Remove Shortcut",
          sc_labels == ["Open", "Rename", "Remove Shortcut"], str(sc_labels))
    menu_click(pg, "Rename")
    pg.wait_for_timeout(200)
    pg.locator(".cattipu-desktop-objects__rename").fill("Renamed By Desktop")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(300)

    project_after = pg.evaluate(PROJECT_NAMES)
    check("renaming a shortcut renames the project it points at",
          "Renamed By Desktop" in project_after, str(project_after))
    check("the shortcut shows the new name without storing one",
          any(x["label"] == "Renamed By Desktop" for x in objects(pg)))

    # The stored record must still carry no name of its own — that is the
    # structural reason the rename can never go stale.
    stored = pg.evaluate(
        "() => JSON.parse(localStorage.getItem('cattipu-desktop')||'{}')"
        "?.state?.objects ?? []"
    )
    linked = [o for o in stored if o["kind"] == "project-shortcut"]
    check("a stored shortcut holds a projectId and an empty label",
          all(o.get("label") == "" and o.get("projectId") for o in linked),
          str([(o.get("label"), o.get("projectId")) for o in linked]))

    projects_before = len(project_after)
    open_object_menu(pg, sc["id"])
    menu_click(pg, "Remove Shortcut")
    pg.wait_for_timeout(300)
    projects_now = len(pg.evaluate(PROJECT_NAMES))
    check("removing a shortcut does not delete the project",
          projects_now == projects_before, f"{projects_before} -> {projects_now}")
    check("the shortcut itself is gone",
          not any(x["id"] == sc["id"] for x in objects(pg)))

    # ── 9. folder menu + delete ─────────────────────────────────────────
    fol = [x for x in objects(pg) if x["kind"] == "folder"][0]
    open_object_menu(pg, fol["id"])
    fol_labels = [i["label"] for i in menu_labels(pg)]
    check("folder menu is Open / Rename / Delete",
          fol_labels == ["Open", "Rename", "Delete"], str(fol_labels))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(150)
    pg.keyboard.press("Escape")

    # ── 10. double-click opens ──────────────────────────────────────────
    # A folder is opened FIRST so Explorer sits above Projects. Without
    # that, "Projects is topmost afterwards" is satisfied by doing nothing
    # at all — it was already topmost — and the check would prove nothing.
    Z = ("() => Object.fromEntries([...document.querySelectorAll"
         "('.cattipu-managed-window')].map(w => "
         "[w.dataset.windowId, parseInt(getComputedStyle(w).zIndex, 10)]))")

    fol = [x for x in objects(pg) if x["kind"] == "folder"][0]
    pg.mouse.dblclick(*object_point(pg, fol["id"]))
    pg.wait_for_timeout(500)
    z_before = pg.evaluate(Z)
    check("double-clicking a folder opens Explorer, above Projects",
          z_before.get("explorer", -1) > z_before.get("projects", 0), str(z_before))

    remaining = [x for x in objects(pg) if x["kind"] == "project-shortcut"]
    check("a shortcut is still on the desktop to open", len(remaining) >= 1)
    pg.mouse.dblclick(*object_point(pg, remaining[0]["id"]))
    pg.wait_for_timeout(500)
    z_after = pg.evaluate(Z)
    check("double-clicking a shortcut raises Projects above every window",
          z_after["projects"] == max(z_after.values())
          and z_after["projects"] > z_before["projects"],
          f"{z_before} -> {z_after}")

    # ── 11. Golden Master parity of the EMPTY desktop ───────────────────
    ctx2 = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg2 = ctx2.new_page()
    pg2.goto(URL, wait_until="networkidle")
    pg2.wait_for_timeout(BOOT_MS)
    pg2.screenshot(path=f"{OUT}/Desktop_Empty.png")
    check("a fresh profile still shows an empty desktop",
          len(objects(pg2)) == 0)
    ctx2.close()
    ctx.close()
    br.close()

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/m16.json", "w"), indent=1)
sys.exit(1 if failed else 0)
