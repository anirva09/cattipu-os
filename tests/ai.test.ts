/**
 * MVP-04 (AI Gateway) — the boundary between CATTIPU and AI providers.
 *
 *   UI → AIService → /api/ai → AIGateway → ProviderRegistry → adapter → provider
 *
 * Fakes appear only at the test boundary: an injected SDK client for the
 * Claude adapter and an injected fetch for the browser service. Errors are
 * the SDK's own classes, built by the SDK's own factory. Nothing here calls
 * a real provider, and the real route handler is exercised with no key set
 * to prove the configuration error end to end.
 *
 * Run with: npx tsx tests/ai.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Anthropic from "@anthropic-ai/sdk";

import type {
  AIProvider,
  AIProviderRequest,
  AIProviderStatus,
  AIResult,
  AIService,
} from "@/lib/contracts/ai";
import { createAIGateway, parseAIRequest } from "@/lib/services/ai/aiGateway";
import { assembleContext } from "@/lib/services/ai/contextAssembly";
import { createProviderRegistry, type ProviderRegistry } from "@/lib/services/ai/providerRegistry";
import { selectDefaultProvider } from "@/lib/services/ai/providerSelection";
import { createAIService } from "@/lib/services/ai/aiService";
import { claudeError, createClaudeProvider, DEFAULT_CLAUDE_MODEL } from "@/lib/adapters/ai/providers/claude/claudeProvider";
import {
  createOllamaProvider,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "@/lib/adapters/ai/providers/ollama/ollamaProvider";
import { createProject } from "@/lib/project/types";
import { EMPTY_CONVERSATION, conversationFor, useAIStore } from "@/store/useAIStore";
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

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const request = (overrides: Record<string, unknown> = {}) => ({
  projectId: "pa",
  projectName: "Alpha",
  messages: [{ role: "user", text: "Hello" }],
  ...overrides,
});

/** A gateway whose default provider is fixed, so routing is deterministic. */
const gatewayOver = (registry: ProviderRegistry, defaultProvider = "claude") =>
  createAIGateway(registry, { defaultProvider: () => defaultProvider });

const STATUS: AIProviderStatus = {
  providerId: "claude",
  label: "Claude",
  model: "claude-opus-5",
  configured: true,
  local: false,
  setupHint: "Set ANTHROPIC_API_KEY in the server environment and restart.",
};

/** A provider double that records what it was asked. */
function fakeProvider(opts: { configured?: boolean; result?: AIResult; throws?: boolean; id?: string } = {}) {
  const calls: AIProviderRequest[] = [];
  const provider: AIProvider = {
    id: opts.id ?? "claude",
    label: "Claude",
    model: "test-model",
    local: false,
    setupHint: "Set the key.",
    isConfigured: () => opts.configured ?? true,
    async generate(req) {
      calls.push(req);
      if (opts.throws) throw new Error("boom INTERNAL-DETAIL-SENTINEL");
      return (
        opts.result ?? {
          ok: true,
          response: { projectId: req.projectId, providerId: provider.id, model: "test-model", text: "Hi", stopReason: "end_turn" },
        }
      );
    },
  };
  return { provider, calls };
}

// ── contract ───────────────────────────────────────────────────────────

test("contract: provider-neutral and framework-free; no default provider is baked into it", () => {
  const contract = read("lib/contracts/ai.ts");
  for (const forbidden of [/from ["']react/, /from ["']next/, /from ["']zustand/, /@anthropic-ai\/sdk/, /process\.env/]) {
    assert.doesNotMatch(contract, forbidden, `the contract must stay provider- and framework-free (${forbidden})`);
  }
  assert.doesNotMatch(contract, /ollama|11434|anthropic/i, "the contract names no vendor or endpoint");
});

// ── registry ───────────────────────────────────────────────────────────

test("registry: resolves providers by stable id and refuses duplicates", () => {
  const a = fakeProvider({ id: "claude" }).provider;
  const b = fakeProvider({ id: "ollama" }).provider;
  const registry = createProviderRegistry([a, b]);
  assert.equal(registry.resolve("claude"), a);
  assert.equal(registry.resolve("ollama"), b);
  assert.equal(registry.resolve("gemini"), undefined);
  assert.deepEqual(registry.list().map((p) => p.id), ["claude", "ollama"]);
  assert.throws(() => createProviderRegistry([a, a]), /Duplicate/);
});

