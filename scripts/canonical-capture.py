# -*- coding: utf-8 -*-
"""Capture the seven frames the canonical consolidation names.

Four desktop viewports, two boot milestones, and the naming proof.

The boot frames are timed from the boot component's own MOUNT, not from
navigation: BootScreen starts its timers when it mounts, and hydration
sits between the two — 40ms on one run, 250ms on the next. A frame
labelled 600ms has to actually be 600ms of boot, or the label is a lie.
"""
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/cattipu-os/docs/release"

BOOT_WATCH = """
  window.__bootSeen = null;
  (function watch() {
    if (window.__bootSeen === null && document.querySelector('.fixed.inset-0.z-50')) {
      window.__bootSeen = Date.now();
    }
    requestAnimationFrame(watch);
  })();
"""

captured = []

with sync_playwright() as p:
    br = p.chromium.launch()

    # ── the four desktop viewports, default state ───────────────────────
    for w, h in [(1366, 768), (1440, 900), (1600, 900), (1920, 1080)]:
        ctx = br.new_context(viewport={"width": w, "height": h},
                             device_scale_factor=1)
        pg = ctx.new_page()
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(4500)          # past boot and its exit animation
        path = f"{OUT}/Desktop_{w}.png"
        pg.screenshot(path=path)
        captured.append(path)
        ctx.close()

    # ── the two boot milestones ─────────────────────────────────────────
    for target in (600, 1800):
        ctx = br.new_context(viewport={"width": 1600, "height": 900},
                             device_scale_factor=1)
        pg = ctx.new_page()
        pg.add_init_script(BOOT_WATCH)
        pg.goto(URL, wait_until="commit")
        pg.wait_for_function("() => window.__bootSeen !== null", timeout=8000)
        elapsed = pg.evaluate("() => Date.now() - window.__bootSeen")
        if target > elapsed:
            pg.wait_for_timeout(target - elapsed)
        path = f"{OUT}/Boot_{target}ms.png"
        # animations="allow": the bar and the fade ARE the subject.
        pg.screenshot(path=path, animations="allow", timeout=4000)
        actual = pg.evaluate("() => Date.now() - window.__bootSeen")
        print(f"  Boot_{target}ms captured at mount+{actual}ms")
        captured.append(path)
        ctx.close()

    # ── the naming proof ────────────────────────────────────────────────
    # Three folders, the middle one renamed, then a fourth — which must
    # take the number the rename freed rather than the next one up. A
    # stored counter passes every "the second one is (2)" check and fails
    # only here, so this is the frame worth keeping.
    ctx = br.new_context(viewport={"width": 1600, "height": 900},
                         device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(4500)

    layer = pg.evaluate(
        "() => { const b = document.querySelector('[data-testid=desktop-object-layer]')"
        ".getBoundingClientRect(); return {x:b.x, y:b.y, w:b.width, h:b.height}; }")

    def new_folder():
        pg.mouse.click(layer["x"] + 40, layer["y"] + layer["h"] - 60, button="right")
        pg.wait_for_selector(".cattipu-context-menu", timeout=4000)
        pg.locator(".cattipu-context-menu__item", has_text="New Folder").first.click()
        pg.wait_for_timeout(400)

    for _ in range(3):
        new_folder()

    # Rename the middle one, freeing "Untitled Folder (2)".
    pg.evaluate("""() => {
      const el = [...document.querySelectorAll('[data-object-id]')].find(e =>
        ((e.querySelector('.cattipu-desktop-objects__label')||{}).textContent||'')
          .trim() === 'Untitled Folder (2)');
      if (el) el.scrollIntoView();
    }""")
    box = pg.evaluate("""() => {
      const el = [...document.querySelectorAll('[data-object-id]')].find(e =>
        ((e.querySelector('.cattipu-desktop-objects__label')||{}).textContent||'')
          .trim() === 'Untitled Folder (2)');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [b.x + 12, b.y + 20];
    }""")
    if box:
        pg.mouse.click(box[0], box[1], button="right")
        pg.wait_for_selector(".cattipu-context-menu", timeout=3000)
        pg.locator(".cattipu-context-menu__item", has_text="Rename").first.click()
        pg.wait_for_timeout(200)
        pg.locator(".cattipu-desktop-objects__rename").fill("Invoices")
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(400)

    new_folder()                            # must reclaim (2), not take (4)

    labels = pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-desktop-objects__label')]"
        ".map(e => e.textContent.trim()).sort()")
    print(f"  Naming_Test labels: {labels}")
    ok = "Invoices" in labels and "Untitled Folder (2)" in labels \
        and "Untitled Folder (4)" not in labels
    print(f"  freed number reclaimed: {ok}")

    path = f"{OUT}/Naming_Test.png"
    pg.screenshot(path=path)
    captured.append(path)
    ctx.close()
    br.close()

print(f"\n{len(captured)} frames captured")
for c in captured:
    print(f"  {c}")
sys.exit(0 if len(captured) == 7 and ok else 1)
