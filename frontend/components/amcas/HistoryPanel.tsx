"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, getConversationMessages, renameConversation, deleteConversation, clearAllHistory, HistoryConversation, HistoryMessage } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { X, MessageSquare, Clock, Trash2, Loader2, Edit2, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: Readonly<HistoryPanelProps>) {
  const [conversations, setConversations] = useState<HistoryConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const navigate = useNavigate();
  const { setCurrentChat, clearChatMessages, addChatMessage, setConversationId } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const data = await getHistory();
      setConversations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectConversation = async (conv: HistoryConversation) => {
    if (conv.type === "debate") {
      navigate("/debate");
    } else {
      try {
        // Fetch messages from backend
        const data = await getConversationMessages(conv.id);
        // Clear current chat and populate with fetched messages
        clearChatMessages();
        setConversationId(conv.id);
        // Convert backend messages to frontend ChatMessage format
        for (const msg of data.messages) {
          for (const entry of msg.content) {
            if (entry.user) {
              addChatMessage({
                id: `${msg.id}-user`,
                role: "user",
                content: entry.user,
                mode: "standard",
                timestamp: new Date(msg.created_at),
                conversationId: conv.id,
                pdfs: entry.pdfs,
              });
            }
            if (entry.assistant) {
              // Use reasoning_mode from backend to determine mode
              const mode = msg.reasoning_mode === "multi_agent" ? "multi-agent" as const : "standard" as const;
              const whatHappened = (msg as any).what_happened;

              // If we have what_happened data, construct deep research JSON for UI rendering
              let assistantContent = entry.assistant;
              if (whatHappened && whatHappened.decomposition) {
                assistantContent = JSON.stringify({
                  type: "deep_research_phase",
                  phase: "final",
                  content: whatHappened.decomposition || "",
                  researcher1: whatHappened.researcher1 || "",
                  researcher2: whatHappened.researcher2 || "",
                  aggregator: "",
                  finalReport: entry.assistant,
                  finalMeta: null,
                  skipTyping: true, // Skip typing animation when loading from history
                });
              }

              addChatMessage({
                id: `${msg.id}-assistant`,
                role: "assistant",
                content: assistantContent,
                mode,
                timestamp: new Date(msg.created_at),
                conversationId: conv.id,
                meta: msg.confidence != null ? {
                  confidenceScore: Math.round(msg.confidence * 100),
                  reasoningDepth: 2,
                  retryCount: 0,
                  toolsUsed: (entry as any).tools || [],
                  logicalConsistency: msg.consistency != null ? Math.round(msg.consistency * 100) : undefined,
                } : undefined,
                whatHappened,
              });
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load conversation:", err);
        alert("Failed to load conversation messages");
      }
      navigate("/chat");
    }
    onClose();
  };

  const handleRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameConversation(id, editTitle.trim());
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
      );
    } catch (err: any) {
      alert(err.message || "Rename failed");
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id === id));
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    try {
      await clearAllHistory();
      setConversations([]);
    } catch (err: any) {
      alert(err.message || "Clear failed");
    }
  };

  const startEditing = (e: React.MouseEvent, conv: HistoryConversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle("");
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "standard": return "text-chart-2";
      case "debate": return "text-chart-4";
      default: return "text-muted-foreground";
    }
  };

  const getMessageCount = (conv: HistoryConversation) => {
    return conv.messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  };

  const getLastMessage = (conv: HistoryConversation) => {
    if (conv.messages.length === 0) return "No messages";
    const lastMsg = conv.messages[conv.messages.length - 1];
    const lastEntry = lastMsg.content?.[lastMsg.content.length - 1];
    if (!lastEntry) return "No messages";
    const text = lastEntry.user || lastEntry.assistant || "";
    return text.length > 80 ? text.slice(0, 80) + "…" : text;
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative bg-card border border-border shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-mono font-bold tracking-widest text-foreground uppercase">
              Chat History
            </h2>
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground/60 uppercase">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {conversations.length > 0 && (
              <button
                onClick={handleClearAll}
                title="Clear all history"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-destructive/70 border border-destructive/20 hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">Loading history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={loadHistory}
                className="text-[9px] text-primary hover:underline uppercase tracking-widest"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-mono text-muted-foreground">No chat history yet</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                  Start a conversation to see it here
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectConversation(conv);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group relative w-full p-4 border border-border hover:border-primary/30 bg-card hover:bg-primary/5 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title, type & Actions */}
                      <div className="flex items-center gap-2 mb-1">
                        {editingId === conv.id ? (
                          <div className="flex items-center gap-1 flex-1" role="region" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 bg-background border border-border text-xs font-mono text-foreground px-2 py-1 outline-none focus:border-primary"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(e as any, conv.id);
                                if (e.key === "Escape") cancelEdit(e as any);
                              }}
                            />
                            <button
                              onClick={(e) => handleRename(e, conv.id)}
                              className="text-chart-2 hover:text-chart-2/80"
                              type="button"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-destructive/70 hover:text-destructive"
                              type="button"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-mono font-bold text-foreground truncate flex-1">
                              {conv.title}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={cn("text-[9px] font-mono uppercase tracking-wider", getTypeColor(conv.type))}>
                                {conv.type}
                              </span>
                              {/* Actions nested here for vertical centering with title */}
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => startEditing(e, conv)}
                                  title="Rename"
                                  className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  type="button"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(e, conv.id)}
                                  title="Delete"
                                  className="flex items-center justify-center w-7 h-7 text-destructive/70 hover:bg-destructive/10 transition-colors"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Last message preview */}
                      <p className="text-[10px] font-mono text-muted-foreground line-clamp-2 mb-2">
                        {getLastMessage(conv)}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                        <span>{getMessageCount(conv)} messages</span>
                        {conv.messages[0]?.confidence != null && (
                          <span>Confidence: {Math.round(conv.messages[0].confidence * 100)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}