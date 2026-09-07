# -*- coding: utf-8 -*-
"""M17 Real File Explorer — behavioural verification and screenshots.

Every claim in M17_REPORT.md is produced by this script. Positions and
listings are read from the DOM, cross-surface sync is checked by looking
at BOTH surfaces after a single action, and the scroll checks compare
measured geometry rather than appearance.
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
BOOT_MS = 7000

EXPLORER = ".cattipu-managed-window[data-window-id=explorer]"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


# ── page helpers ────────────────────────────────────────────────────────

def open_explorer(pg):
    pg.locator("button", has_text="Explorer").first.click()
    pg.wait_for_selector("[data-testid=explorer]", timeout=5000)
    pg.wait_for_timeout(300)


def grid_items(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('[data-testid=explorer-item]')].map(e => ({
            id: e.dataset.entryId, kind: e.dataset.entryKind,
            label: (e.querySelector('.cattipu-explorer__item-label')||{}).textContent || '',
            where: (e.querySelector('.cattipu-explorer__item-where')||{}).textContent || null,
        }))"""
    )


def crumbs(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('[data-testid=explorer-crumb]')]"
        ".map(e => e.textContent.trim())"
    )


def tree_rows(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('.cattipu-explorer__tree .cattipu-folder-tree-item__row')]
            .map(r => ({label: r.querySelector('.cattipu-folder-tree-item__label').textContent,
                        selected: r.dataset.selected === 'true',
                        depth: +r.closest('.cattipu-folder-tree-item').dataset.depth}))"""
    )


def desktop_icons(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('[data-object-id]')].map(e => ({
            id: e.dataset.objectId, kind: e.dataset.objectKind,
            label: (e.querySelector('.cattipu-desktop-objects__label')||{}).textContent || '',
        }))"""
    )


def project_names(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-project-card__title')]"
        ".map(e => e.textContent.trim().replace(/\\s*\\(v[^)]*\\)$/, ''))"
    )


def menu_labels(pg):
    return pg.evaluate(
        """() => [...document.querySelectorAll('.cattipu-context-menu__item')].map(b => ({
            label: b.querySelector('.cattipu-context-menu__label').textContent,
            disabled: b.dataset.disabled === 'true'}))"""
    )


def menu_click(pg, label):
    pg.locator(".cattipu-context-menu__item", has_text=label).first.click()
    pg.wait_for_timeout(250)


def grid_menu(pg):
    """Right-click empty grid space, below whatever is listed."""
    box = pg.locator("[data-testid=explorer-grid]").bounding_box()
    pg.mouse.click(box["x"] + box["width"] - 40, box["y"] + box["height"] - 40,
                   button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)


def item_menu(pg, entry_id):
    box = pg.locator(f'[data-entry-id="{entry_id}"]').bounding_box()
    pg.mouse.click(box["x"] + 12, box["y"] + 16, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)


def open_item(pg, entry_id):
    box = pg.locator(f'[data-entry-id="{entry_id}"]').bounding_box()
    pg.mouse.dblclick(box["x"] + 12, box["y"] + 16)
    pg.wait_for_timeout(400)


def new_folder(pg):
    before = {i["id"] for i in grid_items(pg)}
    grid_menu(pg)
    menu_click(pg, "New Folder")
    after = grid_items(pg)
    created = [i for i in after if i["id"] not in before]
    return created[0] if created else None


