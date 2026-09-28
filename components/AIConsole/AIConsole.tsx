"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import type { AIError, AIProviderStatus } from "@/lib/contracts/ai";
import { activeProject } from "@/lib/os/projects";
import { aiService } from "@/lib/services/ai/aiService";
import { promptService } from "@/lib/services/memory/promptService";
import { EMPTY_CONVERSATION, conversationFor, useAIStore, type AIConversation } from "@/store/useAIStore";
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

export interface AIConsoleViewProps {
  project: { id: string; name: string } | null;
  provider: ConsoleProviderState;
  conversation: AIConversation;
  memory?: ConsoleMemory;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
}

/** Pure presentation: every state is a function of these props. */
export function AIConsoleView({
  project,
  provider,
  conversation,
  memory = NO_MEMORY,
  draft,
  onDraftChange,
  onSend,
  onClear,
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

/** The window body: the active project's conversation, through the stores. */
export function AIConsole() {
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
  const send = useAIStore((s) => s.send);
  const clear = useAIStore((s) => s.clear);
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
    />
  );
}
