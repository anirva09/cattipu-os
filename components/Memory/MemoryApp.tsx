"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { cattipuCssVariables, cattipuTokens } from "../../design-system/tokens";
import {
  MEMORY_LIMITS,
  WRITABLE_MEMORY_RECORD_KINDS,
  MEMORY_RECORD_LABEL,
  type MemoryFailure,
  type MemoryRecordKind,
} from "@/lib/contracts/memory";
import type { MemoryRecord, ProjectPrompt } from "@/lib/project/types";
import { activeProject } from "@/lib/os/projects";
import { memoryFailureMessage } from "@/lib/services/memory/memoryService";
import { useProjectStore } from "@/store/useProjectStore";

import "../../design-system/bevel.css";
import "./MemoryApp.css";

/**
 * MVP-05 — the Memory window: the active project's memory records and
 * prompts, the context its AI conversations are given.
 *
 * It fills the Memory window the shell already had (a placeholder until
 * now) and is built like the AI Console beside it: a toolbar, one inset
 * well, an instrumentation strip; entries are labelled blocks of text, not
 * cards. It reads and writes through the project store only — memory is
 * part of the project and is saved with it.
 */

export const CATTIPU_MEMORY_REFERENCE = {
  toolbarHeight: 34,
  statusHeight: 24,
  padding: cattipuTokens.spacing[12],
  gap: cattipuTokens.spacing[8],
} as const;

type MemoryStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

export interface RecordDraft {
  /** The record being edited, or null for a new one. */
  id: string | null;
  kind: MemoryRecordKind;
  text: string;
}

export interface PromptEditorDraft {
  id: string | null;
  name: string;
  content: string;
}

export const EMPTY_RECORD_DRAFT: RecordDraft = { id: null, kind: "context", text: "" };
export const EMPTY_PROMPT_DRAFT: PromptEditorDraft = { id: null, name: "", content: "" };

export interface MemoryViewProps {
  project: { id: string; name: string } | null;
  records: readonly MemoryRecord[];
  prompts: readonly ProjectPrompt[];
  activePromptId: string | null;
  recordDraft: RecordDraft;
  promptDraft: PromptEditorDraft;
  recordError: string | null;
  promptError: string | null;
  onRecordDraft: (draft: RecordDraft) => void;
  onPromptDraft: (draft: PromptEditorDraft) => void;
  onSaveRecord: () => void;
  onSavePrompt: () => void;
  onEditRecord: (record: MemoryRecord) => void;
  onEditPrompt: (prompt: ProjectPrompt) => void;
  onRemoveRecord: (id: string) => void;
  onRemovePrompt: (id: string) => void;
  onUsePrompt: (id: string | null) => void;
}

const BUTTON = "cattipu-memory__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical";

