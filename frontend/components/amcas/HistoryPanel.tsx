"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { X, MessageSquare, Clock, Trash2, Edit2, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const { chatSessions, currentChatId, setCurrentChat, deleteChat, clearAllChats, updateChatSession } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const navigate = useNavigate();

  const handleSelectChat = (id: string) => {
    // Always navigate to chat page first, then set the chat
    navigate("/chat");
    setCurrentChat(id);
    onClose();
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      deleteChat(id);
    }
  };

  const startEditing = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      updateChatSession(id, { title: editTitle.trim() });
    }
    setEditingId(null);
    setEditTitle("");
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle("");
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "standard": return "text-chart-2";
      case "multi-agent": return "text-chart-3";
      case "deep-research": return "text-chart-4";
      default: return "text-muted-foreground";
    }
  };

  // Simple relative time formatter
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
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
        onClick={onClose} />

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
              {chatSessions.length} session{chatSessions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {chatSessions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear all chat history?")) {
                    clearAllChats();
                  }
                }}
                title="Clear all"
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
          {chatSessions.length === 0 ? (
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
              {/* Sort by updatedAt desc */}
              {[...chatSessions]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((session) => {
                  const isActive = session.id === currentChatId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectChat(session.id)}
                      className={cn(
                        "group relative p-4 border transition-all cursor-pointer",
                        isActive
                          ? "border-primary/40 bg-primary/5 shadow-[inset_0_0_12px_-4px_var(--glow)]"
                          : "border-border hover:border-primary/30 bg-card hover:bg-primary/5"
                      )} >
                      {/* Selection overlay */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title & mode */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold text-foreground truncate flex-1">
                              {session.title}
                            </span>
                            <span className={cn("text-[9px] font-mono uppercase tracking-wider shrink-0", getModeColor(session.mode))}>
                              {session.mode.replace("-", " ")}
                            </span>
                            {editingId === session.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} >
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-32 bg-background border border-border text-xs font-mono text-foreground px-2 py-1 outline-none focus:border-primary"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(e, session.id);
                                    if (e.key === "Escape") cancelEdit(e);
                                  }}
                                />
                                <button
                                  onClick={(e) => saveEdit(e, session.id)}
                                  className="text-chart-2 hover:text-chart-2/80"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-destructive/70 hover:text-destructive"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => startEditing(e, session)}
                                title="Rename chat"
                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-[10px] font-mono text-muted-foreground line-clamp-2 mb-2">
                            {session.description}
                          </p>

                          {/* Meta */}
                          <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground/60">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(session.updatedAt)}
                            </span>
                            <span>{session.messages.length} messages</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteChat(e, session.id)}
                            title="Delete chat"
                            className="flex items-center justify-center w-8 h-8 text-destructive/70 hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary" />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
