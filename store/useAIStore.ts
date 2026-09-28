import { create } from "zustand";

import type { AIError, AIMessage, AIService } from "@/lib/contracts/ai";
import { aiService } from "@/lib/services/ai/aiService";

/**
 * MVP-04 — the AI console's conversations, one per project.
 *
 * Keyed by project id, so there is no global conversation to leak: a reply
 * is filed under the project that asked, even if the person has switched
 * projects while it was in flight.
 *
 * Deliberately NOT persisted. Long-lived AI context belongs to Project
 * Memory (PROJECT_CONSTITUTION §14, MVP-05); storing transcripts here would
 * create a second owner for it. A reload starts each console empty.
 */

export type AIConversationStatus = "idle" | "sending";

export interface AIConversation {
  messages: AIMessage[];
  status: AIConversationStatus;
  error: AIError | null;
}

export const EMPTY_CONVERSATION: AIConversation = Object.freeze({
  messages: [],
  status: "idle",
  error: null,
}) as AIConversation;

interface AIState {
  conversations: Record<string, AIConversation>;
  send: (project: { id: string; name: string }, text: string, service?: AIService) => Promise<void>;
  clear: (projectId: string) => void;
}

let seq = 0;
const nextId = () => `ai-${Date.now().toString(36)}-${(seq += 1)}`;

export const useAIStore = create<AIState>()((set, get) => {
  const update = (projectId: string, patch: (c: AIConversation) => AIConversation) =>
    set((s) => ({
      conversations: {
        ...s.conversations,
        [projectId]: patch(s.conversations[projectId] ?? EMPTY_CONVERSATION),
      },
    }));

  return {
    conversations: {},

    send: async (project, text, service = aiService) => {
      const prompt = text.trim();
      const current = get().conversations[project.id] ?? EMPTY_CONVERSATION;
      if (!prompt || current.status === "sending") return;

      const userTurn: AIMessage = { id: nextId(), role: "user", text: prompt, createdAt: new Date().toISOString() };
      const history = [...current.messages, userTurn];
      update(project.id, (c) => ({ ...c, messages: [...c.messages, userTurn], status: "sending", error: null }));

      const result = await service.send({
        projectId: project.id,
        projectName: project.name,
        messages: history.map(({ role, text: body }) => ({ role, text: body })),
      });

      update(project.id, (c) =>
        result.ok
          ? {
              ...c,
              status: "idle",
              error: null,
              messages: [
                ...c.messages,
                {
                  id: nextId(),
                  role: "assistant",
                  text: result.response.text,
                  createdAt: new Date().toISOString(),
                  providerId: result.response.providerId,
                  model: result.response.model,
                },
              ],
            }
          : { ...c, status: "idle", error: result.error },
      );
    },

    clear: (projectId) =>
      set((s) => {
        if (s.conversations[projectId]?.status === "sending") return s;
        const next = { ...s.conversations };
        delete next[projectId];
        return { conversations: next };
      }),
  };
});
