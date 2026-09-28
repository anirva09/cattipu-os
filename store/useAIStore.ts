import { create } from "zustand";

import type { AIError, AIMessage, AIService } from "@/lib/contracts/ai";
import type { CattipuProject } from "@/lib/project/types";
import { aiService } from "@/lib/services/ai/aiService";
import { memoryService } from "@/lib/services/memory/memoryService";
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
  };
});
