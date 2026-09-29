import { existsSync } from "node:fs";
import { join } from "node:path";

import type { BuildToolchain } from "@/lib/contracts/forge";

/**
 * MVP-07 — the bundler Forge runs: esbuild, the one already installed with
 * this repository (it is what `tsx` compiles the test suites with). Nothing
 * is installed for a build.
 *
 * The native binary is resolved from the repository's own node_modules by
 * platform and architecture — the same layout esbuild's installer writes —
 * and started directly. Not `npx`, not `npm run`, not a `.cmd` shim: each
 * of those goes through a shell on Windows.
 *
 * The command is fixed. Its only inputs are Forge's own plan: an entry from
 * the target's allowlist and output paths Forge chose.
 */

export function esbuildBinary(root: string = process.cwd()): string | null {
  const pkg = join(root, "node_modules", "@esbuild", `${process.platform}-${process.arch}`);
  const candidates = process.platform === "win32" ? [join(pkg, "esbuild.exe")] : [join(pkg, "bin", "esbuild")];
  return candidates.find((path) => existsSync(path)) ?? null;
}

export function esbuildToolchain(executable: string): BuildToolchain {
  return {
    name: "esbuild",
    command({ entry, outdir, metafile, configuration }) {
      return {
        executable,
        args: [
          entry,
          "--bundle",
          "--platform=browser",
          "--format=esm",
          "--target=es2020",
          `--outdir=${outdir}`,
          "--entry-names=main",
          "--asset-names=assets/[name]-[hash]",
          `--metafile=${metafile}`,
          "--loader:.png=file",
          "--loader:.jpg=file",
          "--loader:.svg=file",
          "--loader:.woff2=file",
          "--color=false",
          "--log-level=warning",
          "--log-limit=20",
          ...(configuration === "production" ? ["--minify"] : ["--sourcemap"]),
        ],
      };
    },
  };
}

/** The toolchain for this server, or null when esbuild is not installed. */
export function resolveEsbuildToolchain(root?: string): BuildToolchain | null {
  const binary = esbuildBinary(root);
  return binary ? esbuildToolchain(binary) : null;
}
