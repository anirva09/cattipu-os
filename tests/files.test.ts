/**
 * MVP-06 (AI File Changes) — AI proposes files, the filesystem writes them,
 * Explorer shows them.
 *
 *   prompt → AI Gateway → provider answer → file proposals (gateway)
 *          → Apply (person) → useFilesystemStore → workspace files
 *          → Explorer entries / editor → next prompt carries the files
 *
 * The cases are written against the wrong implementations this sprint could
 * plausibly ship:
 *
 *  - a proposal written on arrival, before anyone applies it (the store
 *    case asserts the workspace is still empty after the reply lands);
 *  - a half-applied batch (the conflict case plants the failure in the
 *    SECOND write and requires the first to be absent too);
 *  - an update that replaces the record instead of editing it (the id of
 *    the file must survive a second apply);
 *  - one project's files leaking into another's request (two workspaces,
 *    one context);
 *  - a file escaping the workspace by path ("../", absolute, drive letter).
 *
 * Run with: npx tsx tests/files.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { AIProvider, AIProviderStatus, AIResult, AIService } from "@/lib/contracts/ai";
import { FILE_LIMITS, type FileRecordSource } from "@/lib/contracts/filesystem";
import { desktopObjects } from "@/lib/os/desktop";
import { canMoveInto, explorerEntries, searchEverything, type OsObject } from "@/lib/os/filesystem";
import { createProject } from "@/lib/project/types";
import { createAIGateway, parseAIRequest } from "@/lib/services/ai/aiGateway";
import { assembleContext } from "@/lib/services/ai/contextAssembly";
import { parseFileProposals } from "@/lib/services/ai/fileProposals";
import { createProviderRegistry } from "@/lib/services/ai/providerRegistry";
import { systemPrompt } from "@/lib/services/ai/systemPrompt";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { conversationFor, useAIStore } from "@/store/useAIStore";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useNotificationStore } from "@/store/useNotificationStore";
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

const AT = "2026-09-29T00:00:00.000Z";

const folder = (id: string, label: string, parentId: string | null, projectId?: string): OsObject => ({
  id,
  kind: "folder",
  label,
  parentId,
  position: { col: 0, row: 0 },
  createdAt: AT,
  ...(projectId ? { projectId } : {}),
});

const file = (id: string, label: string, parentId: string, content: string): OsObject => ({
  id,
  kind: "file",
  label,
  parentId,
  position: { col: 0, row: 0 },
  createdAt: AT,
  content,
});

/** Deterministic ids for records the service creates. */
function source(): FileRecordSource {
  let n = 0;
  return { nextId: () => `new-${(n += 1)}`, at: AT };
}

/** Two projects' workspaces, one with a template section folder. */
const tree = (): OsObject[] => [
  folder("ws-a", "Alpha", null, "pa"),
  folder("ws-a-src", "src", "ws-a"),
  folder("ws-b", "Beta", null, "pb"),
  file("b-secret", "secret.md", "ws-b", "BETA ONLY\n"),
];

// ── paths ──────────────────────────────────────────────────────────────

test("paths: workspace-relative paths are normalised; anything that could escape is refused", () => {
  const n = projectFileService.normalizePath;
  assert.equal(n("src/tasks.ts"), "src/tasks.ts");
  assert.equal(n("./notes/a.md"), "notes/a.md");
  assert.equal(n("notes\\a.md"), "notes/a.md");
  assert.equal(n(".gitignore"), ".gitignore");
  for (const bad of ["", "/etc/passwd", "../x", "a/../b", "a/./b", "a//b", "C:/x", "a/b?", "a/ b", `${"d/".repeat(8)}f`, "x".repeat(65)]) {
    assert.equal(n(bad), null, `accepted ${JSON.stringify(bad)}`);
  }
});

// ── applying writes ────────────────────────────────────────────────────

