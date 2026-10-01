/**
 * CATTIPU OS — a 90s-style TV spot, built with Motion (framer-motion).
 *
 * Hard cuts, extreme close-ups of the real interface, a giant pixel cursor,
 * typed text and red title cards, under a VHS finish (scanlines, grain, a
 * tracking band, soft focus). Every shot is a real screenshot of CATTIPU
 * (docs/media/screens) or one of its own assets (cursors, fonts, logo).
 *
 * The whole spot is ONE Motion sequence. render-ad.mjs pauses it and seeks
 * `controls.time` frame by frame, so every frame is exact — no screen
 * recording, no dropped frames. Run: `node scripts/promo/render-ad.mjs`.
 */
import { animate, motionValue, type AnimationSequence } from "framer-motion";

declare global {
  interface Window {
    __AD_BASE__: string;
    __ad: { duration: number; seek: (t: number) => void };
  }
}

const W = 640;
const H = 480;
const base = window.__AD_BASE__;
const screen = (name: string) => `${base}/docs/media/screens/${name}.png`;

const stage = document.getElementById("stage") as HTMLDivElement;
const sequence: AnimationSequence = [];

/** A crop of a 1600x900 screenshot, in its own pixels, 4:3. */
interface Crop { x: number; y: number; w: number }

function layer(className = "shot"): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  stage.appendChild(el);
  return el;
}

/** Shows `el` from `at` for `dur` seconds: a hard cut in and a hard cut out. */
function cut(el: HTMLElement, at: number, dur: number) {
  sequence.push([el, { opacity: [0, 1] }, { at, duration: 0.001 }]);
  sequence.push([el, { opacity: [1, 0] }, { at: at + dur, duration: 0.001 }]);
}

function transformFor(c: Crop) {
  const scale = W / c.w;
  return { scale, x: -c.x * scale, y: -c.y * scale };
}

/** A screenshot shot that drifts from crop `a` to crop `b` (a slow push-in). */
function shot(name: string, a: Crop, b: Crop, at: number, dur: number) {
  const el = layer();
  const img = document.createElement("img");
  img.src = screen(name);
  img.className = "frame";
  el.appendChild(img);
  const from = transformFor(a);
  const to = transformFor(b);
  sequence.push([img, { scale: [from.scale, to.scale], x: [from.x, to.x], y: [from.y, to.y] }, { at, duration: dur, ease: "linear" }]);
  cut(el, at, dur);
  return el;
}

/** A title card: pixel type on black (or another plate). */
function card(text: string, at: number, dur: number, opts: { color?: string; size?: number; bg?: string } = {}) {
  const el = layer("shot card");
  el.style.background = opts.bg ?? "#000";
  const t = document.createElement("div");
  t.className = "card-text";
  t.textContent = text;
  t.style.color = opts.color ?? "#f2ead6";
  t.style.fontSize = `${opts.size ?? 44}px`;
  el.appendChild(t);
  sequence.push([t, { scale: [1.12, 1] }, { at, duration: dur, ease: "easeOut" }]);
  cut(el, at, dur);
  return el;
}

/** One white frame, the editor's punctuation. */
function flash(at: number) {
  const el = layer("shot flash");
  cut(el, at, 0.04);
}

// ── the giant pixel hand ─────────────────────────────────────────────────
function handShot(at: number, dur: number) {
  const el = layer("shot hand-plate");
  const hand = document.createElement("img");
  hand.src = `${base}/public/cursors/hand.png`;
  hand.className = "giant-cursor";
  el.appendChild(hand);
  sequence.push([hand, { x: [260, 0], y: [220, 0] }, { at, duration: dur * 0.55, ease: "easeOut" }]);
  sequence.push([hand, { scale: [1, 0.88, 1] }, { at: at + dur * 0.62, duration: 0.18 }]);
  cut(el, at, dur);
}

