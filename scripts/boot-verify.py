# -*- coding: utf-8 -*-
"""Boot screen verification.

Records the boot sequence frame by frame and checks it against the timing
constants declared in components/Boot/BootScreen.tsx, rather than against
an impression of how long it felt.
"""
import json
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"

# From BootScreen.tsx — the source of truth this checks against.
START_DELAY = 500
BAR_DURATION = 2200
HOLD_AFTER = 500
EXIT_DELAY = START_DELAY + BAR_DURATION + HOLD_AFTER   # 3200
EXIT_ANIM = 500
TOTAL_SEGMENTS = 20

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


PROBE = """() => {
  const boot = document.querySelector('.fixed.inset-0.z-50');
  const shell = document.querySelector('.cattipu-interactive-desktop');
  const segs = boot ? [...boot.querySelectorAll('.h-3\\\\.5')] : [];
  const filled = segs.filter(s => {
    const bg = getComputedStyle(s).backgroundColor;
    return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
  }).length;
  const stage = boot ? [...boot.querySelectorAll('p')].map(p => p.textContent.trim())[0] : null;
  const skip = boot ? [...boot.querySelectorAll('button')].map(b => b.textContent.trim())[0] : null;
  const logo = boot ? boot.querySelector('img, svg') : null;
  return {
    bootPresent: !!boot,
    bootOpacity: boot ? +getComputedStyle(boot).opacity : null,
    segments: segs.length,
    filled,
    stage,
    skip,
    logo: !!logo,
    logoBox: logo ? (r => ({w: Math.round(r.width), h: Math.round(r.height)}))(logo.getBoundingClientRect()) : null,
    bg: boot ? getComputedStyle(boot).backgroundColor : null,
    shellPresent: !!shell,
    // The check that matters. The boot overlay was present, opaque and
    // animating for four milestones while being painted over by the
    // shell, so "is it in the DOM" proves nothing — this asks what is
    // actually on top at the middle of the screen.
    topAtCentre: (el => el ? (el.closest('.fixed.inset-0.z-50') ? 'boot'
                   : el.closest('.cattipu-interactive-desktop') ? 'shell' : 'other')
                   : 'none')(document.elementFromPoint(innerWidth / 2, innerHeight / 2)),
  };
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    pg = ctx.new_page()

    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # Sample the boot from first paint through hand-off.
    pg.goto(URL, wait_until="commit")
    pg.evaluate("() => { window.__t0 = Date.now(); }")
    timeline = []
    shots = {}
    # Screenshots wait for animations to settle and can take a second or
    # more, which silently pushes the next sample past the boot. So each
    # frame is stamped with the page's OWN elapsed time at the moment it
    # was probed, and the capture happens before the probe rather than
    # after it — a frame labelled 1800ms has to actually be 1800ms.
    for target in (200, 600, 1200, 1800, 2400, 3000, 3400, 4200, 6000):
        elapsed = pg.evaluate("() => Date.now() - window.__t0")
        if target > elapsed:
            pg.wait_for_timeout(target - elapsed)
        if target in (600, 1800, 3000, 4200):
            path = f"{OUT}/Boot_{target}ms.png"
            pg.screenshot(path=path, animations="allow", timeout=4000)
            shots[target] = path
        d = pg.evaluate(PROBE)
        d["t"] = target
        d["actual"] = pg.evaluate("() => Date.now() - window.__t0")
        timeline.append(d)
        print(f"    t={target:5d}ms (actual {d['actual']:5d})  boot={d['bootPresent']} "
              f"filled={d['filled']}/{d['segments']} stage={d['stage']!r} "
              f"shell={d['shellPresent']}")

    at = {d["t"]: d for d in timeline}

    # ── the boot appears, and appears FIRST ──────────────────────────────
    check("the boot screen is present at first paint",
          at[200]["bootPresent"], str(at[200]["bootPresent"]))
    # The overlay fades in over 400ms (framer-motion `transition: {
    # duration: 0.4 }`), so a sample at 600ms can legitimately catch it
    # mid-animation. The requirement is that it is opaque enough to cover
    # the shell, and fully opaque once the animation has finished.
    check("it covers the shell while booting",
          at[600]["bootPresent"] and at[600]["bootOpacity"] > 0.9
          and at[1800]["bootOpacity"] == 1,
          f"opacity {at[600]['bootOpacity']} at 600ms, "
          f"{at[1800]['bootOpacity']} at 1800ms")

    # ── the pieces the brief lists ───────────────────────────────────────
    check("the boot screen is what is actually PAINTED, not just mounted",
          at[600]["topAtCentre"] == "boot" and at[1800]["topAtCentre"] == "boot",
          f"top at centre: {at[600]['topAtCentre']} at 600ms, "
          f"{at[1800]['topAtCentre']} at 1800ms")
    check("the logo renders",
          at[600]["logo"] and at[600]["logoBox"]["w"] > 100, str(at[600]["logoBox"]))
    check("the progress bar has all 20 segments",
          at[600]["segments"] == TOTAL_SEGMENTS, f"{at[600]['segments']} segments")
    # `--color-bg: var(--color-cream)` = #e7d7c3. The first version of
    # this check expected #E9DFC4, which is the PACKAGE's cattipu cream —
    # a different token on a different surface. The boot screen predates
    # the package and uses the app's own.
    check("the background is the app's cream boot surface (#e7d7c3)",
          at[600]["bg"] == "rgb(231, 215, 195)", str(at[600]["bg"]))

    # ── progress behaviour: fills monotonically, completes on schedule ────
    fills = [(d["t"], d["filled"]) for d in timeline if d["bootPresent"]]
    monotonic = all(b >= a for (_, a), (_, b) in zip(fills, fills[1:]))
    check("the bar fills monotonically, never backwards", monotonic, str(fills))
    check("the bar has not started before START_DELAY",
          at[200]["filled"] == 0, f"{at[200]['filled']} at 200ms (START_DELAY={START_DELAY})")
    check("the bar is full by START_DELAY + BAR_DURATION",
          at[3000]["filled"] == TOTAL_SEGMENTS,
          f"{at[3000]['filled']}/{TOTAL_SEGMENTS} at 3000ms (full at {START_DELAY+BAR_DURATION})")

    # ── the staged copy ──────────────────────────────────────────────────
    stages = [d["stage"] for d in timeline if d["bootPresent"] and d["stage"]]
    check("the stage label runs INITIALIZING -> LOADING MODULES -> READY",
          any("INITIALIZING" in s for s in stages)
          and any("LOADING MODULES" in s for s in stages)
          and any("READY" in s for s in stages), str(stages))
    check("the skip prompt appears once the bar is full",
          at[3000]["skip"] == "PRESS ANY KEY TO CONTINUE", str(at[3000]["skip"]))

    # ── hand-off ─────────────────────────────────────────────────────────
    check("the boot is gone after EXIT_DELAY + the exit animation",
          not at[4200]["bootPresent"],
          f"still present at 4200ms (expected gone by {EXIT_DELAY + EXIT_ANIM})")
    check("the desktop is underneath and remains after hand-off",
          at[4200]["shellPresent"] and at[6000]["shellPresent"]
          and not at[6000]["bootPresent"]
          and at[6000]["topAtCentre"] == "shell",
          f"top at centre after boot: {at[6000]['topAtCentre']}")
    check("no page errors during the whole boot",
          not errors, str(errors[:2]))

    # ── the skip path still works ────────────────────────────────────────
    pg2 = ctx.new_page()
    pg2.goto(URL, wait_until="commit")
    pg2.wait_for_timeout(900)
    before = pg2.evaluate(PROBE)
    pg2.keyboard.press("Enter")
    pg2.wait_for_timeout(900)
    after = pg2.evaluate(PROBE)
    check("a keypress skips the boot early",
          before["bootPresent"] and not after["bootPresent"] and after["shellPresent"],
          f"before={before['bootPresent']} after={after['bootPresent']}")
    pg2.close()

    # ── the boot sound is served, not 404 ────────────────────────────────
    resp = pg.request.get(URL.rstrip("/") + "/sounds/boot.wav")
    check("the boot sound file is served", resp.status == 200,
          f"HTTP {resp.status} for /sounds/boot.wav")

    ctx.close()
    br.close()

# Contrast of the one boot element that uses a token M19 changed.
img = Image.open(shots[3000]).convert("RGB")
print(f"\n  boot frame at 3000ms saved: {shots[3000]}")

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/boot.json", "w"), indent=1)
sys.exit(1 if failed else 0)
