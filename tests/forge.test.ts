/**
 * MVP-07 (Forge) — a project's files, really built.
 *
 *   Forge window → useForgeStore → /api/forge → ForgeService
 *     → materializer (one project's files, temp workspace)
 *     → esbuild (allowlisted binary, fixed arguments, no shell)
 *     → artifact directory → BuildResult → project.forge.builds + memory
 *
 * The builds below are REAL: esbuild runs as a native process against files
 * written to a throwaway root, and the assertions read the artifact from
 * disk. Exactly one case replaces the process boundary (`ProcessRunner`),
 * to capture what WOULD be executed; nothing else is mocked.
 *
 * Cases are written against the wrong implementations this sprint could
 * plausibly ship: a "build" that returns success without running anything
 * (the artifact is read back from disk and must contain the source's
 * code); an artifact left behind by a failed build (its directory must not
 * exist); Beta's source in Alpha's artifact (each bundle is searched for
 * the other project's marker); a command taken from the request or from a
 * package.json (the runner's argument list is compared exactly).
 *
 * Run with: npx tsx tests/forge.test.ts
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { FileWrite } from "@/lib/contracts/filesystem";
import {
  FORGE_LIMITS,
  isBuildTarget,
  type BuildResult,
  type ForgeClient,
  type ForgeResponse,
  type ProcessSpec,
} from "@/lib/contracts/forge";
import { childEnvironment, runProcess } from "@/lib/adapters/forge/processRunner";
import { esbuildBinary, resolveEsbuildToolchain } from "@/lib/adapters/forge/esbuildToolchain";
import { insideRoot, materializeWorkspace } from "@/lib/adapters/forge/workspaceMaterializer";
import { projectMilestonesReached } from "@/lib/os/projects";
import { buildStatus } from "@/lib/os/templates";
import { createProject, PROJECT_SCHEMA_VERSION } from "@/lib/project/types";
import { migrateProject } from "@/lib/project/migrate";
import { BUILD_MEMORY_RECORD_ID, toForgeBuild } from "@/lib/services/forge/buildHistory";
import { createForgeService, parseBuildRequest, type ForgeService } from "@/lib/services/forge/forgeService";
import { forgePolicy, secretValues } from "@/lib/services/forge/serverForge";
import { artifactHtml, parseDiagnostics, planWebApp, sanitizeOutput } from "@/lib/services/forge/webAppTarget";
import { memoryService } from "@/lib/services/memory/memoryService";
import { CATTIPU_WINDOW_IDS } from "@/components/WindowManager/windowManager.reducer";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useForgeStore } from "@/store/useForgeStore";
import { useProjectStore } from "@/store/useProjectStore";

(globalThis as Record<string, unknown>).React = React;
const loaders = require.extensions as unknown as Record<string, (m: { exports: unknown }) => void>;
loaders[".css"] = (m) => {
  m.exports = {};
};
loaders[".svg"] = (m) => {
  m.exports = { __esModule: true, default: () => null };
};

const tests: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** A throwaway Forge root for this run, removed at the end. */
const ROOT = join(tmpdir(), `cattipu-forge-test-${process.pid}-${Date.now().toString(36)}`);

let ids = 0;
const service = (overrides: Partial<Parameters<typeof createForgeService>[0]> = {}): ForgeService =>
  createForgeService({
    root: ROOT,
    toolchain: () => resolveEsbuildToolchain(),
    runner: runProcess,
    policy: () => ({ enabled: true, reason: null }),
    secrets: () => ["sk-test-SECRET-VALUE-123"],
    newBuildId: () => `build-t${(ids += 1).toString().padStart(4, "0")}`,
    ...overrides,
  });

const webApp = (marker: string, extra: FileWrite[] = []): FileWrite[] => [
  {
    path: "index.html",
    content: `<!doctype html>\n<html>\n<head><title>${marker}</title></head>\n<body>\n<ul id="tasks"></ul>\n<script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n`,
  },
  {
    path: "src/main.ts",
    content: `import "./style.css";\nimport { tasks } from "./tasks";\nconst list: HTMLElement | null = document.getElementById("tasks");\nfor (const t of tasks) list?.append(Object.assign(document.createElement("li"), { textContent: t }));\nconsole.log("${marker}");\n`,
  },
  { path: "src/tasks.ts", content: `export const tasks: string[] = ["${marker} one", "${marker} two"];\n` },
  { path: "src/style.css", content: "li { color: #1d2a5c; }\n" },
  { path: "public/robots.txt", content: "User-agent: *\n" },
  ...extra,
];