/** Pure presentation: every state is a function of these props. */
export function MemoryView(props: MemoryViewProps) {
  const { project, records, prompts, activePromptId, recordDraft, promptDraft } = props;

  const style: MemoryStyle = {
    ...cattipuCssVariables,
    "--cattipu-memory-toolbar-height": `${CATTIPU_MEMORY_REFERENCE.toolbarHeight}px`,
    "--cattipu-memory-status-height": `${CATTIPU_MEMORY_REFERENCE.statusHeight}px`,
    "--cattipu-memory-pad": `${CATTIPU_MEMORY_REFERENCE.padding}px`,
    "--cattipu-memory-gap": `${CATTIPU_MEMORY_REFERENCE.gap}px`,
  };

  if (!project) {
    return (
      <div className="cattipu-memory cattipu-memory--empty" style={style} data-testid="memory-app" data-memory-state="no-project">
        <p className="cattipu-memory__notice">No project is open. Select or create a project to see its memory.</p>
      </div>
    );
  }

  const active = prompts.find((p) => p.id === activePromptId) ?? null;

  return (
    <div className="cattipu-memory" style={style} data-testid="memory-app" data-memory-project={project.id}>
      <div className="cattipu-memory__toolbar">
        <span className="cattipu-memory__source" data-testid="memory-source">{`${project.name} · PROJECT MEMORY`}</span>
      </div>

      <div className="cattipu-memory__well cattipu-bevel--inset">
        <section className="cattipu-memory__section" data-testid="memory-prompts" aria-label="Prompts">
          <p className="cattipu-memory__heading">PROMPTS · THE ONE IN USE IS SENT WITH EVERY AI REQUEST</p>
          {prompts.length === 0 && (
            <p className="cattipu-memory__notice">{`${project.name} has no prompts. A prompt is a standing instruction for the AI in this project.`}</p>
          )}
          {prompts.map((prompt) => {
            const inUse = prompt.id === activePromptId;
            return (
              <article key={prompt.id} className="cattipu-memory__entry" data-testid="memory-prompt" data-active={inUse || undefined}>
                <p className="cattipu-memory__entry-label">{inUse ? `${prompt.name} · IN USE` : prompt.name}</p>
                <p className="cattipu-memory__entry-text">{prompt.content}</p>
                <span className="cattipu-memory__actions">
                  <button type="button" className={BUTTON} onClick={() => props.onUsePrompt(inUse ? null : prompt.id)}>
                    {inUse ? "Stop using" : "Use"}
                  </button>
                  <button type="button" className={BUTTON} onClick={() => props.onEditPrompt(prompt)}>Edit</button>
                  <button type="button" className={BUTTON} onClick={() => props.onRemovePrompt(prompt.id)}>Delete</button>
                </span>
              </article>
            );
          })}
          <form
            className="cattipu-memory__editor"
            data-testid="memory-prompt-editor"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSavePrompt();
            }}
          >
            <input
              className="cattipu-memory__field cattipu-bevel--inset"
              data-testid="memory-prompt-name"
              aria-label="Prompt name"
              placeholder="Prompt name"
              maxLength={MEMORY_LIMITS.maxPromptNameChars}
              value={promptDraft.name}
              onChange={(event) => props.onPromptDraft({ ...promptDraft, name: event.target.value })}
            />
            <textarea
              className="cattipu-memory__field cattipu-bevel--inset"
              data-testid="memory-prompt-content"
              aria-label="Prompt"
              rows={3}
              placeholder="What the AI should always do in this project."
              maxLength={MEMORY_LIMITS.maxPromptChars}
              value={promptDraft.content}
              onChange={(event) => props.onPromptDraft({ ...promptDraft, content: event.target.value })}
            />
            <span className="cattipu-memory__actions">
              <button type="submit" className={BUTTON} data-testid="memory-prompt-save" disabled={!promptDraft.name.trim() || !promptDraft.content.trim()}>
                {promptDraft.id ? "Save prompt" : "Add prompt"}
              </button>
              {promptDraft.id && (
                <button type="button" className={BUTTON} onClick={() => props.onPromptDraft(EMPTY_PROMPT_DRAFT)}>Cancel</button>
              )}
              {props.promptError && <span className="cattipu-memory__error" role="alert">{props.promptError}</span>}
            </span>
          </form>
        </section>

        <section className="cattipu-memory__section" data-testid="memory-records" aria-label="Memory">
          <p className="cattipu-memory__heading">MEMORY · FACTS THE AI TREATS AS TRUE FOR THIS PROJECT</p>
          {records.length === 0 && (
            <p className="cattipu-memory__notice">{`Nothing is recorded for ${project.name} yet.`}</p>
          )}
          {records.map((record) => (
            <article key={record.id} className="cattipu-memory__entry" data-testid="memory-record" data-kind={record.kind}>
              <p className="cattipu-memory__entry-label">{MEMORY_RECORD_LABEL[record.kind]}</p>
              <p className="cattipu-memory__entry-text">{record.text}</p>
              <span className="cattipu-memory__actions">
                <button type="button" className={BUTTON} onClick={() => props.onEditRecord(record)}>Edit</button>
                <button type="button" className={BUTTON} onClick={() => props.onRemoveRecord(record.id)}>Delete</button>
              </span>
            </article>
          ))}
          <form
            className="cattipu-memory__editor"
            data-testid="memory-record-editor"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSaveRecord();
            }}
          >
            <span className="cattipu-memory__kinds" role="group" aria-label="Kind">
              {WRITABLE_MEMORY_RECORD_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={recordDraft.kind === kind}
                  className={`cattipu-memory__kind cattipu-focus--mechanical ${
                    recordDraft.kind === kind ? "cattipu-bevel--inset" : "cattipu-bevel--raised cattipu-bevel--pressable"
                  }`}
                  onClick={() => props.onRecordDraft({ ...recordDraft, kind })}
                >
                  {MEMORY_RECORD_LABEL[kind]}
                </button>
              ))}
            </span>
            <textarea
              className="cattipu-memory__field cattipu-bevel--inset"
              data-testid="memory-record-text"
              aria-label="Memory"
              rows={3}
              placeholder="Something true about this project."
              maxLength={MEMORY_LIMITS.maxRecordChars}
              value={recordDraft.text}
              onChange={(event) => props.onRecordDraft({ ...recordDraft, text: event.target.value })}
            />
            <span className="cattipu-memory__actions">
              <button type="submit" className={BUTTON} data-testid="memory-record-save" disabled={!recordDraft.text.trim()}>
                {recordDraft.id ? "Save" : "Add to memory"}
              </button>
              {recordDraft.id && (
                <button type="button" className={BUTTON} onClick={() => props.onRecordDraft(EMPTY_RECORD_DRAFT)}>Cancel</button>
              )}
              {props.recordError && <span className="cattipu-memory__error" role="alert">{props.recordError}</span>}
            </span>
          </form>
        </section>
      </div>

      <div className="cattipu-memory__status" data-testid="memory-status">
        <span>{`RECORDS ${String(records.length).padStart(2, "0")}`}</span>
        <span>{`PROMPTS ${String(prompts.length).padStart(2, "0")}`}</span>
        <span className="cattipu-memory__status-prompt">{`IN USE ${active ? active.name : "NONE"}`}</span>
        <span className="cattipu-memory__status-state">SAVED WITH PROJECT</span>
      </div>
    </div>
  );
}