test("apply: creates missing folders once and files with their text, inside the workspace only", () => {
  const before = tree();
  const result = projectFileService.apply(
    before,
    "ws-a",
    [
      { path: "tasks/tasks.md", content: "# Tasks\n" },
      { path: "tasks/done.md", content: "" },
      { path: "src/app.ts", content: "export {};\n" },
    ],
    source(),
  );
  assert.ok(result.ok);
  assert.deepEqual(result.written.map((w) => [w.path, w.status]), [
    ["tasks/tasks.md", "create"],
    ["tasks/done.md", "create"],
    ["src/app.ts", "create"],
  ]);
  const tasks = result.objects.filter((o) => o.kind === "folder" && o.label === "tasks");
  assert.equal(tasks.length, 1, "the second write reused the folder the first created");
  assert.equal(tasks[0].parentId, "ws-a");
  const app = result.objects.find((o) => o.label === "app.ts");
  assert.equal(app?.parentId, "ws-a-src", "an existing folder is written into, not duplicated");
  assert.equal(projectFileService.fileAt(result.objects, "ws-a", "tasks/tasks.md")?.content, "# Tasks\n");
  assert.equal(before.length, 4, "the input is never mutated");
});

test("apply: a second write to the same path edits the file in place; identical text is 'unchanged'", () => {
  const first = projectFileService.apply(tree(), "ws-a", [{ path: "tasks.md", content: "one\n" }], source());
  assert.ok(first.ok);
  const id = first.fileIds[0];
  const second = projectFileService.apply(first.objects, "ws-a", [{ path: "tasks.md", content: "two\n" }], source());
  assert.ok(second.ok);
  assert.deepEqual([second.fileIds[0], second.written[0].status], [id, "update"]);
  assert.equal(second.objects.filter((o) => o.kind === "file" && o.label === "tasks.md").length, 1);
  const third = projectFileService.apply(second.objects, "ws-a", [{ path: "tasks.md", content: "two\n" }], source());
  assert.ok(third.ok);
  assert.equal(third.written[0].status, "unchanged");
});

test("apply: all or nothing — a conflict in the second write leaves the first unwritten", () => {
  const objects = [...tree(), file("a-notes", "notes", "ws-a", "a file, not a folder\n")];
  const result = projectFileService.apply(
    objects,
    "ws-a",
    [
      { path: "fine.md", content: "x\n" },
      { path: "notes/inside.md", content: "y\n" },
    ],
    source(),
  );
  assert.deepEqual(result, { ok: false, reason: "path-conflict", path: "notes/inside.md" });
  const asFile = projectFileService.apply(tree(), "ws-a", [{ path: "src", content: "" }], source());
  assert.equal(asFile.ok ? "ok" : asFile.reason, "path-conflict", "a folder is not overwritten by a file");
  const escape = projectFileService.apply(tree(), "ws-a", [{ path: "../secret.md", content: "" }], source());
  assert.equal(escape.ok ? "ok" : escape.reason, "invalid-path");
  const tooMany = Array.from({ length: FILE_LIMITS.maxWrites + 1 }, (_, i) => ({ path: `f${i}.md`, content: "" }));
  const many = projectFileService.apply(tree(), "ws-a", tooMany, source());
  assert.equal(many.ok ? "ok" : many.reason, "too-many");
  const none = projectFileService.apply(tree(), "missing", [{ path: "a.md", content: "" }], source());
  assert.equal(none.ok ? "ok" : none.reason, "no-workspace");
});

test("preview: says what applying would do, without doing it", () => {
  const objects = [...tree(), file("a-t", "tasks.md", "ws-a", "old\n")];
  assert.deepEqual(
    projectFileService.preview(objects, "ws-a", [
      { path: "tasks.md", content: "new\n" },
      { path: "tasks.md", content: "old\n" },
      { path: "src/new.ts", content: "" },
    ]),
    [
      { path: "tasks.md", status: "update" },
      { path: "tasks.md", status: "unchanged" },
      { path: "src/new.ts", status: "create" },
    ],
  );
  assert.equal(projectFileService.preview(objects, "ws-a", [{ path: "src", content: "" }]), null);
});

// ── the filesystem's views ─────────────────────────────────────────────

test("views: files list after folders, are found by search, and never reach the desktop", () => {
  const applied = projectFileService.apply(tree(), "ws-a", [{ path: "src/tasks.ts", content: "" }], source());
  assert.ok(applied.ok);
  const objects = [...applied.objects, file("a-readme", "README.md", "ws-a", "")];
  const listing = explorerEntries(objects, [], "ws-a");
  assert.deepEqual(listing.map((e) => [e.kind, e.label]), [["folder", "src"], ["file", "README.md"]]);
  const hits = searchEverything(objects, [], "tasks");
  assert.deepEqual(hits.map((h) => [h.kind, h.label, h.location]), [["file", "tasks.ts", "CATTIPU OS / Alpha / src"]]);
  const fileId = applied.fileIds[0];
  assert.equal(canMoveInto(objects, fileId, null), false, "a file cannot be moved onto the desktop");
  assert.equal(canMoveInto(objects, fileId, "ws-a"), true);
  assert.ok(!desktopObjects(objects, []).some((o) => o.kind === "file"));
});

