"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAgentPanel } from "./AgentPanelContext";
import { X, Terminal, Bot, Check, Copy, ChevronDown, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Code block with copy ────────────────────────────────────────────────────

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    if (codeRef.current) {
      navigator.clipboard.writeText(codeRef.current.textContent || "").then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  return (
    <div className="relative group my-2 border border-border bg-secondary/30 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/80">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Code</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
          {copied ? (<><Check className="w-3 h-3 text-chart-2" /><span className="text-chart-2">Copied</span></>) : (<><Copy className="w-3 h-3" /><span>Copy</span></>)}
        </button>
      </div>
      <div ref={codeRef} className={cn("p-3 text-[11px] font-mono text-foreground overflow-auto whitespace-pre-wrap bg-background/50", className)}>
        {children}
      </div>
    </div>
  );
}

const MarkdownComponents: any = {
  h1: ({ node, ...props }: any) => <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest mt-4 mb-2" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest mt-4 mb-2 border-b border-border pb-1" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-[11px] font-mono font-semibold text-primary mt-3 mb-1" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-relaxed my-1.5 text-muted-foreground" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) return <code className="bg-secondary/50 border border-border/50 px-1.5 py-0.5 text-[11px] font-mono rounded" {...props}>{children}</code>;
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre: ({ node, ...props }: any) => <pre className="m-0 p-0 bg-transparent" {...props} />,
};

// ─── File Content Viewer ───────────────────────────────────

function FileViewer({ file, progress }: { file: { filename: string; content: string; language: string; isStreaming: boolean }; progress: number }) {
  const displayedContent = file.content.slice(0, progress);
  const done = progress >= file.content.length;
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!done) bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [progress, done]);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-primary opacity-70" />
          <span className="text-[11px] font-mono text-foreground">{file.filename}</span>
          <span className="text-[9px] font-mono text-muted-foreground/50 uppercase">{file.language}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
          {copied ? (<><Check className="w-3 h-3 text-chart-2" /><span className="text-chart-2">Copied</span></>) : (<><Copy className="w-3 h-3" /><span>Copy</span></>)}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        <pre ref={codeRef} className="text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">
          {displayedContent}
          {!done && <span className="inline-block w-1.5 h-3.5 bg-primary/80 animate-pulse ml-1 align-middle" />}
        </pre>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}

// ─── Agent Content Viewer ────────────────────────────────────────────────────

