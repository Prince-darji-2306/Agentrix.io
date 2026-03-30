"use client";

import { create } from "zustand";
import { nanoid } from "@/lib/nanoid";

export type ChatMode = "standard" | "multi-agent" | "deep-research";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: ChatMode;
  timestamp: Date;
  systemIndicators?: string[];
  processingIndicator?: string;
  meta?: {
    confidenceScore: number;
    reasoningDepth: number;
    retryCount: number;
    toolsUsed: string[];
    logicalConsistency?: number;
    criticFeedback?: string;
  };
  conversationId?: string; // Backend conversation_id for this message pair
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

export type GraphNodeType = "orchestrator" | "agent" | "critic" | "output" | "planner" | "coder" | "aggregator" | "reviewer";

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
  setConversationId: (id) => set({ conversationId: id }),
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
