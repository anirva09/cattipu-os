import { NextResponse } from "next/server";

import type { ForgeErrorCode, ForgeResponse } from "@/lib/contracts/forge";
import { serverForge } from "@/lib/services/forge/serverForge";

/**
 * MVP-07 — the server end of Forge.
 *
 *   GET                           what can be built here, and why not
 *   GET ?projectId=&buildId=      whether that build's artifact still exists
 *   POST { projectId, target, configuration, files }   build it
 *
 * The body names a target; it cannot name a command. A failed build is a
 * 200 with `status: "failed"` — it is a result, not an HTTP error.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Leaves Forge's 60s build limit room to report first. */
export const maxDuration = 90;

const STATUS: Record<ForgeErrorCode, number> = {
  "invalid-request": 400,
  disabled: 403,
  "toolchain-unavailable": 503,
  busy: 409,
  network: 502,
  internal: 500,
};

function reply(response: ForgeResponse) {
  return NextResponse.json(response, { status: response.ok ? 200 : STATUS[response.error.code] });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.has("projectId") || params.has("buildId")) {
    const check = await serverForge.artifact(params.get("projectId"), params.get("buildId"));
    return NextResponse.json(check, { status: "code" in check ? 400 : 200 });
  }
  return NextResponse.json(serverForge.status());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: { code: "invalid-request", message: "The request body is not valid JSON." } });
  }
  return reply(await serverForge.build(body));
}