def rename_item(pg, entry_id, name):
    item_menu(pg, entry_id)
    menu_click(pg, "Rename")
    pg.locator(".cattipu-explorer__rename").fill(name)
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(300)


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)
    open_explorer(pg)

    # ── 1. Explorer reads the real OS, not a mock ───────────────────────
    items = grid_items(pg)
    names = project_names(pg)
    check("Explorer's root lists the OS's real projects",
          sorted(i["label"] for i in items) == sorted(names), f"{items} vs {names}")
    check("the old mock filesystem is gone",
          not any(i["label"] in ("Apps", "Assets", "Templates", "Downloads")
                  for i in items),
          str([i["label"] for i in items]))
    check("the breadcrumb starts at the OS root", crumbs(pg) == ["CATTIPU OS"],
          str(crumbs(pg)))
    pg.screenshot(path=f"{OUT}/Explorer_Empty.png",
                  clip=pg.locator(EXPLORER).bounding_box())

    # ── 2. folders sync: Explorer -> tree, grid and desktop ─────────────
    created = new_folder(pg)
    check("New Folder appears in the grid immediately",
          created is not None and created["kind"] == "folder", str(created))
    check("...and in the folder tree in the same render",
          any(r["label"] == "Untitled Folder" for r in tree_rows(pg)),
          str([r["label"] for r in tree_rows(pg)]))
    check("...and on the desktop, because the root IS the desktop",
          any(d["label"] == "Untitled Folder" for d in desktop_icons(pg)),
          str([d["label"] for d in desktop_icons(pg)]))

    rename_item(pg, created["id"], "Work")
    check("renaming in Explorer renames the one shared object",
          any(i["label"] == "Work" for i in grid_items(pg))
          and any(r["label"] == "Work" for r in tree_rows(pg))
          and any(d["label"] == "Work" for d in desktop_icons(pg)),
          f"grid={[i['label'] for i in grid_items(pg)]} "
          f"tree={[r['label'] for r in tree_rows(pg)]} "
          f"desk={[d['label'] for d in desktop_icons(pg)]}")

    # ── 3. breadcrumbs, tree selection and grid move together ───────────
    work_id = [i["id"] for i in grid_items(pg) if i["label"] == "Work"][0]
    open_item(pg, work_id)
    check("opening a folder updates the breadcrumbs",
          crumbs(pg) == ["CATTIPU OS", "Work"], str(crumbs(pg)))
    check("...the tree selection",
          [r["label"] for r in tree_rows(pg) if r["selected"]] == ["Work"],
          str([(r["label"], r["selected"]) for r in tree_rows(pg)]))
    check("...and the grid", grid_items(pg) == [], str(grid_items(pg)))

    # ── 4. nested folders are in Explorer and NOT on the desktop ────────
    nested = new_folder(pg)
    rename_item(pg, nested["id"], "Clients")
    check("a folder made inside a folder is listed there",
          [i["label"] for i in grid_items(pg)] == ["Clients"],
          str(grid_items(pg)))
    check("...and does NOT appear on the desktop",
          not any(d["label"] == "Clients" for d in desktop_icons(pg)),
          str([d["label"] for d in desktop_icons(pg)]))
    rows = {r["label"]: r["depth"] for r in tree_rows(pg)}
    check("...but is nested one level under Work in the tree",
          rows.get("Clients") == rows.get("Work", -99) + 1,
          str(rows))

    # ── 5. desktop -> Explorer, the other direction ─────────────────────
    layer = pg.locator("[data-testid=desktop-object-layer]").bounding_box()
    pg.mouse.click(layer["x"] + 40, layer["y"] + 500, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)
    menu_click(pg, "New Folder")
    desk_names = [d["label"] for d in desktop_icons(pg)]
    check("a folder made on the desktop exists straight away",
          "Untitled Folder" in desk_names, str(desk_names))
    # Explorer is still standing in Work, so the new root folder must NOT
    # be in this listing - the sync is real, not "everything everywhere".
    check("...and is not shown in the folder Explorer is standing in",
          not any(i["label"] == "Untitled Folder" for i in grid_items(pg)),
          str(grid_items(pg)))
    pg.locator("[data-testid=explorer-up]").click()
    pg.wait_for_timeout(300)
    check("...and IS in Explorer's root the moment you go there",
          any(i["label"] == "Untitled Folder" for i in grid_items(pg)),
          str([i["label"] for i in grid_items(pg)]))
    check("the up button returns to the root breadcrumb",
          crumbs(pg) == ["CATTIPU OS"], str(crumbs(pg)))

    pg.screenshot(path=f"{OUT}/Explorer_WithFolders.png",
                  clip=pg.locator(EXPLORER).bounding_box())

    # ── 6. search ───────────────────────────────────────────────────────
    pg.locator("[data-testid=explorer-search]").fill("clie")
    pg.wait_for_timeout(350)
    hits = grid_items(pg)
    check("search finds a folder that is not in the current listing",
          [h["label"] for h in hits] == ["Clients"], str(hits))
    check("...and says where it lives",
          hits[0]["where"] == "CATTIPU OS / Work", str(hits[0]["where"]))
    check("the breadcrumb reports the search, not a stale folder",
          crumbs(pg) == ['Search: "clie"'], str(crumbs(pg)))

    # All three kinds have to be reachable by one query, so the fixture
    # gets a folder and a shortcut whose names share a stem with a
    # project. ("a" was the first attempt and matched no folder at all,
    # so it tested the fixture rather than the search.)
    pg.locator("[data-testid=explorer-search]").fill("")
    pg.wait_for_timeout(250)
    bank = new_folder(pg)
    rename_item(pg, bank["id"], "Bank Records")
    layer = pg.locator("[data-testid=desktop-object-layer]").bounding_box()
    pg.mouse.click(layer["x"] + 40, layer["y"] + 600, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)
    menu_click(pg, "New Project Shortcut")
    menu_click(pg, "Banking Platform")

    pg.locator("[data-testid=explorer-search]").fill("bank")
    pg.wait_for_timeout(350)
    hits = grid_items(pg)
    kinds = {h["kind"] for h in hits}
    check("search covers folders, projects and shortcuts",
          {"folder", "project", "project-shortcut"} <= kinds,
          str([(h["kind"], h["label"]) for h in hits]))
    check("a prefix match is listed before a mid-word match",
          [h["label"] for h in hits][0].lower().startswith("bank"),
          str([h["label"] for h in hits]))

    pg.screenshot(path=f"{OUT}/Explorer_Search.png",
                  clip=pg.locator(EXPLORER).bounding_box())

    pg.locator("[data-testid=explorer-search]").fill("")
    pg.wait_for_timeout(350)
    check("clearing the search restores the folder you were in",
          crumbs(pg) == ["CATTIPU OS"] and len(grid_items(pg)) > 0,
          f"{crumbs(pg)} {len(grid_items(pg))}")

    # ── 7. move ─────────────────────────────────────────────────────────
    stray = [i for i in grid_items(pg) if i["label"] == "Untitled Folder"][0]
    item_menu(pg, stray["id"])
    labels = [m["label"] for m in menu_labels(pg)]
    check("a folder's menu is Open / Rename / Move to / Delete",
          labels == ["Open", "Rename", "Move to", "Delete"], str(labels))
    menu_click(pg, "Move to")
    targets = [m["label"] for m in menu_labels(pg)]
    check("Move to offers folders but never the folder itself",
          "Work" in targets and "Untitled Folder" not in targets, str(targets))
    menu_click(pg, "Work")
    check("a moved folder leaves the desktop",
          not any(d["label"] == "Untitled Folder" for d in desktop_icons(pg)),
          str([d["label"] for d in desktop_icons(pg)]))
    check("...and leaves the root listing",
          not any(i["label"] == "Untitled Folder" for i in grid_items(pg)),
          str([i["label"] for i in grid_items(pg)]))
    open_item(pg, work_id)
    check("...and is inside its new parent",
          sorted(i["label"] for i in grid_items(pg)) == ["Clients", "Untitled Folder"],
          str([i["label"] for i in grid_items(pg)]))
    pg.locator("[data-testid=explorer-up]").click()
    pg.wait_for_timeout(300)

    # ── 8. projects ─────────────────────────────────────────────────────
    proj = [i for i in grid_items(pg) if i["kind"] == "project"][0]
    item_menu(pg, proj["id"])
    labels = [m["label"] for m in menu_labels(pg)]
    check("a project's menu is Open / Rename / Duplicate / Delete",
          labels == ["Open", "Rename", "Duplicate", "Delete"], str(labels))
    before = len(project_names(pg))
    menu_click(pg, "Duplicate")
    after = len(project_names(pg))
    check("Duplicate adds one project, visible in Explorer and Projects",
          after == before + 1
          and len([i for i in grid_items(pg) if i["kind"] == "project"]) == after,
          f"{before} -> {after}")

    count_before = len(project_names(pg))
    z_before = pg.evaluate(
        "() => Object.fromEntries([...document.querySelectorAll('.cattipu-managed-window')]"
        ".map(w => [w.dataset.windowId, parseInt(getComputedStyle(w).zIndex,10)]))")
    open_item(pg, proj["id"])
    z_after = pg.evaluate(
        "() => Object.fromEntries([...document.querySelectorAll('.cattipu-managed-window')]"
        ".map(w => [w.dataset.windowId, parseInt(getComputedStyle(w).zIndex,10)]))")
    check("opening a project from Explorer raises the Projects window",
          z_after["projects"] == max(z_after.values())
          and z_after["projects"] > z_before["projects"], f"{z_before} -> {z_after}")
    check("...and creates no second project record",
          len(project_names(pg)) == count_before,
          f"{count_before} -> {len(project_names(pg))}")

    # ── 9. no overlap ───────────────────────────────────────────────────
    open_explorer(pg)
    boxes = pg.evaluate(
        "() => [...document.querySelectorAll('[data-testid=explorer-item]')]"
        ".map(e => { const b = e.getBoundingClientRect();"
        " return {l:b.left, t:b.top, r:b.right, b:b.bottom}; })")
    overlaps = [
        (i, j)
        for i in range(len(boxes)) for j in range(i + 1, len(boxes))
        if not (boxes[i]["r"] <= boxes[j]["l"] + 0.5 or boxes[j]["r"] <= boxes[i]["l"] + 0.5
                or boxes[i]["b"] <= boxes[j]["t"] + 0.5 or boxes[j]["b"] <= boxes[i]["t"] + 0.5)
    ]
    check("no two grid entries overlap", not overlaps, str(overlaps[:3]))

    # ── 10. scroll behaviour ────────────────────────────────────────────
    geo = pg.evaluate(
        """() => {
            const ex = document.querySelector('[data-testid=explorer]');
            const gr = document.querySelector('[data-testid=explorer-grid]');
            const win = document.querySelector('%s');
            const de = document.documentElement;
            return {
              exOverflowX: ex.scrollWidth - ex.clientWidth,
              exOverflowY: ex.scrollHeight - ex.clientHeight,
              gridScrolls: gr.scrollHeight > gr.clientHeight,
              gridOverflowX: gr.scrollWidth - gr.clientWidth,
              winH: win.getBoundingClientRect().height,
              pageScrollX: de.scrollWidth - de.clientWidth,
              pageScrollY: de.scrollHeight - de.clientHeight,
            };
        }""" % EXPLORER
    )
    check("Explorer never scrolls as a whole — its panes do",
          geo["exOverflowX"] <= 0 and geo["exOverflowY"] <= 0, str(geo))
    check("the grid never scrolls sideways", geo["gridOverflowX"] <= 0, str(geo))
    check("the page itself gains no scrollbars",
          geo["pageScrollX"] <= 0 and geo["pageScrollY"] <= 0, str(geo))

    # A folder with far more entries than fit: the grid must take the
    # overflow as its own scroll and the window must not grow.
    pg.evaluate(
        """() => {
            const raw = JSON.parse(localStorage.getItem('cattipu-desktop'));
            const objs = raw.state.objects;
            for (let i = 0; i < 40; i += 1) {
              objs.push({id:'bulk-'+i, kind:'folder', label:'Bulk '+i,
                         parentId:null, position:{col:0,row:0},
                         createdAt:'2026-01-01T00:00:00.000Z'});
            }
            localStorage.setItem('cattipu-desktop', JSON.stringify(raw));
        }"""
    )
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)
    open_explorer(pg)
    geo2 = pg.evaluate(
        """() => {
            const ex = document.querySelector('[data-testid=explorer]');
            const gr = document.querySelector('[data-testid=explorer-grid]');
            const win = document.querySelector('%s');
            const de = document.documentElement;
            return {
              count: document.querySelectorAll('[data-testid=explorer-item]').length,
              gridScrolls: gr.scrollHeight > gr.clientHeight + 1,
              exOverflowY: ex.scrollHeight - ex.clientHeight,
              gridOverflowX: gr.scrollWidth - gr.clientWidth,
              winH: win.getBoundingClientRect().height,
              pageScrollY: de.scrollHeight - de.clientHeight,
            };
        }""" % EXPLORER
    )
    boxes2 = pg.evaluate(
        "() => [...document.querySelectorAll('[data-testid=explorer-item]')]"
        ".map(e => { const b = e.getBoundingClientRect();"
        " return {l:b.left, t:b.top, r:b.right, b:b.bottom}; })")
    crowded_overlaps = [
        (i, j)
        for i in range(len(boxes2)) for j in range(i + 1, len(boxes2))
        if not (boxes2[i]["r"] <= boxes2[j]["l"] + 0.5
                or boxes2[j]["r"] <= boxes2[i]["l"] + 0.5
                or boxes2[i]["b"] <= boxes2[j]["t"] + 0.5
                or boxes2[j]["b"] <= boxes2[i]["t"] + 0.5)
    ]
    check("no overlap in a listing of 45 entries either",
          not crowded_overlaps and len(boxes2) > 40,
          f"{len(boxes2)} entries, {len(crowded_overlaps)} overlaps")

    check("a listing too tall to fit scrolls inside the grid pane",
          geo2["gridScrolls"] and geo2["count"] > 40, str(geo2))
    check("...without growing the window", abs(geo2["winH"] - geo["winH"]) < 1,
          f"{geo['winH']} -> {geo2['winH']}")
    check("...and without giving the page a scrollbar",
          geo2["pageScrollY"] <= 0 and geo2["exOverflowY"] <= 0, str(geo2))

    # ── 11. the v1 -> v2 migration ──────────────────────────────────────
    ctx2 = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg2 = ctx2.new_page()
    pg2.goto(URL, wait_until="networkidle")
    pg2.evaluate(
        """() => localStorage.setItem('cattipu-desktop', JSON.stringify({
            version: 1,
            state: {objects: [{id:'legacy-1', kind:'folder', label:'From M16',
                               position:{col:0,row:0},
                               createdAt:'2026-01-01T00:00:00.000Z'}],
                    wallpaper: null},
        }))"""
    )
    pg2.reload(wait_until="networkidle")
    pg2.wait_for_timeout(BOOT_MS)
    check("an M16 desktop folder survives the upgrade and lands at the root",
          any(d["label"] == "From M16" for d in desktop_icons(pg2)),
          str([d["label"] for d in desktop_icons(pg2)]))
    open_explorer(pg2)
    check("...and is in Explorer's root too",
          any(i["label"] == "From M16" for i in grid_items(pg2)),
          str([i["label"] for i in grid_items(pg2)]))
    ctx2.close()
    ctx.close()
    br.close()

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/m17.json", "w"), indent=1)
sys.exit(1 if failed else 0)
