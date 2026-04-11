"use client";

import { create } from "zustand";
import { nanoid } from "@/lib/nanoid";

export type ChatMode = "standard" | "multi-agent" | "deep-research";

export interface ChatCodeAgentOutput {
  agent_id?: string;
  agent_name?: string;
  content?: string;
}

export interface ChatCodeFileOutput {
  filename?: string;
  language?: string;
  index?: number;
  total?: number;
  content?: string;
}

export interface ChatCodeCompleteMarker {
  type: "code_complete";
  file_count: number;
  filenames: string[];
}

export interface ChatMessagePreThinking {
  decomposition?: string;
  researcher1?: string;
  researcher2?: string;
  route_path?: string;
  problem_understanding?: string;
  approach?: string;
  agent_outputs?: ChatCodeAgentOutput[];
  file_outputs?: ChatCodeFileOutput[];
  final_marker?: ChatCodeCompleteMarker;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: ChatMode;
  timestamp: Date;
  processingIndicator?: string;
  meta?: {
    confidenceScore: number;
    reasoningDepth: number;
    retryCount: number;
    toolsUsed: string[];
    logicalConsistency?: number;
    criticFeedback?: string;
  };
  pdfs?: string[];
  conversationId?: string; // Backend conversation_id for this message pair
  preThinking?: ChatMessagePreThinking;
}

export interface ChatSession {
  id: string;
  title: string;
  description: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: Date;
  updatedAt: Date;
  backendConversationId?: string; // UUID from backend
}

export interface DebateMessage {
  id: string;
  role: "user" | "proposer" | "critic" | "verifier";
  content: string;
  round?: number;
  timestamp: Date;
  conversationId?: string; // Backend conversation_id
}

export interface DebateSessionState {
  topic: string;
  conversationId: string | null;
}

export type GraphNodeType = "deep_research" | "agent" | "critic" | "output" | "planner" | "coder" | "aggregator" | "reviewer";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  description: string;
  status: "pending" | "running" | "completed" | "error";
  timeTaken?: string;
  output?: string;
  toolsUsed?: string[];
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

interface AppState {
  activePage: string;
  setActivePage: (page: string) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  updateChatMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearChatMessages: () => void;
  selectedMode: ChatMode;
  setSelectedMode: (mode: ChatMode) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  currentIndicator: string;
  setCurrentIndicator: (v: string) => void;
  debateMessages: DebateMessage[];
  addDebateMessage: (msg: DebateMessage) => void;
  clearDebateMessages: () => void;
  debateSession: DebateSessionState;
  hydrateDebateSession: (payload: { topic: string; conversationId: string | null; messages: DebateMessage[] }) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  graphNodes: GraphNode[];
  setGraphNodes: (nodes: GraphNode[]) => void;
  graphEdges: GraphEdge[];
  setGraphEdges: (edges: GraphEdge[]) => void;
  clearGraphData: () => void;
  upsertGraphNode: (node: GraphNode) => void;
  chatSessions: ChatSession[];
  currentChatId: string | null;
  createChat: () => void;
  hydrateChatSession: (messages: ChatMessage[], mode: ChatMode, backendConversationId?: string | null) => void;
  deleteChat: (id: string) => void;
  setCurrentChat: (id: string | null) => void;
  updateChatSession: (id: string, updates: Partial<Pick<ChatSession, 'title' | 'description' | 'backendConversationId'>>) => void;
  clearAllChats: () => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
  // Backend conversation tracking
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  // Auth state
  userId: string | null;
  userDisplayName: string | null;
  authToken: string | null;
  setAuth: (token: string, userId: string, displayName: string | null) => void;
  clearAuth: () => void;
}

const loadChatSessions = (): ChatSession[] => {
  if (globalThis.window === undefined) return [];
  try {
    const saved = localStorage.getItem("agentrix_chat_history");
    if (saved) {
      const parsed = JSON.parse(saved) as ChatSession[];
      return parsed.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
      }));
    }
  } catch (e) {
    console.warn("Failed to load chat history from localStorage:", e);
  }
  return [];
};

