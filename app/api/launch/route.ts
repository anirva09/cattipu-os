import { NextResponse } from "next/server";

import type { LaunchErrorCode, LaunchResponse } from "@/lib/contracts/launch";
import { serverLaunch } from "@/lib/services/launch/serverLaunch";

/**
 * MVP-08 — the server end of Launch.
 *
 *   GET                                        every project's runtime, and whether launching is on
 *   POST { action: "start", projectId, buildId }   run that build's artifact
 *   POST { action: "stop", projectId }             stop that project's application
 *
 * The body names a project and a build; it cannot name a path, a URL, a
 * command or an executable. A runtime that fails to come up is a 200 with
 * `status: "failed"` — a result, not an HTTP error.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<LaunchErrorCode, number> = {
  "invalid-request": 400,
  disabled: 403,
  "build-not-found": 404,
  busy: 409,
  "not-running": 409,
  network: 502,
  internal: 500,
};

function reply(response: LaunchResponse) {
  return NextResponse.json(response, { status: response.ok ? 200 : STATUS[response.error.code] });
}

export async function GET() {
  return NextResponse.json(serverLaunch.status());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: { code: "invalid-request", message: "The request body is not valid JSON." } });
  }
  const action = typeof body === "object" && body !== null ? (body as { action?: unknown }).action : undefined;
  if (action === "start") return reply(await serverLaunch.launch(body));
  if (action === "stop") return reply(await serverLaunch.stop(body));
  return reply({ ok: false, error: { code: "invalid-request", message: 'The action must be "start" or "stop".' } });
}
