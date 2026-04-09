"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AgentData {
  id: string;
  name: string;
  content: string;
}

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  isStreaming: boolean;
}

interface AgentPanelContextType {
  // Agent outputs
  agents: Record<string, AgentData>;
  activeAgentId: string | null;
  upsertAgentData: (id: string, name: string, content: string) => void;
  setActiveAgentId: (id: string | null) => void;
  clearAgents: () => void;
  // Panel state
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
  // File outputs
  files: CodeFile[];
  activeFileIndex: number | null;
  upsertFileData: (filename: string, content: string, language: string, isStreaming: boolean) => void;
  setActiveFileIndex: (index: number | null) => void;
  clearFiles: () => void;
}

const AgentPanelContext = createContext<AgentPanelContextType | undefined>(undefined);

export function AgentPanelProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Record<string, AgentData>>({});
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);

  const upsertAgentData = (id: string, name: string, content: string) => {
    setAgents(prev => {
      return {
        ...prev,
        [id]: { id, name, content }
      };
    });
    setActiveAgentId(prevId => {
      if (!prevId) return id;
      return prevId;
    });
    setIsPanelOpen(true);
  };

  const upsertFileData = (filename: string, content: string, language: string, isStreaming: boolean) => {
    setFiles(prev => {
      const existingIndex = prev.findIndex(f => f.filename === filename);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { filename, content, language, isStreaming };
        return updated;
      }
      return [...prev, { filename, content, language, isStreaming }];
    });
    // Auto-focus the new/updated file
    setFiles(prev => {
      const idx = prev.findIndex(f => f.filename === filename);
      if (idx >= 0) setActiveFileIndex(idx);
      return prev;
    });
    setIsPanelOpen(true);
  };

  const clearAgents = () => {
    setAgents({});
    setActiveAgentId(null);
    setIsPanelOpen(false);
  };

  const clearFiles = () => {
    setFiles([]);
    setActiveFileIndex(null);
  };

  return (
    <AgentPanelContext.Provider value={{
      agents, activeAgentId, isPanelOpen,
      upsertAgentData, setActiveAgentId, setIsPanelOpen, clearAgents,
      files, activeFileIndex, upsertFileData, setActiveFileIndex, clearFiles,
    }}>
      {children}
    </AgentPanelContext.Provider>
  );
}

export function useAgentPanel() {
  const context = useContext(AgentPanelContext);
  if (!context) {
    throw new Error("useAgentPanel must be used within an AgentPanelProvider");
  }
  return context;
}
