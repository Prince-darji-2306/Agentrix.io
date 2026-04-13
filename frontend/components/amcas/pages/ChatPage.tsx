"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useAgentPanel } from "../AgentPanelContext";
import { generateResponse, type SmartSSEEvent } from "@/lib/api";
import ChatMessageComp from "../ChatMessage";
import ToolSelector from "../ToolSelector";
import { Send, Square, Terminal, AlertCircle, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "@/lib/nanoid";
import type { GraphNode, GraphEdge, GraphNodeType } from "@/lib/store";
import { GRAPH_TOPOLOGIES } from "@/lib/graph-config";

const SUGGESTIONS = [
  "Explain multi-agent reasoning architectures",
  "What is task decomposition in AI planning?",
  "How does deep research mode differ from standard?",
];

export default function ChatPage() {
  const {
    chatMessages,
    addChatMessage,
    updateChatMessage,
    selectedMode,
    isGenerating,
    setIsGenerating,
    currentIndicator,
    setCurrentIndicator,
    setGraphNodes,
    setGraphEdges,
    upsertGraphNode,
    createChat,
    clearGraphData,
    conversationId,
    setConversationId,
  } = useAppStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { upsertAgentData, clearAgents, upsertFileData, clearFiles } = useAgentPanel();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize graph edges to prevent unnecessary re-renders
  const codeEdges = useMemo(() => GRAPH_TOPOLOGIES.CODE_MODE_EDGES, []);
  const standardEdges = useMemo(() => GRAPH_TOPOLOGIES.STANDARD_MODE_EDGES, []);

  // Combined scroll effect: during generation use auto (no jitter), on complete use smooth
  useEffect(() => {
    if (isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    } else if (chatMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isGenerating, chatMessages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

  // Build graph data from deepResearchRaw result
  const buildGraphFromDeepResearch = (
    task: string,
    deepResearchRaw: {
      subtasks: Array<{ id: number; description: string; agent_type: string; result: string }>;
      final_result: string;
      critic_confidence?: number;
      critic_logical_consistency?: number;
      critic_feedback?: string;
    }
  ): { nodes: GraphNode[]; edges: GraphEdge[] } => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const { subtasks, final_result, critic_confidence, critic_logical_consistency, critic_feedback } = deepResearchRaw;

    // Deep research node (top center)
    nodes.push({
      id: "deep_research",
      type: "deep_research",
      label: "Deep Research",
      description: `Task: "${task.substring(0, 80)}${task.length > 80 ? '...' : ''}"`,
      status: "completed",
      timeTaken: "-",
      x: 400,
      y: 60,
    });

    // Researcher nodes (parallel)
    const researcherNodes = subtasks
      .filter((st) => st.agent_type === "researcher")
      .map((st, idx) => {
        return {
          id: `researcher-${st.id}`,
          type: "agent",
          label: `Researcher ${st.id}`,
          description: st.description,
          status: "completed",
          timeTaken: "-",
          output: st.result,
          x: 200 + idx * 160, // Increased spacing: 160px between researchers
          y: 180,
        } as GraphNode;
      });

    // Aggregator node (below parallel researchers)
    const aggregatorNode = subtasks.find((st) => st.agent_type === "aggregator");
    if (aggregatorNode) {
      nodes.push(
        {
          id: "aggregator",
          type: "agent",
          label: "Aggregator",
          description: aggregatorNode.description,
          status: "completed",
          timeTaken: "-",
          output: aggregatorNode.result,
          x: 400,
          y: 320,
        },
        {
          id: "critic",
          type: "critic",
          label: "Critic",
          description: `Confidence: ${critic_confidence ?? 85}% | Consistency: ${critic_logical_consistency ?? 85}%`,
          status: "completed",
          timeTaken: "-",
          output: critic_feedback
            ? `Confidence: ${critic_confidence}%\nLogical Consistency: ${critic_logical_consistency}%\nFeedback: ${critic_feedback}`
            : `Confidence: ${critic_confidence ?? 85}%\nLogical Consistency: ${critic_logical_consistency ?? 85}%`,
          x: 400,
          y: 400,
        },
        {
          id: "output",
          type: "output",
          label: "Final Report",
          description: "7-section structured output",
          status: "completed",
          timeTaken: "-",
          output: final_result,
          x: 400,
          y: 480,
        },
        ...researcherNodes
      );
    } else {
      nodes.push(...researcherNodes);
    }

    // Edges: deep_research -> each researcher (parallel)
    researcherNodes.forEach((rn) => {
      edges.push({ id: `edge-orch-res-${rn.id}`, from: "deep_research", to: rn.id });
    });

    // Edges: both researchers -> aggregator (gather)
    if (aggregatorNode) {
      const newEdges = [];
      researcherNodes.forEach((rn) => {
        newEdges.push({ id: `edge-res-aggregator-${rn.id}`, from: rn.id, to: "aggregator" });
      });
      // Edge: aggregator -> critic
      newEdges.push({ id: "edge-aggregator-critic", from: "aggregator", to: "critic" });
      // Edge: critic -> output
      newEdges.push({ id: "edge-critic-output", from: "critic", to: "output" });
      edges.push(...newEdges);
    }

    return { nodes, edges };
  };

  const handleSubmit = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isGenerating) return;
    const userMsg = input.trim();
    setInput("");
    setError(null);
    const filesToUpload = [...selectedFiles];
    const pdfNames = filesToUpload.map(f => f.name);
    setSelectedFiles([]);

    addChatMessage({
      id: nanoid(),
      role: "user",
      content: userMsg || `Uploaded ${filesToUpload.length} PDF(s)`,
      mode: selectedMode,
      timestamp: new Date(),
      pdfs: pdfNames.length > 0 ? pdfNames : undefined,
    });
    setIsGenerating(true);

    try {
      // Determine the initial indicator based on whether PDFs are being uploaded
      const hasPdfs = filesToUpload.length > 0;
      const initialIndicator = hasPdfs ? "Processing PDFs..." : "Analyzing input...";

      // Create AI bubble immediately with the initial indicator
      const assistantId = nanoid();
      addChatMessage({
        id: assistantId,
        role: "assistant",
        content: selectedMode === "standard" ? "Thinking..." : "Processing...",
        mode: selectedMode,
        timestamp: new Date(),
        processingIndicator: initialIndicator,
      });

      // Step 1: Process PDFs if any
      if (hasPdfs) {
        const { uploadPdfs } = await import("@/lib/api");
        const uploadRes = await uploadPdfs(filesToUpload, conversationId);
        // Save returned conversation_id if any
        if (uploadRes.conversation_id) {
          setConversationId(uploadRes.conversation_id);
        }
        // Update indicator to "Analyzing input..." after PDFs are done
        updateChatMessage(assistantId, {
          processingIndicator: "Analyzing input...",
        });
      }

      // Step 2: Determine query for LLM
      const query = userMsg || (hasPdfs
        ? "I've uploaded some PDFs. Please analyze them and provide insights based on your knowledge base."
        : null);

      if (query) {
        // Only proceed with LLM generation if we have a query
        if (selectedMode === "standard") {
          // Use streaming via generateResponse
          const result = await generateResponse(
            query,
            selectedMode,
            (indicator) => updateChatMessage(assistantId, { processingIndicator: indicator }),
            undefined,
            (section: string, content: string) => {
              if (section === "answer") {
                updateChatMessage(assistantId, { content });
              }
            },
            conversationId,
            pdfNames
          );
          // Save returned conversation_id for future messages
          if (result.conversation_id) {
            setConversationId(result.conversation_id);
          }
          updateChatMessage(assistantId, {
            content: result.content,
            meta: result.meta,
            processingIndicator: undefined,
          });
        } else if (selectedMode === "multi-agent") {
          // Smart Orchestrator with SSE streaming
          setGraphNodes([]);
          setGraphEdges([]);
          let codePhase = "";
          let problemContent = "";
          let approachContent = "";
          let codeContent = "";

          // Deep research phase state
          let detectedPath = "";
          let decomposeContent = "";
          let researcher1Content = "";
          let researcher2Content = "";
          let aggregatorContent = "";
          let finalReportContent = "";
          let finalMetaContent: any = null;

          const result = await generateResponse(
            query,
            selectedMode,
            (indicator) => updateChatMessage(assistantId, { processingIndicator: indicator }),
            // onNodeUpdate
            (event: SmartSSEEvent) => {
              if (event.type === "route") {
                detectedPath = event.path || "";
                if (event.path === "code") {
                  setGraphEdges(codeEdges);
                } else if (event.path === "standard") {
                  setGraphEdges(standardEdges);
                } else if (event.path === "deep_research") {
                  // Deep research edges will be built from deepResearchRaw after completion
                  setGraphEdges([]);
                }
              }
              if (event.node_id) {
                upsertGraphNode({
                  id: event.node_id,
                  type: (event.node_type ?? "agent") as GraphNodeType,
                  label: event.label ?? "",
                  description: "",
                  status: event.status ?? "running",
                  x: event.x ?? 400,
                  y: event.y ?? 300,
                  output: event.output ?? undefined,
                  timeTaken: "-",
                });
              }
            },
            // onContentChunk - handle section streaming
            (section: string, content: string) => {
              if (section === "answer") {
                // Standard mode streaming content
                updateChatMessage(assistantId, { content });
              } else if (section === "problem_understanding") {
                codePhase = "problem";
                problemContent = content;
                // Send code pipeline phase JSON for typewriter animation
                const uiContent = JSON.stringify({
                  type: "code_pipeline_phase",
                  phase: "problem",
                  problemUnderstanding: problemContent,
                  approach: "",
                  code: "",
                  finalResult: "",
                });
                updateChatMessage(assistantId, { content: uiContent });
              } else if (section === "approach") {
                codePhase = "approach";
                approachContent = content;
                // Send code pipeline phase JSON for typewriter animation
                const uiContent = JSON.stringify({
                  type: "code_pipeline_phase",
                  phase: "approach",
                  problemUnderstanding: problemContent,
                  approach: approachContent,
                  code: "",
                  finalResult: "",
                });
                updateChatMessage(assistantId, { content: uiContent });
              } else if (section === "code") {
                codePhase = "code";
                codeContent = content;
                // Send code pipeline phase JSON for typewriter animation
                const uiContent = JSON.stringify({
                  type: "code_pipeline_phase",
                  phase: "code",
                  problemUnderstanding: problemContent,
                  approach: approachContent,
                  code: codeContent,
                  finalResult: "",
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              // Deep research sections
              else if (section === "decomposition") {
                decomposeContent = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "decomposition",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "researcher_1") {
                researcher1Content = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "researching",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "researcher_2") {
                researcher2Content = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "researching",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "aggregation") {
                aggregatorContent = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "aggregating",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else {
                // Fallback: accumulate content
                updateChatMessage(assistantId, { content });
              }
            },
            conversationId,
            pdfNames,
            (id, name, content) => upsertAgentData(id, name, content),
            (filename, content, language, index, total) => upsertFileData(filename, content, language, index < total - 1)
          );

          // Update conversation ID if returned
          if (result.conversation_id) {
            setConversationId(result.conversation_id);
          }

          // For deep_research path, build graph from deepResearchRaw
          if (result.deepResearchRaw && result.deepResearchRaw.subtasks) {
            const { nodes, edges } = buildGraphFromDeepResearch(query, result.deepResearchRaw);
            setGraphNodes(nodes);
            setGraphEdges(edges);
          }

          updateChatMessage(assistantId, {
            meta: result.meta,
            processingIndicator: undefined,
            preThinking: result.preThinking,
          });
        } else {
          // deep-research: use deep_research pipeline with SSE streaming
          setGraphNodes([]);
          setGraphEdges([]);

          // Deep research phase state
          let decomposeContent = "";
          let researcher1Content = "";
          let researcher2Content = "";
          let aggregatorContent = "";
          let finalReportContent = "";
          let finalMetaContent: any = null;

          const result = await generateResponse(
            query, 
            selectedMode, 
            (indicator) => {
              updateChatMessage(assistantId, { processingIndicator: indicator });
            },
            undefined,
            // onContentChunk - handle section streaming
            (section: string, content: string) => {
              if (section === "decomposition") {
                decomposeContent = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "decomposition",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "researcher_1") {
                researcher1Content = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "researching",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "researcher_2") {
                researcher2Content = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "researching",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "aggregation") {
                aggregatorContent = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "aggregating",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
              else if (section === "answer") {
                // Final answer content from deep_research
                finalReportContent = content;
                const uiContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "final",
                  content: decomposeContent,
                  researcher1: researcher1Content,
                  researcher2: researcher2Content,
                  aggregator: aggregatorContent,
                  finalReport: finalReportContent,
                  finalMeta: finalMetaContent,
                });
                updateChatMessage(assistantId, { content: uiContent });
              }
            },
            conversationId,
            pdfNames,
            (id, name, content) => upsertAgentData(id, name, content)
          );

          // Update conversation ID if returned
          if (result.conversation_id) {
            setConversationId(result.conversation_id);
          }

          // Build graph from deep_research data if available
          if (result.deepResearchRaw) {
            const { nodes, edges } = buildGraphFromDeepResearch(
              query,
              result.deepResearchRaw
            );
            setGraphNodes(nodes);
            setGraphEdges(edges);
          }

          updateChatMessage(assistantId, {
            meta: result.meta,
            processingIndicator: undefined,
            preThinking: result.preThinking,
          });
        }
      } else {
        // No query and no PDFs (shouldn't happen due to guard, but be safe)
        updateChatMessage(assistantId, {
          content: "No input provided.",
          processingIndicator: undefined,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred";
      setError(msg);
    } finally {
      setIsGenerating(false);
      setCurrentIndicator("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const combined = [...selectedFiles, ...newFiles];
      if (combined.length > 10) {
        setError("Maximum 10 files allowed.");
        setSelectedFiles(combined.slice(0, 10));
      } else {
        setSelectedFiles(combined);
        setError(null);
      }
    }
    // Reset file input so same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    clearGraphData();
    clearAgents();
    clearFiles();
    setInput("");
    setError(null);
    setSelectedFiles([]);
    createChat();
  };

  const isEmpty = chatMessages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono tracking-widest text-foreground uppercase">
            Chat Interface
          </span>
          <span className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase hidden sm:block">
            / Multi-modal reasoning terminal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            title="New chat"
            className="flex items-center justify-center w-8 h-8 text-primary hover:bg-primary/10 border border-primary/30 hover:border-primary/50 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Ready</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-2 sm:px-4">
        {isEmpty ? (
          <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
            {/* Boot screen */}
            <div className="w-full border border-border bg-card p-6 font-mono text-left space-y-1">
              <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
                AMCAS v2.4.1 — Autonomous Multi-Agent Cognitive System
              </p>
              <p className="text-[9px] tracking-widest text-muted-foreground/50">
                ─────────────────────────────────────────
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-primary">SYS:</span> All cognitive modules nominal
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-chart-2">MEM:</span> 147 tasks loaded into retrieval index
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-chart-3">AGT:</span> Agent pool standby — 3 modes available
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                ─────────────────────────────────────────
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-primary text-[10px]"></span>
                <span className="text-[10px] text-foreground">Awaiting input</span>
                <span className="inline-block w-1.5 h-3.5 bg-primary/80 animate-pulse ml-0.5" />
              </div>
            </div>

            {/* Suggestion prompts */}
            <div className="w-full space-y-2">
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase text-left">
                Suggested queries
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border border-border bg-card",
                    "font-mono text-[11px] text-muted-foreground tracking-wide",
                    "hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all duration-150",
                    "flex items-center gap-2"
                  )}
                >
                  <span className="text-primary/50">&gt;</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            {chatMessages.map((msg) => (
              <ChatMessageComp key={msg.id} message={msg} />
            ))}
            {isGenerating && currentIndicator && (
              <div className="w-full animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest text-primary/80 uppercase">
                    {currentIndicator}
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="flex gap-3 w-full animate-in fade-in duration-300">
                <div className="w-7 h-7 flex items-center justify-center border border-destructive/40 text-destructive text-xs font-mono shrink-0">
                  !
                </div>
                <div className="flex-1 border border-destructive/30 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3 h-3" />
                    <span className="font-semibold uppercase tracking-widest text-[10px]">API Error</span>
                  </div>
                  {error}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
        </div>
      </div>

       {/* Input area */}
       <div className="border-t border-border bg-background px-2 sm:px-4 py-3 shrink-0">
         <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* File Pills */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 text-[10px] font-mono whitespace-nowrap overflow-hidden text-primary">
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input box with mode pill INSIDE left side */}
          <div className="flex items-center gap-0 border border-border bg-card focus-within:border-primary/40 transition-colors">
            {/* Left: combined actions menu */}
            <div className="flex items-center px-2 py-2.5 border-r border-border shrink-0">
              <ToolSelector onFileSelect={() => fileInputRef.current?.click()} />
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              multiple
              accept=".pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter query…"
              rows={1}
              className={cn(
                "flex-1 bg-transparent text-xs font-mono text-foreground",
                "placeholder:text-muted-foreground/50 resize-none outline-none",
                "leading-relaxed px-3 py-2.5 max-h-32 overflow-y-auto"
              )}
              style={{ minHeight: "40px" }}
            />

            {/* Send button */}
            <button
              onClick={isGenerating ? undefined : handleSubmit}
              disabled={((!input.trim() && selectedFiles.length === 0) && !isGenerating)}
              className={cn(
                "flex items-center justify-center w-10 h-10 shrink-0 border-l border-border transition-all duration-150 font-mono",
                (input.trim() || selectedFiles.length > 0) && !isGenerating
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : isGenerating
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer"
                    : "text-muted-foreground/40 cursor-not-allowed"
              )}
              aria-label={isGenerating ? "Stop generation" : "Send message"}
            >
              {isGenerating ? (
                <Square className="w-3 h-3" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
