"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/store";
import ConfidenceBar from "./ConfidenceBar";
import { ChevronDown, ChevronUp, Wrench, RotateCcw, Layers, CheckCircle2, Copy, Check, FileText } from "lucide-react";
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

// ─── Code Pipeline Phase UI ─────────────────────────────────────────────────

interface CodePipelinePhaseData {
  type: "code_pipeline_phase";
  phase: "problem" | "approach" | "code" | "final";
  problemUnderstanding: string;
  approach: string;
  code: string;
  finalResult: string;
  skipTyping?: boolean; // When true (loading from history), skip typing animation
}

// ─── Code Pipeline Phase UI ─────────────────────────────────────────────────

function CodePipelinePhaseUI({ data }: { data: CodePipelinePhaseData }) {
  const { phase, problemUnderstanding, approach, code, skipTyping } = data;

  // Always call hooks - pass skipTyping to avoid unnecessary animations
  const problemTyping = useTypingAnimation(problemUnderstanding, 3, skipTyping ?? false);
  const approachTyping = useTypingAnimation(approach, 3, skipTyping ?? false);
  const codeTyping = useTypingAnimation(code, 2, skipTyping ?? false);

  // Cursor component for typing animation
  const TypingCursor = ({ isActive }: { isActive: boolean }) => (
    <span className={isActive ? "inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" : ""} />
  );

  // ─── Problem Section ──────────────────────────────────────────────────────
  if (phase === "problem") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-chart-1 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-chart-1/80 uppercase">
            Problem Understanding
          </span>
        </div>
        <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
            {problemTyping.displayedText}
          </ReactMarkdown>
          <TypingCursor isActive={!problemTyping.isComplete} />
        </div>
      </div>
    );
  }

  // ─── Approach Section (problem + approach accumulate) ─────────────────────
  if (phase === "approach") {
    return (
      <div className="space-y-4">
        {/* Problem Understanding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-1" />
            <span className="text-[10px] font-mono tracking-widest text-chart-1/80 uppercase">
              Problem Understanding
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {problemTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Approach/Plan */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-3 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-chart-3/80 uppercase">
              Approach / Plan
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {approachTyping.displayedText}
            </ReactMarkdown>
            <TypingCursor isActive={!approachTyping.isComplete} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Code Section (all sections shown) ───────────────────────────────────
  if (phase === "code") {
    return (
      <div className="space-y-4">
        {/* Problem Understanding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-1" />
            <span className="text-[10px] font-mono tracking-widest text-chart-1/80 uppercase">
              Problem Understanding
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {problemTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Approach/Plan */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-3" />
            <span className="text-[10px] font-mono tracking-widest text-chart-3/80 uppercase">
              Approach / Plan
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {approachTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Code Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-2 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-chart-2/80 uppercase">
              Implementation
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {codeTyping.displayedText}
            </ReactMarkdown>
            <TypingCursor isActive={!codeTyping.isComplete} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Final Section (all complete) ────────────────────────────────────────
  if (phase === "final") {
    return (
      <div className="space-y-4">
        {/* Problem Understanding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-1" />
            <span className="text-[10px] font-mono tracking-widest text-chart-1/80 uppercase">
              Problem Understanding
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {problemTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Approach/Plan */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-3" />
            <span className="text-[10px] font-mono tracking-widest text-chart-3/80 uppercase">
              Approach / Plan
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {approachTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Code Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-2" />
            <span className="text-[10px] font-mono tracking-widest text-chart-2/80 uppercase">
              Implementation
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {codeTyping.displayedText}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Deep Research Phase UI ───────────────────────────────────────────────────

interface DeepResearchPhaseData {
  type: "deep_research_phase";
  phase: "decomposition" | "researching" | "aggregating" | "final";
  content: string;
  researcher1: string;
  researcher2: string;
  aggregator: string;
  finalReport: string;
  finalMeta: {
    confidence_score: number;
    logical_consistency: number;
    critic_feedback: string;
    serious_mistakes: any[];
  } | null;
  skipTyping?: boolean; // When true (loading from history), skip typing animation
}

// ─── Typing Animation Hook ───────────────────────────────────────────────────
function useTypingAnimation(fullText: string, speed: number = 2, skipTyping: boolean = false) {
  // Lazy initialization: if skipTyping, start with full text; otherwise start empty
  const [displayedText, setDisplayedText] = useState(() => skipTyping ? fullText : "");
  const [isComplete, setIsComplete] = useState(() => skipTyping || !fullText);
  const fullTextRef = useRef(fullText);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  // Reset when fullText changes (only if not skipping)
  useEffect(() => {
    // If skipTyping is true, show full text immediately and don't animate
    if (skipTyping) {
      setDisplayedText(fullText);
      setIsComplete(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    fullTextRef.current = fullText;
    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!fullText) {
      setIsComplete(true);
      return;
    }

    intervalRef.current = setInterval(() => {
      indexRef.current += 12; // Type 12 chars at a time for smooth, readable feel
      if (indexRef.current >= fullText.length) {
        setDisplayedText(fullText);
        setIsComplete(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setDisplayedText(fullText.slice(0, indexRef.current));
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fullText, speed, skipTyping]);

  // If text hasn't changed and is complete, show full text
  return { displayedText: isComplete ? fullText : displayedText, isComplete };
}

// ─── Collapsible Previous Phases ─────────────────────────────────────────────
function PreviousPhasesCollapsible({
  content,
  researcher1,
  researcher2,
}: {
  content: string;
  researcher1: string;
  researcher2: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase hover:text-muted-foreground transition-colors"
      >
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Want to see what happened?
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Decomposition */}
          {content && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono tracking-widest text-primary/60 uppercase">
                Task Decomposition
              </span>
              <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Researcher Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Researcher 1 */}
            <div className="border border-border/50 bg-secondary/20 rounded overflow-hidden">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 bg-secondary/30">
                <span className="text-[9px]">🔬</span>
                <span className="text-[9px] font-mono tracking-widest text-foreground/70 uppercase">
                  Researcher 1
                </span>
              </div>
              <div className="p-2 max-h-[200px] overflow-y-auto">
                <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {researcher1 ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {researcher1}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-muted-foreground/30 italic">No data</span>
                  )}
                </div>
              </div>
            </div>

            {/* Researcher 2 */}
            <div className="border border-border/50 bg-secondary/20 rounded overflow-hidden">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 bg-secondary/30">
                <span className="text-[9px]">🔬</span>
                <span className="text-[9px] font-mono tracking-widest text-foreground/70 uppercase">
                  Researcher 2
                </span>
              </div>
              <div className="p-2 max-h-[200px] overflow-y-auto">
                <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {researcher2 ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {researcher2}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-muted-foreground/30 italic">No data</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deep Research Phase UI — Accumulating Content ────────────────────────────

function DeepResearchPhaseUI({ data }: { data: DeepResearchPhaseData }) {
  const { phase, content, researcher1, researcher2, aggregator, finalReport, finalMeta, skipTyping } = data;

  // Always call hooks (React rules of hooks) - pass skipTyping to avoid unnecessary animations
  const decomposeTyping = useTypingAnimation(content, 3, skipTyping ?? false);
  const researcher1Typing = useTypingAnimation(researcher1, 3, skipTyping ?? false);
  const researcher2Typing = useTypingAnimation(researcher2, 3, skipTyping ?? false);
  const aggregatorTyping = useTypingAnimation(aggregator, 3, skipTyping ?? false);
  const finalTyping = useTypingAnimation(finalReport, 3, skipTyping ?? false);

  // ─── Decomposition Section (always shown when content exists) ────────────
  const DecompositionSection = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 bg-primary" />
        <span className="text-[10px] font-mono tracking-widest text-primary/80 uppercase">
          Task Decomposition
        </span>
      </div>
      <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );

  // ─── Researcher Cards (always shown when either researcher has content) ──
  const ResearcherCards = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 bg-chart-2" />
        <span className="text-[10px] font-mono tracking-widest text-chart-2/80 uppercase">
          Parallel Research
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Researcher 1 Card */}
        <div className="border border-border bg-secondary/30 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
            <span className="text-[10px]">🔬</span>
            <span className="text-[10px] font-mono tracking-widest text-foreground uppercase">
              Researcher 1
            </span>
          </div>
          <div className="p-3 max-h-[300px] overflow-y-auto">
            <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground">
              {researcher1 ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {researcher1Typing.displayedText}
                  </ReactMarkdown>
                  {!researcher1Typing.isComplete && (
                    <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/50 italic">Researching...</span>
              )}
            </div>
          </div>
        </div>

        {/* Researcher 2 Card */}
        <div className="border border-border bg-secondary/30 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
            <span className="text-[10px]">🔬</span>
            <span className="text-[10px] font-mono tracking-widest text-foreground uppercase">
              Researcher 2
            </span>
          </div>
          <div className="p-3 max-h-[300px] overflow-y-auto">
            <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground">
              {researcher2 ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {researcher2Typing.displayedText}
                  </ReactMarkdown>
                  {!researcher2Typing.isComplete && (
                    <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/50 italic">Researching...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Collapsible "Want to see what happened?" ────────────────────────────
  const WhatHappenedCollapsible = () => {
    if (!content && !researcher1 && !researcher2) return null;
    return <PreviousPhasesCollapsible content={content} researcher1={researcher1} researcher2={researcher2} />;
  };

  // ─── Phase 1: Decomposition ──────────────────────────────────────────────
  if (phase === "decomposition") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-primary/80 uppercase">
            Task Decomposition
          </span>
        </div>
        <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
            {decomposeTyping.displayedText}
          </ReactMarkdown>
          {!decomposeTyping.isComplete && (
            <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    );
  }

  // ─── Phase 2: Researching (decomposition + researchers accumulate) ───────
  if (phase === "researching") {
    return (
      <div className="space-y-4">
        {/* Decomposition stays visible */}
        {content && <DecompositionSection />}
        {/* Researchers appear below */}
        <ResearcherCards />
      </div>
    );
  }

  // ─── Phase 3: Aggregating (what happened ABOVE aggregator) ───────────────
  if (phase === "aggregating") {
    return (
      <div className="space-y-4">
        {/* "Want to see what happened?" ABOVE the aggregator content */}
        <WhatHappenedCollapsible />

        {/* Aggregator content */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-chart-3 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-chart-3/80 uppercase">
              Synthesizing Research
            </span>
          </div>
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            {aggregator ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {aggregatorTyping.displayedText}
                </ReactMarkdown>
                {!aggregatorTyping.isComplete && (
                  <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" />
                )}
              </>
            ) : (
              <span className="text-muted-foreground/50 italic">Synthesizing...</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase 4: Final Report (what happened ABOVE final) ───────────────────
  if (phase === "final" && finalReport) {
    return (
      <div className="space-y-4">
        {/* "Want to see what happened?" ABOVE the final report */}
        <WhatHappenedCollapsible />

        {/* Final report */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {finalTyping.displayedText}
            </ReactMarkdown>
            {!finalTyping.isComplete && (
              <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5" />
            )}
          </div>
          {finalMeta && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3 h-3 text-chart-2" />
                <span className="text-[10px] font-mono tracking-widest text-chart-2/80 uppercase">
                  Evaluation Metrics
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border border-border rounded">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Confidence</span>
                  <span className="text-[11px] font-mono text-chart-2 ml-auto">{finalMeta.confidence_score}%</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border border-border rounded">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Consistency</span>
                  <span className="text-[11px] font-mono text-chart-2 ml-auto">{finalMeta.logical_consistency}%</span>
                </div>
              </div>
              {finalMeta.critic_feedback && (
                <div className="mt-2 px-3 py-2 bg-secondary/30 border border-border rounded">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Feedback</p>
                  <p className="text-[11px] font-mono text-foreground">{finalMeta.critic_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

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
  const modeInfo = (message.mode ? MODE_LABELS[message.mode] : MODE_LABELS.standard) || MODE_LABELS.standard;
  const isProcessing = !!message.processingIndicator;

  return (
    <div className={cn(
      "flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
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
          {(() => {
            // Check if content is a code pipeline phase JSON
            try {
              if (message.content.startsWith('{') && message.content.includes('"type":"code_pipeline_phase"')) {
                const data: CodePipelinePhaseData = JSON.parse(message.content);
                // Skip typing if: loading from history (skipTyping already set),
                // OR generation is complete (message has meta data),
                // OR we're not currently generating anything
                const shouldSkipTyping = data.skipTyping || !!message.meta || !isProcessing;
                data.skipTyping = shouldSkipTyping;
                return <CodePipelinePhaseUI data={data} />;
              }
            } catch {
              // Not code pipeline JSON, continue to check other types
            }
            // Check if content is a deep research phase JSON
            try {
              if (message.content.startsWith('{') && message.content.includes('"type":"deep_research_phase"')) {
                const data: DeepResearchPhaseData = JSON.parse(message.content);
                // Merge whatHappened from message into the data if available
                if (message.whatHappened) {
                  data.researcher1 = message.whatHappened.researcher1 || data.researcher1;
                  data.researcher2 = message.whatHappened.researcher2 || data.researcher2;
                  data.content = message.whatHappened.decomposition || data.content;
                }
                // Skip typing if: loading from history (skipTyping already set),
                // OR generation is complete (message has meta data),
                // OR we're not currently generating anything
                const shouldSkipTyping = data.skipTyping || !!message.meta || !isProcessing;
                data.skipTyping = shouldSkipTyping;
                return <DeepResearchPhaseUI data={data} />;
              }
            } catch {
              // Not JSON, fall through to markdown
            }
            // Default: render as markdown
            return (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                {message.content}
              </ReactMarkdown>
            );
          })()}

          {/* PDF attachment boxes — shown below message text */}
          {!isAssistant && message.pdfs && message.pdfs.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-primary/20">
              <p className="text-[9px] font-mono tracking-widest text-primary/50 uppercase mb-1.5">
                Attached · {message.pdfs.length} file{message.pdfs.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {message.pdfs.map((pdf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary"
                  >
                    <FileText className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    <span className="truncate max-w-[160px]">{pdf}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