export const useAppStore = create<AppState>((set, get) => ({
  activePage: "chat",
  setActivePage: (page) => set({ activePage: page }),
  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => {
      const newChatMessages = [...s.chatMessages, msg];

      // If no current chat session, auto-create one
      if (!s.currentChatId) {
        const id = nanoid();
        const now = new Date();
        const userFirstMsg = newChatMessages.find(m => m.role === "user");
        const title = userFirstMsg?.content ? userFirstMsg.content.slice(0, 50) : "New Chat";
        const newSession: ChatSession = {
          id,
          title,
          description: "Started conversation",
          messages: newChatMessages,
          mode: s.selectedMode,
          createdAt: now,
          updatedAt: now,
          backendConversationId: s.conversationId || undefined,
        };
        const updatedSessions = [...s.chatSessions, newSession];
        try {
          localStorage.setItem("agentrix_chat_history", JSON.stringify(updatedSessions));
        } catch (e) {
          console.warn("Failed to persist new chat session:", e);
        }
        return { chatMessages: newChatMessages, chatSessions: updatedSessions, currentChatId: id };
      }

      // Update existing session
      if (s.currentChatId) {
        const updatedSessions = s.chatSessions.map((session) =>
          session.id === s.currentChatId
            ? { 
                ...session, 
                messages: newChatMessages, 
                updatedAt: new Date(),
                backendConversationId: session.backendConversationId || s.conversationId || undefined
              }
            : session
        );
        try {
          localStorage.setItem("agentrix_chat_history", JSON.stringify(updatedSessions));
        } catch (e) {
          console.warn("Failed to persist chat history on addChatMessage:", e);
        }
        return { chatMessages: newChatMessages, chatSessions: updatedSessions };
      }

      return { chatMessages: newChatMessages };
    }),
  updateChatMessage: (id, patch) =>
    set((s) => {
      const newChatMessages = s.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m));
      if (s.currentChatId) {
        const updatedSessions = s.chatSessions.map((session) =>
          session.id === s.currentChatId
            ? { ...session, messages: newChatMessages, updatedAt: new Date() }
            : session
        );
        try {
          localStorage.setItem("agentrix_chat_history", JSON.stringify(updatedSessions));
        } catch (e) {
          console.warn("Failed to persist chat history on updateChatMessage:", e);
        }
        return { chatMessages: newChatMessages, chatSessions: updatedSessions };
      }
      return { chatMessages: newChatMessages };
    }),
  clearChatMessages: () => set({ chatMessages: [] }),
  selectedMode: "standard",
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  currentIndicator: "",
  setCurrentIndicator: (v) => set({ currentIndicator: v }),
  debateMessages: [],
  addDebateMessage: (msg) =>
    set((s) => ({ debateMessages: [...s.debateMessages, msg] })),
  clearDebateMessages: () => set({ debateMessages: [] }),
  debateSession: { topic: "", conversationId: null },
  hydrateDebateSession: ({ topic, conversationId, messages }) =>
    set({ debateSession: { topic, conversationId }, debateMessages: messages }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  graphNodes: [],
  setGraphNodes: (nodes) => set({ graphNodes: nodes }),
  graphEdges: [],
  setGraphEdges: (edges) => set({ graphEdges: edges }),
  clearGraphData: () => set({ graphNodes: [], graphEdges: [] }),
  upsertGraphNode: (node) => set((s) => {
    const idx = s.graphNodes.findIndex(n => n.id === node.id);
    if (idx >= 0) {
      const updated = [...s.graphNodes];
      updated[idx] = { ...updated[idx], ...node };
      return { graphNodes: updated };
    }
    return { graphNodes: [...s.graphNodes, node] };
  }),
  chatSessions: loadChatSessions(),
  currentChatId: null,
  createChat: () => {
    const { selectedMode, chatSessions } = get();
    const id = nanoid();
    const now = new Date();
    const newSession: ChatSession = {
      id,
      title: "New Chat",
      description: "No messages yet",
      messages: [],
      mode: selectedMode,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...chatSessions, newSession];
    set({ chatSessions: updated, currentChatId: id, chatMessages: [], conversationId: null });
    try {
      localStorage.setItem("agentrix_chat_history", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to create new chat:", e);
    }
  },
  hydrateChatSession: (messages, mode, backendConversationId) => {
    set((state) => {
      const existingIndex =
        backendConversationId
          ? state.chatSessions.findIndex((session) => session.backendConversationId === backendConversationId)
          : -1;
      const id = existingIndex >= 0 ? state.chatSessions[existingIndex].id : nanoid();
      const now = new Date();
      const userFirstMsg = messages.find((m) => m.role === "user");
      const title = userFirstMsg?.content ? userFirstMsg.content.slice(0, 50) : "History Replay";
      const newSession: ChatSession = {
        id,
        title,
        description: "Loaded from history",
        messages,
        mode,
        createdAt: now,
        updatedAt: now,
        backendConversationId: backendConversationId || undefined,
      };
      const updatedSessions =
        existingIndex >= 0
          ? state.chatSessions.map((session, index) => (index === existingIndex ? newSession : session))
          : [...state.chatSessions, newSession];
      try {
        localStorage.setItem("agentrix_chat_history", JSON.stringify(updatedSessions));
      } catch (e) {
        console.warn("Failed to persist history replay session:", e);
      }
      return {
        chatMessages: messages,
        chatSessions: updatedSessions,
        currentChatId: id,
        selectedMode: mode,
        conversationId: backendConversationId || null,
      };
    });
  },
  deleteChat: (id) => {
    set((state) => {
      const updated = state.chatSessions.filter((s) => s.id !== id);
      try {
        localStorage.setItem("agentrix_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to delete chat from localStorage:", e);
      }
      const newCurrentId = state.currentChatId === id ? null : state.currentChatId;
      const newMessages = state.currentChatId === id ? [] : state.chatMessages;
      const newConvId = state.currentChatId === id ? null : state.conversationId;
      return { chatSessions: updated, currentChatId: newCurrentId, chatMessages: newMessages, conversationId: newConvId };
    });
  },
  setCurrentChat: (id) => {
    const { chatSessions } = get();
    if (id === null) {
      set({ currentChatId: null, chatMessages: [], selectedMode: "standard", conversationId: null });
      return;
    }
    const session = chatSessions.find((s) => s.id === id);
    if (session) {
      set({
        currentChatId: id,
        chatMessages: session.messages,
        selectedMode: session.mode,
        conversationId: session.backendConversationId || null,
      });
    }
  },
  updateChatSession: (id, updates) => {
    set((state) => {
      const updated = state.chatSessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      );
      try {
        localStorage.setItem("agentrix_chat_history", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to update chat in localStorage:", e);
      }
      return { chatSessions: updated };
    });
  },
  clearAllChats: () => {
    set({ chatSessions: [], currentChatId: null, chatMessages: [] });
    try {
      localStorage.removeItem("agentrix_chat_history");
    } catch (e) {
      console.warn("Failed to clear chat history from localStorage:", e);
    }
  },
  isHistoryOpen: false,
  setIsHistoryOpen: (v) => set({ isHistoryOpen: v }),
  // Backend conversation tracking
  conversationId: null,
  setConversationId: (id) => set((state) => {
    // Also persist conversation ID to the current chat session if it exists
    if (state.currentChatId && id) {
      const updatedSessions = state.chatSessions.map((session) =>
        session.id === state.currentChatId
          ? { ...session, backendConversationId: id, updatedAt: new Date() }
          : session
      );
      try {
        localStorage.setItem("agentrix_chat_history", JSON.stringify(updatedSessions));
      } catch (e) {
        console.warn("Failed to persist conversation ID to chat session:", e);
      }
      return { conversationId: id, chatSessions: updatedSessions };
    }
    return { conversationId: id };
  }),
  // Auth state
  userId: typeof window !== "undefined" ? localStorage.getItem("agentrix_user_id") : null,
  userDisplayName: typeof window !== "undefined" ? localStorage.getItem("agentrix_display_name") : null,
  authToken: typeof window !== "undefined" ? localStorage.getItem("agentrix_token") : null,
  setAuth: (token, userId, displayName) => {
    localStorage.setItem("agentrix_token", token);
    localStorage.setItem("agentrix_user_id", userId);
    if (displayName) localStorage.setItem("agentrix_display_name", displayName);
    set({ authToken: token, userId, userDisplayName: displayName });
  },
  clearAuth: () => {
    localStorage.removeItem("agentrix_token");
    localStorage.removeItem("agentrix_user_id");
    localStorage.removeItem("agentrix_display_name");
    localStorage.removeItem("agentrix_auth");
    set({ authToken: null, userId: null, userDisplayName: null });
  },
}));