// ── gateway ────────────────────────────────────────────────────────────

test("gateway: malformed requests are refused before any provider is touched", async () => {
  const { provider, calls } = fakeProvider();
  const gateway = gatewayOver(createProviderRegistry([provider]));
  const cases: unknown[] = [
    null,
    "text",
    request({ projectId: "" }),
    request({ projectId: undefined }),
    request({ messages: [] }),
    request({ messages: [{ role: "system", text: "x" }] }),
    request({ messages: [{ role: "assistant", text: "first" }, { role: "user", text: "then" }] }),
    request({ messages: [{ role: "user", text: "q" }, { role: "assistant", text: "a" }] }),
    request({ messages: [{ role: "user", text: "   " }] }),
    request({ messages: [{ role: "user", text: "x".repeat(20_001) }] }),
  ];
  for (const input of cases) {
    const result = await gateway.handle(input);
    assert.equal(result.ok, false, JSON.stringify(input)?.slice(0, 60));
    assert.equal(!result.ok && result.error.code, "invalid-request");
  }
  assert.equal(calls.length, 0);
  assert.equal(parseAIRequest(request()).ok, true);
});

test("gateway: an unknown provider is a normalised error", async () => {
  const gateway = gatewayOver(createProviderRegistry([fakeProvider().provider]));
  const result = await gateway.handle(request({ providerId: "gemini" }));
  assert.deepEqual(!result.ok && [result.error.code, result.error.providerId], ["unknown-provider", "gemini"]);
  const missing = gateway.status("gemini");
  assert.equal("code" in missing && missing.code, "unknown-provider");
});

test("gateway: missing configuration is explicit and never reaches the provider", async () => {
  const { provider, calls } = fakeProvider({ configured: false });
  const gateway = gatewayOver(createProviderRegistry([provider]));
  const result = await gateway.handle(request());
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error.code, "not-configured");
  assert.equal(calls.length, 0, "no request leaves the server without credentials");
  const status = gateway.status();
  assert.deepEqual("configured" in status && [status.providerId, status.configured, status.local], ["claude", false, false]);
});

test("gateway: a successful provider answer passes through normalised, for the asking project", async () => {
  const { provider, calls } = fakeProvider();
  const gateway = gatewayOver(createProviderRegistry([provider]));
  const result = await gateway.handle(request());
  assert.deepEqual(result.ok && [result.response.projectId, result.response.text], ["pa", "Hi"]);
  assert.equal(calls[0].providerId, "claude");
  assert.equal(calls[0].projectId, "pa");
});

test("gateway: a provider that throws, or answers for another project, becomes a provider error", async () => {
  const thrower = gatewayOver(createProviderRegistry([fakeProvider({ throws: true }).provider]));
  const thrown = await thrower.handle(request());
  assert.equal(!thrown.ok && thrown.error.code, "provider-error");
  assert.doesNotMatch(!thrown.ok ? thrown.error.message : "", /SENTINEL/, "raw errors are not echoed");
  const liar = gatewayOver(
    createProviderRegistry([
      fakeProvider({
        result: { ok: true, response: { projectId: "pb", providerId: "claude", model: "m", text: "x", stopReason: "end_turn" } },
      }).provider,
    ]),
  );
  const crossed = await liar.handle(request());
  assert.equal(!crossed.ok && crossed.error.code, "provider-error");
});

// ── Claude adapter ─────────────────────────────────────────────────────

type CreateArgs = Record<string, unknown>;

function fakeClaude(respond: (args: CreateArgs) => unknown) {
  const calls: CreateArgs[] = [];
  const client = {
    beta: {
      messages: {
        create: async (args: CreateArgs) => {
          calls.push(args);
          return respond(args);
        },
      },
    },
  } as unknown as Pick<Anthropic, "beta">;
  return { client, calls };
}

/** What the gateway hands an adapter: the request plus the context it
 *  assembled (MVP-05). With no memory that is the system block alone. */
const withContext = (req: Omit<AIProviderRequest, "context">): AIProviderRequest => ({
  ...req,
  context: assembleContext(req),
});

const providerRequest = (): AIProviderRequest =>
  withContext({
    projectId: "pa",
    projectName: "Alpha",
    providerId: "claude",
    messages: [
      { role: "user", text: "What is this project?" },
      { role: "assistant", text: "An app." },
      { role: "user", text: "Tell me more." },
    ],
  });