test("context: only this workspace's files travel, sorted, with content inside the budget", () => {
  const applied = projectFileService.apply(
    tree(),
    "ws-a",
    [
      { path: "z.md", content: "zed\n" },
      { path: "a/big.txt", content: "x".repeat(FILE_LIMITS.maxContextChars) },
      { path: "a/small.txt", content: "small\n" },
    ],
    source(),
  );
  assert.ok(applied.ok);
  const context = projectFileService.contextFor(applied.objects, "ws-a", "pa");
  assert.equal(context.projectId, "pa");
  assert.deepEqual(
    context.files.map((f) => [f.path, f.omitted ?? false]),
    [["a/big.txt", false], ["a/small.txt", true], ["z.md", true]],
  );
  assert.ok(!JSON.stringify(context).includes("BETA ONLY"), "another project's file never travels");
  assert.equal(projectFileService.pathOf(applied.objects, applied.fileIds[2], "ws-a"), "a/small.txt");
  assert.equal(projectFileService.pathOf(applied.objects, "b-secret", "ws-a"), null);
});

// ── proposals in an answer ─────────────────────────────────────────────

test("proposals: FILE blocks are read from any answer's text, as models actually write them", () => {
  const text = [
    "Here is a simple task list.",
    "",
    "**FILE: `tasks/README.md`**",
    "```markdown",
    "# Tasks",
    "",
    "```ts",
    "const nested = true;",
    "```",
    "- [ ] one",
    "```",
    "",
    "FILE: tasks/list.json",
    "",
    "~~~json",
    '["one"]',
    "~~~",
    "",
    "FILE: ../escape.md",
    "```",
    "nope",
    "```",
    "FILE: tasks/list.json",
    "```json",
    '["one","two"]',
    "```",
    "FILE: never-closed.md",
    "```",
    "lost",
  ].join("\n");
  assert.deepEqual(parseFileProposals(text), [
    { path: "tasks/README.md", content: "# Tasks\n\n```ts\nconst nested = true;\n```\n- [ ] one\n" },
    { path: "tasks/list.json", content: '["one","two"]\n' },
  ]);
  assert.deepEqual(parseFileProposals("Just an answer.\n```ts\nconst x = 1;\n```"), []);
});