// ── typing ───────────────────────────────────────────────────────────────
function typing(text: string, at: number, dur: number, opts: { field?: boolean; color?: string; size?: number } = {}) {
  const el = layer(opts.field ? "shot type-plate" : "shot card");
  const line = document.createElement("div");
  line.className = opts.field ? "type-field" : "card-text";
  line.style.color = opts.color ?? (opts.field ? "#002A73" : "#f2ead6");
  line.style.fontSize = `${opts.size ?? (opts.field ? 30 : 40)}px`;
  const typed = document.createElement("span");
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.textContent = "|";
  line.append(typed, caret);
  el.appendChild(line);

  const count = motionValue(0);
  count.on("change", (v) => (typed.textContent = text.slice(0, Math.round(v))));
  sequence.push([count, [0, text.length], { at, duration: dur * 0.7, ease: "linear" }]);
  const blink = motionValue(0);
  blink.on("change", (v) => (caret.style.opacity = Math.floor(v) % 2 === 0 ? "1" : "0"));
  sequence.push([blink, [0, Math.max(2, Math.round(dur * 5))], { at, duration: dur, ease: "linear" }]);
  cut(el, at, dur);
}

// ── a cursor arriving on a key, then pressing it ─────────────────────────
function pressShot(name: string, crop: Crop, target: { x: number; y: number }, at: number, dur: number) {
  const el = shot(name, crop, { x: crop.x + 6, y: crop.y + 4, w: crop.w - 12 }, at, dur);
  const arrow = document.createElement("img");
  arrow.src = `${base}/public/cursors/arrow.png`;
  arrow.className = "arrow-cursor";
  el.appendChild(arrow);
  sequence.push([arrow, { x: [W + 40, target.x], y: [H + 60, target.y] }, { at, duration: dur * 0.55, ease: "easeOut" }]);
  sequence.push([arrow, { scale: [1, 0.85, 1] }, { at: at + dur * 0.6, duration: 0.14 }]);
}

// ── the red question ─────────────────────────────────────────────────────
function glitchCard(text: string, at: number, dur: number) {
  const el = layer("shot card");
  el.style.background = "#000";
  const t = document.createElement("div");
  t.className = "card-text glitch";
  t.textContent = text;
  el.appendChild(t);
  const g = motionValue(0);
  g.on("change", (v) => {
    const k = Math.floor(v);
    const jx = Math.sin(k * 12.9898) * 4;
    const red = 3 + Math.abs(Math.sin(k * 3.1)) * 5;
    t.style.transform = `translateX(${jx.toFixed(1)}px)`;
    t.style.textShadow = `${red.toFixed(1)}px 0 rgba(255,40,40,.75), ${(-red).toFixed(1)}px 0 rgba(40,200,255,.45)`;
  });
  sequence.push([g, [0, dur * 25], { at, duration: dur, ease: "linear" }]);
  sequence.push([t, { scale: [1.35, 1] }, { at, duration: 0.25, ease: "easeOut" }]);
  cut(el, at, dur);
}

function endCard(at: number, dur: number) {
  const el = layer("shot end-plate");
  const logo = document.createElement("img");
  logo.src = `${base}/public/logo/icon-color.png`;
  logo.className = "end-logo";
  const name = document.createElement("div");
  name.className = "end-name";
  name.textContent = "CATTIPU OS";
  const tag = document.createElement("div");
  tag.className = "end-tag";
  tag.textContent = "The operating system for software creators.";
  const url = document.createElement("div");
  url.className = "end-url";
  url.textContent = "github.com/anirva09/cattipu-os";
  el.append(logo, name, tag, url);
  sequence.push([logo, { scale: [0.6, 1], opacity: [0, 1] }, { at, duration: 0.35, ease: "easeOut" }]);
  sequence.push([name, { opacity: [0, 1], y: [12, 0] }, { at: at + 0.25, duration: 0.25 }]);
  sequence.push([tag, { opacity: [0, 1] }, { at: at + 0.55, duration: 0.25 }]);
  sequence.push([url, { opacity: [0, 1] }, { at: at + 0.8, duration: 0.25 }]);
  cut(el, at, dur);
}

// ── the cut ──────────────────────────────────────────────────────────────
// Crops are in the screenshots' own 1600x900 pixels; every one is 4:3.
let t = 0;
const next = (d: number) => { const at = t; t += d; return at; };

