# -*- coding: utf-8 -*-
"""M18 Workspace Intelligence — behavioural verification and screenshots.

Geometry is read from the live DOM and compared against the workspace box
the shell actually computes, not against hardcoded numbers. Restore is
checked on all three of size, position and z-order. Clipping and overlap
are measured pairwise.
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
BOOT_MS = 7000
LAYER = ".cattipu-interactive-desktop__window-layer"
TITLE_BAR_H = 38

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


# ── helpers ─────────────────────────────────────────────────────────────

def workspace(pg):
    return pg.evaluate(
        "() => { const r = document.querySelector('%s').getBoundingClientRect();"
        " return {x:r.x, y:r.y, width:Math.round(r.width), height:Math.round(r.height)}; }"
        % LAYER
    )


def windows(pg):
    """Every managed window, in workspace coordinates."""
    return pg.evaluate(
        """() => {
            const layer = document.querySelector('%s').getBoundingClientRect();
            return Object.fromEntries(
              [...document.querySelectorAll('.cattipu-managed-window')].map(w => {
                const b = w.getBoundingClientRect();
                return [w.dataset.windowId, {
                  x: Math.round(b.x - layer.x), y: Math.round(b.y - layer.y),
                  width: Math.round(b.width), height: Math.round(b.height),
                  z: parseInt(getComputedStyle(w).zIndex, 10),
                  mode: w.dataset.mode, snap: w.dataset.snap || null,
                  visible: w.dataset.visible === 'true',
                }];
              }));
        }""" % LAYER
    )


def visible(pg):
    return {k: v for k, v in windows(pg).items() if v["visible"]}


def open_all(pg):
    for label in ("Architect", "Memory", "Explorer", "Settings"):
        pg.locator("button", has_text=label).first.click()
        pg.wait_for_timeout(250)


def title_bar(pg, wid):
    box = pg.locator(
        f'.cattipu-managed-window[data-window-id={wid}] .cattipu-window__titlebar'
    ).bounding_box()
    return box


RAIL = {"projects": "Projects", "architect": "Architect", "memory": "Memory",
        "explorer": "Explorer", "settings": "Settings"}


def drag_title(pg, wid, to_x, to_y, steps=10, release=True):
    """Drag a window's title bar to an absolute viewport point.

    Raises the window from the rail first. A title bar has a bounding box
    whether or not another window is sitting on top of it, so grabbing it
    blind lands the pointer on whatever is above — which is a harness
    that silently drags the wrong window, not a product bug.
    """
    pg.locator("button", has_text=RAIL[wid]).first.click()
    pg.wait_for_timeout(250)
    tb = title_bar(pg, wid)
    sx, sy = tb["x"] + 60, tb["y"] + tb["height"] / 2
    pg.mouse.move(sx, sy)
    pg.mouse.down()
    pg.mouse.move((sx + to_x) / 2, (sy + to_y) / 2, steps=steps)
    pg.mouse.move(to_x, to_y, steps=steps)
    pg.wait_for_timeout(120)
    if release:
        pg.mouse.up()
        pg.wait_for_timeout(300)


def free_desktop_point(pg):
    """A workspace point no visible window covers, or None.

    Once every window is tiled there is no such point — which is exactly
    why the workspace commands also have a keyboard route.
    """
    box = workspace(pg)
    rects = list(visible(pg).values())
    for ly in range(box["height"] - 8, 8, -24):
        for lx in range(8, box["width"] - 8, 24):
            if not any(r["x"] <= lx <= r["x"] + r["width"]
                       and r["y"] <= ly <= r["y"] + r["height"] for r in rects):
                return box["x"] + lx, box["y"] + ly
    return None


def desktop_menu(pg):
    spot = free_desktop_point(pg)
    assert spot, "no free desktop to right-click"
    pg.mouse.click(spot[0], spot[1], button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)


def shortcut(pg, key):
    pg.keyboard.down("Control")
    pg.keyboard.down("Alt")
    pg.keyboard.press(key)
    pg.keyboard.up("Alt")
    pg.keyboard.up("Control")
    pg.wait_for_timeout(400)


def menu_click(pg, label):
    pg.locator(".cattipu-context-menu__item", has_text=label).first.click()
    pg.wait_for_timeout(350)


def overlaps(a, b):
    return not (
        a["x"] + a["width"] <= b["x"] or b["x"] + b["width"] <= a["x"]
        or a["y"] + a["height"] <= b["y"] or b["y"] + b["height"] <= a["y"]
    )


def shot(pg, name):
    pg.screenshot(path=f"{OUT}/{name}.png")


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: print("PAGEERROR:", str(e)[:200]))
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)

    box = workspace(pg)
    print(f"  workspace {box['width']}x{box['height']}")
    half_l = box["width"] // 2
    half_r = box["width"] - half_l
    half_t = box["height"] // 2
    half_b = box["height"] - half_t

    # ── 1. snap left ────────────────────────────────────────────────────
    before = windows(pg)["projects"]
    drag_title(pg, "projects", box["x"] + 4, box["y"] + 300, release=False)
    preview = pg.evaluate(
        """() => { const e = document.querySelector('[data-testid=snap-preview]');
            if (!e) return null;
            const layer = document.querySelector('%s').getBoundingClientRect();
            const b = e.getBoundingClientRect();
            return {region: e.dataset.region, x: Math.round(b.x - layer.x),
                    y: Math.round(b.y - layer.y),
                    width: Math.round(b.width), height: Math.round(b.height)}; }"""
        % LAYER
    )
    check("dragging to the left edge previews the left half",
          preview is not None and preview["region"] == "left"
          and preview["width"] == half_l and preview["x"] == 0
          and preview["height"] == box["height"], str(preview))
    shot(pg, "Snap_Left_preview")
    pg.mouse.up()
    pg.wait_for_timeout(400)

    after = windows(pg)["projects"]
    check("releasing applies the snap exactly",
          after["x"] == 0 and after["y"] == 0
          and after["width"] == half_l and after["height"] == box["height"],
          f"{after} want w={half_l} h={box['height']}")
    check("the preview disappears on release",
          pg.locator("[data-testid=snap-preview]").count() == 0)
    shot(pg, "Snap_Left")

    # ── 2. snap right, and the two halves meeting ───────────────────────
    pg.locator("button", has_text="Explorer").first.click()
    pg.wait_for_timeout(500)
    drag_title(pg, "explorer", box["x"] + box["width"] - 4, box["y"] + 300)
    right = windows(pg)["explorer"]
    check("the right edge snaps to the right half",
          right["x"] == half_l and right["width"] == half_r
          and right["height"] == box["height"], str(right))
    left = windows(pg)["projects"]
    check("the two halves meet with no seam and no overlap",
          left["x"] + left["width"] == right["x"]
          and left["width"] + right["width"] == box["width"],
          f"{left['width']} + {right['width']} = {box['width']}")
    shot(pg, "Snap_Right")

    # ── 3. snap top and bottom ──────────────────────────────────────────
    drag_title(pg, "explorer", box["x"] + 600, box["y"] + 4)
    top = windows(pg)["explorer"]
    check("the top edge snaps to the top half, not to maximize",
          top["y"] == 0 and top["height"] == half_t
          and top["width"] == box["width"] and top["mode"] == "normal",
          str(top))
    drag_title(pg, "explorer", box["x"] + 600, box["y"] + box["height"] - 4)
    bottom = windows(pg)["explorer"]
    check("the bottom edge snaps to the bottom half",
          bottom["y"] == half_t and bottom["height"] == half_b,
          str(bottom))

    # ── 4. restore: size, position AND z-order ──────────────────────────
    # Projects is still snapped from step 1, so it goes home first: the
    # maximize round trip has to start from a free window for "previous
    # size" to mean the reference size.
    drag_title(pg, "projects", box["x"] + 500, box["y"] + 260)
    pg.locator("button", has_text="Settings").first.click()
    pg.wait_for_timeout(400)
    pre = windows(pg)
    check("fixture: Projects is free and not the topmost window",
          pre["projects"]["snap"] is None
          and pre["projects"]["z"] < pre["settings"]["z"],
          f"snap={pre['projects']['snap']} z={pre['projects']['z']} "
          f"settings z={pre['settings']['z']}")

    def maximize(wid):
        pg.locator(
            f".cattipu-managed-window[data-window-id={wid}] .cattipu-window__control"
        ).nth(1).click()
        pg.wait_for_timeout(400)

    maximize("projects")
    maxed = windows(pg)["projects"]
    check("maximize fills the workspace",
          maxed["width"] == box["width"] and maxed["height"] == box["height"]
          and maxed["x"] == 0 and maxed["y"] == 0, str(maxed))

    # Raise Settings while Projects is maximized. Restoring must put
    # Projects back UNDER it — which is only possible if restore lowers
    # the z-index rather than keeping the one maximize gave it.
    #
    # (Comparing against the z read before the maximize CLICK does not
    # work and is not the contract: clicking the control is a click on
    # the window, so it raises it first. Restore returns the order from
    # immediately before the maximize, which is after that raise.)
    pg.locator("button", has_text="Settings").first.click()
    pg.wait_for_timeout(350)
    settings_z = windows(pg)["settings"]["z"]

    maximize("projects")
    post = windows(pg)["projects"]
    check("restore lowers the window back out of the front of the stack",
          post["z"] < settings_z,
          f"projects z={post['z']} settings z={settings_z}")
    check("restore returns the exact size",
          (post["width"], post["height"]) == (pre["projects"]["width"],
                                              pre["projects"]["height"]),
          f"{pre['projects']['width']}x{pre['projects']['height']} -> "
          f"{post['width']}x{post['height']}")
    check("restore returns the exact position",
          (post["x"], post["y"]) == (pre["projects"]["x"], pre["projects"]["y"]),
          f"({pre['projects']['x']},{pre['projects']['y']}) -> ({post['x']},{post['y']})")
    check("...and does not leave it at its maximized z-order",
          post["z"] < maxed["z"], f"maximized z={maxed['z']} restored z={post['z']}")

    # Maximizing a SNAPPED window and un-maximizing must put it back on
    # its half, not send it home.
    drag_title(pg, "projects", box["x"] + 4, box["y"] + 300)
    check("fixture: Projects is snapped left",
          windows(pg)["projects"]["snap"] == "left",
          str(windows(pg)["projects"]["snap"]))
    maximize("projects")
    maximize("projects")
    back = windows(pg)["projects"]
    check("un-maximizing a snapped window returns it to its half",
          back["snap"] == "left" and back["width"] == half_l
          and back["height"] == box["height"], str(back))

    # ── 5. cascade ──────────────────────────────────────────────────────
    shortcut(pg, "r")
    open_all(pg)
    check("all five windows are open", len(visible(pg)) == 5,
          str(sorted(visible(pg))))

    desktop_menu(pg)
    labels = pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-context-menu__label')]"
        ".map(e => e.textContent)")
    check("the desktop menu offers Window", "Window" in labels, str(labels))
    menu_click(pg, "Window")
    sub = pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-context-menu__label')]"
        ".map(e => e.textContent)")
    check("Window offers Cascade, Tile and Restore All",
          {"Cascade", "Tile", "Restore All"} <= set(sub), str(sub))
    menu_click(pg, "Cascade")

    cas = visible(pg)
    ordered = sorted(cas.values(), key=lambda w: w["z"])
    steps = [
        (ordered[i]["x"] - ordered[i - 1]["x"], ordered[i]["y"] - ordered[i - 1]["y"])
        for i in range(1, len(ordered))
    ]
    check("cascade offsets every window by the same step",
          all(s == (24, 24) for s in steps), str(steps))
    check("no cascaded window is clipped by the workspace",
          all(w["x"] >= 0 and w["y"] >= 0
              and w["x"] + w["width"] <= box["width"]
              and w["y"] + w["height"] <= box["height"] for w in cas.values()),
          str({k: (v["x"], v["y"], v["width"], v["height"]) for k, v in cas.items()}))
    shot(pg, "Cascade")

    # ── 6. tile ─────────────────────────────────────────────────────────
    desktop_menu(pg)
    menu_click(pg, "Window")
    menu_click(pg, "Tile")
    til = visible(pg)
    check("tiling moves all five windows", len(til) == 5, str(len(til)))
    pairs = [(a, b) for a in til for b in til if a < b and overlaps(til[a], til[b])]
    check("no two tiled windows overlap", not pairs, str(pairs[:3]))
    check("tiles reach both far edges of the workspace",
          max(w["x"] + w["width"] for w in til.values()) == box["width"]
          and max(w["y"] + w["height"] for w in til.values()) == box["height"],
          f"right={max(w['x']+w['width'] for w in til.values())} "
          f"bottom={max(w['y']+w['height'] for w in til.values())} "
          f"box={box['width']}x{box['height']}")
    check("no tile is clipped",
          all(w["x"] >= 0 and w["y"] >= 0 for w in til.values()),
          str({k: (v["x"], v["y"]) for k, v in til.items()}))
    shot(pg, "Tile")

    # How much desktop is left once everything is tiled. The tile gaps
    # are 8px seams, so a point-based test finds "free desktop" and would
    # wrongly conclude the menu is reachable. The honest measure is area.
    free_ratio = pg.evaluate(
        """() => {
            const layer = document.querySelector('%s').getBoundingClientRect();
            const rects = [...document.querySelectorAll('.cattipu-managed-window')]
              .filter(w => w.dataset.visible === 'true')
              .map(w => { const b = w.getBoundingClientRect();
                return {x: b.x - layer.x, y: b.y - layer.y, w: b.width, h: b.height}; });
            let free = 0;
            for (let y = 0; y < layer.height; y += 4)
              for (let x = 0; x < layer.width; x += 4)
                if (!rects.some(r => x >= r.x && x <= r.x + r.w
                                  && y >= r.y && y <= r.y + r.h)) free += 1;
            const total = Math.ceil(layer.width / 4) * Math.ceil(layer.height / 4);
            return free / total;
        }""" % LAYER
    )
    check("a fully tiled workspace leaves almost no desktop to right-click",
          free_ratio < 0.05,
          f"{free_ratio * 100:.1f}% of the workspace is uncovered — the 8px "
          f"tile seams; this is why the commands also have a keyboard route")
    shortcut(pg, "c")
    cas2 = visible(pg)
    check("Ctrl+Alt+C cascades even with no desktop showing",
          all(w["width"] == cas[k]["width"] for k, w in cas2.items()),
          str({k: (v["x"], v["y"]) for k, v in cas2.items()}))
    shortcut(pg, "t")
    check("Ctrl+Alt+T tiles", len(visible(pg)) == 5
          and max(w["x"] + w["width"] for w in visible(pg).values()) == box["width"])

    # ── 7. focus intelligence ───────────────────────────────────────────
    # Click a window that is NOT on top, on its body rather than its title
    # bar — "any visible part" is the requirement.
    lowest = min(til.items(), key=lambda kv: kv[1]["z"])[0]
    z_before = windows(pg)[lowest]["z"]
    tb = title_bar(pg, lowest)
    pg.mouse.click(tb["x"] + 40, tb["y"] + tb["height"] + 60)
    pg.wait_for_timeout(350)
    now = windows(pg)
    check("clicking a window's body raises it above every other",
          now[lowest]["z"] == max(w["z"] for w in now.values())
          and now[lowest]["z"] > z_before,
          f"{lowest} z {z_before} -> {now[lowest]['z']}")
    focused = pg.evaluate(
        "() => { const a = document.activeElement;"
        " const w = a && a.closest('.cattipu-managed-window');"
        " return w ? w.dataset.windowId : null; }")
    check("keyboard focus follows the active window",
          focused == lowest, f"activeElement is in {focused}, active is {lowest}")

    # ── 8. boundary safety ──────────────────────────────────────────────
    off = [
        ("far right", box["x"] + box["width"] + 600, box["y"] + 300),
        ("far below", box["x"] + 600, box["y"] + box["height"] + 600),
        ("above and left", box["x"] - 600, box["y"] - 600),
    ]
    safe = True
    detail = []
    for label, tx, ty in off:
        drag_title(pg, "memory", tx, ty)
        w = windows(pg)["memory"]
        bar = {"x": w["x"], "y": w["y"], "width": w["width"], "height": TITLE_BAR_H}
        ok = (bar["x"] + bar["width"] > 0 and bar["x"] < box["width"]
              and bar["y"] >= 0 and bar["y"] + bar["height"] <= box["height"])
        detail.append(f"{label}:{(w['x'], w['y'])}{'ok' if ok else 'LOST'}")
        safe = safe and ok
    check("a window dragged far off-screen keeps its title bar reachable",
          safe, " ".join(detail))

    # ── 9. multi-window workflow ────────────────────────────────────────
    desktop_menu(pg)
    menu_click(pg, "Window")
    menu_click(pg, "Tile")
    multi = visible(pg)
    check("Projects, Explorer, Architect, Memory and Settings coexist",
          set(multi) == {"projects", "explorer", "architect", "memory", "settings"},
          str(sorted(multi)))
    pairs = [(a, b) for a in multi for b in multi if a < b and overlaps(multi[a], multi[b])]
    check("...with no overlap between any pair", not pairs, str(pairs[:3]))
    check("...and every one fully inside the workspace",
          all(w["x"] >= 0 and w["y"] >= 0
              and w["x"] + w["width"] <= box["width"] + 1
              and w["y"] + w["height"] <= box["height"] + 1 for w in multi.values()),
          str({k: (v["x"], v["y"], v["width"], v["height"]) for k, v in multi.items()}))
    # Each window still renders its own body, not an empty frame.
    bodies = pg.evaluate(
        """() => Object.fromEntries(
            [...document.querySelectorAll('.cattipu-managed-window')]
              .filter(w => w.dataset.visible === 'true')
              .map(w => [w.dataset.windowId, w.innerText.trim().length]))"""
    )
    check("...each still rendering real content",
          all(v > 0 for v in bodies.values()), str(bodies))

    # Frozen window bodies are laid out at the 920x612 design size, so a
    # tile narrower than that clips its own contents. Measured rather
    # than glossed over: what must NOT happen is the window CHROME being
    # clipped, and each window's title bar and controls staying whole is
    # the assertion. The content overflow is recorded as a number.
    inner = pg.evaluate(
        """() => Object.fromEntries(
            [...document.querySelectorAll('.cattipu-managed-window')]
              .filter(w => w.dataset.visible === 'true')
              .map(w => {
                const body = w.querySelector('.cattipu-window__body');
                const bar = w.querySelector('.cattipu-window__titlebar');
                const controls = w.querySelector('.cattipu-window__controls');
                const wb = w.getBoundingClientRect();
                const bb = bar.getBoundingClientRect();
                const cb = controls.getBoundingClientRect();
                // The body itself reports no overflow: its children clip
                // themselves. The honest measure walks the subtree for
                // any element whose content is wider than its box.
                const clipped = body
                  ? [...body.querySelectorAll('*')]
                      .filter(e => e.scrollWidth > e.clientWidth + 1).length
                  : 0;
                return [w.dataset.windowId, {
                  clippedElements: clipped,
                  contentOverflowX: body ? body.scrollWidth - body.clientWidth : 0,
                  barWhole: bb.width > 0 && bb.right <= wb.right + 1
                            && bb.left >= wb.left - 1,
                  controlsWhole: cb.right <= wb.right + 1 && cb.width > 0,
                }];
              }))"""
    )
    check("every tiled window's chrome is whole — title bar and controls",
          all(v["barWhole"] and v["controlsWhole"] for v in inner.values()),
          str({k: (v["barWhole"], v["controlsWhole"]) for k, v in inner.items()}))
    print("       elements clipping their own content, per window "
          "(design size is 920x612): "
          + str({k: v["clippedElements"] for k, v in inner.items()}))
    shot(pg, "MultiWindow")

    # ── 10. no layout regressions ───────────────────────────────────────
    geo = pg.evaluate(
        """() => { const de = document.documentElement;
            const frac = [...document.querySelectorAll('.cattipu-managed-window')]
              .filter(w => w.dataset.visible === 'true')
              .filter(w => { const b = w.getBoundingClientRect();
                return [b.x,b.y,b.width,b.height].some(v => Math.abs(v-Math.round(v))>0.01); })
              .map(w => w.dataset.windowId);
            return {pageX: de.scrollWidth - de.clientWidth,
                    pageY: de.scrollHeight - de.clientHeight, frac}; }"""
    )
    check("the page still has no scrollbars",
          geo["pageX"] <= 0 and geo["pageY"] <= 0, str(geo))
    check("no window lands on a fractional pixel", not geo["frac"], str(geo["frac"]))

    # ── 11. restore all ─────────────────────────────────────────────────
    drag_title(pg, "settings", box["x"] + 4, box["y"] + 300)
    check("fixture: Settings is snapped", windows(pg)["settings"]["snap"] == "left",
          str(windows(pg)["settings"]["snap"]))
    shortcut(pg, "r")
    check("Restore All clears every snap",
          all(w["snap"] is None and w["mode"] == "normal"
              for w in visible(pg).values()),
          str({k: (v["mode"], v["snap"]) for k, v in visible(pg).items()}))

    # ── 12. the session survives a reload ───────────────────────────────
    drag_title(pg, "explorer", box["x"] + 4, box["y"] + 300)
    snapped_before = windows(pg)["explorer"]
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)
    snapped_after = windows(pg)["explorer"]
    check("a snapped window is still snapped after a reload",
          snapped_after["snap"] == "left"
          and snapped_after["width"] == snapped_before["width"],
          f"{snapped_before} -> {snapped_after}")

    ctx.close()
    br.close()

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/m18.json", "w"), indent=1)
sys.exit(1 if failed else 0)