test("claude: configuration comes from the server environment only", () => {
  assert.equal(createClaudeProvider({ env: {} }).isConfigured(), false);
  assert.equal(createClaudeProvider({ env: { ANTHROPIC_API_KEY: "  " } }).isConfigured(), false);
  assert.equal(createClaudeProvider({ env: { ANTHROPIC_API_KEY: "k" } }).isConfigured(), true);
  assert.equal(createClaudeProvider({ env: {} }).model, DEFAULT_CLAUDE_MODEL);
  assert.equal(createClaudeProvider({ env: { CATTIPU_CLAUDE_MODEL: "claude-sonnet-5" } }).model, "claude-sonnet-5");
});

test("claude: builds the Messages request and normalises the answer", async () => {
  const { client, calls } = fakeClaude(() => ({
    model: "claude-opus-5",
    stop_reason: "end_turn",
    content: [
      { type: "thinking", thinking: "" },
      { type: "text", text: "First part." },
      { type: "text", text: "Second part." },
    ],
  }));
  const provider = createClaudeProvider({ env: { ANTHROPIC_API_KEY: "k" }, createClient: () => client });
  const result = await provider.generate(providerRequest());
  assert.deepEqual(result, {
    ok: true,
    response: { projectId: "pa", providerId: "claude", model: "claude-opus-5", text: "First part.\n\nSecond part.", stopReason: "end_turn" },
  });
  const sent = calls[0];
  assert.equal(sent.model, DEFAULT_CLAUDE_MODEL);
  assert.equal(sent.fallbacks, "default");
  assert.deepEqual(sent.betas, ["server-side-fallback-2026-07-01"]);
  assert.ok(Array.isArray(sent.system), "system context arrives as separate blocks");
  assert.match(JSON.stringify(sent.system), /\\"Alpha\\"/, "the provider knows which project it is helping with");
  assert.deepEqual(sent.messages, [
    { role: "user", content: "What is this project?" },
    { role: "assistant", content: "An app." },
    { role: "user", content: "Tell me more." },
  ]);
  assert.equal(JSON.stringify(sent).includes("\"k\""), false, "the key is never placed in the request body");
});

test("claude: a refusal is reported as declined, never shown as an answer", async () => {
  const { client } = fakeClaude(() => ({ model: "claude-opus-5", stop_reason: "refusal", content: [{ type: "text", text: "partial" }] }));
  const result = await createClaudeProvider({ env: { ANTHROPIC_API_KEY: "k" }, createClient: () => client }).generate(providerRequest());
  assert.equal(!result.ok && result.error.code, "refused");
});

test("claude: an answer with no text is a provider error", async () => {
  const { client } = fakeClaude(() => ({ model: "claude-opus-5", stop_reason: "end_turn", content: [] }));
  const result = await createClaudeProvider({ env: { ANTHROPIC_API_KEY: "k" }, createClient: () => client }).generate(providerRequest());
  assert.equal(!result.ok && result.error.code, "provider-error");
});

