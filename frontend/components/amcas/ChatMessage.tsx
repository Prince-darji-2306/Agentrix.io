"use client";

import React, { useState, useCallback } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/store";
import ConfidenceBar from "./ConfidenceBar";
import { ChevronDown, ChevronUp, Wrench, RotateCcw, Layers, CheckCircle2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

const MODE_LABELS: Record<string, { short: string; color: string }> = {
  standard:       { short: "STD",  color: "text-muted-foreground border-border" },
  "multi-agent":  { short: "MAS",  color: "text-chart-1 border-chart-1/40" },
  "deep-research":{ short: "DRS",  color: "text-chart-2 border-chart-2/40" },
};

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Code block with copy button
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
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
        <span className="text-[8px] font-mono tracking-widest text-muted-foreground/60 uppercase">Code</span>
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
          "bg-secondary border border-t-0 border-border p-2 text-[10px] text-chart-1 font-mono overflow-auto whitespace-pre-wrap",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Make the text match the old style but parsed robustly
const MarkdownComponents: any = {
  h1: ({ node, ...props }: any) => <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest mt-2 mb-1" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest mt-3 mb-1 border-b border-border pb-1" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-[11px] font-mono font-semibold text-primary mt-2 mb-0.5" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="border-border my-2" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-relaxed my-0.5" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic text-muted-foreground" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return <code className="bg-secondary border border-border px-1 py-0.5 text-[10px] text-chart-1 font-mono rounded-none" {...props}>{children}</code>;
    }
    // Block code - wrap in CodeBlock with copy button
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre: ({ node, ...props }: any) => <pre className="m-0 p-0 bg-transparent" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-none my-1 space-y-0.5" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside my-1 space-y-0.5 font-semibold text-muted-foreground" {...props} />,
  li: ({ node, ...props }: any) => {
    // If it's an ordered list, it uses decimals automatically via Tailwind list-decimal.
    // If it's unordered, we can prepend our bullet.
    return (
      <li className="font-normal text-foreground leading-relaxed flex gap-2">
        <span className="text-primary shrink-0 opacity-50">·</span>
        <span className="flex-1">{props.children}</span>
      </li>
    );
  },
  table: ({ node, ...props }: any) => <div className="overflow-x-auto my-2"><table className="w-full text-left font-mono text-[10px] border-collapse" {...props} /></div>,
  thead: ({ node, ...props }: any) => <thead className="border-b border-border/60 text-muted-foreground" {...props} />,
  th: ({ node, ...props }: any) => <th className="px-2 py-1 font-semibold tracking-wide uppercase" {...props} />,
  td: ({ node, ...props }: any) => <td className="px-2 py-1 border-b border-border/30" {...props} />,
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const [metaOpen, setMetaOpen] = useState(false);
  const isAssistant = message.role === "assistant";
  const modeInfo = MODE_LABELS[message.mode] ?? MODE_LABELS.standard;
  const isProcessing = !!message.processingIndicator;

  return (
    <div className={cn(
      "flex gap-3 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
      isAssistant ? "flex-row" : "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 flex items-center justify-center border shrink-0 mt-0.5 text-[10px] font-mono font-bold",
        isAssistant
          ? "border-primary/50 text-primary bg-primary/8"
          : "border-border text-muted-foreground bg-secondary"
      )}>
        {isAssistant ? "AI" : "ME"}
      </div>

      {/* Content block */}
      <div className={cn("flex-1 min-w-0", !isAssistant && "flex flex-col items-end")}>
        {/* Label row -Hidden when processing */}
        {!isProcessing && (
          <div className={cn(
            "flex items-center gap-2 mb-1",
            !isAssistant && "flex-row-reverse"
          )}>
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground/60 uppercase">
              {isAssistant ? "AMCAS" : "USER"}
            </span>
            {isAssistant && message.mode !== "standard" && (
              <span className={cn(
                "text-[8px] font-mono tracking-widest px-1.5 py-0.5 border uppercase",
                modeInfo.color
              )}>
                {modeInfo.short}
              </span>
            )}
            <span className="text-[9px] font-mono text-muted-foreground/30">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Processing indicator - shows above bubble when processing */}
        {isProcessing && (
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-primary/80 uppercase">
              {message.processingIndicator}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          "text-xs font-mono leading-relaxed px-3.5 py-3 border",
          isAssistant
            ? "bg-card border-border text-foreground"
            : "bg-primary/8 border-primary/25 text-foreground"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Expandable meta for assistant */}
        {isAssistant && message.meta && (
          <div className="mt-1.5 w-full">
            <button
              onClick={() => setMetaOpen(!metaOpen)}
              className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase hover:text-muted-foreground transition-colors"
            >
              Analysis
              {metaOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            {metaOpen && (
              <div className="mt-1.5 p-3 bg-card border border-border space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <ConfidenceBar label="Confidence" value={message.meta.confidenceScore} size="sm" />
                {message.meta.logicalConsistency !== undefined && (
                  <ConfidenceBar label="Consistency" value={message.meta.logicalConsistency} size="sm" />
                )}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Depth</span>
                    <span className="text-[9px] font-mono text-foreground ml-auto">{message.meta.reasoningDepth}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Retries</span>
                    <span className="text-[9px] font-mono text-foreground ml-auto">{message.meta.retryCount}</span>
                  </div>
                </div>
                {message.meta.toolsUsed.length > 0 && (
                  <div className="flex items-start gap-1.5 pt-2.5 border-t border-border">
                    <Wrench className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {message.meta.toolsUsed.map((t) => (
                        <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 bg-secondary border border-border text-muted-foreground uppercase tracking-wide">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {message.meta.criticFeedback && (
                  <div className="flex items-start gap-1.5 pt-0.5 border-t border-border">
                    <CheckCircle2 className="w-3 h-3 text-chart-2 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide mb-1">Critic Feedback</p>
                      <p className="text-[10px] font-mono text-foreground">{message.meta.criticFeedback}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
