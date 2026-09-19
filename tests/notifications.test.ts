/**
 * M22 (Notification Center) — the store's history semantics, the panel,
 * the Bell, and the boundaries that keep the center a shell utility
 * surface on the one notification owner.
 *
 * The panel and the TopBar are plain functions of their props, so these
 * tests call them directly and walk the element tree they return: that
 * gives the real click handlers to invoke against the real store, which
 * static markup alone cannot. Static markup is used where what matters is
 * what a person would see. Stylesheets and PixelForge SVG imports are
 * stubbed because Node cannot load them.
 *
 * Run with: npx tsx tests/notifications.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { APP_MAP } from "@/lib/apps";
import { CATTIPU_WINDOW_IDS } from "@/components/WindowManager/windowManager.reducer";
import {
  MAX_HISTORY,
  newestFirst,
  unreadCount,
  useNotificationStore,
  type CattipuNotification,
} from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";

// The repository compiles JSX with the classic runtime (tsconfig
// `jsx: preserve`, which tsx lowers to React.createElement).
(globalThis as Record<string, unknown>).React = React;
const loaders = require.extensions as unknown as Record<string, (m: { exports: unknown }) => void>;
loaders[".css"] = (m) => {
  m.exports = {};
};
loaders[".svg"] = (m) => {
  m.exports = { __esModule: true, default: () => null };
};

type CenterModule = typeof import("@/components/System/NotificationCenter");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const center = require("@/components/System/NotificationCenter") as CenterModule;
type ShellIconsModule = typeof import("@/components/PixelIcon/shellIcons");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SHELL_ICON_IDS } = require("@/components/PixelIcon/shellIcons") as ShellIconsModule;
type TopBarModule = typeof import("@/components/TopBar/TopBar");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TopBar } = require("@/components/TopBar/TopBar") as TopBarModule;

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function listSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const abs = join(ROOT, dir, entry);
    if (statSync(abs).isDirectory()) out.push(...listSource(relative(ROOT, abs)));
    else if (/\.tsx?$/.test(entry)) out.push(relative(ROOT, abs).split("\\").join("/"));
  }
  return out;
}

const store = () => useNotificationStore.getState();
const reset = () => useNotificationStore.setState({ notifications: [] });

/** Run `fn` with Date.now pinned, so pushes can share a timestamp. */
function atTime<T>(now: number, fn: () => T): T {
  const real = Date.now;
  Date.now = () => now;
  try {
    return fn();
  } finally {
    Date.now = real;
  }
}

// ── element-tree helpers ───────────────────────────────────────────────

type Node = React.ReactElement<Record<string, unknown>>;

function walk(node: unknown, visit: (el: Node) => void) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!React.isValidElement(node)) return;
  const el = node as Node;
  visit(el);
  walk(el.props.children, visit);
}

function find(tree: unknown, predicate: (el: Node) => boolean): Node[] {
  const found: Node[] = [];
  walk(tree, (el) => {
    if (predicate(el)) found.push(el);
  });
  return found;
}

const button = (tree: unknown, label: string | RegExp) => {
  const matches = find(tree, (el) => {
    if (el.type !== "button") return false;
    const name = (el.props["aria-label"] as string | undefined) ?? textOf(el);
    return typeof label === "string" ? name === label : label.test(name);
  });
  assert.equal(matches.length, 1, `expected exactly one button named ${label}`);
  return matches[0];
};

function textOf(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (!React.isValidElement(node)) return "";
  return textOf((node as Node).props.children);
}

const click = (el: Node) => (el.props.onClick as () => void)();

const panel = () =>
  center.NotificationCenterPanel({ notifications: store().notifications });

// ── STORE ──────────────────────────────────────────────────────────────

test("push stores an unread entry with a store-made id and push-time timestamp", () => {
  reset();
  const id = atTime(1_700_000_000_000, () => store().push("info", "Hello", { message: "World" }));
  const [n] = store().notifications;
  assert.equal(n.id, id);
  assert.match(id, /\S/);
  assert.equal(n.type, "info");
  assert.equal(n.title, "Hello");
  assert.equal(n.message, "World");
  assert.equal(n.createdAt, 1_700_000_000_000);
  assert.equal(n.read, false);
});

test("ids are unique per push and never change when the entry changes", () => {
  reset();
  const a = store().push("info", "A");
  const b = store().push("info", "A");
  assert.notEqual(a, b, "a repeated event is a second notification, not a duplicate");
  store().markRead(a);
  assert.deepEqual(
    store().notifications.map((n) => n.id),
    [a, b],
  );
});