test("system prompt: describes the file format the parser reads, and that nothing is written unapplied", () => {
  const prompt = systemPrompt("Alpha");
  assert.match(prompt, /FILE: <path>/);
  assert.match(prompt, /Nothing is written until the person applies/);
  assert.doesNotMatch(prompt, /cannot read or change this project's files/);
  const example = prompt.slice(prompt.indexOf("FILE: notes/tasks.md"));
  assert.deepEqual(parseFileProposals(example).map((w) => w.path), ["notes/tasks.md"], "the prompt's own example parses");
});

// ── the gateway ────────────────────────────────────────────────────────

function fakeProvider(text: string, seen: { context?: string[] } = {}): AIProvider {
  return {
    id: "fake",
    label: "Fake",
    model: "fake-1",
    local: true,
    setupHint: "",
    isConfigured: () => true,
    generate: async (request) => {
      seen.context = request.context.map((b) => `${b.source}:${b.text}`);
      return { ok: true, response: { projectId: request.projectId, providerId: "fake", model: "fake-1", text, stopReason: "stop" } };
    },
  };
}

const gatewayFor = (provider: AIProvider) =>
  createAIGateway(createProviderRegistry([provider]), { defaultProvider: () => "fake" });

test("gateway: the project's files become one context block; proposals come back as data", async () => {
  const seen: { context?: string[] } = {};
  const gateway = gatewayFor(fakeProvider("Done.\nFILE: tasks.md\n```\n- [ ] one\n```", seen));
  const result = await gateway.handle({
    projectId: "pa",
    projectName: "Alpha",
    messages: [{ role: "user", text: "Create a simple task list." }],
    files: { projectId: "pa", files: [{ path: "README.md", content: "# Alpha\n" }] },
  });
  assert.ok(result.ok);
  assert.deepEqual(result.response.fileChanges, [{ path: "tasks.md", content: "- [ ] one\n" }]);
  assert.equal(seen.context?.length, 2);
  assert.match(seen.context?.[1] ?? "", /^project-files:Files in the workspace of "Alpha"[\s\S]*FILE: README\.md\n```\n# Alpha\n```$/);

  const plain = await gatewayFor(fakeProvider("No files here.")).handle({
    projectId: "pa",
    projectName: "Alpha",
    messages: [{ role: "user", text: "hi" }],
  });
  assert.ok(plain.ok);
  assert.equal("fileChanges" in plain.response, false);
});

test("gateway: files filed under another project, or over the limits, are refused", () => {
  const base = { projectId: "pa", projectName: "Alpha", messages: [{ role: "user", text: "hi" }] };
  const other = parseAIRequest({ ...base, files: { projectId: "pb", files: [] } });
  assert.equal(other.ok, false);
  assert.match(other.ok ? "" : other.result.ok ? "" : other.result.error.message, /different project/);
  const huge = parseAIRequest({
    ...base,
    files: { projectId: "pa", files: [{ path: "a", content: "x".repeat(FILE_LIMITS.maxContextChars + 1) }] },
  });
  assert.equal(huge.ok, false);
  const ok = parseAIRequest({ ...base, files: { projectId: "pa", files: [] } });
  assert.ok(ok.ok);
  assert.deepEqual(
    assembleContext(ok.request).map((b) => b.source),
    ["system", "project-files"],
    "files are context even without memory",
  );
});

// ── the flow, through the real stores ──────────────────────────────────

const STATUS: AIProviderStatus = {
  providerId: "fake",
  label: "Fake",
  model: "fake-1",
  configured: true,
  local: true,
  setupHint: "",
};

function scriptedService(reply: (req: Parameters<AIService["send"]>[0]) => string) {
  const requests: Parameters<AIService["send"]>[0][] = [];
  const service: AIService = {
    status: async () => STATUS,
    send: async (req): Promise<AIResult> => {
      requests.push(req);
      const text = reply(req);
      return {
        ok: true,
        response: {
          projectId: req.projectId,
          providerId: "fake",
          model: "fake-1",
          text,
          stopReason: "stop",
          fileChanges: parseFileProposals(text),
        },
      };
    },
  };
  return { service, requests };
}

function freshOS() {
  useAIStore.setState({ sessions: {} });
  useNotificationStore.setState({ notifications: [] });
  useProjectStore.setState({
    projects: [
      { ...createProject({ name: "Alpha" }), id: "pa" },
      { ...createProject({ name: "Beta" }), id: "pb" },
    ],
  });
  useFilesystemStore.setState({ objects: [], selectedObjectId: null });
  const fs = useFilesystemStore.getState();
  const wsA = fs.createProjectWorkspace("pa", "Alpha", []);
  const wsB = fs.createProjectWorkspace("pb", "Beta", []);
  return { wsA: wsA.id, wsB: wsB.id };
}

const TASK_LIST = [
  "A simple task list, as a Markdown checklist.",
  "",
  "FILE: tasks/tasks.md",
  "```markdown",
  "# Tasks",
  "- [ ] Plan the week",
  "- [ ] Write the first screen",
  "```",
].join("\n");

test("flow: 'Create a simple task list.' → proposal → Apply → real file in the workspace → Explorer", async () => {
  const { wsA, wsB } = freshOS();
  const ai = scriptedService(() => TASK_LIST);

  await useAIStore.getState().send("pa", "Create a simple task list.", ai.service);
  assert.equal(ai.requests[0].files?.projectId, "pa", "the request carried this project's files");
  assert.deepEqual(ai.requests[0].files?.files, []);

  const project = useProjectStore.getState().projects.find((p) => p.id === "pa");
  assert.ok(project);
  const reply = conversationFor(project, undefined).messages.at(-1);
  assert.equal(reply?.role, "assistant");
  assert.deepEqual(reply?.fileChanges?.map((c) => c.path), ["tasks/tasks.md"], "the proposal is filed with the turn");
  assert.ok(
    !useFilesystemStore.getState().objects.some((o) => o.kind === "file"),
    "nothing is written when the answer arrives",
  );

  const applied = useAIStore.getState().applyProposal("pa", reply!.id);
  assert.ok(applied.ok);
  const objects = useFilesystemStore.getState().objects;
  const written = projectFileService.fileAt(objects, wsA, "tasks/tasks.md");
  assert.equal(written?.content, "# Tasks\n- [ ] Plan the week\n- [ ] Write the first screen\n");
  assert.equal(projectFileService.fileAt(objects, wsB, "tasks/tasks.md"), null, "Beta is untouched");
  assert.equal(useFilesystemStore.getState().selectedObjectId, written?.parentId, "Explorer opens where the file is");
  assert.deepEqual(
    explorerEntries(objects, useProjectStore.getState().projects, written!.parentId).map((e) => [e.kind, e.label]),
    [["file", "tasks.md"]],
  );
  const notice = useNotificationStore.getState().notifications.at(-1);
  assert.deepEqual([notice?.type, notice?.title], ["success", "1 file written"]);

  // The person edits it in Explorer; the next prompt carries the edit.
  assert.ok(useFilesystemStore.getState().writeFileContent(written!.id, "# Tasks\n- [x] Plan the week\n"));
  await useAIStore.getState().send("pa", "What is left?", ai.service);
  assert.deepEqual(ai.requests[1].files?.files, [{ path: "tasks/tasks.md", content: "# Tasks\n- [x] Plan the week\n" }]);
});

test("flow: a proposal is not applied for a project without a workspace, and says why", async () => {
  freshOS();
  useProjectStore.setState((s) => ({ projects: [...s.projects, { ...createProject({ name: "Gamma" }), id: "pc" }] }));
  const ai = scriptedService(() => TASK_LIST);
  await useAIStore.getState().send("pc", "Create a simple task list.", ai.service);
  assert.equal(ai.requests[0].files, undefined, "no workspace, no file context");
  const project = useProjectStore.getState().projects.find((p) => p.id === "pc")!;
  const reply = conversationFor(project, undefined).messages.at(-1)!;
  const result = useAIStore.getState().applyProposal("pc", reply.id);
  assert.deepEqual(result, { ok: false, reason: "no-workspace" });
  assert.equal(useNotificationStore.getState().notifications.at(-1)?.type, "error");
  assert.deepEqual(useAIStore.getState().applyProposal("pa", reply.id), { ok: false, reason: "not-found" });
});

test("store: file names stay path segments; oversized text is refused", () => {
  const { wsA } = freshOS();
  const result = useFilesystemStore.getState().applyFileWrites("pa", [{ path: "a.md", content: "" }]);
  assert.ok(result.ok);
  const id = result.fileIds[0];
  const fs = useFilesystemStore.getState();
  fs.renameObject(id, "b/c.md");
  assert.equal(projectFileService.pathOf(useFilesystemStore.getState().objects, id, wsA), "a.md");
  fs.renameObject(id, "b.md");
  assert.equal(projectFileService.pathOf(useFilesystemStore.getState().objects, id, wsA), "b.md");
  assert.equal(fs.writeFileContent(id, "x".repeat(FILE_LIMITS.maxFileChars + 1)), false);
  assert.equal(fs.writeFileContent(wsA, "folders have no text"), false);
});

// ── the console ────────────────────────────────────────────────────────

type ConsoleModule = typeof import("@/components/AIConsole/AIConsole");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AIConsoleView, consoleProposals } = require("@/components/AIConsole/AIConsole") as ConsoleModule;

