"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronRight,
  Terminal,
  Code,
  Layers,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Agent Config ─────────────────────────────────────────────────────────────

interface AgentConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  nodeType: string;
}

const AGENT_CONFIG: AgentConfig[] = [
  {
    id: "code_planner",
    label: "Code Planner",
    icon: <Layers className="w-3.5 h-3.5" />,
    nodeType: "planner",
  },
  {
    id: "coder_1",
    label: "Coding Agent 1",
    icon: <Terminal className="w-3.5 h-3.5" />,
    nodeType: "coder",
  },
  {
    id: "coder_2",
    label: "Coding Agent 2",
    icon: <Terminal className="w-3.5 h-3.5" />,
    nodeType: "coder",
  },
  {
    id: "coder_3",
    label: "Coding Agent 3",
    icon: <Terminal className="w-3.5 h-3.5" />,
    nodeType: "coder",
  },
  {
    id: "code_aggregator",
    label: "Code Aggregator",
    icon: <GitMerge className="w-3.5 h-3.5" />,
    nodeType: "aggregator",
  },
  {
    id: "code_reviewer",
    label: "Code Reviewer",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    nodeType: "reviewer",
  },
  {
    id: "output",
    label: "Final Output",
    icon: <Code className="w-3.5 h-3.5" />,
    nodeType: "output",
  },
];

// ─── Typing Animation Hook ────────────────────────────────────────────────────

function usePseudoStream(
  fullText: string,
  charsPerTick: number = 16,
  intervalMs: number = 2
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (!fullText) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    // New, longer text arrived — reset and re-animate from beginning
    if (fullText !== prevTextRef.current) {
      prevTextRef.current = fullText;
      indexRef.current = 0;
      setDisplayedText("");
      setIsComplete(false);

      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        indexRef.current += charsPerTick;
        if (indexRef.current >= fullText.length) {
          setDisplayedText(fullText);
          setIsComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setDisplayedText(fullText.slice(0, indexRef.current));
        }
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fullText, charsPerTick, intervalMs]);

  return { displayedText: isComplete ? fullText : displayedText, isComplete };
}