test("newest first follows insertion order, even for pushes in the same millisecond", () => {
  reset();
  const ids = atTime(42, () => ["first", "second", "third"].map((t) => store().push("info", t)));
  assert.deepEqual(
    newestFirst(store().notifications).map((n) => n.id),
    [...ids].reverse(),
  );
  // Deterministic: the same history always orders the same way, and the
  // store's own array is left in canonical (insertion) order.
  assert.deepEqual(newestFirst(store().notifications), newestFirst(store().notifications));
  assert.deepEqual(store().notifications.map((n) => n.id), ids);
});

test("markRead reads exactly one entry; repeating it or naming no entry changes nothing", () => {
  reset();
  const a = store().push("info", "A");
  const b = store().push("warning", "B");
  store().markRead(a);
  assert.deepEqual(store().notifications.map((n) => n.read), [true, false]);
  assert.equal(unreadCount(store().notifications), 1);

  const before = store().notifications;
  store().markRead(a);
  store().markRead("notif-missing");
  assert.equal(store().notifications, before, "no-op actions must not publish a new history");
  assert.ok(store().notifications.some((n) => n.id === b && !n.read));
});

test("markAllRead reads every entry and is a no-op once nothing is unread", () => {
  reset();
  store().push("info", "A");
  store().push("error", "B");
  store().markAllRead();
  assert.equal(unreadCount(store().notifications), 0);
  const before = store().notifications;
  store().markAllRead();
  assert.equal(store().notifications, before);
});

test("dismiss removes only the named entry, and it stays gone", () => {
  reset();
  const a = store().push("info", "A");
  const b = store().push("success", "B");
  store().dismiss(a);
  assert.deepEqual(store().notifications.map((n) => n.id), [b]);
  store().push("info", "C");
  assert.ok(!store().notifications.some((n) => n.id === a));
});

test("clearAll empties the history and is a no-op when it is already empty", () => {
  reset();
  store().push("info", "A");
  store().push("warning", "B");
  store().clearAll();
  assert.deepEqual(store().notifications, []);
  const before = store().notifications;
  store().clearAll();
  assert.equal(store().notifications, before);
});

test("history is bounded by MAX_HISTORY and drops the oldest first", () => {
  reset();
  const ids = Array.from({ length: MAX_HISTORY + 2 }, (_, i) => store().push("info", `N${i}`));
  const kept = store().notifications.map((n) => n.id);
  assert.equal(kept.length, MAX_HISTORY);
  assert.deepEqual(kept, ids.slice(-MAX_HISTORY));
});