test("console: a proposing turn lists its files with what Apply would do; Applied once written", () => {
  const { wsA } = freshOS();
  const project = useProjectStore.getState().projects.find((p) => p.id === "pa")!;
  const messages = [
    { id: "u", role: "user" as const, text: "Create a simple task list.", createdAt: AT },
    { id: "m", role: "assistant" as const, text: TASK_LIST, createdAt: AT, fileChanges: parseFileProposals(TASK_LIST) },
  ];
  const render = (objects: readonly OsObject[]) =>
    renderToStaticMarkup(
      React.createElement(AIConsoleView, {
        project: { id: "pa", name: "Alpha" },
        provider: { kind: "known", status: STATUS },
        conversation: { status: "idle", error: null, messages },
        proposals: consoleProposals(project, messages, objects),
        draft: "",
        onDraftChange: () => {},
        onSend: () => {},
        onClear: () => {},
      }),
    );

  const before = render(useFilesystemStore.getState().objects);
  assert.match(before, /FILE CHANGES · 01/);
  assert.match(before, /data-status="create"[^>]*>.*?NEW.*?tasks\/tasks\.md/);
  assert.match(before, /<button[^>]*data-testid="ai-apply"[^>]*>Apply<\/button>/);
  assert.doesNotMatch(before, /data-testid="ai-apply"[^>]*disabled/);

  useFilesystemStore.getState().applyFileWrites("pa", messages[1].fileChanges ?? []);
  const after = render(useFilesystemStore.getState().objects);
  assert.match(after, /WRITTEN/);
  assert.match(after, /<button[^>]*data-testid="ai-apply"[^>]*disabled=""[^>]*>Applied<\/button>/);
  assert.doesNotMatch(after, /data-testid="ai-show-files"[^>]*disabled/);

  const orphan = consoleProposals({ ...project, id: "none" }, messages, useFilesystemStore.getState().objects);
  assert.match(orphan.m.blocked ?? "", /no workspace folder/);
  assert.ok(wsA);
});

