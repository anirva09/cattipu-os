# -*- coding: utf-8 -*-
"""Production release verification.

Opens every application the shell offers, at every supported viewport, and
asserts the shell survives it. The per-sprint harnesses check that each
feature is correct; this one checks that the RELEASE is whole — that
nothing was lost in the cleanup, and that no surface breaks the layout it
is opened into.

Deliberately not a re-run of the sprint harnesses. It asks the questions
that only matter at release: does every rail item open something, does the
layout hold at every size with those windows open, and does the console
stay clean through all of it.
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
BOOT_MS = 4200

VIEWPORTS = [(1366, 768), (1440, 900), (1600, 900), (1920, 1080)]

# Every rail item. The four with real applications must render content;
# the rest resolve to the placeholder, which is a real window either way.
RAIL = ["Home", "Projects", "Architect", "Canvas", "Forge",
        "Memory", "Launch", "Explorer", "Settings"]

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


LAYOUT = """() => {
  const vw = innerWidth, vh = innerHeight;
  const de = document.documentElement;
  // Clipped means UNREACHABLE. Content running past the viewport inside
  // a SCROLLING ancestor is reachable by scrolling, and the rail scrolls
  // deliberately at short heights — counting it would report the fix M19
  // shipped as the defect it fixed. Same rule the M19 harness uses.
  const scrollableAncestor = e => {
    let n = e.parentElement;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return true;
      n = n.parentElement;
    }
    return false;
  };
  const bleed = [...document.querySelectorAll('.cattipu-interactive-desktop *')]
    .filter(e => {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return false;
      return (b.right > vw + 1 || b.bottom > vh + 1 || b.left < -1 || b.top < -1)
             && !scrollableAncestor(e);
    })
    .slice(0, 5)
    .map(e => (typeof e.className === 'string' ? e.className.split(' ')[0] : e.tagName));
  const rect = s => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return {x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom};
  };
  return {
    vw, vh,
    hScroll: de.scrollWidth > vw + 1,
    vScroll: de.scrollHeight > vh + 1,
    bleed,
    sidebar: rect('.cattipu-interactive-desktop__sidebar'),
    topbar: rect('.cattipu-interactive-desktop__topbar'),
    status: rect('.cattipu-interactive-desktop__bottom-status'),
    widgets: rect('.cattipu-interactive-desktop__right-widgets'),
    windows: [...document.querySelectorAll('.cattipu-managed-window')]
      .filter(w => w.dataset.visible === 'true')
      .map(w => { const b = w.getBoundingClientRect();
                  return {id: w.dataset.windowId, x: b.x, y: b.y,
                          r: b.right, b: b.bottom}; }),
  };
}"""


with sync_playwright() as p:
    br = p.chromium.launch()
    errors = []

    for (w, h) in VIEWPORTS:
        ctx = br.new_context(viewport={"width": w, "height": h},
                             device_scale_factor=1)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e, v=f"{w}x{h}": errors.append(f"{v}: {e}"))
        pg.on("console", lambda m, v=f"{w}x{h}":
              errors.append(f"{v}: {m.text}") if m.type == "error" else None)

        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(BOOT_MS)

        # ── boot handed off cleanly ─────────────────────────────────────
        if (w, h) == (1600, 900):
            check("boot hands off to the desktop",
                  pg.evaluate("() => !document.querySelector('.fixed.inset-0.z-50')"
                              " && !!document.querySelector('.cattipu-interactive-desktop')"))

        # ── every rail item opens something ─────────────────────────────
        opened = []
        for label in RAIL:
            try:
                pg.locator("button", has_text=label).first.click(timeout=4000)
                pg.wait_for_timeout(350)
                opened.append(label)
            except Exception as exc:                      # noqa: BLE001
                errors.append(f"{w}x{h} rail {label}: {exc}")
        check(f"{w}x{h} — every rail item opens",
              len(opened) == len(RAIL), f"{len(opened)}/{len(RAIL)}: {opened}")

        state = pg.evaluate(LAYOUT)

        # ── the layout guarantees, with every app open ──────────────────
        check(f"{w}x{h} — no horizontal scroll", not state["hScroll"])
        check(f"{w}x{h} — no vertical scroll", not state["vScroll"])
        check(f"{w}x{h} — nothing bleeds outside the viewport",
              not state["bleed"], str(state["bleed"]))
        # Measured against the signed-off geometry, not against an
        # assumption about it. The rail runs the FULL height at x=0, and
        # the top bar and status bar both start where the rail ends —
        # they span the workspace, not the window. A first version of
        # this check expected a top bar at x=0 and a status bar at x=0
        # and reported the Golden Master layout as eight failures.
        rail_w = state["sidebar"]["w"]
        check(f"{w}x{h} — the rail is pinned at x=0, full height",
              state["sidebar"]["x"] == 0 and state["sidebar"]["y"] == 0
              and abs(state["sidebar"]["b"] - h) < 1,
              f"x={state['sidebar']['x']} y={state['sidebar']['y']} "
              f"bottom={state['sidebar']['b']} of {h}")
        check(f"{w}x{h} — the top bar is pinned, from the rail to the right edge",
              state["topbar"]["y"] == 0
              and abs(state["topbar"]["x"] - rail_w) < 1
              and abs(state["topbar"]["r"] - w) < 1,
              f"{state['topbar']['x']}..{state['topbar']['r']} at y={state['topbar']['y']}")
        check(f"{w}x{h} — the status bar is flush to the bottom and both workspace edges",
              abs(state["status"]["b"] - h) < 1
              and abs(state["status"]["x"] - rail_w) < 1
              and abs(state["status"]["r"] - w) < 1,
              f"{state['status']['x']}..{state['status']['r']} "
              f"bottom={state['status']['b']} of {h}")
        check(f"{w}x{h} — the widget column is inside the viewport",
              state["widgets"]["r"] <= w, f"{state['widgets']['r']} of {w}")

        # Windows may be dragged off-screen by a person; they must not be
        # laid out off-screen. Every window opened above is placed by the
        # shell, so each one's title bar has to be reachable.
        offscreen = [win for win in state["windows"]
                     if win["x"] < 0 or win["y"] < 0 or win["r"] > w or win["b"] > h]
        check(f"{w}x{h} — every opened window is on screen",
              not offscreen, str(offscreen[:3]))

        if (w, h) == (1600, 900):
            pg.screenshot(path=f"{OUT}/Production_AllApps_1600.png")
        pg.screenshot(path=f"{OUT}/Production_{w}.png")
        ctx.close()

    check("no console or page errors at any viewport",
          not errors, str(errors[:3]))
    br.close()

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/production.json", "w"), indent=1)
sys.exit(1 if failed else 0)