const request = (projectId: string, files: FileWrite[], more: Record<string, unknown> = {}) => ({
  projectId,
  target: "web-app",
  configuration: "production",
  files,
  ...more,
});

function built(response: ForgeResponse): BuildResult {
  assert.ok(response.ok, response.ok ? "" : `${response.error.code}: ${response.error.message}`);
  return response.result;
}

// ── contract & validation ──────────────────────────────────────────────

test("1 request validation: a build names a safe project, a known target and carries workspace files", () => {
  const files = webApp("A");
  const bad: Array<[unknown, RegExp]> = [
    [null, /JSON object/],
    [request("", files), /name the project/],
    [request("../escape", files), /name the project/],
    [request("pa", files, { target: "npm run build" }), /target is not supported/],
    [request("pa", files, { configuration: "release; rm -rf /" }), /configuration is not supported/],
    [request("pa", files, { files: "index.html" }), /carry the project's files/],
    [request("pa", [{ path: "../etc/passwd", content: "" }]), /not a workspace path/],
    [request("pa", [{ path: "C:/Windows/win.ini", content: "" }]), /not a workspace path/],
    [request("pa", [{ path: "a.ts", content: "" }, { path: "./a.ts", content: "" }]), /appears twice/],
    [request("pa", Array.from({ length: FORGE_LIMITS.maxFiles + 1 }, (_, i) => ({ path: `f${i}.ts`, content: "" }))), /at most/],
  ];
  for (const [input, message] of bad) {
    const parsed = parseBuildRequest(input);
    assert.equal(parsed.ok, false, JSON.stringify(input)?.slice(0, 80));
    if (!parsed.ok && !parsed.response.ok) assert.match(parsed.response.error.message, message);
  }
  const ok = parseBuildRequest(request("pa", files, { command: "del /s C:\\", script: "evil", args: ["--x"] }));
  assert.ok(ok.ok);
  assert.deepEqual(Object.keys(ok.request).sort(), ["configuration", "files", "projectId", "target"], "no command survives parsing");
});

test("3 targets: exactly one allowlisted target; a command is never a target", () => {
  assert.equal(isBuildTarget("web-app"), true);
  for (const t of ["npm run build", "build", "node", "cmd", "", "web-app "]) assert.equal(isBuildTarget(t), false, t);
  assert.deepEqual(planWebApp([{ path: "index.html", content: "" }]).ok, false, "an entry is required");
  const plan = planWebApp(webApp("A"));
  assert.ok(plan.ok);
  assert.equal(plan.entry, "src/main.ts");
  assert.deepEqual(plan.publicFiles, ["public/robots.txt"]);
});

// ── the materializer ──────────────────────────────────────────────────

test("6 path safety + 14 secrets: files land only under the root; secret files never land", async () => {
  const root = join(ROOT, "materialize-case");
  const staged = await materializeWorkspace(root, [
    { path: "src/a.ts", content: "a" },
    { path: "../outside.ts", content: "x" },
    { path: "C:/Windows/evil.ts", content: "x" },
    { path: ".env", content: "ANTHROPIC_API_KEY=sk-live" },
    { path: "config/.env.local", content: "TOKEN=1" },
    { path: "keys/server.pem", content: "-----BEGIN" },
  ]);
  assert.deepEqual(staged.written, ["src/a.ts"]);
  assert.deepEqual(staged.skipped.map((s) => [s.path, s.reason]), [
    ["../outside.ts", "invalid-path"],
    ["C:/Windows/evil.ts", "invalid-path"],
    [".env", "secret"],
    ["config/.env.local", "secret"],
    ["keys/server.pem", "secret"],
  ]);
  assert.ok(!existsSync(join(ROOT, "outside.ts")));
  assert.ok(!existsSync(join(root, ".env")));
  assert.equal(insideRoot(root, "../x"), null);
  assert.equal(insideRoot(root, "a/../../x"), null);
  assert.ok(insideRoot(root, "a/b.ts"));
});

// ── real builds ────────────────────────────────────────────────────────

test("toolchain: the build tool is the repository's own esbuild binary, started directly", () => {
  const binary = esbuildBinary();
  assert.ok(binary && existsSync(binary), "esbuild is installed with the repository");
  assert.match(binary, /esbuild(\.exe)?$/);
  assert.doesNotMatch(binary, /\.(cmd|ps1|bat)$/i, "never a shell shim");
});

test("8 + 11 + 19 successful build: a real process runs and a real artifact is on disk", async () => {
  const forge = service();
  const result = built(await forge.build(request("pa", webApp("ALPHA-MARKER"))));
  assert.equal(result.status, "success", result.summary);
  assert.equal(result.executed, true);
  assert.equal(result.projectId, "pa");
  assert.equal(result.sourceFiles, 5);
  assert.ok(result.artifact);
  assert.equal(result.artifact.reference, `forge://pa/${result.buildId}`);
  assert.equal(result.artifact.location, join(ROOT, "artifacts", "pa", result.buildId));
  assert.deepEqual(result.artifact.files.map((f) => f.path), ["index.html", "main.css", "main.js", "robots.txt"]);
  assert.match(result.summary, /^Built 4 files, \d+\.\d KB\.$/);

  const dir = result.artifact.location;
  const js = readFileSync(join(dir, "main.js"), "utf8");
  assert.match(js, /ALPHA-MARKER one/, "the bundle holds the source's code");
  assert.doesNotMatch(js, /: string\[\]|HTMLElement \| null/, "TypeScript was compiled away");
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<script type="module" src="\.\/main\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/main\.css">/);
  assert.doesNotMatch(html, /src\/main\.ts/, "the development entry tag is replaced");
  assert.match(readFileSync(join(dir, "main.css"), "utf8"), /#1d2a5c/);
  assert.ok(!existsSync(join(ROOT, "work", result.buildId)), "the temporary workspace is deleted");

  const check = await forge.artifact("pa", result.buildId);
  assert.ok(!("code" in check) && check.exists);
  assert.deepEqual(check.files.map((f) => f.path), result.artifact.files.map((f) => f.path));
});

test("9 + 18 failed build: a real failure, a useful diagnostic, no artifact, source untouched", async () => {
  const files = webApp("BROKEN", []).map((f) =>
    f.path === "src/main.ts" ? { ...f, content: 'import { tasks } from "./tasks";\nconst n: number = 1;\nconsole.log(n, tasks;\n' } : f,
  );
  const before = JSON.stringify(files);
  const forge = service();
  const result = built(await forge.build(request("pa", files)));
  assert.equal(result.status, "failed");
  assert.equal(result.executed, true, "the compiler ran and rejected it");
  assert.equal(result.artifact, null);
  assert.ok(!existsSync(join(ROOT, "artifacts", "pa", result.buildId)), "no directory claims to be an artifact");
  const error = result.diagnostics.find((d) => d.severity === "error");
  assert.deepEqual([error?.file, error?.line], ["src/main.ts", 3]);
  assert.match(error?.message ?? "", /Expected "\)" but found ";"/);
  assert.match(result.summary, /^Build failed: src\/main\.ts:3: Expected/);
  assert.equal(JSON.stringify(files), before, "the request's files are not modified");
  assert.ok(!existsSync(join(ROOT, "work", result.buildId)));

  const missing = built(await forge.build(request("pa", [{ path: "README.md", content: "# no app" }])));
  assert.deepEqual([missing.status, missing.executed, missing.artifact], ["failed", false, null]);
  assert.match(missing.diagnostics.map((d) => d.message).join(" "), /index\.html is missing/);

  const bare = built(await forge.build(request("pa", webApp("X").map((f) =>
    f.path === "src/tasks.ts" ? { ...f, content: 'export { tasks } from "lodash";\n' } : f,
  ))));
  assert.equal(bare.status, "failed", "no packages: a bare import fails instead of reaching a node_modules");
  assert.match(bare.diagnostics[0]?.message ?? "", /Could not resolve "lodash"/);
});

test("6 path safety: an import that climbs out of the workspace fails the build and leaves no artifact", async () => {
  mkdirSync(join(ROOT, "work"), { recursive: true });
  writeFileSync(join(ROOT, "work", "outside.js"), 'export const leaked = "OUTSIDE-SECRET";\n');
  const files = webApp("E").map((f) =>
    f.path === "src/tasks.ts" ? { ...f, content: 'import { leaked } from "../../../outside.js";\nexport const tasks = [leaked];\n' } : f,
  );
  const result = built(await service().build(request("pa", files)));
  assert.equal(result.status, "failed");
  assert.match(result.summary, /outside the project workspace/);
  assert.equal(result.artifact, null);
  assert.ok(!existsSync(join(ROOT, "artifacts", "pa", result.buildId)));
});

test("7 isolation: Alpha and Beta build from their own files into their own artifacts", async () => {
  const forge = service();
  const alpha = built(await forge.build(request("pa", webApp("ALPHA-ONLY"))));
  const beta = built(await forge.build(request("pb", webApp("BETA-ONLY"))));
  assert.ok(alpha.artifact && beta.artifact);
  assert.match(alpha.artifact.location, /[\\/]artifacts[\\/]pa[\\/]/);
  assert.match(beta.artifact.location, /[\\/]artifacts[\\/]pb[\\/]/);
  const alphaJs = readFileSync(join(alpha.artifact.location, "main.js"), "utf8");
  const betaJs = readFileSync(join(beta.artifact.location, "main.js"), "utf8");
  assert.match(alphaJs, /ALPHA-ONLY/);
  assert.doesNotMatch(alphaJs, /BETA-ONLY/);
  assert.match(betaJs, /BETA-ONLY/);
  assert.doesNotMatch(betaJs, /ALPHA-ONLY/);
  const stillAlpha = await forge.artifact("pa", alpha.buildId);
  assert.ok(!("code" in stillAlpha) && stillAlpha.exists, "Beta's build did not replace Alpha's artifact");
  assert.deepEqual(await forge.artifact("pb", alpha.buildId), { reference: `forge://pb/${alpha.buildId}`, exists: false, files: [] });
});

test("artifacts on disk are bounded per project; older ones are pruned, newer kept", async () => {
  const forge = service();
  const results: BuildResult[] = [];
  for (let i = 0; i < FORGE_LIMITS.keepArtifacts + 2; i += 1) results.push(built(await forge.build(request("pprune", webApp(`P${i}`)))));
  const kept = readdirSync(join(ROOT, "artifacts", "pprune")).sort();
  assert.deepEqual(kept, results.slice(-FORGE_LIMITS.keepArtifacts).map((r) => r.buildId));
});

// ── no arbitrary execution ─────────────────────────────────────────────

test("15 + 16 the only thing executed is the toolchain's fixed command — not the request's, not package.json's", async () => {
  const specs: ProcessSpec[] = [];
  const forge = service({
    runner: async (spec) => {
      specs.push(spec);
      return runProcess(spec);
    },
  });
  const files = webApp("C", [
    { path: "package.json", content: JSON.stringify({ scripts: { build: "del /s /q C:\\", prebuild: "curl evil" } }) },
  ]);
  await forge.build(request("pa", files, { command: "powershell -c evil", executable: "cmd.exe", args: ["/c", "evil"] }));
  assert.equal(specs.length, 1);
  const [spec] = specs;
  assert.equal(spec.executable, esbuildBinary());
  assert.equal(spec.args[0], "src/main.ts");
  assert.equal(spec.timeoutMs, FORGE_LIMITS.timeoutMs);
  const joined = spec.args.join(" ");
  assert.doesNotMatch(joined, /evil|del |curl|powershell|cmd/i);
  for (const arg of spec.args.slice(1)) assert.match(arg, /^--[a-z-]+(:[.a-z0-9]+)?(=.*)?$/, arg);

  const runner = read("lib/adapters/forge/processRunner.ts");
  assert.match(runner, /shell: false/);
  assert.doesNotMatch(runner, /exec\(|execSync|shell: true|eval\(/);
  for (const file of ["app/api/forge/route.ts", "lib/services/forge/forgeService.ts", "components/Forge/ForgeApp.tsx", "store/useForgeStore.ts"]) {
    assert.doesNotMatch(read(file), /child_process/, `${file} starts processes itself`);
  }
  for (const file of ["lib/services/ai/aiGateway.ts", "lib/services/ai/fileProposals.ts", "store/useAIStore.ts", "components/AIConsole/AIConsole.tsx"]) {
    assert.doesNotMatch(read(file), /forge|Forge/, `${file} reaches Forge`);
  }
});

test("14 no secret leakage: the child gets no server secrets; stored output is redacted and bounded", () => {
  const env = childEnvironment({ SystemRoot: "C:\\Windows", TEMP: "C:\\t", ANTHROPIC_API_KEY: "sk-ant-x", PATH: "C:\\bin", NODE_ENV: "development" });
  assert.deepEqual(Object.keys(env).sort(), ["SystemRoot", "TEMP"]);
  assert.deepEqual(secretValues({ ANTHROPIC_API_KEY: "sk-ant-abcdefgh", GH_TOKEN: "ghp_12345678", NODE_ENV: "production", SHORT_KEY: "x" }).sort(), ["ghp_12345678", "sk-ant-abcdefgh"]);
  const text = sanitizeOutput(`C:\\tmp\\forge\\work\\b1\\project\\src\\a.ts failed sk-ant-abcdefgh\n${"x".repeat(9000)}`, "C:\\tmp\\forge\\work\\b1", ["sk-ant-abcdefgh"]);
  assert.ok(text.length <= FORGE_LIMITS.maxOutputChars + 1);
  const short = sanitizeOutput("at C:\\tmp\\forge\\work\\b1\\project\\a.ts key sk-ant-abcdefgh", "C:\\tmp\\forge\\work\\b1", ["sk-ant-abcdefgh"]);
  assert.equal(short, "at <workspace>\\project\\a.ts key <redacted>");
});

test("10 bounded output: diagnostics, output and history are capped", () => {
  const noisy = Array.from({ length: 40 }, (_, i) => `X [ERROR] problem ${i}\n\n    src/a.ts:${i + 1}:1:\n`).join("\n");
  const diagnostics = parseDiagnostics(noisy);
  assert.equal(diagnostics.length, FORGE_LIMITS.maxDiagnostics);
  assert.deepEqual(diagnostics[0], { severity: "error", message: "problem 0", file: "src/a.ts", line: 1, column: 1 });
  assert.deepEqual(parseDiagnostics("✘ [ERROR] unix marker\n\n    src/b.ts:2:3:\n")[0].file, "src/b.ts");
  const result = fakeResult("pa", "b1", "success");
  assert.equal("output" in toForgeBuild({ ...result, output: "chatty" }), false, "success keeps no log");
  const failed = toForgeBuild({ ...fakeResult("pa", "b2", "failed"), output: "y".repeat(10_000) });
  assert.equal(failed.output?.length, FORGE_LIMITS.maxOutputChars);
});

test("html: only the entry's development tag is replaced; everything else in the page is kept", () => {
  const html = artifactHtml('<html><head></head><body><script src="./vendor.js"></script><script type="module" src="./src/main.ts"></script></body></html>', "src/main.ts", false);
  assert.match(html, /vendor\.js/);
  assert.doesNotMatch(html, /main\.ts/);
  assert.doesNotMatch(html, /main\.css/);
  assert.match(html, /<script type="module" src="\.\/main\.js"><\/script>\n<\/body>/);
});

// ── policy & route ─────────────────────────────────────────────────────

test("policy: builds run on a development server, and in production only when switched on", () => {
  assert.equal(forgePolicy({ NODE_ENV: "development" }).enabled, true);
  assert.equal(forgePolicy({ NODE_ENV: "production" }).enabled, false);
  assert.equal(forgePolicy({ NODE_ENV: "production", FORGE_ENABLED: "1" }).enabled, true);
  assert.equal(forgePolicy({ NODE_ENV: "development", FORGE_ENABLED: "0" }).enabled, false);
});

test("disabled or missing toolchain: nothing runs and the reason is said", async () => {
  let ran = false;
  const runner = async () => {
    ran = true;
    return { exitCode: 0, output: "", timedOut: false, spawnError: null };
  };
  const off = service({ policy: () => ({ enabled: false, reason: "off here" }), runner });
  assert.deepEqual(await off.build(request("pa", webApp("A"))), { ok: false, error: { code: "disabled", message: "off here" } });
  const none = service({ toolchain: () => null, runner });
  const r = await none.build(request("pa", webApp("A")));
  assert.equal(r.ok ? "" : r.error.code, "toolchain-unavailable");
  assert.equal(none.status().enabled, false);
  assert.match(none.status().reason ?? "", /esbuild/);
  assert.equal(ran, false);
});

test("route: the real /api/forge builds, refuses bad input, and reports its toolchain", async () => {
  process.env.FORGE_ROOT = join(ROOT, "route");
  for (const key of Object.keys(require.cache)) {
    if (/[\\/](app[\\/]api[\\/]forge[\\/]route|lib[\\/]services[\\/]forge[\\/]serverForge)\.ts$/.test(key)) delete require.cache[key];
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const route = require("@/app/api/forge/route") as typeof import("@/app/api/forge/route");
  const status = await (await route.GET(new Request("http://localhost/api/forge"))).json();
  assert.deepEqual([status.enabled, status.toolchain, status.targets[0].id], [true, "esbuild", "web-app"]);
  const bad = await route.POST(new Request("http://localhost/api/forge", { method: "POST", body: JSON.stringify(request("pa", webApp("A"), { target: "shell" })) }));
  assert.equal(bad.status, 400);
  const res = await route.POST(new Request("http://localhost/api/forge", { method: "POST", body: JSON.stringify(request("proute", webApp("ROUTE"))) }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as ForgeResponse;
  assert.ok(body.ok && body.result.status === "success" && body.result.artifact);
  assert.ok(existsSync(join(ROOT, "route", "artifacts", "proute", body.result.buildId, "main.js")));
  const check = await (await route.GET(new Request(`http://localhost/api/forge?projectId=proute&buildId=${body.result.buildId}`))).json();
  assert.equal(check.exists, true);
  const traversal = await route.GET(new Request("http://localhost/api/forge?projectId=..&buildId=x"));
  assert.equal(traversal.status, 400);
  delete process.env.FORGE_ROOT;
});

// ── the browser half: filesystem → Forge → project ─────────────────────

function fakeResult(projectId: string, buildId: string, status: "success" | "failed"): BuildResult {
  return {
    buildId,
    projectId,
    target: "web-app",
    configuration: "production",
    status,
    startedAt: `2026-09-29T00:00:0${buildId.slice(-1)}.000Z`,
    completedAt: "2026-09-29T00:00:09.000Z",
    durationMs: 120,
    summary: status === "success" ? "Built 3 files, 1.0 KB." : "Build failed: src/main.ts:1: bad",
    diagnostics: status === "failed" ? [{ severity: "error", message: "bad", file: "src/main.ts", line: 1, column: 1 }] : [],
    output: "",
    artifact:
      status === "success"
        ? { reference: `forge://${projectId}/${buildId}`, location: `C:/forge/${projectId}/${buildId}`, entry: "index.html", files: [{ path: "index.html", bytes: 100 }], bytes: 100 }
        : null,
    executed: true,
    sourceFiles: 2,
  };
}

function freshOS() {
  useForgeStore.setState({ sessions: {} });
  useProjectStore.setState({
    projects: [
      { ...createProject({ name: "Alpha" }), id: "pa" },
      { ...createProject({ name: "Beta" }), id: "pb" },
      { ...createProject({ name: "Gamma" }), id: "pc" },
    ],
  });
  useFilesystemStore.setState({ objects: [], selectedObjectId: null });
  const fs = useFilesystemStore.getState();
  fs.createProjectWorkspace("pa", "Alpha", []);
  fs.createProjectWorkspace("pb", "Beta", []);
  fs.applyFileWrites("pa", webApp("ALPHA-FS"));
  fs.applyFileWrites("pb", webApp("BETA-FS"));
}

/** A ForgeClient over a real ForgeService — the HTTP hop is the only part
 *  left out. */
function clientOver(forge: ForgeService, seen: unknown[] = []): ForgeClient {
  return {
    status: async () => forge.status(),
    build: async (req) => {
      seen.push(JSON.parse(JSON.stringify(req)));
      return forge.build(JSON.parse(JSON.stringify(req)));
    },
    artifact: async (p, b) => forge.artifact(p, b),
  };
}

test("5 + 17 workspace resolution: Forge takes the active project's files from the filesystem, only them", async () => {
  freshOS();
  const seen: Array<{ projectId: string; files: FileWrite[] }> = [];
  const before = JSON.stringify(useFilesystemStore.getState().objects);
  await useForgeStore.getState().build("pa", "web-app", "production", clientOver(service(), seen as unknown[]));
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0].files.map((f) => f.path), ["index.html", "public/robots.txt", "src/main.ts", "src/style.css", "src/tasks.ts"]);
  assert.ok(!JSON.stringify(seen[0]).includes("BETA-FS"), "no Beta file travels with Alpha's build");
  assert.equal(JSON.stringify(useFilesystemStore.getState().objects), before, "a build writes no filesystem object");

  await useForgeStore.getState().build("pc", "web-app", "production", clientOver(service(), seen as unknown[]));
  assert.equal(seen.length, 1, "no workspace: nothing is sent");
  assert.match(useForgeStore.getState().sessions.pc?.error?.message ?? "", /no workspace folder/);
  assert.equal(useProjectStore.getState().projects.find((p) => p.id === "pc")?.forge.builds.length, 0);
});

test("12 + 19 + 20 persistence: a real build is filed under its project, with its artifact, and memory references it", async () => {
  freshOS();
  await useForgeStore.getState().build("pa", "web-app", "production", clientOver(service()));
  const alpha = useProjectStore.getState().projects.find((p) => p.id === "pa")!;
  assert.equal(alpha.forge.builds.length, 1);
  const build = alpha.forge.builds[0];
  assert.deepEqual([build.status, build.projectId, build.target, build.executed], ["success", "pa", "web-app", true]);
  assert.ok(build.artifact && existsSync(join(build.artifact.location, "main.js")));
  assert.match(readFileSync(join(build.artifact.location, "main.js"), "utf8"), /ALPHA-FS/);
  const memory = alpha.memory.records.find((r) => r.id === BUILD_MEMORY_RECORD_ID);
  assert.equal(memory?.kind, "build");
  assert.deepEqual(memory?.refs, [{ kind: "forge-build", id: build.id }]);
  assert.match(memory?.text ?? "", /SUCCEEDED/);
  assert.ok(!(memory?.text ?? "").includes("<!doctype"), "memory holds a reference, not the source or log");
  assert.ok(memoryService.contextFor(alpha).records.some((r) => r.kind === "build"), "the AI sees the latest build");
  assert.deepEqual(projectMilestonesReached(alpha).includes("Built"), true);
  assert.equal(buildStatus(alpha), "success");

  // A failing Beta build files under Beta; Alpha's history is untouched.
  useFilesystemStore.getState().applyFileWrites("pb", [{ path: "src/main.ts", content: "const = ;\n" }]);
  await useForgeStore.getState().build("pb", "web-app", "production", clientOver(service()));
  const after = useProjectStore.getState().projects;
  const beta = after.find((p) => p.id === "pb")!;
  assert.deepEqual(beta.forge.builds.map((b) => [b.status, b.projectId, b.artifact]), [["failed", "pb", null]]);
  assert.ok(beta.forge.builds[0].output, "a failed build keeps its bounded output");
  assert.equal(projectMilestonesReached(beta).includes("Built"), false, "a failed build built nothing");
  assert.deepEqual(after.find((p) => p.id === "pa")!.forge.builds.map((b) => b.id), [build.id]);
  assert.match(beta.memory.records.find((r) => r.id === BUILD_MEMORY_RECORD_ID)?.text ?? "", /FAILED/);

  assert.equal(useProjectStore.getState().recordForgeBuild("pa", fakeResult("pb", "build-x9", "success")), false, "a result is never filed under another project");
  assert.equal(useProjectStore.getState().recordForgeBuild("nope", fakeResult("nope", "build-x8", "success")), false);
  for (let i = 0; i < FORGE_LIMITS.maxHistory + 3; i += 1) {
    useProjectStore.getState().recordForgeBuild("pc", { ...fakeResult("pc", `b${i}`, "failed"), startedAt: `2026-09-29T01:${String(i).padStart(2, "0")}:00.000Z` });
  }
  const gamma = useProjectStore.getState().projects.find((p) => p.id === "pc")!;
  assert.equal(gamma.forge.builds.length, FORGE_LIMITS.maxHistory);
  assert.equal(gamma.memory.records.filter((r) => r.kind === "build").length, 1, "one memory reference, replaced each build");
});

// ── reload ─────────────────────────────────────────────────────────────

type ProjectStoreModule = typeof import("@/store/useProjectStore");

function withReload(data: Map<string, string>, run: (store: ProjectStoreModule["useProjectStore"]) => void) {
  const g = globalThis as Record<string, unknown>;
  const had = { localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"), window: Object.getOwnPropertyDescriptor(g, "window") };
  const storage: Storage = {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
  Object.defineProperty(g, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(g, "window", { value: globalThis, configurable: true, writable: true });
  const pattern = /[\\/]store[\\/]useProjectStore\.ts$/;
  const saved = Object.keys(require.cache).filter((k) => pattern.test(k)).map((k) => [k, require.cache[k]] as const);
  try {
    for (const [key] of saved) delete require.cache[key];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    run((require("@/store/useProjectStore") as ProjectStoreModule).useProjectStore);
  } finally {
    for (const key of Object.keys(require.cache).filter((k) => pattern.test(k))) delete require.cache[key];
    for (const [key, mod] of saved) require.cache[key] = mod;
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
}

test("13 reload: build history survives a reload; a v6 store migrates to v7 without inventing builds", () => {
  const data = new Map<string, string>();
  withReload(data, (store) => {
    store.setState({ projects: [{ ...createProject({ name: "Alpha" }), id: "pa" }] });
    assert.ok(store.getState().recordForgeBuild("pa", fakeResult("pa", "build-r1", "success")));
  });
  withReload(data, (store) => {
    const alpha = store.getState().projects.find((p) => p.id === "pa")!;
    assert.deepEqual(alpha.forge.builds.map((b) => [b.id, b.status, b.artifact?.reference]), [["build-r1", "success", "forge://pa/build-r1"]]);
  });
  assert.match(data.get("cattipu-projects") ?? "", new RegExp(`"version":${PROJECT_SCHEMA_VERSION}`));

  const v6 = { ...createProject({ name: "Old" }), id: "po", version: 6 } as Record<string, unknown>;
  v6.forge = {
    sourceFiles: [],
    tests: [],
    diagnostics: [],
    builds: [
      { id: "old1", status: "pending", startedAt: "2026-01-01T00:00:00.000Z" },
      { id: "old2", status: "success", startedAt: "2026-01-02T00:00:00.000Z", projectId: "someone-else" },
      { status: "success" },
      { id: "old3", status: "shipped", startedAt: "x" },
    ],
  };
  const migrated = migrateProject(v6);
  assert.deepEqual(
    migrated.forge.builds.map((b) => [b.id, b.status, b.projectId, b.artifact]),
    [["old1", "failed", "po", null], ["old2", "success", "po", null]],
  );
  // MVP-08 moved the schema to v8 (launch history); v7's Forge fields are unchanged.
  assert.ok(PROJECT_SCHEMA_VERSION >= 7);
});

// ── the window ─────────────────────────────────────────────────────────

type ForgeModule = typeof import("@/components/Forge/ForgeApp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ForgeView } = require("@/components/Forge/ForgeApp") as ForgeModule;

test("window: Forge is a managed window; the view shows BUILDING, BUILD COMPLETE and BUILD FAILED honestly", () => {
  assert.ok(CATTIPU_WINDOW_IDS.includes("forge"));
  assert.match(read("components/Shell/CattipuShell.tsx"), /forge: <ForgeApp \/>/);
  const status = { kind: "known" as const, status: { enabled: true, toolchain: "esbuild", targets: [], reason: null } };
  const base = {
    project: { id: "pa", name: "Alpha" },
    hasWorkspace: true,
    server: status,
    session: { status: "idle" as const, startedAt: null, error: null },
    builds: [],
    selectedBuildId: null,
    configuration: "production" as const,
    onConfiguration: () => {},
    onBuild: () => {},
    onSelectBuild: () => {},
  };
  const render = (props: Partial<React.ComponentProps<typeof ForgeView>>) => renderToStaticMarkup(React.createElement(ForgeView, { ...base, ...props }));

  const ready = render({});
  assert.match(ready, /TARGET WEB APPLICATION/);
  assert.match(ready, /<button[^>]*data-testid="forge-build"[^>]*>Build<\/button>/);
  assert.doesNotMatch(ready, /data-testid="forge-build"[^>]*disabled/);

  const running = render({ session: { status: "running", startedAt: "2026-09-29T00:00:00.000Z", error: null } });
  assert.match(running, /BUILDING…/);
  assert.match(running, /data-testid="forge-build"[^>]*disabled=""[^>]*>Building…/);

  const ok = toForgeBuild(fakeResult("pa", "build-1", "success"));
  const bad = toForgeBuild(fakeResult("pa", "build-2", "failed"));
  const done = render({ builds: [ok, bad], selectedBuildId: "build-1", artifactCheck: { reference: "forge://pa/build-1", exists: true, files: [] } });
  assert.match(done, /BUILD COMPLETE · build-1/);
  assert.match(done, /forge:\/\/pa\/build-1/);
  assert.match(done, /ON DISK/);
  assert.match(done, /HISTORY · 02/);

  const failed = render({ builds: [bad, ok], selectedBuildId: "build-2" });
  assert.match(failed, /BUILD FAILED · build-2/);
  assert.match(failed, /data-testid="forge-artifact"[^>]*>NONE</);
  assert.match(failed, /src\/main\.ts:1:1 bad/);

  const off = render({ server: { kind: "known", status: { enabled: false, toolchain: null, targets: [], reason: "Building runs on a development server." } } });
  assert.match(off, /Building runs on a development server\./);
  assert.match(off, /data-testid="forge-build"[^>]*disabled/);
  assert.match(render({ hasWorkspace: false }), /has no workspace folder/);
});

// ── runner ─────────────────────────────────────────────────────────────

async function main() {
  let failed = 0;
  try {
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
  } finally {
    rmSync(ROOT, { recursive: true, force: true });
  }
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

void main();