test("wiring: files reach the filesystem only through the store; the console never writes one", () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
  const consoleSrc = read("components/AIConsole/AIConsole.tsx");
  assert.doesNotMatch(consoleSrc, /applyFileWrites|writeFileContent|setState/);
  const gateway = read("lib/services/ai/aiGateway.ts");
  assert.doesNotMatch(gateway, /useFilesystemStore|applyFileWrites/, "the server writes no files");
  for (const adapter of ["claude/claudeProvider.ts", "ollama/ollamaProvider.ts"]) {
    assert.doesNotMatch(read(`lib/adapters/ai/providers/${adapter}`), /FILE:|fileChanges|parseFileProposals/, adapter);
  }
  assert.match(read("components/Shell/CattipuShell.tsx"), /ai: \(\{ openWindow \}\) => <AIConsole onOpenWindow=/);
});

// ── persistence ────────────────────────────────────────────────────────

type FilesystemStoreModule = typeof import("@/store/useFilesystemStore");

function withReload(data: Map<string, string>, run: (store: FilesystemStoreModule["useFilesystemStore"]) => void) {
  const g = globalThis as Record<string, unknown>;
  const had = {
    localStorage: Object.getOwnPropertyDescriptor(g, "localStorage"),
    window: Object.getOwnPropertyDescriptor(g, "window"),
  };
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
  try {
    for (const key of Object.keys(require.cache)) {
      if (/[\\/]store[\\/]useFilesystemStore\.ts$/.test(key)) delete require.cache[key];
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    run((require("@/store/useFilesystemStore") as FilesystemStoreModule).useFilesystemStore);
  } finally {
    for (const [name, desc] of Object.entries(had)) {
      if (desc) Object.defineProperty(g, name, desc);
      else delete g[name];
    }
  }
}

test("persistence: written files survive a reload; a v4 record migrates; a textless file record is dropped", () => {
  const data = new Map<string, string>();
  withReload(data, (store) => {
    store.getState().createProjectWorkspace("pa", "Alpha", []);
    assert.ok(store.getState().applyFileWrites("pa", [{ path: "tasks/tasks.md", content: "# Tasks\n" }]).ok);
  });
  withReload(data, (store) => {
    const ws = store.getState().objects.find((o) => o.projectId === "pa" && o.parentId === null)!;
    assert.equal(projectFileService.fileAt(store.getState().objects, ws.id, "tasks/tasks.md")?.content, "# Tasks\n");
  });

  const legacy = new Map<string, string>([
    [
      "cattipu-desktop",
      JSON.stringify({
        version: 4,
        state: {
          objects: [folder("f1", "Old", null), { ...file("bad", "x.md", "f1", ""), content: 7 }],
          selectedObjectId: "f1",
        },
      }),
    ],
  ]);
  withReload(legacy, (store) => {
    assert.deepEqual(store.getState().objects.map((o) => o.id), ["f1"]);
    assert.equal(store.getState().selectedObjectId, "f1");
  });
  assert.match(legacy.get("cattipu-desktop") ?? "", /"version":5/);
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