test("history is session-scoped and entries never expire on a timer", () => {
  const source = read("store/useNotificationStore.ts");
  assert.doesNotMatch(source, /zustand\/middleware|persist\(|localStorage|sessionStorage/);
  assert.doesNotMatch(source, /setTimeout|setInterval/);
});

test("only success and error chime, only when sound is on, and only on push", () => {
  reset();
  const g = globalThis as Record<string, unknown>;
  const hadWindow = "window" in g;
  const plays: string[] = [];
  g.window = globalThis;
  g.Audio = class {
    src: string;
    currentTime = 0;
    volume = 1;
    preload = "";
    constructor(src: string) {
      this.src = src;
    }
    play() {
      plays.push(this.src);
      return Promise.resolve();
    }
  };
  const sound = useSettingsStore.getState().soundEnabled;
  try {
    useSettingsStore.setState({ soundEnabled: true });
    for (const type of ["info", "success", "warning", "error"] as const) store().push(type, type);
    assert.deepEqual(plays, ["/sounds/success.wav", "/sounds/error.wav"]);

    // Reading, dismissing, clearing and rendering the center are not pushes.
    const id = store().notifications[0].id;
    store().markRead(id);
    store().markAllRead();
    store().dismiss(id);
    renderToStaticMarkup(React.createElement(center.NotificationCenterPanel, { notifications: store().notifications }));
    store().clearAll();
    assert.equal(plays.length, 2);

    useSettingsStore.setState({ soundEnabled: false });
    store().push("error", "Muted");
    assert.equal(plays.length, 2, "sound off must suppress the chime");
    assert.equal(store().notifications.length, 1, "a muted push is still a notification");
  } finally {
    useSettingsStore.setState({ soundEnabled: sound });
    delete g.Audio;
    if (!hadWindow) delete g.window;
  }
});

// ── CENTER ─────────────────────────────────────────────────────────────

test("the center renders canonical notifications newest first", () => {
  reset();
  store().push("info", "Older", { message: "first body" });
  store().push("error", "Newer");
  const html = renderToStaticMarkup(panel());
  assert.ok(html.indexOf("Newer") < html.indexOf("Older"), "newest must render first");
  assert.match(html, /first body/);
  assert.match(html, /role="dialog"/);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
});

test("the empty center says NO NOTIFICATIONS and disables both footer actions", () => {
  reset();
  const tree = panel();
  assert.match(renderToStaticMarkup(tree), /NO NOTIFICATIONS/);
  assert.equal(button(tree, "MARK ALL READ").props.disabled, true);
  assert.equal(button(tree, "CLEAR ALL").props.disabled, true);
});

test("each type maps to its canonical PixelForge status mark", () => {
  const expected = { info: "info", success: "ready", warning: "warning", error: "error" } as const;
  for (const [type, icon] of Object.entries(expected)) {
    assert.equal(center.NOTIFICATION_MARKS[type as keyof typeof expected].icon, icon);
    assert.match(SHELL_ICON_IDS[icon], /^CAT-UTIL-0(07|08|09|10)$/);
  }
  reset();
  store().push("success", "Ok");
  const marks = find(panel(), (el) => typeof el.props.name === "string" && el.props.size === 16);
  assert.deepEqual(marks.map((m) => m.props.name), ["ready"]);
});

test("the row's mark-read action reads that entry through the store", () => {
  reset();
  store().push("info", "Keep");
  const target = store().push("warning", "Read me");
  click(button(panel(), "Mark read: Read me"));
  assert.deepEqual(
    store().notifications.map((n) => [n.id === target, n.read]),
    [[false, false], [true, true]],
  );
  // A read row offers no mark-read action.
  assert.equal(find(panel(), (el) => el.props["aria-label"] === "Mark read: Read me").length, 0);
});

test("the dismiss action removes the entry through the store", () => {
  reset();
  store().push("info", "Stay");
  store().push("error", "Go");
  click(button(panel(), "Dismiss: Go"));
  assert.deepEqual(store().notifications.map((n) => n.title), ["Stay"]);
  assert.doesNotMatch(renderToStaticMarkup(panel()), /Go</);
});

test("Mark All Read and Clear All act through the store and disable honestly", () => {
  reset();
  store().push("info", "A");
  store().push("warning", "B");
  let tree = panel();
  assert.equal(button(tree, "MARK ALL READ").props.disabled, false);
  click(button(tree, "MARK ALL READ"));
  assert.equal(unreadCount(store().notifications), 0);

  tree = panel();
  assert.equal(button(tree, "MARK ALL READ").props.disabled, true);
  assert.equal(button(tree, "CLEAR ALL").props.disabled, false);
  click(button(tree, "CLEAR ALL"));
  assert.deepEqual(store().notifications, []);
});

test("the header count is capped at 99+", () => {
  assert.equal(center.formatUnreadCount(7), "7");
  assert.equal(center.formatUnreadCount(99), "99");
  assert.equal(center.formatUnreadCount(100), "99+");
});

test("the center and the Bell draw no Lucide or retired M13 icons", () => {
  for (const file of ["components/System/NotificationCenter.tsx", "components/TopBar/TopBar.tsx"]) {
    assert.doesNotMatch(read(file), /from\s+["'](lucide-react|@\/components\/Icons|framer-motion)["']/, file);
  }
});

// ── BELL ───────────────────────────────────────────────────────────────

const topBar = (props: Partial<React.ComponentProps<typeof TopBar>>) =>
  TopBar({ dateTimeText: "", ...props });
const bellOf = (tree: unknown) =>
  find(tree, (el) => String(el.props.className ?? "").includes("cattipu-top-bar__notification-button"))[0];

test("the Bell toggles: closed → click → open → click → closed", () => {
  let open = false;
  const onToggle = () => {
    open = !open;
  };
  click(bellOf(topBar({ notificationsOpen: open, onNotifications: onToggle })));
  assert.equal(open, true);
  const bell = bellOf(topBar({ notificationsOpen: open, onNotifications: onToggle }));
  assert.equal(bell.props["aria-expanded"], true);
  click(bell);
  assert.equal(open, false);
  assert.equal(bellOf(topBar({ notificationsOpen: open, onNotifications: onToggle })).props["aria-expanded"], false);
});

test("Escape closes; presses on the panel or the Bell do not; presses elsewhere do", () => {
  const box = (...inside: unknown[]) => ({ contains: (node: unknown) => inside.includes(node) });
  const inPanel = {} as EventTarget;
  const onBell = {} as EventTarget;
  const elsewhere = {} as EventTarget;
  const panelBox = box(inPanel);
  const bellBox = box(onBell);
  const dismissal = (event: { type: string; key?: string; target: EventTarget | null }) =>
    center.centerDismissal(event, panelBox as never, bellBox as never);

  assert.equal(dismissal({ type: "keydown", key: "Escape", target: inPanel }), "escape");
  assert.equal(dismissal({ type: "keydown", key: "Tab", target: inPanel }), null);
  assert.equal(dismissal({ type: "pointerdown", target: inPanel }), null);
  assert.equal(dismissal({ type: "pointerdown", target: onBell }), null);
  assert.equal(dismissal({ type: "pointerdown", target: elsewhere }), "outside");
});

test("a closed center renders nothing; an open one renders the dialog", () => {
  const bellRef = { current: null };
  const render = (open: boolean) =>
    renderToStaticMarkup(
      React.createElement(center.NotificationCenter, { id: "nc", open, onClose: () => {}, bellRef }),
    );
  assert.equal(render(false), "");
  assert.match(render(true), /id="nc"[^>]*role="dialog"|role="dialog"[^>]*id="nc"/);
});

test("the Bell's unread indicator follows canonical unread state", () => {
  const withUnread = topBar({ hasNotification: true, unreadCount: 3 });
  assert.ok(find(withUnread, (el) => el.props.className === "cattipu-top-bar__unread-marker").length === 1);
  assert.equal(bellOf(withUnread).props["aria-label"], "Notifications, 3 unread");

  const none = topBar({ hasNotification: false, unreadCount: 0 });
  assert.equal(find(none, (el) => el.props.className === "cattipu-top-bar__unread-marker").length, 0);

  // The shell derives both from the store, not from Bell-local state.
  const shell = read("components/Shell/CattipuShell.tsx");
  assert.match(shell, /useNotificationStore\(\(s\) => unreadCount\(s\.notifications\)\)/);
  assert.match(read("components/InteractiveDesktop/InteractiveDesktop.tsx"), /hasNotification=\{Boolean\(notificationCenter && notificationCenter\.unreadCount > 0\)\}/);
});

test("Search is untouched: its button still only forwards onSearch and nothing wires it", () => {
  const onSearch = () => {};
  const search = find(topBar({ onSearch }), (el) => el.props["aria-label"] === "Search");
  assert.equal(search.length, 1);
  assert.equal(search[0].props.onClick, onSearch);
  for (const file of ["components/Shell/CattipuShell.tsx", "components/InteractiveDesktop/InteractiveDesktop.tsx"]) {
    assert.doesNotMatch(read(file), /onSearch|CommandPalette/, file);
  }
});

// ── ARCHITECTURE ───────────────────────────────────────────────────────

test("the center, the Bell and their wiring never touch the legacy window store or palette", () => {
  for (const file of [
    "components/System/NotificationCenter.tsx",
    "components/TopBar/TopBar.tsx",
    "components/Shell/CattipuShell.tsx",
    "components/InteractiveDesktop/InteractiveDesktop.tsx",
  ]) {
    assert.doesNotMatch(read(file), /useWindowStore|CommandPalette/, file);
  }
});

test("exactly one live Notification Center path: CattipuShell mounts the one renderer", () => {
  const live = [...listSource("components"), ...listSource("app"), ...listSource("lib")];
  const mounters = live.filter((file) => /System\/NotificationCenter["']/.test(read(file)));
  assert.deepEqual(mounters, ["components/Shell/CattipuShell.tsx"]);
  assert.equal((read("components/Shell/CattipuShell.tsx").match(/<NotificationCenter\b/g) ?? []).length, 1);
});

test("there is one notification store", () => {
  const stores = listSource("store");
  assert.deepEqual(stores.filter((f) => /notif|toast|bell/i.test(f)), ["store/useNotificationStore.ts"]);
  const creators = [...listSource("store"), ...listSource("components"), ...listSource("lib")].filter(
    (file) => /create<[^>]*Notification/.test(read(file)),
  );
  assert.deepEqual(creators, ["store/useNotificationStore.ts"]);
});

test("the center is not a managed window or an application", () => {
  for (const id of CATTIPU_WINDOW_IDS) assert.doesNotMatch(id, /notif|bell/i);
  for (const id of Object.keys(APP_MAP)) assert.doesNotMatch(id, /notif|bell/i);
  assert.doesNotMatch(read("components/System/NotificationCenter.tsx"), /ManagedWindow|useWindowManager|WindowManager\//);
});

// ── HYDRATION ──────────────────────────────────────────────────────────

test("rendering creates no time- or random-derived content", () => {
  const history: CattipuNotification[] = [
    { id: "notif-a", type: "info", title: "A", createdAt: 1_700_000_000_000, read: false },
    { id: "notif-b", type: "error", title: "B", message: "m", createdAt: 1_700_000_060_000, read: true },
  ];
  const render = () =>
    renderToStaticMarkup(React.createElement(center.NotificationCenterPanel, { notifications: history }));
  const realNow = Date.now;
  const realRandom = Math.random;
  try {
    Date.now = () => 1;
    Math.random = () => 0.1;
    const first = render();
    Date.now = () => 9_999_999_999_999;
    Math.random = () => 0.9;
    assert.equal(render(), first);
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }
  assert.doesNotMatch(read("components/System/NotificationCenter.tsx"), /Date\.now|Math\.random|new Date\(\)/);
});

// ── runner ─────────────────────────────────────────────────────────────

async function run() {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${name}`);
      console.error(err instanceof Error ? (err.stack ?? err.message) : err);
    }
  }
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

void run();
