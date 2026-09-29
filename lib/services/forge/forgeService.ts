import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { FILE_LIMITS } from "@/lib/contracts/filesystem";
import {
  FORGE_LIMITS,
  isBuildConfiguration,
  isBuildTarget,
  type ArtifactCheck,
  type BuildArtifact,
  type BuildArtifactFile,
  type BuildDiagnostic,
  type BuildRequest,
  type BuildResult,
  type BuildToolchain,
  type ForgeError,
  type ForgeResponse,
  type ForgeStatus,
  type ProcessRunner,
} from "@/lib/contracts/forge";
import { insideRoot, materializeWorkspace } from "@/lib/adapters/forge/workspaceMaterializer";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import {
  WEB_APP_TARGET,
  artifactHtml,
  buildSummary,
  parseDiagnostics,
  planWebApp,
  sanitizeOutput,
} from "./webAppTarget";

/**
 * MVP-07 — ForgeService: the build lifecycle, on the server.
 *
 *   validate request → resolve target → plan → materialize one project's
 *   files → run the toolchain's fixed command → check what it read →
 *   assemble the artifact → normalised BuildResult → delete the workspace
 *
 * It knows nothing about React or HTTP, and it starts processes only
 * through the injected `ProcessRunner` — the tests replace exactly that
 * boundary and nothing else. It never writes a project's files and never
 * stores a build: the result goes back to the browser, where the project
 * records it.
 */

export interface ForgeServiceOptions {
  /** Where build workspaces and artifacts live, e.g. `<tmp>/cattipu-forge`. */
  root: string;
  toolchain: () => BuildToolchain | null;
  runner: ProcessRunner;
  /** Whether this server may run builds at all, and why not. */
  policy: () => { enabled: boolean; reason: string | null };
  /** Values that must never appear in stored output (the server's keys). */
  secrets?: () => readonly string[];
  now?: () => Date;
  newBuildId?: () => string;
}

export interface ForgeService {
  status(): ForgeStatus;
  build(input: unknown): Promise<ForgeResponse>;
  artifact(projectId: unknown, buildId: unknown): Promise<ArtifactCheck | ForgeError>;
}

/** Ids become directory names, so they are held to a strict alphabet. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;

const invalid = (message: string): ForgeResponse => ({ ok: false, error: { code: "invalid-request", message } });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Narrows untrusted JSON to a `BuildRequest`. Any field that is not part
 *  of the contract — a `command`, a `script`, an `args` — is ignored: the
 *  request has no way to say what runs. */
export function parseBuildRequest(input: unknown): { ok: true; request: BuildRequest } | { ok: false; response: ForgeResponse } {
  if (!isRecord(input)) return { ok: false, response: invalid("The build request must be a JSON object.") };
  const { projectId, target, configuration, files } = input;
  if (typeof projectId !== "string" || !SAFE_ID.test(projectId)) {
    return { ok: false, response: invalid("A build must name the project it belongs to.") };
  }
  if (!isBuildTarget(target)) return { ok: false, response: invalid("That build target is not supported.") };
  const config = configuration === undefined ? "production" : configuration;
  if (!isBuildConfiguration(config)) return { ok: false, response: invalid("That build configuration is not supported.") };
  if (!Array.isArray(files)) return { ok: false, response: invalid("A build must carry the project's files.") };
  if (files.length > FORGE_LIMITS.maxFiles) {
    return { ok: false, response: invalid(`A build can carry at most ${FORGE_LIMITS.maxFiles} files.`) };
  }
  let total = 0;
  const seen = new Set<string>();
  const clean: BuildRequest["files"] = [];
  for (const f of files) {
    if (!isRecord(f) || typeof f.path !== "string" || typeof f.content !== "string") {
      return { ok: false, response: invalid("Every file needs a path and content.") };
    }
    const path = projectFileService.normalizePath(f.path);
    if (!path) return { ok: false, response: invalid(`"${f.path.slice(0, 80)}" is not a workspace path.`) };
    if (seen.has(path)) return { ok: false, response: invalid(`"${path}" appears twice.`) };
    if (f.content.length > FILE_LIMITS.maxFileChars) return { ok: false, response: invalid(`"${path}" is too large.`) };
    total += f.content.length;
    if (total > FORGE_LIMITS.maxTotalChars) return { ok: false, response: invalid("The project is too large to build.") };
    seen.add(path);
    clean.push({ path, content: f.content });
  }
  return { ok: true, request: { projectId, target, configuration: config, files: clean } };
}

