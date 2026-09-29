"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import type { AIError, AIProviderStatus } from "@/lib/contracts/ai";
import type { FileWritePreview, FileWriteStatus } from "@/lib/contracts/filesystem";
import { workspaceForProject, type OsObject } from "@/lib/os/filesystem";
import { activeProject } from "@/lib/os/projects";
import type { CattipuProject } from "@/lib/project/types";
import { aiService } from "@/lib/services/ai/aiService";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { promptService } from "@/lib/services/memory/promptService";
import { EMPTY_CONVERSATION, conversationFor, useAIStore, type AIConversation } from "@/store/useAIStore";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./AIConsole.css";

/**
 * MVP-04 — the AI Console: prompt → AI Gateway → provider → response.
 *
 * A workstation tool, not a chat app: turns are labelled blocks of text in
 * an inset well, the way a terminal shows a session. The console depends on
 * the AIService contract only; it has no idea which provider answers, and
 * no credential ever reaches it.
 *
 * MVP-05: the conversation is the project's own, read from and saved to
 * Project Memory, so it survives a reload and stays with its project. The
 * status strip says what memory travels with the next prompt; the server,
 * not this component, turns that memory into provider context.
 *
 * MVP-06: a turn that proposes files shows them under its text — each path
 * with what applying it would do, derived from the filesystem as it is now
 * — and nothing is written until Apply is pressed. "Show in Explorer"
 * raises Explorer on the folder the files are in.
 */

export const CATTIPU_AI_CONSOLE_REFERENCE = {
  toolbarHeight: 34,
  statusHeight: 24,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
} as const;

type ConsoleStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

/** Provider status as the console knows it: still asking, known, or failed. */
export type ConsoleProviderState =
  | { kind: "checking" }
  | { kind: "known"; status: AIProviderStatus }
  | { kind: "unavailable"; error: AIError };

const ERROR_LABEL: Record<AIError["code"], string> = {
  "not-configured": "NOT CONFIGURED",
  unavailable: "UNAVAILABLE",
  "unknown-provider": "UNKNOWN PROVIDER",
  "invalid-request": "INVALID REQUEST",
  authentication: "AUTHENTICATION",
  "rate-limited": "RATE LIMITED",
  overloaded: "OVERLOADED",
  refused: "DECLINED",
  "provider-error": "PROVIDER ERROR",
  network: "NETWORK",
};

/** "LOCAL AI UNAVAILABLE" for a local runtime that is not answering — the
 *  console knows a provider is local, never which vendor it is. */
function errorLabel(error: AIError, provider: ConsoleProviderState): string {
  const local = provider.kind === "known" && provider.status.local;
  return local && error.code === "unavailable" ? "LOCAL AI UNAVAILABLE" : ERROR_LABEL[error.code];
}

function providerLine(provider: ConsoleProviderState): string {
  if (provider.kind === "checking") return "CHECKING PROVIDER";
  if (provider.kind === "unavailable") return "GATEWAY UNAVAILABLE";
  const { label, model, configured } = provider.status;
  return configured ? `${label.toUpperCase()} · ${model}` : `${label.toUpperCase()} · NOT CONFIGURED`;
}

/** MVP-05 — what the project's memory contributes to the next prompt. */
export interface ConsoleMemory {
  records: number;
  /** The active prompt's name, or null when none is chosen. */
  prompt: string | null;
}

const NO_MEMORY: ConsoleMemory = { records: 0, prompt: null };

/** MVP-06 — one turn's proposed files, as the console shows them. */
export interface ConsoleProposal {
  entries: FileWritePreview[];
  /** Why it cannot be applied, in plain words; null when it can. */
  blocked: string | null;
}

const CHANGE_LABEL: Record<FileWriteStatus, string> = {
  create: "NEW",
  update: "UPDATE",
  unchanged: "WRITTEN",
};

/** Each turn's proposal, keyed by message id, from the project's
 *  conversation and the filesystem. Derived every time: "written" means the
 *  file at that path holds exactly the proposed text right now. */
export function consoleProposals(
  project: CattipuProject,
  messages: AIConversation["messages"],
  objects: readonly OsObject[],
): Record<string, ConsoleProposal> {
  const workspace = workspaceForProject(objects, project.id);
  const out: Record<string, ConsoleProposal> = {};
  for (const message of messages) {
    const changes = message.role === "assistant" ? message.fileChanges : undefined;
    if (!changes?.length) continue;
    const asNew = changes.map((c) => ({ path: c.path, status: "create" as const }));
    if (!workspace) {
      out[message.id] = { entries: asNew, blocked: `${project.name} has no workspace folder.` };
      continue;
    }
    const entries = projectFileService.preview(objects, workspace.id, changes);
    out[message.id] = entries
      ? { entries, blocked: null }
      : { entries: asNew, blocked: "A path conflicts with what is already in the workspace." };
  }
  return out;
}

