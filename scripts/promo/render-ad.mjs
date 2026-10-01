// Renders the CATTIPU 90s spot (scripts/promo/ad.ts) to video.
//
//   node scripts/promo/render-ad.mjs
//
// 1. bundles ad.ts (Motion timeline) with the repository's own esbuild
// 2. opens it in headless Chrome or Edge (a throwaway profile, never yours)
// 3. pauses the Motion sequence and seeks it frame by frame, capturing each
//    frame exactly: no screen recording, no dropped frames
// 4. encodes docs/media/cattipu-ad.mp4 in the same browser (MediaRecorder)
// 5. writes docs/media/cattipu-ad.gif with Python + Pillow, for the README
//
// Needs: Chrome or Edge (or CHROME=<path>), Python 3 with Pillow for the GIF.
// Set AD_FRAMES_DIR=<dir> to keep the individual frames.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FPS = 25;
const W = 640;
const H = 480;
const OUT_MP4 = join(ROOT, "docs", "media", "cattipu-ad.mp4");
const OUT_GIF = join(ROOT, "docs", "media", "cattipu-ad.gif");

const BROWSERS = [
  process.env.CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserPath = BROWSERS.find((p) => existsSync(p));
if (!browserPath) throw new Error("No Chrome or Edge found. Set CHROME=<path to the browser>.");

const work = mkdtempSync(join(tmpdir(), "cattipu-ad-"));
const asset = (p) => pathToFileURL(join(ROOT, p)).href;

// ── 1. the page ──────────────────────────────────────────────────────────
const bundle = await build({
  entryPoints: [join(ROOT, "scripts", "promo", "ad.ts")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const css = `
@font-face { font-family: "Px437"; src: url("${asset("public/fonts/Web437_IBM_VGA_8x16.woff")}"); }
@font-face { font-family: "Ark"; src: url("${asset("public/fonts/ArkPixel-12px-Proportional-Latin.woff2")}"); }
html, body { margin: 0; background: #000; }
#stage { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000;
  filter: saturate(1.25) contrast(1.06) blur(0.45px); }
.shot { position: absolute; inset: 0; opacity: 0; overflow: hidden; }
.frame { position: absolute; left: 0; top: 0; transform-origin: 0 0; image-rendering: auto; }
.card { display: grid; place-items: center; }
.card-text { font-family: "Px437", monospace; letter-spacing: 1px; text-align: center; padding: 0 32px;
  text-shadow: 2px 0 rgba(255,60,60,.55), -2px 0 rgba(60,200,255,.35); }
.glitch { color: #ff1e1e; font-size: 96px; filter: blur(0.6px); }
.flash { background: #fffbe8; }
.hand-plate { background: #E9DFC4 url("${asset("public/assets/cattipu/engineering-paper-8px.png")}"); display: grid; place-items: center; }
.giant-cursor { width: 320px; height: 320px; image-rendering: pixelated; }
.arrow-cursor { position: absolute; left: 0; top: 0; width: 54px; height: 84px; image-rendering: pixelated; }
.type-plate { background: #E9DFC4; display: grid; place-items: center; }
.type-field { font-family: "Px437", monospace; padding: 22px 26px; min-width: 520px; background: #F4EEDD;
  border: 3px solid; border-color: #6b5f45 #fffaf0 #fffaf0 #6b5f45; }
.caret { margin-left: 2px; }
.end-plate { background: #E9DFC4 url("${asset("public/assets/cattipu/engineering-paper-8px.png")}"); display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.end-logo { width: 170px; image-rendering: pixelated; }
.end-name { font-family: "Px437", monospace; font-size: 46px; color: #002A73; letter-spacing: 2px; }
.end-tag { font-family: "Ark", monospace; font-size: 24px; color: #1d1d1d; }
.end-url { font-family: "Ark", monospace; font-size: 18px; color: #A40000; }
.overlay { position: absolute; inset: 0; pointer-events: none; }
.scan { background: repeating-linear-gradient(0deg, rgba(0,0,0,.20) 0 1px, transparent 1px 3px); }
.vignette { background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%); }
.grain { opacity: .07; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='128' height='128' filter='url(%23n)'/></svg>"); }
.band { height: 26px; inset: auto 0 auto 0; top: 0; background: linear-gradient(transparent, rgba(255,255,255,.10), transparent); }
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><div id="stage"></div><script>window.__AD_BASE__ = ${JSON.stringify(pathToFileURL(ROOT).href)};</script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;
const page = join(work, "ad.html");
writeFileSync(page, html);

// ── 2. the browser ───────────────────────────────────────────────────────
const port = 9400 + Math.floor(Math.random() * 400);
const proc = spawn(browserPath, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${join(work, "profile")}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
  "--allow-file-access-from-files", `--window-size=${W},${H}`, "--force-device-scale-factor=1", "about:blank",
], { stdio: "ignore", windowsHide: true });

let target;
for (let i = 0; i < 60 && !target; i += 1) {
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  } catch { /* starting */ }
  if (!target) await new Promise((r) => setTimeout(r, 200));
}
if (!target) throw new Error("The browser did not start.");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
};
const send = (method, params = {}) => new Promise((res, rej) => {
  seq += 1; pending.set(seq, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: seq, method, params }));
});
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(page).href });
  for (let i = 0; i < 50; i += 1) {
    if (await evaluate("!!window.__ad").catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await evaluate("document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))).then(() => true)");
  const duration = await evaluate("window.__ad.duration");
  const total = Math.ceil(duration * FPS);
  console.log(`spot ${duration.toFixed(2)}s, ${total} frames at ${FPS} fps`);

  // ── 3. frame-exact capture ─────────────────────────────────────────────
  // AD_FRAMES_DIR keeps the frames for inspection; by default they are temporary.
  const framesDir = process.env.AD_FRAMES_DIR ? resolve(process.env.AD_FRAMES_DIR) : join(work, "frames");
  mkdirSync(framesDir, { recursive: true });
  for (let f = 0; f < total; f += 1) {
    await evaluate(`(window.__ad.seek(${(f / FPS).toFixed(4)}), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))`);
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    writeFileSync(join(framesDir, `f${String(f).padStart(4, "0")}.png`), Buffer.from(shot.data, "base64"));
  }
  console.log("frames captured");

  // ── 4. MP4, encoded by the browser ─────────────────────────────────────
  const frameUrls = Array.from({ length: total }, (_, f) => pathToFileURL(join(framesDir, `f${String(f).padStart(4, "0")}.png`)).href);
  const mp4Base64 = await evaluate(`(async () => {
    const urls = ${JSON.stringify(frameUrls)};
    const imgs = await Promise.all(urls.map((u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; })));
    const canvas = document.createElement('canvas'); canvas.width = ${W}; canvas.height = ${H};
    const ctx = canvas.getContext('2d'); ctx.drawImage(imgs[0], 0, 0);
    const stream = canvas.captureStream(${FPS});
    const type = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E') ? 'video/mp4;codecs=avc1.42E01E' : 'video/webm;codecs=vp9';
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6000000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => rec.onstop = res);
    rec.start();
    const t0 = performance.now();
    for (let f = 0; f < imgs.length; f += 1) {
      ctx.drawImage(imgs[f], 0, 0);
      const wait = t0 + (f + 1) * ${1000 / FPS} - performance.now();
      await new Promise((r) => setTimeout(r, Math.max(0, wait)));
    }
    rec.stop(); await done;
    const blob = new Blob(chunks, { type });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return type + '|' + btoa(s);
  })()`);
  const [mime, data] = [mp4Base64.slice(0, mp4Base64.indexOf("|")), mp4Base64.slice(mp4Base64.indexOf("|") + 1)];
  const outVideo = mime.startsWith("video/mp4") ? OUT_MP4 : OUT_MP4.replace(/\.mp4$/, ".webm");
  writeFileSync(outVideo, Buffer.from(data, "base64"));
  console.log(`video ${outVideo} (${mime})`);

  // ── 5. GIF for the README ──────────────────────────────────────────────
  const py = spawnSync(process.platform === "win32" ? "python" : "python3", [join(ROOT, "scripts", "promo", "frames-to-gif.py"), framesDir, OUT_GIF], { stdio: "inherit" });
  if (py.status !== 0) console.warn("GIF skipped: Python with Pillow is needed.");
} finally {
  try { ws.close(); } catch { /* closed */ }
  proc.kill();
  await new Promise((r) => setTimeout(r, 1500));
  // The browser can hold its profile a moment after exit; a leftover temp
  // folder is not a failed render.
  try { rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* left in temp */ }
}
