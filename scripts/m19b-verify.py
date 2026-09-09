# -*- coding: utf-8 -*-
"""M19 Parts C, D and E — the browser title, template identity, and the
claim that one action reaches every surface.

The Part E checks are written to fail on the bug they were written for:
the RECENT PROJECTS widget rendered three hardcoded names and had never
shown a project created after boot. So it is not enough to assert that a
new project appears SOMEWHERE — each surface is asked separately, after
one creation, and the widget is asked before and after.
"""
import json
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3321/"
OUT = "/home/claude/out"
BOOT_MS = 4200

results = []
contexts = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


# ── helpers ─────────────────────────────────────────────────────────────

def fresh(br, w=1600, h=900):
    """A page with no persisted state.

    A new PAGE in the same context inherits its localStorage, so the
    second scenario would have started with the first one's projects
    already created and every "before" baseline would have been a lie.
    Each scenario gets its own context and therefore its own seed.
    """
    ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
    contexts.append(ctx)
    pg = ctx.new_page()
    pg.set_viewport_size({"width": w, "height": h})
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(BOOT_MS)
    return pg


def box(pg, selector):
    return pg.evaluate(
        "(s) => { const e = document.querySelector(s); if (!e) return null;"
        " const b = e.getBoundingClientRect();"
        " return {x:b.x, y:b.y, w:b.width, h:b.height}; }", selector)


def desktop_menu(pg):
    layer = box(pg, "[data-testid=desktop-object-layer]")
    pg.mouse.click(layer["x"] + 40, layer["y"] + layer["h"] - 60, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=4000)
    pg.wait_for_timeout(200)


def menu_click(pg, label):
    pg.locator(".cattipu-context-menu__item", has_text=label).first.click()
    pg.wait_for_timeout(400)


def open_explorer(pg):
    pg.locator("button", has_text="Explorer").first.click()
    pg.wait_for_selector("[data-testid=explorer]", timeout=5000)
    pg.wait_for_timeout(400)


def explorer_labels(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('[data-testid=explorer-item]')]"
        ".map(e => (e.querySelector('.cattipu-explorer__item-label')||{})"
        ".textContent.trim())")


def open_folder(pg, label):
    """Double-click the FOLDER entry with this label. A project record can
    share the name, so the folder is picked by kind, not by text alone."""
    pg.evaluate("""(label) => {
      const items = [...document.querySelectorAll('[data-testid=explorer-item]')];
      const el = items.find(e =>
        e.dataset.entryKind === 'folder' &&
        ((e.querySelector('.cattipu-explorer__item-label')||{}).textContent||'').trim() === label);
      if (el) el.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    }""", label)
    pg.wait_for_timeout(700)


def recents(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll("
        "'.cattipu-right-widget-stack__recent-list li')].map(e => e.textContent.trim())")


def project_names(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-project-card__title')]"
        ".map(e => e.textContent.trim().replace(/\\s*\\(v[^)]*\\)$/, ''))")


def desktop_labels(pg):
    return pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-desktop-objects__label')]"
        ".map(e => e.textContent.trim())")


def workspace_title(pg):
    return pg.evaluate(
        "() => (document.querySelector('.cattipu-top-bar__workspace')||{}).textContent || ''")


def create_from_template(pg, label):
    desktop_menu(pg)
    menu_click(pg, "New Project")
    pg.wait_for_timeout(300)
    menu_click(pg, label)
    pg.wait_for_timeout(600)


