import { spawn } from "node:child_process";

import type { RuntimeChild, RuntimeExit, RuntimeProcessSpec, RuntimeSpawner } from "@/lib/contracts/launch";
import { childEnvironment } from "@/lib/adapters/forge/processRunner";

/**
 * MVP-08 — where Launch starts a process. Forge's runner waits for a build
 * to finish; a runtime is meant to keep running, so it needs its own
 * boundary — with the same discipline:
 *
 * An executable path and an argument array, `shell: false`, so nothing is
 * ever parsed by cmd, PowerShell or sh; the minimal environment Forge's
 * runner gives its children (no server key can reach an application); and
 * stdin kept as a pipe, which is the runtime's lifeline — closing it is how
 * Launch asks it to stop, and if this server dies the pipe closes with it.
 * Nothing it prints is kept beyond a short stderr tail used to explain a
 * failure.
 */

const MAX_ERROR_TAIL = 2_000;

export const spawnRuntimeProcess: RuntimeSpawner = (spec: RuntimeProcessSpec): RuntimeChild => {
  const lineListeners: Array<(line: string) => void> = [];
  const exitListeners: Array<(exit: RuntimeExit) => void> = [];
  let exit: RuntimeExit | null = null;
  let stdoutBuffer = "";
  let stderrTail = "";

  const finish = (result: RuntimeExit) => {
    if (exit) return;
    exit = result;
    for (const listener of exitListeners) listener(result);
  };

  let child: ReturnType<typeof spawn> | null = null;
  try {
    child = spawn(spec.executable, [...spec.args], {
      cwd: spec.cwd,
      env: childEnvironment() as NodeJS.ProcessEnv,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    stderrTail = err instanceof Error ? err.message : "spawn failed";
    queueMicrotask(() => finish({ code: null, signal: null }));
  }

  child?.stdout?.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8");
    let newline = stdoutBuffer.indexOf("\n");
    while (newline !== -1) {
      const line = stdoutBuffer.slice(0, newline).replace(/\r$/, "");
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      for (const listener of lineListeners) listener(line);
      newline = stdoutBuffer.indexOf("\n");
    }
    // A child that never ends a line cannot grow this without bound.
    if (stdoutBuffer.length > MAX_ERROR_TAIL) stdoutBuffer = stdoutBuffer.slice(-MAX_ERROR_TAIL);
  });
  child?.stderr?.on("data", (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString("utf8")).slice(-MAX_ERROR_TAIL);
  });
  // A write after the child has gone (EPIPE) is not this server's failure.
  child?.stdin?.on("error", () => {});
  child?.on("error", (err) => {
    stderrTail = (stderrTail + err.message).slice(-MAX_ERROR_TAIL);
    finish({ code: null, signal: null });
  });
  child?.on("exit", (code, signal) => finish({ code, signal }));

  return {
    pid: child?.pid ?? null,
    onLine: (listener) => void lineListeners.push(listener),
    onExit: (listener) => {
      if (exit) listener(exit);
      else exitListeners.push(listener);
    },
    exited: () => exit !== null,
    closeInput: () => {
      if (!exit) child?.stdin?.end();
    },
    kill: () => {
      if (!exit) child?.kill();
    },
    errorOutput: () => stderrTail,
  };
};