export interface AIConsoleViewProps {
  project: { id: string; name: string } | null;
  provider: ConsoleProviderState;
  conversation: AIConversation;
  memory?: ConsoleMemory;
  /** MVP-06 — proposed files, keyed by the assistant turn's id. */
  proposals?: Record<string, ConsoleProposal>;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  onApply?: (messageId: string) => void;
  onShowFiles?: (messageId: string) => void;
}

/** Pure presentation: every state is a function of these props. */
export function AIConsoleView({
  project,
  provider,
  conversation,
  memory = NO_MEMORY,
  proposals = {},
  draft,
  onDraftChange,
  onSend,
  onClear,
  onApply,
  onShowFiles,
}: AIConsoleViewProps) {
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const sending = conversation.status === "sending";
  const assistantLabel =
    provider.kind === "known" ? provider.status.label.toUpperCase() : "AI";

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.messages.length, sending, conversation.error]);

  const style: ConsoleStyle = {
    ...cattipuCssVariables,
    "--cattipu-ai-toolbar-height": `${CATTIPU_AI_CONSOLE_REFERENCE.toolbarHeight}px`,
    "--cattipu-ai-status-height": `${CATTIPU_AI_CONSOLE_REFERENCE.statusHeight}px`,
    "--cattipu-ai-pad": `${CATTIPU_AI_CONSOLE_REFERENCE.padding}px`,
    "--cattipu-ai-gap": `${CATTIPU_AI_CONSOLE_REFERENCE.gap}px`,
  };

  if (!project) {
    return (
      <div className="cattipu-ai cattipu-ai--empty" style={style} data-testid="ai-console" data-ai-state="no-project">
        <p className="cattipu-ai__notice">No project is open. Select or create a project to talk to the AI about it.</p>
      </div>
    );
  }

  const notConfigured = provider.kind === "known" && !provider.status.configured;
  const state = sending ? "sending" : conversation.error ? "error" : "ready";

  return (
    <div className="cattipu-ai" style={style} data-testid="ai-console" data-ai-state={state}>
      <div className="cattipu-ai__toolbar">
        <span className="cattipu-ai__source" data-testid="ai-source">
          {`${project.name} · ${providerLine(provider)}`}
        </span>
        <button
          type="button"
          className="cattipu-ai__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={onClear}
          disabled={sending || (conversation.messages.length === 0 && !conversation.error)}
        >
          Clear
        </button>
      </div>

      <div className="cattipu-ai__transcript cattipu-bevel--inset" ref={transcriptRef} data-testid="ai-transcript">
        {conversation.messages.length === 0 && !sending && !conversation.error && (
          <p className="cattipu-ai__notice">
            {notConfigured
              ? `${provider.status.label} is not configured on this server. ${provider.status.setupHint} Sending now returns the configuration error.`
              : `Ask about ${project.name}. Nothing is sent until you press Send. This conversation belongs to this project only and is saved with it.`}
          </p>
        )}

        {conversation.messages.map((message) => (
          <article key={message.id} className="cattipu-ai__turn" data-role={message.role}>
            <p className="cattipu-ai__turn-label">
              {message.role === "user" ? "YOU" : `${assistantLabel}${message.model ? ` · ${message.model}` : ""}`}
            </p>
            <p className="cattipu-ai__turn-text">{message.text}</p>
            {proposals[message.id] && (
              <ProposalBlock
                proposal={proposals[message.id]}
                disabled={sending}
                onApply={() => onApply?.(message.id)}
                onShowFiles={() => onShowFiles?.(message.id)}
              />
            )}
          </article>
        ))}

        {sending && (
          <article className="cattipu-ai__turn" data-role="assistant" data-testid="ai-waiting" aria-live="polite">
            <p className="cattipu-ai__turn-label">{`${assistantLabel} · WAITING`}</p>
            <p className="cattipu-ai__turn-text cattipu-ai__turn-text--pending">Request sent to the AI gateway…</p>
          </article>
        )}

        {conversation.error && !sending && (
          <article className="cattipu-ai__turn" data-role="error" role="alert" data-testid="ai-error">
            <p className="cattipu-ai__turn-label">{`ERROR · ${errorLabel(conversation.error, provider)}`}</p>
            <p className="cattipu-ai__turn-text">{conversation.error.message}</p>
          </article>
        )}
      </div>

      <form
        className="cattipu-ai__input"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <textarea
          className="cattipu-ai__field cattipu-bevel--inset"
          data-testid="ai-prompt"
          aria-label="Prompt"
          rows={3}
          placeholder="Type a prompt. Ctrl+Enter sends."
          value={draft}
          disabled={sending}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="submit"
          className="cattipu-ai__button cattipu-ai__send cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="ai-send"
          disabled={sending || !draft.trim()}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>

      <div className="cattipu-ai__status" data-testid="ai-status">
        <span>{`MESSAGES ${String(conversation.messages.length).padStart(2, "0")}`}</span>
        <span className="cattipu-ai__status-memory" data-testid="ai-memory">
          {`MEMORY ${String(memory.records).padStart(2, "0")} · PROMPT ${memory.prompt ?? "NONE"}`}
        </span>
        <span className="cattipu-ai__status-state">{state.toUpperCase()}</span>
      </div>
    </div>
  );
}

