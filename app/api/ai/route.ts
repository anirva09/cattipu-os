import { NextResponse } from "next/server";

import type { AIErrorCode, AIResult } from "@/lib/contracts/ai";
import { serverAIGateway } from "@/lib/services/ai/serverGateway";

/**
 * MVP-04 — the server end of the AI boundary.
 *
 * The browser's AIService posts here; the gateway resolves a provider and
 * the adapter talks to it with credentials that exist only in this server
 * process. Responses are always the normalised contract, never a provider
 * payload, and never contain a credential.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Leaves the adapter's 55s request timeout room to answer first. */
export const maxDuration = 60;

const STATUS: Record<AIErrorCode, number> = {
  "invalid-request": 400,
  "unknown-provider": 404,
  "not-configured": 503,
  unavailable: 503,
  authentication: 502,
  "rate-limited": 429,
  overloaded: 503,
  refused: 422,
  "provider-error": 502,
  network: 502,
};

function reply(result: AIResult) {
  return NextResponse.json(result, { status: result.ok ? 200 : STATUS[result.error.code] });
}

export async function GET(request: Request) {
  const providerId = new URL(request.url).searchParams.get("provider") ?? undefined;
  const status = serverAIGateway.status(providerId);
  return NextResponse.json(status, { status: "code" in status ? 404 : 200 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({
      ok: false,
      error: { code: "invalid-request", message: "The request body is not valid JSON.", retryable: false },
    });
  }
  return reply(await serverAIGateway.handle(body));
}