test("claude: SDK errors map to normalised codes, most specific first", async () => {
  const cases: Array<[unknown, string, boolean]> = [
    [Anthropic.APIError.generate(401, { type: "error", error: { type: "authentication_error" } }, "bad key", new Headers()), "authentication", false],
    [Anthropic.APIError.generate(403, { type: "error", error: { type: "permission_error" } }, "denied", new Headers()), "authentication", false],
    [Anthropic.APIError.generate(429, { type: "error", error: { type: "rate_limit_error" } }, "slow down", new Headers()), "rate-limited", true],
    [Anthropic.APIError.generate(404, { type: "error", error: { type: "not_found_error" } }, "no model", new Headers()), "provider-error", false],
    [Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error" } }, "bad", new Headers()), "provider-error", false],
    [Anthropic.APIError.generate(529, { type: "error", error: { type: "overloaded_error" } }, "busy", new Headers()), "overloaded", true],
    [Anthropic.APIError.generate(500, { type: "error", error: { type: "api_error" } }, "oops", new Headers()), "provider-error", true],
    [new Anthropic.APIConnectionTimeoutError({ message: "timeout" }), "provider-error", true],
    [new Anthropic.APIConnectionError({ message: "offline" }), "network", true],
    [new Error("anything"), "provider-error", true],
  ];
  for (const [error, code, retryable] of cases) {
    const mapped = claudeError(error, DEFAULT_CLAUDE_MODEL);
    assert.deepEqual([mapped.code, mapped.retryable, mapped.providerId], [code, retryable, "claude"], String(error));
  }
  // Through the adapter as well: a thrown SDK error is returned, not thrown.
  const { client } = fakeClaude(() => {
    throw Anthropic.APIError.generate(429, { type: "error", error: { type: "rate_limit_error" } }, "slow", new Headers());
  });
  const result = await createClaudeProvider({ env: { ANTHROPIC_API_KEY: "k" }, createClient: () => client }).generate(providerRequest());
  assert.equal(!result.ok && result.error.code, "rate-limited");
});

// ── provider selection and routing ─────────────────────────────────────

test("selection: AI_PROVIDER wins; otherwise Ollama in development and Claude in production", () => {
  assert.equal(selectDefaultProvider({ AI_PROVIDER: "claude", NODE_ENV: "development" }), "claude");
  assert.equal(selectDefaultProvider({ AI_PROVIDER: " Ollama " }), "ollama");
  assert.equal(selectDefaultProvider({ NODE_ENV: "development" }), "ollama");
  assert.equal(selectDefaultProvider({}), "ollama");
  assert.equal(selectDefaultProvider({ NODE_ENV: "production" }), "claude");
});

test("routing: the gateway resolves claude or ollama by id, and the configured default when none is named", async () => {
  const claude = fakeProvider({ id: "claude" });
  const ollama = fakeProvider({ id: "ollama" });
  const gateway = gatewayOver(createProviderRegistry([claude.provider, ollama.provider]), "ollama");
  await gateway.handle(request());
  await gateway.handle(request({ providerId: "claude" }));
  await gateway.handle(request({ providerId: "ollama" }));
  assert.equal(ollama.calls.length, 2);
  assert.equal(claude.calls.length, 1);
  assert.equal(ollama.calls[0].providerId, "ollama");
});

// ── Ollama adapter ─────────────────────────────────────────────────────

type Call = { url: string; init: RequestInit };

function fakeOllama(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ollamaRequest = (): AIProviderRequest =>
  withContext({
    projectId: "pa",
    projectName: "Alpha",
    providerId: "ollama",
    messages: [
      { role: "user", text: "What is this project?" },
      { role: "assistant", text: "An app." },
      { role: "user", text: "Tell me more." },
    ],
  });

test("ollama: configuration defaults to the local server and the documented model; env overrides both", () => {
  const plain = createOllamaProvider({ env: {} });
  assert.deepEqual([plain.id, plain.model, plain.local, plain.isConfigured()], ["ollama", DEFAULT_OLLAMA_MODEL, true, true]);
  assert.equal(DEFAULT_OLLAMA_BASE_URL, "http://127.0.0.1:11434");
  assert.match(plain.setupHint, new RegExp(`ollama pull ${DEFAULT_OLLAMA_MODEL.replace(/[.]/g, "\\.")}`));
  assert.equal(createOllamaProvider({ env: { OLLAMA_MODEL: "llama3.2:1b" } }).model, "llama3.2:1b");
  assert.equal(createOllamaProvider({ env: { OLLAMA_BASE_URL: "not a url" } }).isConfigured(), false);
});

test("ollama: sends the native chat request and normalises the answer", async () => {
  const { fetcher, calls } = fakeOllama(() =>
    json({ model: "qwen2.5-coder:1.5b", message: { role: "assistant", content: "  A local answer.  " }, done: true, done_reason: "stop" }),
  );
  const provider = createOllamaProvider({ env: { OLLAMA_BASE_URL: "http://127.0.0.1:11434/" }, fetcher });
  const result = await provider.generate(ollamaRequest());
  assert.deepEqual(result, {
    ok: true,
    response: { projectId: "pa", providerId: "ollama", model: "qwen2.5-coder:1.5b", text: "A local answer.", stopReason: "stop" },
  });
  assert.equal(calls[0].url, "http://127.0.0.1:11434/api/chat");
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.model, DEFAULT_OLLAMA_MODEL);
  assert.equal(body.stream, false);
  assert.equal("num_gpu" in body.options, false, "GPU placement is Ollama's decision unless configured");
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[0].content, /"Alpha"/, "the local model knows which project it is helping with");
  assert.deepEqual(body.messages.slice(1), [
    { role: "user", content: "What is this project?" },
    { role: "assistant", content: "An app." },
    { role: "user", content: "Tell me more." },
  ]);
});

