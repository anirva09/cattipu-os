import type { FileWrite } from "@/lib/contracts/filesystem";
import { FORGE_LIMITS, type BuildDiagnostic, type BuildTargetId } from "@/lib/contracts/forge";

/**
 * MVP-07 — the one build target Forge supports, as pure rules.
 *
 * WEB APPLICATION: a static browser app. The workspace needs `index.html`
 * at its root and one entry script at a fixed, allowlisted path; Forge
 * bundles the entry (and everything it imports, CSS included) with the
 * bundler this repository already carries, and writes an artifact that is
 * a directory a browser can open: index.html, main.js, main.css, and the
 * workspace's `public/` files.
 *
 * No packages: there is no install step, so a bare import ("react") fails
 * the build with the bundler's own "Could not resolve" diagnostic rather
 * than reaching into anyone's node_modules.
 */

export const WEB_APP_TARGET = {
  id: "web-app" as BuildTargetId,
  label: "WEB APPLICATION",
  requirement: "index.html and one entry: src/main.ts, src/main.js, src/index.ts, src/index.js, main.ts or main.js",
  html: "index.html",
  /** In order; the first one present is the entry. */
  entries: ["src/main.ts", "src/main.js", "src/index.ts", "src/index.js", "main.ts", "main.js"],
  publicDir: "public/",
} as const;

export type WebAppPlan =
  | { ok: true; entry: string; html: string; publicFiles: string[] }
  | { ok: false; summary: string; diagnostics: BuildDiagnostic[] };

export function planWebApp(files: readonly FileWrite[]): WebAppPlan {
  const paths = new Set(files.map((f) => f.path));
  const missing: BuildDiagnostic[] = [];
  if (!paths.has(WEB_APP_TARGET.html)) {
    missing.push({ severity: "error", message: "index.html is missing from the workspace root.", file: WEB_APP_TARGET.html });
  }
  const entry = WEB_APP_TARGET.entries.find((candidate) => paths.has(candidate));
  if (!entry) {
    missing.push({ severity: "error", message: `No entry script. Add one of: ${WEB_APP_TARGET.entries.join(", ")}.` });
  }
  if (missing.length > 0 || !entry) {
    return { ok: false, summary: "Not built: the workspace is not a web application yet.", diagnostics: missing };
  }
  return {
    ok: true,
    entry,
    html: WEB_APP_TARGET.html,
    publicFiles: [...paths].filter((p) => p.startsWith(WEB_APP_TARGET.publicDir)).sort(),
  };
}

// ── secrets ────────────────────────────────────────────────────────────

/** Files that never leave the filesystem for a build: environment files,
 *  package-manager credentials and private keys. */
export function isSecretPath(path: string): boolean {
  const name = path.split("/").pop() ?? path;
  return (
    /^\.env(\..*)?$/i.test(name) ||
    /^\.(npmrc|netrc|pypirc)$/i.test(name) ||
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /^id_(rsa|dsa|ecdsa|ed25519)$/i.test(name)
  );
}

// ── the artifact's page ────────────────────────────────────────────────

/**
 * The artifact's index.html: the source page with its development script
 * tag for the entry removed, and the bundle's script (and stylesheet, when
 * there is one) put in. Deterministic; nothing else in the page changes.
 */
export function artifactHtml(source: string, entry: string, hasCss: boolean): string {
  const entryName = entry.replace(/^\.\//, "");
  const pointsAtEntry = (src: string) => src.replace(/^\.?\//, "") === entryName;
  let html = source.replace(
    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>\s*/gi,
    (tag, src: string) => (pointsAtEntry(src) ? "" : tag),
  );
  if (hasCss) {
    const link = '<link rel="stylesheet" href="./main.css">';
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `  ${link}\n</head>`) : `${link}\n${html}`;
  }
  const script = '<script type="module" src="./main.js"></script>';
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `  ${script}\n</body>`) : `${html}\n${script}\n`;
}

// ── output ─────────────────────────────────────────────────────────────

/**
 * The bundler's messages as diagnostics. Its plain-text format is a marker
 * line ("X [ERROR] ..." on Windows, "✘ [ERROR] ..." elsewhere) followed,
 * after a blank line, by an indented "file:line:column:" location.
 */
export function parseDiagnostics(output: string): BuildDiagnostic[] {
  const lines = output.split(/\r?\n/);
  const out: BuildDiagnostic[] = [];
  for (let i = 0; i < lines.length && out.length < FORGE_LIMITS.maxDiagnostics; i += 1) {
    const head = /^\s*(?:X|✘|▲|×)\s+\[(ERROR|WARNING)\]\s+(.+?)\s*$/.exec(lines[i]);
    if (!head) continue;
    const diagnostic: BuildDiagnostic = {
      severity: head[1] === "ERROR" ? "error" : "warning",
      message: head[2].slice(0, FORGE_LIMITS.maxDiagnosticChars),
    };
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      const where = /^\s+([^\s:][^:]*?):(\d+):(\d+):\s*$/.exec(lines[j]);
      if (where) {
        diagnostic.file = where[1].replace(/\\/g, "/");
        diagnostic.line = Number(where[2]);
        diagnostic.column = Number(where[3]);
        break;
      }
    }
    out.push(diagnostic);
  }
  return out;
}

/**
 * Output fit to keep: the build workspace's absolute path removed (it means
 * nothing once deleted and names the machine), any secret value from the
 * server's environment redacted, and only the tail kept.
 */
export function sanitizeOutput(output: string, workDir: string, secrets: readonly string[]): string {
  let text = output;
  for (const dir of new Set([workDir, workDir.replace(/\\/g, "/")])) {
    if (dir) text = text.split(dir).join("<workspace>");
  }
  for (const secret of secrets) {
    if (secret.length >= 8) text = text.split(secret).join("<redacted>");
  }
  const max = FORGE_LIMITS.maxOutputChars;
  return text.length > max ? `…${text.slice(text.length - max)}` : text;
}

/** One line for the build history. */
export function buildSummary(
  status: "success" | "failed",
  diagnostics: readonly BuildDiagnostic[],
  artifactFiles: number,
  bytes: number,
): string {
  if (status === "success") {
    const kb = (bytes / 1024).toFixed(1);
    return `Built ${artifactFiles} ${artifactFiles === 1 ? "file" : "files"}, ${kb} KB.`;
  }
  const errors = diagnostics.filter((d) => d.severity === "error");
  const first = errors[0];
  if (!first) return "Build failed.";
  const where = first.file ? `${first.file}${first.line ? `:${first.line}` : ""}: ` : "";
  const more = errors.length > 1 ? ` (+${errors.length - 1} more)` : "";
  return `Build failed: ${where}${first.message}${more}`.slice(0, FORGE_LIMITS.maxDiagnosticChars);
}
