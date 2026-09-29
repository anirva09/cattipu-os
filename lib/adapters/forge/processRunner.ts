import { spawn } from "node:child_process";

import type { ProcessOutcome, ProcessRunner, ProcessSpec } from "@/lib/contracts/forge";

/**
 * MVP-07 — the one place CATTIPU starts a native process.
 *
 * An executable path and an argument array, run with `shell: false`, so no
 * argument is ever parsed by cmd, PowerShell or sh. The child gets a
 * minimal environment — enough for Windows to load an executable — and
 * none of the server's variables, so a provider key or deploy token cannot
 * reach it or its output. Output is captured up to a bound; a run past its
 * time limit is killed.
 */

/** What a child process may inherit: the OS locations Windows needs to
 *  start a process, and nothing that could carry a credential. */
const ENV_ALLOWLIST = ["SystemRoot", "SYSTEMROOT", "windir", "TEMP", "TMP", "TMPDIR"] as const;

export function childEnvironment(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ENV_ALLOWLIST) {
    const value = source[key];
    if (value) env[key] = value;
  }
  return env;
}

/** Capture cap: well above what one build prints, so a runaway process
 *  cannot grow the server's memory without bound. */
const MAX_CAPTURE = 256 * 1024;

export const runProcess: ProcessRunner = (spec: ProcessSpec) =>
  new Promise<ProcessOutcome>((resolve) => {
    let output = "";
    let timedOut = false;
    let settled = false;
    const finish = (outcome: ProcessOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(spec.executable, [...spec.args], {
        cwd: spec.cwd,
        env: childEnvironment() as NodeJS.ProcessEnv,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      finish({ exitCode: null, output: "", timedOut: false, spawnError: err instanceof Error ? err.message : "spawn failed" });
      return;
    }

    const collect = (chunk: Buffer) => {
      if (output.length < MAX_CAPTURE) output += chunk.toString("utf8").slice(0, MAX_CAPTURE - output.length);
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, spec.timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      finish({ exitCode: null, output, timedOut, spawnError: err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({ exitCode: code, output, timedOut, spawnError: null });
    });
  });
