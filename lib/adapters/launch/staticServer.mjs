/**
 * MVP-08 — the program a local-web runtime runs: a static HTTP server for
 * ONE Forge artifact directory.
 *
 * Started by Launch as `node staticServer.mjs <artifact directory>` — an
 * argument array, no shell. Plain JavaScript with no imports beyond Node
 * itself, so Node runs it directly.
 *
 * - Binds 127.0.0.1 only, on port 0: the OS picks a free port, so two
 *   runtimes can never collide. The port is reported on stdout as
 *   `CATTIPU-RUNTIME-READY {"host":"127.0.0.1","port":N}`.
 * - Serves only files inside the artifact directory. A path with `..`, a
 *   dot-segment, a backslash, a drive or stream colon, a NUL, or a hidden
 *   (dot) name is refused before it touches the disk; what remains is
 *   resolved, and its real path must still be inside the real root.
 * - GET and HEAD only. A Host header that is not this loopback address is
 *   refused, so a page on another origin cannot rebind a name to it.
 * - Exits when its stdin closes: Launch stops it that way, and if the
 *   server that started it dies, the pipe closes and so does this — no
 *   orphaned process keeps a port.
 * - If the artifact directory disappears (Forge pruned it), the next
 *   request is answered 410 and the process exits with code 3.
 */
import { createServer } from "node:http";
import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const READY = "CATTIPU-RUNTIME-READY";
export const EXIT_BAD_ROOT = 2;
export const EXIT_ROOT_GONE = 3;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function inside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * The file a request path names inside `root`, or null when the path is
 * not one this server will serve. Refuses rather than normalises: a path
 * that tries to climb is not quietly turned into one that does not.
 */
export function resolveRequestPath(root, rawUrl) {
  const pathname = String(rawUrl).split("?")[0].split("#")[0];
  if (!pathname.startsWith("/")) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (/[\0\\:]/.test(decoded)) return null;
  const segments = decoded.split("/").slice(1);
  for (const segment of segments) {
    if (segment === "..") return null;
    if (segment.startsWith(".")) return null;
  }
  const rel = segments.filter(Boolean).join("/");
  const file = decoded.endsWith("/") || rel === "" ? join(rel, "index.html") : rel;
  const target = resolve(root, file);
  return inside(root, target) ? target : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(body);
}

function main(argv) {
  const rootArg = argv[0];
  if (!rootArg || !isAbsolute(rootArg)) {
    process.stderr.write("The runtime needs the artifact directory as an absolute path.\n");
    process.exit(EXIT_BAD_ROOT);
  }
  let root;
  try {
    root = realpathSync(rootArg);
    if (!statSync(root).isDirectory() || !statSync(join(root, "index.html")).isFile()) throw new Error("no index.html");
  } catch {
    process.stderr.write("The artifact directory does not exist or has no index.html.\n");
    process.exit(EXIT_BAD_ROOT);
  }

  let port = 0;
  const server = createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method not allowed.\n", { Allow: "GET, HEAD" });
      return;
    }
    const host = String(req.headers.host ?? "");
    if (host !== `${HOST}:${port}` && host !== `localhost:${port}`) {
      send(res, 421, "This runtime answers only on its loopback address.\n");
      return;
    }
    try {
      statSync(root);
    } catch {
      send(res, 410, "The artifact this runtime served no longer exists.\n");
      server.close();
      setImmediate(() => process.exit(EXIT_ROOT_GONE));
      return;
    }
    let target = resolveRequestPath(root, req.url ?? "/");
    if (!target) {
      send(res, 404, "Not found.\n");
      return;
    }
    try {
      if (statSync(target).isDirectory()) target = join(target, "index.html");
      const real = realpathSync(target);
      const info = statSync(real);
      if (!inside(root, real) || !info.isFile()) throw new Error("outside");
      res.writeHead(200, {
        "Content-Type": TYPES[extname(real).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(real).pipe(res);
    } catch {
      send(res, 404, "Not found.\n");
    }
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.stdin.on("end", shutdown);
  process.stdin.on("close", shutdown);
  process.stdin.on("error", shutdown);
  process.stdin.resume();

  server.on("error", (err) => {
    process.stderr.write(`The runtime could not listen: ${err.code ?? err.message}\n`);
    process.exit(1);
  });
  server.listen(0, HOST, () => {
    const address = server.address();
    port = address.port;
    process.stdout.write(`${READY} ${JSON.stringify({ host: address.address, port: address.port })}\n`);
  });
}

// Run only when started as a program, never when imported.
const same = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && same(resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}