// ─── Code Block subcomponent (with copy button) ───────────────────────────────

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    if (codeRef.current) {
      const text = codeRef.current.textContent || "";
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  return (
    <div className="relative group my-1">
      <div className="flex items-center justify-between bg-secondary/80 border border-border px-3 py-1.5">
        <span className="text-[8px] font-mono tracking-widest text-muted-foreground/60 uppercase">
          Code
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-chart-2" />
              <span className="text-chart-2">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div
        ref={codeRef}
        className={cn(
          "bg-secondary border border-t-0 border-border p-2 text-[10px] text-chart-1 font-mono overflow-x-auto whitespace-pre-wrap",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

const MarkdownComponents: any = {
  h1: ({ node, ...props }: any) => (
    <h1
      className="text-sm font-mono font-bold text-foreground uppercase tracking-widest mt-2 mb-1"
      {...props}
    />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      className="text-xs font-mono font-bold text-foreground uppercase tracking-widest mt-3 mb-1 border-b border-border pb-1"
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="text-[11px] font-mono font-semibold text-primary mt-2 mb-0.5"
      {...props}
    />
  ),
  hr: ({ node, ...props }: any) => (
    <hr className="border-border my-2" {...props} />
  ),
  p: ({ node, ...props }: any) => (
    <p className="leading-relaxed my-0.5" {...props} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic text-muted-foreground" {...props} />
  ),
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="bg-secondary border border-border px-1 py-0.5 text-[10px] text-chart-1 font-mono rounded-none"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre: ({ node, ...props }: any) => (
    <pre className="m-0 p-0 bg-transparent" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="list-none my-1 space-y-0.5" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol
      className="list-decimal list-inside my-1 space-y-0.5 font-semibold text-muted-foreground"
      {...props}
    />
  ),
  li: ({ node, ...props }: any) => (
    <li className="font-normal text-foreground leading-relaxed flex gap-2">
      <span className="text-primary shrink-0 opacity-50">·</span>
      <span className="flex-1">{props.children}</span>
    </li>
  ),
};

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse shrink-0" />
    );
  }
  if (status === "completed") {
    return <span className="w-1.5 h-1.5 rounded-full bg-chart-2 shrink-0" />;
  }
  if (status === "error") {
    return <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />;
  }
  // pending
  return (
    <span className="w-1.5 h-1.5 rounded-full border border-muted-foreground/30 shrink-0" />
  );
}

// ─── Agent Output Pane ────────────────────────────────────────────────────────

function AgentOutputPane({
  agentId,
  output,
  status,
  label,
}: {
  agentId: string;
  output: string;
  status: string;
  label: string;
}) {
  const { displayedText, isComplete } = usePseudoStream(output, 18, 1);

  const isEmpty = !output;
  const isRunning = status === "running";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 bg-card/50">
        <StatusDot status={status} />
        <span className="text-[10px] font-mono tracking-widest text-foreground uppercase flex-1">
          {label}
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-chart-3 animate-spin" />
            <span className="text-[9px] font-mono text-chart-3 tracking-widest uppercase">
              Running
            </span>
          </div>
        )}
        {status === "completed" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-chart-2 tracking-widest uppercase">
              Done
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty && isRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              Generating…
            </span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="w-1.5 h-1.5 rounded-full border border-muted-foreground/30" />
            <span className="text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase">
              Not yet started
            </span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-foreground leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {displayedText}
            </ReactMarkdown>
            {/* Typing cursor while pseudo-streaming */}
            {!isComplete && (
              <span className="inline-block w-1.5 h-3 bg-primary/70 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main CodingPanel Component ───────────────────────────────────────────────

export default function CodingPanel() {
  const {
    codingPanelOpen,
    setCodingPanelOpen,
    selectedCodingAgentId,
    setSelectedCodingAgentId,
    graphNodes,
    isGenerating,
  } = useAppStore();

  // When panel opens, auto-select first completed/running coder; fallback to first
  useEffect(() => {
    if (codingPanelOpen && !selectedCodingAgentId) {
      const firstActive = AGENT_CONFIG.find((a) => {
        const node = graphNodes.find((n) => n.id === a.id);
        return (
          node && (node.status === "completed" || node.status === "running")
        );
      });
      setSelectedCodingAgentId(
        firstActive ? firstActive.id : AGENT_CONFIG[0].id
      );
    }
  }, [codingPanelOpen, graphNodes, selectedCodingAgentId, setSelectedCodingAgentId]);

  // Auto-select the most recently updated active agent
  useEffect(() => {
    if (!codingPanelOpen) return;
    const running = AGENT_CONFIG.find((a) => {
      const node = graphNodes.find((n) => n.id === a.id);
      return node?.status === "running";
    });
    if (running) {
      setSelectedCodingAgentId(running.id);
    }
  }, [graphNodes, codingPanelOpen, setSelectedCodingAgentId]);

  if (!codingPanelOpen) return null;

  const selectedNode = graphNodes.find((n) => n.id === selectedCodingAgentId);
  const selectedAgentConfig = AGENT_CONFIG.find(
    (a) => a.id === selectedCodingAgentId
  );

  return (
    <>
      {/* Backdrop overlay (subtle) */}
      <div
        className="fixed inset-0 z-40 bg-background/20 backdrop-blur-[1px]"
        onClick={() => setCodingPanelOpen(false)}
      />

      {/* Panel: occupies right half of the screen as a slide-in overlay */}
      <div
        className={cn(
          "fixed top-0 right-0 h-screen z-50 flex shadow-2xl",
          "w-1/2 min-w-[600px] max-w-[900px]",
          "border-l border-border bg-background",
          // Slide-in animation via Tailwind animate (or inline style)
          "animate-in slide-in-from-right duration-300 ease-out"
        )}
      >
        {/* ── LEFT SIDEBAR: Agent List ─────────────────────────────────── */}
        <div className="w-52 shrink-0 flex flex-col border-r border-border bg-card/30">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-mono tracking-widest text-foreground uppercase">
                Agents
              </span>
            </div>
            <button
              onClick={() => setCodingPanelOpen(false)}
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              title="Close panel"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto py-2">
            {AGENT_CONFIG.map((agent) => {
              const node = graphNodes.find((n) => n.id === agent.id);
              const status = node?.status ?? "pending";
              const isSelected = selectedCodingAgentId === agent.id;
              const hasOutput = !!node?.output;

              return (
                <button
                  key={agent.id}
                  id={`coding-agent-btn-${agent.id}`}
                  onClick={() => setSelectedCodingAgentId(agent.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150",
                    "border-l-2 group relative",
                    isSelected
                      ? "border-l-primary bg-primary/8 text-foreground"
                      : "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {/* Status indicator */}
                  <StatusDot status={status} />

                  {/* Icon */}
                  <span
                    className={cn(
                      "shrink-0 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {agent.icon}
                  </span>

                  {/* Label */}
                  <span className="text-[11px] font-mono flex-1 leading-snug">
                    {agent.label}
                  </span>

                  {/* Active chevron */}
                  {isSelected && (
                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  )}

                  {/* Running pulse */}
                  {status === "running" && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-chart-3 animate-ping shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: generation status */}
          <div className="px-3 py-2 border-t border-border">
            {isGenerating ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-mono text-primary tracking-widest uppercase">
                  Pipeline running
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                <span className="text-[9px] font-mono text-chart-2 tracking-widest uppercase">
                  Complete
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Output Content ───────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/20 shrink-0">
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase">
              Output
            </span>
            <span className="text-muted-foreground/30 text-[9px]">/</span>
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
              {selectedAgentConfig?.label ?? "—"}
            </span>
            {/* Running ping indicator */}
            {selectedNode?.status === "running" && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-ping" />
                <span className="text-[9px] font-mono text-chart-3 tracking-widest uppercase">
                  Live
                </span>
              </span>
            )}
          </div>

          {/* Agent content pane */}
          {selectedCodingAgentId ? (
            <AgentOutputPane
              key={selectedCodingAgentId}
              agentId={selectedCodingAgentId}
              output={selectedNode?.output ?? ""}
              status={selectedNode?.status ?? "pending"}
              label={selectedAgentConfig?.label ?? selectedCodingAgentId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase">
                Select an agent to view output
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