card("SOMEWHERE,", next(0.55), 0.55);
card("SOMEONE HAS AN IDEA.", next(0.75), 0.75, { size: 34 });
handShot(next(0.85), 0.85);
typing("A habit tracker with streaks", next(1.15), 1.15, { field: true });
pressShot("architect", { x: 1060, y: 120, w: 320 }, { x: 430, y: 200 }, next(0.65), 0.65);
shot("architect", { x: 290, y: 380, w: 520 }, { x: 330, y: 400, w: 400 }, next(0.45), 0.45);
flash(t);
card("PLAN IT.", next(0.42), 0.42, { color: "#ff3b30", size: 64 });
shot("canvas", { x: 250, y: 120, w: 900 }, { x: 330, y: 160, w: 700 }, next(0.38), 0.38);
shot("explorer", { x: 110, y: 90, w: 600 }, { x: 110, y: 170, w: 520 }, next(0.48), 0.48);
flash(t);
card("BUILD IT.", next(0.42), 0.42, { color: "#ff3b30", size: 64 });
shot("hero", { x: 105, y: 160, w: 480 }, { x: 115, y: 165, w: 300 }, next(0.55), 0.55);
shot("hero", { x: 1160, y: 70, w: 200 }, { x: 1230, y: 78, w: 120 }, next(0.32), 0.32);
shot("boot", { x: 520, y: 240, w: 560 }, { x: 600, y: 330, w: 400 }, next(0.42), 0.42);
flash(t);
card("RUN IT.", next(0.42), 0.42, { color: "#ff3b30", size: 64 });
shot("hero", { x: 740, y: 160, w: 480 }, { x: 745, y: 175, w: 340 }, next(0.55), 0.55);
shot("built-app", { x: 380, y: 20, w: 840 }, { x: 430, y: 40, w: 740 }, next(0.32), 0.32);
shot("built-app-dark", { x: 430, y: 40, w: 740 }, { x: 480, y: 60, w: 640 }, next(0.32), 0.32);
shot("ai-console", { x: 100, y: 150, w: 720 }, { x: 110, y: 200, w: 560 }, next(0.65), 0.65);
shot("memory", { x: 100, y: 80, w: 900 }, { x: 120, y: 120, w: 700 }, next(0.36), 0.36);
shot("desktop-dark", { x: 1100, y: 70, w: 500 }, { x: 1300, y: 80, w: 300 }, next(0.4), 0.4);
shot("notifications", { x: 1100, y: 60, w: 500 }, { x: 1250, y: 70, w: 350 }, next(0.38), 0.38);

// The rapid-fire montage.
const montage: Array<[string, Crop]> = [
  ["hero", { x: 0, y: 0, w: 1200 }],
  ["wallpaper-studio", { x: 300, y: 120, w: 900 }],
  ["desktop", { x: 200, y: 0, w: 1200 }],
  ["boot-ready", { x: 500, y: 230, w: 600 }],
  ["widgets-menu", { x: 560, y: 220, w: 520 }],
  ["canvas", { x: 200, y: 80, w: 1000 }],
  ["launch", { x: 300, y: 120, w: 900 }],
  ["architect", { x: 100, y: 80, w: 1100 }],
];
for (const [name, crop] of montage) {
  shot(name, crop, { x: crop.x + crop.w * 0.06, y: crop.y + crop.w * 0.03, w: crop.w * 0.88 }, next(0.13), 0.13);
}

typing("What will we build", next(1.25), 1.25);
glitchCard("today?", next(1.15), 1.15);
endCard(next(2.2), 2.2);

// ── the VHS finish, above every shot ─────────────────────────────────────
const grain = layer("overlay grain");
const band = layer("overlay band");
layer("overlay scan");
layer("overlay vignette");
const tick = motionValue(0);
tick.on("change", (v) => {
  const k = Math.floor(v);
  grain.style.backgroundPosition = `${(k * 37) % 128}px ${(k * 71) % 128}px`;
  band.style.transform = `translateY(${((k * 9) % (H + 120)) - 60}px)`;
});
sequence.push([tick, [0, t * 25], { at: 0, duration: t, ease: "linear" }]);

const controls = animate(sequence);
controls.pause();
window.__ad = {
  duration: t,
  seek: (time: number) => {
    controls.time = time;
  },
};