/** MVP-06 — the files one turn proposes: a listing in an inset well, like
 *  the transcript itself, with the two actions under it. */
function ProposalBlock({
  proposal,
  disabled,
  onApply,
  onShowFiles,
}: {
  proposal: ConsoleProposal;
  disabled: boolean;
  onApply: () => void;
  onShowFiles: () => void;
}) {
  const { entries, blocked } = proposal;
  const pending = entries.filter((e) => e.status !== "unchanged").length;
  const written = entries.length - pending;
  return (
    <div className="cattipu-ai__changes cattipu-bevel--inset" data-testid="ai-changes">
      <p className="cattipu-ai__changes-label">
        {`FILE CHANGES · ${String(entries.length).padStart(2, "0")}`}
      </p>
      <ul className="cattipu-ai__changes-list">
        {entries.map((entry) => (
          <li key={entry.path} className="cattipu-ai__change" data-status={entry.status} data-testid="ai-change">
            <span className="cattipu-ai__change-status">{CHANGE_LABEL[entry.status]}</span>
            <span className="cattipu-ai__change-path" title={entry.path}>{entry.path}</span>
          </li>
        ))}
      </ul>
      <div className="cattipu-ai__changes-actions">
        {blocked && (
          <span className="cattipu-ai__changes-blocked" role="status">{blocked}</span>
        )}
        <button
          type="button"
          className="cattipu-ai__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="ai-show-files"
          disabled={blocked !== null || written === 0}
          onClick={onShowFiles}
        >
          Show in Explorer
        </button>
        <button
          type="button"
          className="cattipu-ai__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          data-testid="ai-apply"
          disabled={disabled || blocked !== null || pending === 0}
          onClick={onApply}
        >
          {pending === 0 ? "Applied" : "Apply"}
        </button>
      </div>
    </div>
  );
}

export interface AIConsoleProps {
  /** Raises another shell window; the console opens Explorer on the files
   *  it wrote through the window manager, never its own file view. */
  onOpenWindow?: (id: "explorer") => void;
}

/** The window body: the active project's conversation, through the stores. */
export function AIConsole({ onOpenWindow }: AIConsoleProps = {}) {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(() => activeProject(projects), [projects]);
  const session = useAIStore((s) => (project ? s.sessions[project.id] : undefined));
  const conversation = useMemo(
    () => (project ? conversationFor(project, session) : EMPTY_CONVERSATION),
    [project, session],
  );
  const memory = useMemo<ConsoleMemory>(
    () =>
      project
        ? { records: project.memory.records.length, prompt: promptService.active(project)?.name ?? null }
        : NO_MEMORY,
    [project],
  );
  const objects = useFilesystemStore((s) => s.objects);
  const proposals = useMemo(
    () => (project ? consoleProposals(project, conversation.messages, objects) : {}),
    [project, conversation.messages, objects],
  );
  const send = useAIStore((s) => s.send);
  const clear = useAIStore((s) => s.clear);
  const applyProposal = useAIStore((s) => s.applyProposal);
  const [provider, setProvider] = useState<ConsoleProviderState>({ kind: "checking" });
  // Drafts are per project too, so switching projects never carries a half-
  // typed prompt into another project's conversation.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = project ? drafts[project.id] ?? "" : "";

  useEffect(() => {
    let live = true;
    aiService.status().then((status) => {
      if (!live) return;
      setProvider("code" in status ? { kind: "unavailable", error: status } : { kind: "known", status });
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <AIConsoleView
      project={project ? { id: project.id, name: project.name } : null}
      provider={provider}
      conversation={conversation}
      memory={memory}
      draft={draft}
      onDraftChange={(value) => project && setDrafts((d) => ({ ...d, [project.id]: value }))}
      onSend={() => {
        if (!project || !draft.trim()) return;
        const text = draft;
        setDrafts((d) => ({ ...d, [project.id]: "" }));
        void send(project.id, text);
      }}
      onClear={() => project && clear(project.id)}
      proposals={proposals}
      onApply={(messageId) => project && applyProposal(project.id, messageId)}
      onShowFiles={(messageId) => {
        if (!project) return;
        const first = conversation.messages.find((m) => m.id === messageId)?.fileChanges?.[0];
        const fs = useFilesystemStore.getState();
        const workspace = workspaceForProject(fs.objects, project.id);
        const file = first && workspace ? projectFileService.fileAt(fs.objects, workspace.id, first.path) : null;
        if (file?.parentId) fs.selectObject(file.parentId);
        onOpenWindow?.("explorer");
      }}
    />
  );
}
