import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  streamingContent: string;
  error: string | null;

  createConversation: () => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  clearMessages: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;
  setError: (error: string | null) => void;
  getCurrentConversation: () => Conversation | null;
  getCurrentMessages: () => Message[];
  generateTitle: (content: string) => string;
}

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      streamingContent: "",
      error: null,

      createConversation: () => {
        const id = generateId();
        const newConversation: Conversation = {
          id,
          title: "新对话",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newCurrentId =
            state.currentConversationId === id
              ? newConversations[0]?.id || null
              : state.currentConversationId;

          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
          };
        });
      },

      selectConversation: (id: string) => {
        set({ currentConversationId: id });
      },

      renameConversation: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }));
      },

      addMessage: (conversationId: string, message: Message) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;

            const updatedConv = {
              ...c,
              messages: [...c.messages, message],
              updatedAt: new Date(),
            };

            if (c.messages.length === 0 && message.role === "user") {
              updatedConv.title = get().generateTitle(message.content);
            }

            return updatedConv;
          }),
        }));
      },

      updateLastAssistantMessage: (conversationId: string, content: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;

            const messages = [...c.messages];
            const lastIndex = messages.length - 1;

            if (lastIndex >= 0 && messages[lastIndex].role === "assistant") {
              messages[lastIndex] = {
                ...messages[lastIndex],
                content,
              };
            }

            return { ...c, messages, updatedAt: new Date() };
          }),
        }));
      },

      clearMessages: (conversationId: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [], title: "新对话", updatedAt: new Date() }
              : c
          ),
        }));
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setStreamingContent: (content: string) => set({ streamingContent: content }),

      appendStreamingContent: (content: string) => {
        set((state) => ({
          streamingContent: state.streamingContent + content,
        }));
      },

      clearStreamingContent: () => set({ streamingContent: "" }),

      setError: (error: string | null) => set({ error }),

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return conversations.find((c) => c.id === currentConversationId) || null;
      },

      getCurrentMessages: () => {
        const conversation = get().getCurrentConversation();
        return conversation?.messages || [];
      },

      generateTitle: (content: string) => {
        const maxLength = 20;
        const cleaned = content.replace(/\n/g, " ").trim();
        if (cleaned.length <= maxLength) return cleaned;
        return cleaned.slice(0, maxLength) + "...";
      },
    }),
    {
      name: "ai-cli-chat",
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