async function listFiles(dir: string, base = dir): Promise<BuildArtifactFile[]> {
  const out: BuildArtifactFile[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push({ path: relative(base, full).replace(/\\/g, "/"), bytes: (await stat(full)).size });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

let seq = 0;
const defaultBuildId = () =>
  `build-${Date.now().toString(36)}-${(seq += 1).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function createForgeService(options: ForgeServiceOptions): ForgeService {
  const now = options.now ?? (() => new Date());
  const newBuildId = options.newBuildId ?? defaultBuildId;
  const running = new Set<string>();
  const artifactsOf = (projectId: string) => join(options.root, "artifacts", projectId);

  /** Newest `keepArtifacts` directories stay; build ids sort by time. */
  async function prune(projectId: string) {
    const dir = artifactsOf(projectId);
    if (!(await exists(dir))) return;
    const builds = (await readdir(dir)).filter((name) => SAFE_ID.test(name)).sort().reverse();
    for (const old of builds.slice(FORGE_LIMITS.keepArtifacts)) {
      await rm(join(dir, old), { recursive: true, force: true });
    }
  }

  return {
    status() {
      const policy = options.policy();
      const toolchain = policy.enabled ? options.toolchain() : null;
      return {
        enabled: policy.enabled && toolchain !== null,
        toolchain: toolchain?.name ?? null,
        targets: [{ id: WEB_APP_TARGET.id, label: WEB_APP_TARGET.label, requirement: WEB_APP_TARGET.requirement }],
        reason: !policy.enabled
          ? policy.reason
          : toolchain
            ? null
            : "The build toolchain (esbuild) is not installed where CATTIPU's server runs.",
      };
    },

    async build(input) {
      const parsed = parseBuildRequest(input);
      if (!parsed.ok) return parsed.response;
      const request = parsed.request;

      const policy = options.policy();
      if (!policy.enabled) return { ok: false, error: { code: "disabled", message: policy.reason ?? "Building is switched off." } };
      const toolchain = options.toolchain();
      if (!toolchain) {
        return { ok: false, error: { code: "toolchain-unavailable", message: "The build toolchain is not installed on this server." } };
      }
      if (running.has(request.projectId)) {
        return { ok: false, error: { code: "busy", message: "This project already has a build running." } };
      }
      running.add(request.projectId);

      const buildId = newBuildId();
      const started = now();
      const workDir = join(options.root, "work", buildId);
      const projectDir = join(workDir, "project");
      const outDir = join(workDir, "out");
      const metafile = join(workDir, "meta.json");

      const finish = (
        status: BuildResult["status"],
        diagnostics: BuildDiagnostic[],
        extra: { output?: string; artifact?: BuildArtifact | null; executed: boolean; summary?: string },
      ): ForgeResponse => {
        const completed = now();
        const artifact = status === "success" ? extra.artifact ?? null : null;
        return {
          ok: true,
          result: {
            buildId,
            projectId: request.projectId,
            target: request.target,
            configuration: request.configuration,
            status,
            startedAt: started.toISOString(),
            completedAt: completed.toISOString(),
            durationMs: Math.max(0, completed.getTime() - started.getTime()),
            summary: extra.summary ?? buildSummary(status, diagnostics, artifact?.files.length ?? 0, artifact?.bytes ?? 0),
            diagnostics: diagnostics.slice(0, FORGE_LIMITS.maxDiagnostics),
            output: extra.output ?? "",
            artifact,
            executed: extra.executed,
            sourceFiles: request.files.length,
          },
        };
      };

      try {
        const plan = planWebApp(request.files);
        if (!plan.ok) return finish("failed", plan.diagnostics, { executed: false, summary: plan.summary });

        const staged = await materializeWorkspace(projectDir, request.files);
        const notes: BuildDiagnostic[] = staged.skipped.map((s) => ({
          severity: "warning",
          message: s.reason === "secret" ? "Left out of the build: secret file." : "Left out of the build: invalid path.",
          file: s.path,
        }));

        const command = toolchain.command({ entry: plan.entry, outdir: outDir, metafile, configuration: request.configuration });
        const run = await options.runner({
          executable: command.executable,
          args: command.args,
          cwd: projectDir,
          timeoutMs: FORGE_LIMITS.timeoutMs,
        });
        const output = sanitizeOutput(run.output, workDir, options.secrets?.() ?? []);

        if (run.spawnError) {
          return finish("failed", [{ severity: "error", message: "The build tool could not be started." }, ...notes], { executed: false, output });
        }
        if (run.timedOut) {
          return finish("failed", [{ severity: "error", message: `The build took longer than ${FORGE_LIMITS.timeoutMs / 1000}s and was stopped.` }, ...notes], { executed: true, output });
        }
        const diagnostics = [...parseDiagnostics(run.output), ...notes];
        if (run.exitCode !== 0) {
          const errors = diagnostics.some((d) => d.severity === "error")
            ? diagnostics
            : [{ severity: "error" as const, message: `The build exited with code ${run.exitCode}.` }, ...diagnostics];
          return finish("failed", errors, { executed: true, output });
        }

        // The bundler follows imports wherever they point. Anything it read
        // from outside this project's workspace fails the build, and its
        // output is discarded before it can become an artifact.
        const meta = JSON.parse(await readFile(metafile, "utf8")) as { inputs?: Record<string, unknown> };
        const escaped = Object.keys(meta.inputs ?? {}).filter((input) => !insideRoot(projectDir, input));
        if (escaped.length > 0) {
          return finish("failed", [{ severity: "error", message: "The build read a file outside the project workspace.", file: escaped[0].replace(/\\/g, "/").split("/").pop() }], { executed: true, output });
        }

        const artifactDir = join(artifactsOf(request.projectId), buildId);
        await mkdir(artifactDir, { recursive: true });
        await cp(outDir, artifactDir, { recursive: true });
        const html = request.files.find((f) => f.path === plan.html)?.content ?? "";
        await writeFile(join(artifactDir, "index.html"), artifactHtml(html, plan.entry, await exists(join(outDir, "main.css"))), "utf8");
        for (const publicFile of plan.publicFiles) {
          const target = insideRoot(artifactDir, publicFile.slice(WEB_APP_TARGET.publicDir.length));
          const source = insideRoot(projectDir, publicFile);
          if (target && source && (await exists(source))) {
            await mkdir(join(target, ".."), { recursive: true });
            await cp(source, target);
          }
        }
        const files = await listFiles(artifactDir);
        const artifact: BuildArtifact = {
          reference: `forge://${request.projectId}/${buildId}`,
          location: artifactDir,
          entry: "index.html",
          files,
          bytes: files.reduce((sum, f) => sum + f.bytes, 0),
        };
        await prune(request.projectId);
        return finish("success", diagnostics, { executed: true, output, artifact });
      } catch (err) {
        return {
          ok: false,
          error: { code: "internal", message: `Forge failed: ${err instanceof Error ? err.message.split(options.root).join("<forge>") : "unknown error"}` },
        };
      } finally {
        running.delete(request.projectId);
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    },

    async artifact(projectId, buildId) {
      if (typeof projectId !== "string" || !SAFE_ID.test(projectId) || typeof buildId !== "string" || !SAFE_ID.test(buildId)) {
        return { code: "invalid-request", message: "An artifact is named by a project id and a build id." };
      }
      const dir = join(artifactsOf(projectId), buildId);
      const reference = `forge://${projectId}/${buildId}`;
      if (!(await exists(join(dir, "index.html")))) return { reference, exists: false, files: [] };
      return { reference, exists: true, files: await listFiles(dir) };
    },
  };
}