with sync_playwright() as p:
    br = p.chromium.launch()

    # ══ Golden Master — the default desktop is unchanged ══════════════════
    pg = fresh(br)
    base_recents = recents(pg)
    # The widget used to render these three from a hardcoded constant. It
    # now renders them from the three seed projects, ordered by createdAt.
    # Identical output, different source — which is the whole point: the
    # Golden Master render is preserved and is no longer a literal.
    check("RECENT PROJECTS still lists the Golden Master's three names, in order",
          base_recents == ["Banking Platform", "AI SaaS Starter", "CATTIPU Website"],
          str(base_recents))
    check("the default desktop is still empty",
          desktop_labels(pg) == [], str(desktop_labels(pg)))

    # ══ Part C — the browser title ═══════════════════════════════════════
    check("the tab shows the brand alone before anything is opened",
          pg.title() == "CATTIPU OS", pg.title())
    check("the top bar agrees that nothing is active",
          workspace_title(pg) == "", repr(workspace_title(pg)))

    # Opened from the Projects tree, the same gesture M19's own harness
    # uses — a card double-click is a different affordance and not what
    # this check is about.
    pg.locator(".cattipu-folder-tree-item__label", has_text="AI SaaS Starter").first.click()
    pg.wait_for_timeout(600)
    check("opening a project moves the tab and the top bar together",
          pg.title() == "CATTIPU OS — AI SaaS Starter"
          and workspace_title(pg).strip().endswith("AI SaaS Starter"),
          f"tab {pg.title()!r}, bar {workspace_title(pg).strip()!r}")

    pg.locator(".cattipu-folder-tree-item__label", has_text="Banking Platform").first.click()
    pg.wait_for_timeout(600)
    check("switching projects switches both, with no third source of truth",
          pg.title() == "CATTIPU OS — Banking Platform"
          and workspace_title(pg).strip().endswith("Banking Platform"),
          f"tab {pg.title()!r}, bar {workspace_title(pg).strip()!r}")
    pg.close()

    # ══ Parts D + E — ONE action, every surface ══════════════════════════
    pg = fresh(br)
    before_recents = recents(pg)
    create_from_template(pg, "Web App")
    pg.wait_for_timeout(400)

    names = project_names(pg)
    check("E1 — the Projects window lists the new project",
          "Web App" in names, str(names))
    check("E2 — RECENT PROJECTS lists it, at the top",
          recents(pg)[:1] == ["Web App"],
          f"was {before_recents}, now {recents(pg)}")
    check("E3 — the workspace title follows it",
          workspace_title(pg).strip().endswith("Web App"),
          repr(workspace_title(pg).strip()))
    check("E4 — the browser title follows it",
          pg.title() == "CATTIPU OS — Web App", pg.title())
    labels = desktop_labels(pg)
    check("E5 — its workspace folder is on the desktop",
          "Web App" in labels, str(labels))

    # No duplicate records: the surfaces are views of one array, so the
    # name appears once per surface, not once per surface that copied it.
    check("E6 — exactly one project record and one workspace folder",
          names.count("Web App") == 1 and labels.count("Web App") == 1,
          f"{names.count('Web App')} cards, {labels.count('Web App')} folders")

    # One frame showing the whole of Part E at once: the card in the
    # Projects window, the name at the top of RECENT PROJECTS, the
    # workspace folder on the desktop, and the title bar — all from the
    # single creation above.
    pg.screenshot(path=f"{OUT}/Propagation.png")

    # Explorer and search, on the same state.
    pg.keyboard.press("Escape")
    open_explorer(pg)
    entries = explorer_labels(pg)
    # Twice on purpose: the PROJECT record and its workspace FOLDER are
    # different objects that share a name, and Explorer lists both at the
    # root. Seeing one of each is what "two views of one state" looks like.
    check("E7 — Explorer shows the project and its workspace folder",
          entries.count("Web App") == 2, str(entries))

    pg.locator("[data-testid=explorer-search]").fill("Web App")
    pg.wait_for_timeout(500)
    hits = explorer_labels(pg)
    check("E8 — search finds it without a separate index",
          any("Web App" in h for h in hits), str(hits))
    pg.locator("[data-testid=explorer-search]").fill("")
    pg.wait_for_timeout(400)

    # ── Part D: what the workspace folder actually contains ─────────────
    open_folder(pg, "Web App")
    inside = explorer_labels(pg)
    check("D1 — the workspace holds the plan's sections and a link back",
          set(["Screens", "Services", "Environments"]).issubset(set(inside))
          and "Web App" in inside,
          str(inside))
    pg.close()

    # An API declares no screens, so it gets no Screens folder — the same
    # rule that keeps plan.screens empty rather than inventing one.
    pg = fresh(br)
    create_from_template(pg, "API")
    pg.wait_for_timeout(400)
    open_explorer(pg)
    open_folder(pg, "API")
    api_inside = explorer_labels(pg)
    check("D2 — an API's workspace has no Screens folder",
          "Screens" not in api_inside and "Services" in api_inside,
          str(api_inside))

    # ── the new project is NOT reported as partly built ──────────────────
    progress = pg.evaluate(
        "() => [...document.querySelectorAll('.cattipu-project-card')]"
        ".map(c => ({name: (c.querySelector('.cattipu-project-card__title')||{}).textContent,"
        "            pct: (c.textContent.match(/(\\d+)%/)||[])[1]}))")
    fresh_project = [p for p in progress if p["name"] and p["name"].startswith("API")]
    check("D3 — a brand new template project reports 0%, not a seeded plan",
          fresh_project and fresh_project[0]["pct"] == "0", str(fresh_project))
    pg.screenshot(path=f"{OUT}/Template_Workspace.png")
    pg.close()

    # ── the workspace folder's name is a LINK, not a copy ────────────────
    pg = fresh(br)
    create_from_template(pg, "Dashboard")
    pg.wait_for_timeout(400)
    before_labels = desktop_labels(pg)
    before_cards = project_names(pg)

    # Rename the workspace FOLDER on the desktop and watch the PROJECT
    # change. A folder that had copied its name at creation would rename
    # only itself and leave the project card saying "Dashboard"; a folder
    # that is linked has no name of its own to edit, so the rename lands
    # on the project and every surface follows from the one record.
    # Aimed 12px in from the icon's left edge, not its centre: an icon in
    # column 2 has its centre under the Projects window, and a click there
    # lands on the window. M16's harness learned this the same way.
    x, y = pg.evaluate("""() => {
      const el = [...document.querySelectorAll('[data-object-id]')].find(e =>
        ((e.querySelector('.cattipu-desktop-objects__label')||{}).textContent||'').trim()
          === 'Dashboard');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [b.x + 12, b.y + 20];
    }""")
    pg.mouse.click(x, y, button="right")
    pg.wait_for_selector(".cattipu-context-menu", timeout=3000)
    menu_click(pg, "Rename")
    pg.wait_for_timeout(200)
    pg.locator(".cattipu-desktop-objects__rename").fill("Revenue Board")
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(500)

    after_labels = desktop_labels(pg)
    after_cards = project_names(pg)
    check("D4 — a workspace folder has no name of its own; renaming it renames the project",
          "Dashboard" in before_labels and "Dashboard" in before_cards
          and "Revenue Board" in after_labels and "Revenue Board" in after_cards
          and "Dashboard" not in after_labels and "Dashboard" not in after_cards,
          f"folders {before_labels} -> {after_labels}; cards {before_cards} -> {after_cards}")
    pg.close()

    for c in contexts:
        c.close()
    br.close()

failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "pass": ok, "detail": d} for n, ok, d in results],
          open("/tmp/m19b.json", "w"), indent=1)
sys.exit(1 if failed else 0)