/** Editor state for one project. Remounted per project (see MemoryApp),
 *  so a half-written entry never carries into another project. */
function ProjectMemoryEditor({ project }: { project: NonNullable<ReturnType<typeof activeProject>> }) {
  const addMemoryRecord = useProjectStore((s) => s.addMemoryRecord);
  const updateMemoryRecord = useProjectStore((s) => s.updateMemoryRecord);
  const removeMemoryRecord = useProjectStore((s) => s.removeMemoryRecord);
  const savePrompt = useProjectStore((s) => s.savePrompt);
  const removePrompt = useProjectStore((s) => s.removePrompt);
  const setActivePrompt = useProjectStore((s) => s.setActivePrompt);
  const [recordDraft, setRecordDraft] = useState<RecordDraft>(EMPTY_RECORD_DRAFT);
  const [promptDraft, setPromptDraft] = useState<PromptEditorDraft>(EMPTY_PROMPT_DRAFT);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const message = (reason: MemoryFailure) => memoryFailureMessage(reason);

  return (
    <MemoryView
      project={{ id: project.id, name: project.name }}
      records={project.memory.records}
      prompts={project.memory.prompts}
      activePromptId={project.memory.activePromptId}
      recordDraft={recordDraft}
      promptDraft={promptDraft}
      recordError={recordError}
      promptError={promptError}
      onRecordDraft={(draft) => {
        setRecordDraft(draft);
        setRecordError(null);
      }}
      onPromptDraft={(draft) => {
        setPromptDraft(draft);
        setPromptError(null);
      }}
      onSaveRecord={() => {
        const result = recordDraft.id
          ? updateMemoryRecord(project.id, recordDraft.id, { kind: recordDraft.kind, text: recordDraft.text })
          : addMemoryRecord(project.id, { kind: recordDraft.kind, text: recordDraft.text });
        if (!result.ok) return setRecordError(message(result.reason));
        setRecordDraft({ ...EMPTY_RECORD_DRAFT, kind: recordDraft.kind });
      }}
      onSavePrompt={() => {
        const result = savePrompt(project.id, {
          ...(promptDraft.id ? { id: promptDraft.id } : {}),
          name: promptDraft.name,
          content: promptDraft.content,
        });
        if (!result.ok) return setPromptError(message(result.reason));
        setPromptDraft(EMPTY_PROMPT_DRAFT);
      }}
      onEditRecord={(record) => setRecordDraft({ id: record.id, kind: record.kind, text: record.text })}
      onEditPrompt={(prompt) => setPromptDraft({ id: prompt.id, name: prompt.name, content: prompt.content })}
      onRemoveRecord={(id) => {
        removeMemoryRecord(project.id, id);
        if (recordDraft.id === id) setRecordDraft(EMPTY_RECORD_DRAFT);
      }}
      onRemovePrompt={(id) => {
        removePrompt(project.id, id);
        if (promptDraft.id === id) setPromptDraft(EMPTY_PROMPT_DRAFT);
      }}
      onUsePrompt={(id) => setActivePrompt(project.id, id)}
    />
  );
}

/** The window body: the active project's memory, through the project store. */
export function MemoryApp() {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(() => activeProject(projects), [projects]);
  if (!project) {
    return <MemoryView {...NO_PROJECT_PROPS} />;
  }
  return <ProjectMemoryEditor key={project.id} project={project} />;
}

const noop = () => {};
const NO_PROJECT_PROPS: MemoryViewProps = {
  project: null,
  records: [],
  prompts: [],
  activePromptId: null,
  recordDraft: EMPTY_RECORD_DRAFT,
  promptDraft: EMPTY_PROMPT_DRAFT,
  recordError: null,
  promptError: null,
  onRecordDraft: noop,
  onPromptDraft: noop,
  onSaveRecord: noop,
  onSavePrompt: noop,
  onEditRecord: noop,
  onEditPrompt: noop,
  onRemoveRecord: noop,
  onRemovePrompt: noop,
  onUsePrompt: noop,
};
