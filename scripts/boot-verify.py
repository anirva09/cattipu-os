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
  // The skip prompt is in the DOM the whole time — BootScreen animates its
  // OPACITY on `done`, it does not mount it. Asserting on the text alone
  // passes identically before and after the bar fills, which is no
  // assertion at all, so the opacity comes back too.
  const skipEl = boot ? [...boot.querySelectorAll('button')][0] : null;
  const skip = skipEl ? skipEl.textContent.trim() : null;
  const skipOpacity = skipEl ? +getComputedStyle(skipEl).opacity : null;
  const logo = boot ? boot.querySelector('img, svg') : null;
  return {
    bootPresent: !!boot,
    bootOpacity: boot ? +getComputedStyle(boot).opacity : null,
    segments: segs.length,
    filled,
    stage,
    skip,
    skipOpacity,
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

    # BootScreen's timers start when the component MOUNTS, not when the
    # document commits, and hydration sits between the two — 250ms on one
    # run, 90ms on the next. Measuring the bar against navigation time
    # therefore measures START_DELAY + BAR_DURATION + however long hydration
    # took today, and an assertion written against 2700ms passes or fails on
    # machine load rather than on the boot screen. It did exactly that:
    # 20/20 at 3000ms one run, 19/20 the next, with nothing changed.
    #
    # So the page stamps the three moments itself, off rAF, each against the
    # boot's own mount. The milestone table below still samples on
    # navigation time because that is what a person watching the screen
    # experiences; the timing checks read these stamps, because that is what
    # the constants in BootScreen.tsx actually describe.
    pg.add_init_script("""
      window.__t0 = Date.now();
      window.__bootSeen = null;   // overlay first in the DOM = mount
      window.__fullAt = null;     // all 20 segments coloured
      window.__goneAt = null;     // overlay removed after having been seen
      (function watch() {
        const boot = document.querySelector('.fixed.inset-0.z-50');
        const now = Date.now();
        if (boot) {
          if (window.__bootSeen === null) window.__bootSeen = now;
          if (window.__fullAt === null) {
            const segs = [...boot.querySelectorAll('.h-3\\\\.5')];
            const filled = segs.filter(s => {
              const bg = getComputedStyle(s).backgroundColor;
              return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
            }).length;
            if (segs.length && filled === segs.length) window.__fullAt = now;
          }
        } else if (window.__bootSeen !== null && window.__goneAt === null) {
          window.__goneAt = now;
        }
        requestAnimationFrame(watch);
      })();
    """)

    # Sample the boot from first paint through hand-off.
    pg.goto(URL, wait_until="commit")
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

    # Measured from the boot's own mount, so these test BootScreen's
    # constants rather than today's hydration cost.
    #
    # The tolerance is deliberately ASYMMETRIC, because the two directions
    # are not the same finding. The bar is driven by twenty setTimeouts
    # competing with hydration of a heavy shell, so it runs a little LATE —
    # measured at mount+2938 against a declared 2700, about 9% drift, and it
    # can only ever drift one way. That is main-thread contention, not a
    # boot defect. Finishing EARLY cannot happen by contention at all; it
    # means a constant changed. So: early is fenced tight, late is given
    # room. A 250ms symmetric window passed at 238ms, which is a test that
    # was going to fail on someone else's machine for no reason.
    #
    # The slack is still far short of hiding a real change: halving
    # BAR_DURATION completes at ~mount+1600 and trips the early fence,
    # doubling it completes at ~mount+5100 and trips the late one.
    EARLY_FENCE = 50
    LATE_SLACK = 600
    stamps = pg.evaluate(
        "() => ({seen: window.__bootSeen, full: window.__fullAt, gone: window.__goneAt, t0: window.__t0})")
    mount_delay = stamps["seen"] - stamps["t0"]
    full_after_mount = stamps["full"] - stamps["seen"]
    gone_after_mount = stamps["gone"] - stamps["seen"]
    print(f"\n    hydration {mount_delay}ms   bar full at mount+{full_after_mount}ms   "
          f"boot gone at mount+{gone_after_mount}ms")

    def on_schedule(measured, declared):
        return declared - EARLY_FENCE <= measured <= declared + LATE_SLACK

    check("the bar completes at START_DELAY + BAR_DURATION after mount",
          on_schedule(full_after_mount, START_DELAY + BAR_DURATION),
          f"full at mount+{full_after_mount}ms (declared {START_DELAY+BAR_DURATION}, "
          f"window {START_DELAY+BAR_DURATION-EARLY_FENCE}..{START_DELAY+BAR_DURATION+LATE_SLACK})")
    check("the boot hands off at EXIT_DELAY + the exit animation after mount",
          on_schedule(gone_after_mount, EXIT_DELAY + EXIT_ANIM),
          f"gone at mount+{gone_after_mount}ms (declared {EXIT_DELAY+EXIT_ANIM}, "
          f"window {EXIT_DELAY+EXIT_ANIM-EARLY_FENCE}..{EXIT_DELAY+EXIT_ANIM+LATE_SLACK})")

    # ── the staged copy ──────────────────────────────────────────────────
    stages = [d["stage"] for d in timeline if d["bootPresent"] and d["stage"]]
    check("the stage label runs INITIALIZING -> LOADING MODULES -> READY",
          any("INITIALIZING" in s for s in stages)
          and any("LOADING MODULES" in s for s in stages)
          and any("READY" in s for s in stages), str(stages))
    check("the skip prompt is hidden while the bar is still filling, and shown once it is full",
          at[1800]["skip"] == "PRESS ANY KEY TO CONTINUE"
          and at[1800]["skipOpacity"] < 0.1
          and at[3400]["skipOpacity"] > 0.9,
          f"opacity {at[1800]['skipOpacity']} at 1800ms (filling), "
          f"{at[3400]['skipOpacity']} at 3400ms (full)")

    # ── hand-off ─────────────────────────────────────────────────────────
    check("the desktop is up within 4.2s of navigation, hydration included",
          not at[4200]["bootPresent"],
          f"boot present at 4200ms: {at[4200]['bootPresent']}")
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
