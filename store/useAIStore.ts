import { create } from "zustand";

import type { AIError, AIMessage, AIService } from "@/lib/contracts/ai";
import type { ApplyFileWritesResult, FileWriteFailure, ProjectFilesContext } from "@/lib/contracts/filesystem";
import { workspaceForProject } from "@/lib/os/filesystem";
import type { CattipuProject } from "@/lib/project/types";
import { aiService } from "@/lib/services/ai/aiService";
import { projectFileService } from "@/lib/services/filesystem/projectFileService";
import { memoryService } from "@/lib/services/memory/memoryService";
import { useFilesystemStore } from "@/store/useFilesystemStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useProjectStore } from "@/store/useProjectStore";

/**
 * The AI console's in-flight state, one entry per project.
 *
 * MVP-04 kept whole conversations here, in memory. MVP-05 moves them to
 * their owner: every turn is filed in the project's memory
 * (`project.memory.conversations`, persisted with the project), so a reload
 * restores it and another project never sees it. What stays here is only
 * what must NOT survive a reload — whether a request is in flight and the
 * last error — so this store is still not persisted.
 *
 * Keyed by project id: a reply is filed under the project (and the
 * conversation) that asked, even if the person has switched projects while
 * it was in flight.
 *
 * MVP-06: a request carries the project's files (from the filesystem, the
 * files' owner), and a reply's file proposals are filed with the turn.
 * `applyProposal` is the only path from a proposal to the filesystem, and
 * it runs only when the person presses Apply.
 */

export type AIConversationStatus = "idle" | "sending";

export interface AISession {
  status: AIConversationStatus;
  error: AIError | null;
}

/** What the console renders: the persisted turns plus the live state. */
export interface AIConversation extends AISession {
  messages: AIMessage[];
}

export const IDLE_SESSION: AISession = Object.freeze({ status: "idle", error: null }) as AISession;

export const EMPTY_CONVERSATION: AIConversation = Object.freeze({
  messages: [],
  status: "idle",
  error: null,
}) as AIConversation;

/** The console's conversation for a project: its persisted turns and its
 *  session. Messages are never shared between projects — they are read
 *  from the project in hand only. */
export function conversationFor(project: CattipuProject, session: AISession | undefined): AIConversation {
  const conversation = memoryService.activeConversation(project);
  return { ...(session ?? IDLE_SESSION), messages: conversation?.messages ?? [] };
}

interface AIState {
  sessions: Record<string, AISession>;
  send: (projectId: string, text: string, service?: AIService) => Promise<void>;
  clear: (projectId: string) => void;
  /** Writes one assistant turn's proposed files into the project's
   *  workspace, reports the outcome, and points the filesystem selection at
   *  the folder of the first file so Explorer opens where they are. */
  applyProposal: (projectId: string, messageId: string) => ApplyFileWritesResult;
}

const FAILURE_TEXT: Record<FileWriteFailure, string> = {
  "no-workspace": "The project has no workspace folder to write into.",
  "invalid-path": "A proposed path is not a valid workspace path.",
  "too-many": "The proposal names too many files.",
  "too-long": "A proposed file is too large.",
  "path-conflict": "A proposed path runs through a file, or names a folder as a file.",
  "not-found": "That proposal is no longer in this project's conversation.",
};

/** The project's files as request data; none when it has no workspace. */
function filesContextFor(projectId: string): ProjectFilesContext | undefined {
  const objects = useFilesystemStore.getState().objects;
  const workspace = workspaceForProject(objects, projectId);
  return workspace ? projectFileService.contextFor(objects, workspace.id, projectId) : undefined;
}

let seq = 0;
const nextId = () => `message-${Date.now().toString(36)}-${(seq += 1)}-${Math.random().toString(36).slice(2, 8)}`;

export const useAIStore = create<AIState>()((set, get) => {
  const setSession = (projectId: string, session: AISession) =>
    set((s) => ({ sessions: { ...s.sessions, [projectId]: session } }));

  return {
    sessions: {},

    send: async (projectId, text, service = aiService) => {
      const prompt = text.trim();
      if (!prompt || get().sessions[projectId]?.status === "sending") return;

      const projects = useProjectStore.getState();
      const userTurn: AIMessage = { id: nextId(), role: "user", text: prompt, createdAt: new Date().toISOString() };
      const filed = projects.appendConversationMessage(projectId, userTurn);
      if (!filed.ok) return;
      const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return;
      setSession(projectId, { status: "sending", error: null });

      // The turns and the memory are data. The server turns the memory into
      // provider context; nothing here writes a system prompt.
      const result = await service.send({
        projectId,
        projectName: project.name,
        messages: memoryService.history(filed.value),
        memory: memoryService.contextFor(project),
        files: filesContextFor(projectId),
      });

      if (result.ok) {
        useProjectStore.getState().appendConversationMessage(
          projectId,
          {
            id: nextId(),
            role: "assistant",
            text: result.response.text,
            createdAt: new Date().toISOString(),
            providerId: result.response.providerId,
            model: result.response.model,
            ...(result.response.fileChanges?.length ? { fileChanges: result.response.fileChanges } : {}),
          },
          filed.value.id,
        );
      }
      setSession(projectId, { status: "idle", error: result.ok ? null : result.error });
    },

    clear: (projectId) => {
      if (get().sessions[projectId]?.status === "sending") return;
      useProjectStore.getState().clearConversation(projectId);
      set((s) => {
        const next = { ...s.sessions };
        delete next[projectId];
        return { sessions: next };
      });
    },

    applyProposal: (projectId, messageId) => {
      const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
      const message = project?.memory.conversations
        .flatMap((c) => (c.projectId === projectId ? c.messages : []))
        .find((m) => m.id === messageId);
      const writes = message?.role === "assistant" ? message.fileChanges ?? [] : [];
      if (!project || writes.length === 0) return { ok: false, reason: "not-found" };

      const filesystem = useFilesystemStore.getState();
      const result = filesystem.applyFileWrites(projectId, writes);
      const notify = useNotificationStore.getState().push;
      if (!result.ok) {
        notify("error", "Files not written", { message: FAILURE_TEXT[result.reason] });
        return result;
      }
      const first = result.objects.find((o) => o.id === result.fileIds[0]);
      if (first?.parentId) filesystem.selectObject(first.parentId);
      const changed = result.written.filter((w) => w.status !== "unchanged").length;
      notify("success", `${changed} ${changed === 1 ? "file" : "files"} written`, {
        message: `${project.name}: ${result.written.map((w) => w.path).join(", ")}`,
      });
      return result;
    },
  };
});