function AgentViewer({ agent, progress }: { agent: { id: string; name: string; content: string }; progress: number }) {
  const displayedContent = agent.content.slice(0, progress);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progress < agent.content.length) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [progress, agent.content.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary opacity-70" />
          <span className="text-[11px] font-mono text-foreground uppercase tracking-wider">{agent.name}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl font-mono text-[11px] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
            {displayedContent}
          </ReactMarkdown>
          {progress < agent.content.length && (
            <span className="inline-block w-1.5 h-3.5 bg-primary/80 animate-pulse ml-1 align-middle" />
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

type ActiveView = { type: "agent"; id: string } | { type: "file"; index: number };

export default function AgentPanel() {
  const {
    agents, activeAgentId, isPanelOpen, setIsPanelOpen, setActiveAgentId,
    files, activeFileIndex, setActiveFileIndex,
  } = useAgentPanel();

  const [progress, setProgress] = useState<Record<string, number>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [isAgentsVisible, setIsAgentsVisible] = useState(true);
  const [isFilesVisible, setIsFilesVisible] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView | null>(null);

  const agentsRef = useRef(agents);
  const filesRef = useRef(files);

  useEffect(() => {
    agentsRef.current = agents;
    filesRef.current = files;
  }, [agents, files]);

  // Agent and File typewriter progress ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, agent] of Object.entries(agentsRef.current)) {
          const currentLen = next[id] || 0;
          if (currentLen < agent.content.length) {
            next[id] = Math.min(currentLen + 15, agent.content.length);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      // File typewriter ticker
      setFileProgress(prev => {
        let changed = false;
        const next = { ...prev };
        for (const file of filesRef.current) {
          const currentLen = next[file.filename] || 0;
          if (currentLen < file.content.length) {
            next[file.filename] = Math.min(currentLen + 18, file.content.length);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10);
    return () => clearInterval(interval);
  }, []);

  // Auto-switch active view when a file first arrives
  useEffect(() => {
    if (activeFileIndex !== null) {
      setActiveView({ type: "file", index: activeFileIndex });
    }
  }, [activeFileIndex]);

  // Default to first agent if no view selected
  useEffect(() => {
    if (!activeView && activeAgentId) {
      setActiveView({ type: "agent", id: activeAgentId });
    }
  }, [activeAgentId, activeView]);

  // Keep active view valid and visible when panel is opened/hydrated
  useEffect(() => {
    if (!isPanelOpen) return;

    const activeAgentExists =
      activeView?.type === "agent" ? Boolean(agents[activeView.id]) : false;
    const activeFileExists =
      activeView?.type === "file" ? Boolean(files[activeView.index]) : false;

    if (activeView && (activeAgentExists || activeFileExists)) return;

    if (files.length > 0) {
      const nextFileIndex = activeFileIndex ?? 0;
      setActiveFileIndex(nextFileIndex);
      setActiveView({ type: "file", index: nextFileIndex });
      return;
    }

    if (activeAgentId && agents[activeAgentId]) {
      setActiveView({ type: "agent", id: activeAgentId });
      return;
    }

    const firstAgent = Object.values(agents)[0];
    if (firstAgent) {
      setActiveAgentId(firstAgent.id);
      setActiveView({ type: "agent", id: firstAgent.id });
      return;
    }

    setActiveView(null);
  }, [isPanelOpen, activeView, files, agents, activeFileIndex, activeAgentId, setActiveAgentId, setActiveFileIndex]);

  const agentList = Object.values(agents);

  const renderContent = () => {
    if (!activeView) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground/40 font-mono text-xs">
          No active output
        </div>
      );
    }
    if (activeView.type === "file") {
      const file = files[activeView.index];
      if (!file) return null;
      return <FileViewer file={file} progress={fileProgress[file.filename] || 0} />;
    }
    if (activeView.type === "agent") {
      const agent = agents[activeView.id];
      if (!agent) return null;
      return <AgentViewer agent={agent} progress={progress[agent.id] || 0} />;
    }
    return null;
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-background/20 backdrop-blur-[1px] z-40 transition-opacity duration-300",
          isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsPanelOpen(false)}
      />

      <div className={cn(
        "fixed top-0 right-0 h-full w-1/2 bg-card border-l border-border shadow-2xl z-50 flex transition-transform duration-300 ease-in-out",
        isPanelOpen ? "translate-x-0" : "translate-x-full"
      )}>

        {/* ── Sidebar ── */}
        <div className="w-[200px] shrink-0 border-r border-border bg-background flex flex-col">

          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Bot className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono tracking-widest uppercase">Code Panel</span>
            </div>
            <button onClick={() => setIsPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── View Agents section ── */}
            <div className="border-b border-border/50">
              <button
                onClick={() => setIsAgentsVisible(!isAgentsVisible)}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-all duration-200 w-full text-left px-3 py-2.5 group"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tracking-widest uppercase flex-1 group-hover:tracking-[0.15em] transition-all duration-300">View Agents</span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-300 ease-in-out opacity-70",
                  isAgentsVisible ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isAgentsVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="p-2 space-y-1">
                    {agentList.map((agent) => {
                      const isActive = activeView?.type === "agent" && activeView.id === agent.id;
                      const isStreaming = (progress[agent.id] || 0) < agent.content.length;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => { setActiveView({ type: "agent", id: agent.id }); setActiveAgentId(agent.id); }}
                          className={cn(
                            "w-full flex flex-col text-left px-3 py-2 border rounded-md transition-all duration-200",
                            isActive ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center justify-between pointer-events-none">
                            <span className={cn("text-[10px] font-mono uppercase tracking-widest", isActive ? "text-primary" : "text-muted-foreground")}>
                              {agent.name}
                            </span>
                            <span className={cn("w-1.5 h-1.5 rounded-full", isStreaming ? "bg-chart-2 animate-pulse" : "bg-muted")} />
                          </div>
                        </button>
                      );
                    })}
                    {agentList.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/50 p-3 font-mono text-center">Waiting for agents...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-border/50">
              <button
                onClick={() => setIsFilesVisible(!isFilesVisible)}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-all duration-200 w-full text-left px-3 py-2.5 group"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tracking-widest uppercase flex-1 group-hover:tracking-[0.15em] transition-all duration-300">File Output</span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-300 ease-in-out opacity-70",
                  isFilesVisible ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isFilesVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="p-2 space-y-1">
                    {files.map((file, idx) => {
                      const isActive = activeView?.type === "file" && activeView.index === idx;
                      const isStreaming = (fileProgress[file.filename] || 0) < file.content.length;
                      return (
                        <button
                          key={file.filename}
                          onClick={() => { setActiveView({ type: "file", index: idx }); setActiveFileIndex(idx); }}
                          className={cn(
                            "w-full flex flex-col text-left px-3 py-2 border rounded-md transition-all duration-200",
                            isActive ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center justify-between pointer-events-none gap-1">
                            <span className={cn("text-[10px] font-mono truncate", isActive ? "text-primary" : "text-muted-foreground")}>
                              {file.filename}
                            </span>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isStreaming ? "bg-chart-2 animate-pulse" : "bg-chart-2/50")} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest pointer-events-none">
                            {file.language}
                          </span>
                        </button>
                      );
                    })}
                    {files.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/50 p-3 font-mono text-center">No files yet...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
