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
}

export interface ChatSession {
  id: string;
  title: string;
  description: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebateMessage {
  id: string;
  role: "user" | "proposer" | "critic" | "verifier";
  content: string;
  round?: number;
  timestamp: Date;
}

export type GraphNodeType = "orchestrator" | "agent" | "critic" | "output";

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
  chatSessions: ChatSession[];
  currentChatId: string | null;
  createChat: () => void;
  deleteChat: (id: string) => void;
  setCurrentChat: (id: string | null) => void;
  updateChatSession: (id: string, updates: Partial<Pick<ChatSession, 'title' | 'description'>>) => void;
  clearAllChats: () => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
}

const loadChatSessions = (): ChatSession[] => {
  if (typeof window === "undefined") return [];
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
            ? { ...session, messages: newChatMessages, updatedAt: new Date() }
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
    set({ chatSessions: updated, currentChatId: id, chatMessages: [] });
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
      return { chatSessions: updated, currentChatId: newCurrentId, chatMessages: newMessages };
    });
  },
  setCurrentChat: (id) => {
    const { chatSessions } = get();
    if (id === null) {
      set({ currentChatId: null, chatMessages: [], selectedMode: "standard" });
      return;
    }
    const session = chatSessions.find((s) => s.id === id);
    if (session) {
      set({
        currentChatId: id,
        chatMessages: session.messages,
        selectedMode: session.mode,
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
      if (state.currentChatId === id && updates.messages) {
        return { chatSessions: updated, chatMessages: updates.messages };
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
}));
