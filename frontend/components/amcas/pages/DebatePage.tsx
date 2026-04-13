"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, DebateMessage } from "@/lib/store";
import { streamDebate } from "@/lib/api";
import DebatePanel from "../DebatePanel";
import { nanoid } from "@/lib/nanoid";
import { Send, Swords, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function DebatePage() {
  const { debateMessages, addDebateMessage, clearDebateMessages, debateSession, hydrateDebateSession, setDebateConversationId } = useAppStore();
  const [topic, setTopic] = useState(debateSession.topic);
  const [rounds, setRounds] = useState(3);
  const [mode, setMode] = useState<"autogen" | "raw">("autogen");
  const [isDebating, setIsDebating] = useState(false);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [contradictions, setContradictions] = useState(0);
  const [resolution, setResolution] = useState<"pending" | "ongoing" | "resolved">("pending");
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debateConversationId, setLocalConvId] = useState<string | null>(null);
  const [showRoundsMenu, setShowRoundsMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setShowRoundsMenu(false);
        setShowModeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debateSession.topic) {
      setTopic(debateSession.topic);
      setLocalConvId(debateSession.conversationId);
    }
  }, [debateSession.topic, debateSession.conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debateMessages]);

  const startDebate = async () => {
    if (!topic.trim() || isDebating) return;
    clearDebateMessages();
    hydrateDebateSession({ topic, conversationId: debateConversationId, messages: [] });
    setIsDebating(true);
    setRound(0);
    setContradictions(0);
    setResolution("ongoing");
    setError(null);

    try {
      for await (const msg of streamDebate(topic, rounds, debateConversationId, mode)) {
        if (msg.type === "done") break;

        if ((msg as any).type === "conversation_id") {
          const newId = (msg as any).conversation_id;
          setLocalConvId(newId);
          setDebateConversationId(newId);
        } else if (msg.type === "round") {
          setRound(msg.round ?? 0);
          setTotalRounds(msg.total_rounds ?? rounds);
        } else if (msg.type === "message") {
          const role = msg.agent_id === "A" ? "proposer" : "critic";
          addDebateMessage({
            id: nanoid(),
            role,
            content: msg.content ?? "",
            round: msg.round,
            timestamp: new Date(),
            conversationId: (msg as any).conversation_id || debateConversationId || undefined,
          });
          // Count when both agents have spoken in a round as potential contradiction
          if (role === "critic") {
            setContradictions((c) => c + 1);
          }
        } else if (msg.type === "verdict") {
          addDebateMessage({
            id: nanoid(),
            role: "verifier",
            content: msg.content ?? "",
            timestamp: new Date(),
          });
          setResolution("resolved");
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Debate stream failed";
      setError(errMsg);
      setResolution("pending");
    } finally {
      setIsDebating(false);
    }
  };

  const handleUserMessage = () => {
    if (!chatInput.trim()) return;
    addDebateMessage({ id: nanoid(), role: "user", content: chatInput, timestamp: new Date(), conversationId: debateConversationId || undefined });
    setChatInput("");
    setTopic(chatInput);
  };

  const verifierMsg = debateMessages.find((m) => m.role === "verifier");
  const userMsgs = debateMessages.filter((m) => m.role === "user");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Swords className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono tracking-widest text-foreground uppercase">Debate Arena</span>
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase hidden sm:block">
              / {mode === "autogen" ? "AutoGen multi-agent structured debate" : "Raw Groq API debate"}
            </span>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-4">
            {[
              { label: "RND", value: `${round.toString().padStart(2, "0")}/${totalRounds}` },
              { label: "CTR", value: contradictions.toString().padStart(2, "0"), highlight: contradictions > 0 },
            ].map((s) => (
              <div key={s.label} className="text-right">
                <p className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase">{s.label}</p>
                <p className={cn("text-sm font-mono font-bold", s.highlight ? "text-chart-4" : "text-foreground")}>
                  {s.value}
                </p>
              </div>
            ))}
            <div className="text-right">
              <p className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase">Status</p>
              <div className="flex items-center gap-1 mt-0.5">
                {resolution === "pending" && <span className="text-[9px] font-mono text-muted-foreground">IDLE</span>}
                {resolution === "ongoing" && (
                  <span className="flex items-center gap-1 text-[9px] font-mono text-chart-4">
                    <span className="w-1.5 h-1.5 bg-chart-4 animate-pulse" />
                    LIVE
                  </span>
                )}
                {resolution === "resolved" && (
                  <span className="flex items-center gap-1 text-[9px] font-mono text-chart-2">
                    <CheckCircle2 className="w-3 h-3" />
                    DONE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-3 p-4">
        {/* Topic input */}
        <div className="flex gap-2 shrink-0">
          <div className="flex-1 flex items-center border border-border bg-card">
            <span className="text-primary text-xs font-mono px-3 border-r border-border shrink-0">TOPIC</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startDebate()}
              placeholder="Enter a proposition to debate…"
              disabled={isDebating}
              className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
          {/* Rounds selector */}
          <div className="flex items-center border border-border bg-card">
            <span className="text-muted-foreground text-[9px] font-mono px-2 border-r border-border shrink-0 uppercase tracking-widest">RND</span>
            <select
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              disabled={isDebating}
              className="bg-transparent px-2 py-2.5 text-xs font-mono text-foreground outline-none cursor-pointer"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {/* Mode selector */}
          <div className="flex items-center border border-border bg-card">
            <span className="text-muted-foreground text-[9px] font-mono px-2 border-r border-border shrink-0 uppercase tracking-widest">MODE</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "autogen" | "raw")}
              disabled={isDebating}
              className="bg-transparent px-2 py-2.5 text-xs font-mono text-foreground outline-none cursor-pointer"
            >
              <option value="autogen">AutoGen</option>
              <option value="raw">Raw</option>
            </select>
          </div>
          <button
            onClick={startDebate}
            disabled={!topic.trim() || isDebating}
            className={cn(
              "px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase border transition-all duration-150 flex items-center gap-2",
              topic.trim() && !isDebating
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Swords className="w-3 h-3" />
            Initiate
          </button>
        </div>
        {error && (
          <div className="shrink-0 border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive flex items-center gap-2">
            <span className="font-bold uppercase tracking-widest text-[10px]">Error:</span>
            {error}
          </div>
        )}

        {/* Main content area: Debate panels + (optionally) Verifier panel */}
        {verifierMsg ? (
          <ResizablePanelGroup direction="vertical" className="flex-1 gap-3 min-h-0">
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className="grid grid-cols-2 gap-3 h-full overflow-hidden">
                <DebatePanel role="proposer" messages={debateMessages} isActive={isDebating} />
                <DebatePanel role="critic" messages={debateMessages} isActive={isDebating} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/50" />
            <ResizablePanel defaultSize={30} minSize={10}>
              <div className="h-full overflow-y-auto border border-chart-2/30 bg-card animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-3 py-2 border-b border-chart-2/20 bg-chart-2/5 flex items-center gap-2">
                  <span className="text-[8px] font-mono tracking-widest border border-chart-2/40 text-chart-2 px-1.5 py-0.5 uppercase">VRF</span>
                  <span className="text-[10px] font-mono tracking-widest text-chart-2 uppercase font-bold">Verifier Panel</span>
                  <span className="ml-auto text-[8px] font-mono tracking-widest text-chart-2 uppercase">Resolution_Complete</span>
                </div>
                <div className="p-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
                  {verifierMsg.content.split("\n").map((line, lineIndex) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={lineIndex} className={line === "" ? "h-2" : ""}>
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
                          ) : <span key={j}>{part}</span>
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3 min-h-0 overflow-hidden">
            <DebatePanel role="proposer" messages={debateMessages} isActive={isDebating} />
            <DebatePanel role="critic" messages={debateMessages} isActive={isDebating} />
          </div>
        )}

        {/* Chat input */}
        <div className="shrink-0 flex gap-2">
          <div className="flex-1 flex items-center border border-border bg-card">
            <span className="text-muted-foreground text-xs font-mono px-3 border-r border-border shrink-0">INPUT</span>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserMessage()}
              placeholder="Add your perspective…"
              className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
          <button
            onClick={handleUserMessage}
            disabled={!chatInput.trim()}
            className={cn(
              "w-10 flex items-center justify-center border transition-all duration-150",
              chatInput.trim()
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>

        {/* User messages */}
        {userMsgs.length > 0 && (
          <div className="shrink-0 space-y-1.5 max-h-20 overflow-y-auto">
            {userMsgs.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 border border-primary/15 bg-primary/5 px-3 py-2">
                <span className="text-[9px] font-mono tracking-widest text-primary uppercase shrink-0">You</span>
                <p className="text-[10px] font-mono text-muted-foreground">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