test("ollama: OLLAMA_NUM_GPU=0 forces CPU inference; a malformed value is ignored", async () => {
  const sentOptions = async (value: string) => {
    const { fetcher, calls } = fakeOllama(() => json({ model: "m", message: { content: "ok" } }));
    await createOllamaProvider({ env: { OLLAMA_NUM_GPU: value }, fetcher }).generate(ollamaRequest());
    return JSON.parse(String(calls[0].init.body)).options;
  };
  assert.equal((await sentOptions("0")).num_gpu, 0);
  assert.equal("num_gpu" in (await sentOptions("lots")), false);
});

test("ollama: a missing model is a configuration error naming the exact pull command", async () => {
  const { fetcher } = fakeOllama(() => json({ error: `model "${DEFAULT_OLLAMA_MODEL}" not found, try pulling it first` }, 404));
  const result = await createOllamaProvider({ env: {}, fetcher }).generate(ollamaRequest());
  assert.equal(!result.ok && result.error.code, "not-configured");
  assert.match(!result.ok ? result.error.message : "", new RegExp(`ollama pull ${DEFAULT_OLLAMA_MODEL.replace(/[.]/g, "\\.")}`));
});

test("ollama: not running / not installed, and a timeout, are normalised without internals", async () => {
  const refused = fakeOllama(() => {
    throw new TypeError("fetch failed", { cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:11434"), { code: "ECONNREFUSED" }) });
  });
  const down = await createOllamaProvider({ env: {}, fetcher: refused.fetcher }).generate(ollamaRequest());
  assert.deepEqual(!down.ok && [down.error.code, down.error.retryable, down.error.providerId], ["unavailable", true, "ollama"]);
  assert.doesNotMatch(!down.ok ? down.error.message : "", /ECONNREFUSED|127\.0\.0\.1/);

  const slow = fakeOllama(() => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  const late = await createOllamaProvider({ env: { OLLAMA_TIMEOUT_MS: "5000" }, fetcher: slow.fetcher }).generate(ollamaRequest());
  assert.deepEqual(!late.ok && [late.error.code, late.error.retryable], ["provider-error", true]);
  assert.match(!late.ok ? late.error.message : "", /5s/);
});

test("ollama: malformed, empty and rejected answers are provider errors, never a success", async () => {
  const cases: Array<[() => Response, string]> = [
    [() => new Response("<html>not json</html>", { status: 200 }), "provider-error"],
    [() => json({ model: "m", done: true }), "provider-error"],
    [() => json({ model: "m", message: { content: 42 } }), "provider-error"],
    [() => json({ model: "m", message: { content: "   " } }), "provider-error"],
    [() => json({ error: "unsupported option" }, 400), "provider-error"],
    [() => json({ error: "runner crashed" }, 500), "provider-error"],
  ];
  for (const [respond, code] of cases) {
    const { fetcher } = fakeOllama(respond);
    const result = await createOllamaProvider({ env: {}, fetcher }).generate(ollamaRequest());
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, code);
  }
});

test("UI: a local provider that is not running reads LOCAL AI UNAVAILABLE", () => {
  const local: AIProviderStatus = {
    providerId: "ollama",
    label: "Local AI",
    model: DEFAULT_OLLAMA_MODEL,
    configured: true,
    local: true,
    setupHint: `Install Ollama, make sure it is running, and run: ollama pull ${DEFAULT_OLLAMA_MODEL}`,
  };
  const html = view({
    provider: { kind: "known", status: local },
    conversation: {
      status: "idle",
      error: { code: "unavailable", message: "The local AI server is not reachable.", retryable: true, providerId: "ollama" },
      messages: [{ id: "1", role: "user", text: "Hello", createdAt: "t" }],
    },
  });
  assert.match(html, /ERROR · LOCAL AI UNAVAILABLE/);
  assert.match(html, /LOCAL AI · qwen2\.5-coder:1\.5b/);
  // A hosted provider's outage is not called "local".
  const hosted = view({
    conversation: {
      status: "idle",
      error: { code: "unavailable", message: "x", retryable: true },
      messages: [],
    },
  });
  assert.match(hosted, /ERROR · UNAVAILABLE/);
  assert.doesNotMatch(hosted, /LOCAL AI UNAVAILABLE/);
});

// ── the real route, with no credentials ────────────────────────────────

type RouteModule = typeof import("@/app/api/ai/route");

/** The real route over a controlled server environment. The Ollama address
 *  points at a closed local port, so its failure is a real refused
 *  connection, not a stub. */
function withRoute(env: Record<string, string | undefined>, run: (route: RouteModule) => Promise<void>) {
  const keys = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OLLAMA_BASE_URL", "OLLAMA_MODEL"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  for (const key of Object.keys(require.cache)) {
    if (/[\\/](app[\\/]api[\\/]ai[\\/]route|lib[\\/]services[\\/]ai[\\/]serverGateway)\.ts$/.test(key)) delete require.cache[key];
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const route = require("@/app/api/ai/route") as RouteModule;
  return run(route).finally(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
}

const post = (route: RouteModule, body: string) =>
  route.POST(new Request("http://localhost/api/ai", { method: "POST", body }));

test("route: Claude selected with no key answers with an explicit configuration error", async () => {
  await withRoute({ AI_PROVIDER: "claude" }, async (route) => {
    const res = await post(route, JSON.stringify(request()));
    assert.equal(res.status, 503);
    const body = (await res.json()) as AIResult;
    assert.equal(!body.ok && body.error.code, "not-configured");
    const status = (await (await route.GET(new Request("http://localhost/api/ai"))).json()) as AIProviderStatus;
    assert.deepEqual([status.providerId, status.configured, status.local], ["claude", false, false]);
    const bad = await post(route, "{not json");
    assert.equal(bad.status, 400);
  });
});

test("route: in development the local provider answers by default; a stopped runtime is reported as unavailable", async () => {
  await withRoute({ OLLAMA_BASE_URL: "http://127.0.0.1:9" }, async (route) => {
    const status = (await (await route.GET(new Request("http://localhost/api/ai"))).json()) as AIProviderStatus;
    assert.deepEqual([status.providerId, status.local, status.configured], ["ollama", true, true]);
    const res = await post(route, JSON.stringify(request()));
    assert.equal(res.status, 503);
    const body = (await res.json()) as AIResult;
    assert.equal(!body.ok && body.error.code, "unavailable");
    assert.doesNotMatch(!body.ok ? body.error.message : "", /ECONNREFUSED|at \S+:\d+|stack/i, "no internals reach the browser");
    // Claude stays registered and reachable by id.
    const claude = (await (await route.GET(new Request("http://localhost/api/ai?provider=claude"))).json()) as AIProviderStatus;
    assert.equal(claude.providerId, "claude");
  });
});

// ── browser service ────────────────────────────────────────────────────

test("service: posts the request to the gateway and returns its normalised result", async () => {
  const seen: Array<[string, RequestInit | undefined]> = [];
  const ok: AIResult = { ok: true, response: { projectId: "pa", providerId: "claude", model: "m", text: "Hi", stopReason: "end_turn" } };
  const service = createAIService((async (url: string, init?: RequestInit) => {
    seen.push([url, init]);
    return new Response(JSON.stringify(ok), { status: 200 });
  }) as typeof fetch);
  const result = await service.send({ projectId: "pa", projectName: "Alpha", messages: [{ role: "user", text: "Hello" }] });
  assert.deepEqual(result, ok);
  assert.equal(seen[0][0], "/api/ai");
  assert.equal(JSON.parse(String(seen[0][1]?.body)).projectId, "pa");
});

test("service: an unreachable or garbled gateway is still a normalised error", async () => {
  const offline = createAIService((async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch);
  const down = await offline.send({ projectId: "pa", projectName: "A", messages: [{ role: "user", text: "x" }] });
  assert.equal(!down.ok && down.error.code, "network");
  const garbled = createAIService((async () => new Response("<html>502</html>", { status: 502 })) as typeof fetch);
  const bad = await garbled.send({ projectId: "pa", projectName: "A", messages: [{ role: "user", text: "x" }] });
  assert.equal(!bad.ok && bad.error.code, "provider-error");
  const status = await offline.status();
  assert.equal("code" in status && status.code, "network");
});

// ── project isolation, loading and error state ─────────────────────────

/** A service whose answer is released by the test, so in-flight state can be observed. */
function deferredService() {
  let release: (result: AIResult) => void = () => {};
  const requests: Parameters<AIService["send"]>[0][] = [];
  const service: AIService = {
    status: async () => STATUS,
    send: (req) => {
      requests.push(req);
      return new Promise<AIResult>((resolve) => {
        release = resolve;
      });
    },
  };
  return { service, requests, release: (r: AIResult) => release(r) };
}

const answer = (projectId: string, text: string): AIResult => ({
  ok: true,
  response: { projectId, providerId: "claude", model: "claude-opus-5", text, stopReason: "end_turn" },
});

/** MVP-05: conversations live in each project's memory, so the store tests
 *  run over two real projects in the real project store. */
function twoProjects() {
  useAIStore.setState({ sessions: {} });
  useProjectStore.setState({
    projects: [
      { ...createProject({ name: "Alpha" }), id: "pa" },
      { ...createProject({ name: "Beta" }), id: "pb" },
    ],
  });
}

/** What the console shows for a project: its persisted turns + its session. */
const convo = (id: string) => {
  const project = useProjectStore.getState().projects.find((p) => p.id === id);
  assert.ok(project, `project ${id} exists`);
  return conversationFor(project, useAIStore.getState().sessions[id]);
};

test("isolation: each project has its own conversation; a late reply lands in the project that asked", async () => {
  twoProjects();
  const a = deferredService();
  const pending = useAIStore.getState().send("pa", "About Alpha?", a.service);
  // Loading state, for A only.
  assert.equal(convo("pa").status, "sending");
  assert.deepEqual([convo("pb").status, convo("pb").messages.length], ["idle", 0], "B has no conversation at all");
  // A second send in A is ignored while A is waiting.
  await useAIStore.getState().send("pa", "again", a.service);
  assert.equal(a.requests.length, 1);
  // B can talk meanwhile, independently.
  const b = deferredService();
  const pendingB = useAIStore.getState().send("pb", "About Beta?", b.service);
  b.release(answer("pb", "Beta answer"));
  await pendingB;
  a.release(answer("pa", "Alpha answer"));
  await pending;
  const pa = convo("pa");
  const pb = convo("pb");
  assert.deepEqual(pa.messages.map((m) => [m.role, m.text]), [["user", "About Alpha?"], ["assistant", "Alpha answer"]]);
  assert.deepEqual(pb.messages.map((m) => [m.role, m.text]), [["user", "About Beta?"], ["assistant", "Beta answer"]]);
  assert.equal(a.requests[0].projectId, "pa");
  assert.equal(b.requests[0].projectId, "pb");
  assert.equal(pa.messages[1].model, "claude-opus-5");
});

test("history: the next request carries only this project's earlier turns", async () => {
  twoProjects();
  const s = deferredService();
  const first = useAIStore.getState().send("pa", "one", s.service);
  s.release(answer("pa", "reply one"));
  await first;
  const second = useAIStore.getState().send("pa", "two", s.service);
  s.release(answer("pa", "reply two"));
  await second;
  assert.deepEqual(s.requests[1].messages, [
    { role: "user", text: "one" },
    { role: "assistant", text: "reply one" },
    { role: "user", text: "two" },
  ]);
});

test("error state: a failed request keeps the prompt, records the error, and clears on the next send", async () => {
  twoProjects();
  const s = deferredService();
  const failing = useAIStore.getState().send("pa", "hello", s.service);
  s.release({ ok: false, error: { code: "not-configured", message: "Claude is not configured.", retryable: false, providerId: "claude" } });
  await failing;
  const c = convo("pa");
  assert.deepEqual([c.status, c.error?.code, c.messages.length], ["idle", "not-configured", 1]);
  const retry = useAIStore.getState().send("pa", "again", s.service);
  assert.equal(convo("pa").error, null);
  s.release(answer("pa", "ok"));
  await retry;
  useAIStore.getState().clear("pa");
  assert.deepEqual([convo("pa").messages.length, useAIStore.getState().sessions.pa], [0, undefined]);
});

test("persistence boundary: the AI store is never persisted; turns go to Project Memory, which is", () => {
  const source = read("store/useAIStore.ts");
  assert.doesNotMatch(source, /persist\(|localStorage/);
  assert.match(source, /appendConversationMessage/, "turns are filed through the project store");
});

// ── UI states ──────────────────────────────────────────────────────────

type ConsoleModule = typeof import("@/components/AIConsole/AIConsole");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AIConsoleView } = require("@/components/AIConsole/AIConsole") as ConsoleModule;

const view = (props: Partial<React.ComponentProps<typeof AIConsoleView>>) =>
  renderToStaticMarkup(
    React.createElement(AIConsoleView, {
      project: { id: "pa", name: "Alpha" },
      provider: { kind: "known", status: STATUS },
      conversation: EMPTY_CONVERSATION,
      draft: "",
      onDraftChange: () => {},
      onSend: () => {},
      onClear: () => {},
      ...props,
    }),
  );

test("UI: loading state shows the waiting turn and a disabled Sending button", () => {
  const html = view({
    conversation: {
      status: "sending",
      error: null,
      messages: [{ id: "1", role: "user", text: "Hello", createdAt: "2026-09-28T00:00:00.000Z" }],
    },
    draft: "next",
  });
  assert.match(html, /data-ai-state="sending"/);
  assert.match(html, /data-testid="ai-waiting"/);
  assert.match(html, /CLAUDE · WAITING/);
  assert.match(html, /<button[^>]*data-testid="ai-send"[^>]*disabled=""[^>]*>Sending…<\/button>/);
});

test("UI: error state is an alert naming the error; a missing key is explained before sending", () => {
  const error = view({
    conversation: {
      status: "idle",
      error: { code: "not-configured", message: "Claude is not configured on this server.", retryable: false },
      messages: [{ id: "1", role: "user", text: "Hello", createdAt: "2026-09-28T00:00:00.000Z" }],
    },
  });
  assert.match(error, /role="alert"/);
  assert.match(error, /ERROR · NOT CONFIGURED/);
  assert.match(error, /data-ai-state="error"/);
  const unconfigured = view({
    provider: { kind: "known", status: { ...STATUS, configured: false } },
  });
  assert.match(unconfigured, /CLAUDE · NOT CONFIGURED/);
  assert.match(unconfigured, /ANTHROPIC_API_KEY/);
});

test("UI: an answer is shown as a labelled turn with the model that produced it; no project, no console", () => {
  const html = view({
    conversation: {
      status: "idle",
      error: null,
      messages: [
        { id: "1", role: "user", text: "Hello", createdAt: "t" },
        { id: "2", role: "assistant", text: "Hi there", createdAt: "t", providerId: "claude", model: "claude-opus-5" },
      ],
    },
  });
  assert.match(html, /YOU/);
  assert.match(html, /CLAUDE · claude-opus-5/);
  assert.match(html, /Hi there/);
  assert.match(view({ project: null }), /data-ai-state="no-project"/);
});

// ── the boundary itself ────────────────────────────────────────────────

function listSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const abs = join(ROOT, dir, entry);
    if (statSync(abs).isDirectory()) out.push(...listSource(relative(ROOT, abs)));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative(ROOT, abs).split("\\").join("/"));
  }
  return out;
}

test("boundary: no UI, store or client service can reach a provider SDK, an adapter or the server gateway", () => {
  const clientSide = [...listSource("components"), ...listSource("store"), "lib/services/ai/aiService.ts"];
  for (const file of clientSide) {
    const src = read(file);
    assert.doesNotMatch(src, /@anthropic-ai\/sdk|openai|@google\/generative/, `${file} imports a provider SDK`);
    assert.doesNotMatch(src, /lib\/adapters\//, `${file} imports a provider adapter`);
    assert.doesNotMatch(src, /serverGateway/, `${file} imports the server gateway`);
    assert.doesNotMatch(src, /ANTHROPIC_API_KEY\s*[:=]|process\.env\.ANTHROPIC/, `${file} touches a credential`);
  }
  // Only the adapter speaks to the SDK; only the route reaches the server gateway.
  const sdkUsers = listSource("lib").filter((f) => /@anthropic-ai\/sdk/.test(read(f)));
  assert.deepEqual(sdkUsers, ["lib/adapters/ai/providers/claude/claudeProvider.ts"]);
  // Nor can the browser reach a local model server: its address lives in
  // the Ollama adapter alone.
  for (const file of clientSide) {
    assert.doesNotMatch(read(file), /11434|\/api\/chat|OLLAMA_/, `${file} reaches a local model server`);
  }
  assert.match(read("app/api/ai/route.ts"), /serverGateway/);
});

// ── runner ─────────────────────────────────────────────────────────────

async function main() {
  let failed = 0;
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
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

void main();
