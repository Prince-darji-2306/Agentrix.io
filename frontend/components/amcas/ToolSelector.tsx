"use client";

import { ChatMode, useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Cpu, Users, Search, Paperclip, X, FileText, ChevronRight, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const MODES: { id: ChatMode; label: string; shortLabel: string; description: string; icon: React.ElementType; key: string }[] = [
  {
    id: "standard",
    label: "Standard",
    shortLabel: "STD",
    description: "Single-pass reasoning flow",
    icon: Cpu,
    key: "01",
  },
  {
    id: "multi-agent",
    label: "Multi-Agent",
    shortLabel: "MAS",
    description: "Orchestrator spawns specialized agents",
    icon: Users,
    key: "02",
  },
  {
    id: "deep-research",
    label: "Deep Research",
    shortLabel: "DRS",
    description: "Task decomposition + tools + verification",
    icon: Search,
    key: "03",
  },
];

interface ToolSelectorProps {
  onFileSelect?: () => void;
}

export default function ToolSelector({ onFileSelect }: ToolSelectorProps) {
  const { selectedMode, setSelectedMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isNonStandard = selectedMode !== "standard";
  const current = MODES.find((m) => m.id === selectedMode)!;
  const Icon = current.icon;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowModes(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Primary Action Button (Paperclip icon) */}
      {!isNonStandard && (
        <button
          onClick={() => setOpen(!open)}
          aria-label="Add attachment or change mode"
          className={cn(
            "w-7 h-7 flex items-center justify-center border font-mono text-sm transition-all duration-150",
            open
              ? "border-primary/50 bg-primary/12 text-primary"
              : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/8"
          )}
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Mode chip — shown when non-standard mode is active (but still opens the menu) */}
      {isNonStandard && (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 border font-mono text-xs tracking-wider uppercase transition-all duration-150",
            "border-primary/40 bg-primary/10 text-primary hover:bg-primary/16",
            open && "border-primary/60"
          )}
        >
          <Paperclip className="w-3 h-3 text-primary/70 mr-0.5" />
          <Icon className="w-3 h-3" />
          <span>{current.shortLabel}</span>
          {/* X to clear back to standard */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMode("standard");
              setOpen(false);
              setShowModes(false);
            }}
            className="ml-0.5 flex items-center justify-center w-4 h-4 hover:text-foreground transition-colors"
            aria-label="Remove mode"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        </button>
      )}

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-popover border border-border shadow-lg shadow-black/40 overflow-visible z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex flex-col">
            {/* File Upload Option */}
            <button
              onClick={() => {
                if (onFileSelect) onFileSelect();
                setOpen(false);
                setShowModes(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-border/40 font-mono text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <FileText className="w-4 h-4 shrink-0 text-primary/80" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block">Attach Files</span>
                <span className="text-[9px] text-muted-foreground uppercase opacity-70">Max 10 PDFs</span>
              </div>
            </button>

            {/* Reasoning Mode Option */}
            <div
              onMouseEnter={() => setShowModes(true)}
              onMouseLeave={() => setShowModes(false)}
              className="relative w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition-colors font-mono tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground cursor-default"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Zap className="w-4 h-4 shrink-0 text-chart-1/80" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold block">Reasoning Mode</span>
                  <span className="text-[9px] text-muted-foreground uppercase opacity-70">{current.shortLabel} Active</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />

              {/* Nested Reasoning Modes Menu */}
              {showModes && (
                <div className="absolute left-full bottom-0 ml-1 w-72 bg-popover border border-border shadow-lg shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                  <div className="px-3 py-2 border-b border-border bg-muted/30">
                    <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
                      Select Reasoning Mode
                    </span>
                  </div>
                  {MODES.map((mode) => {
                    const MIcon = mode.icon;
                    const isActive = mode.id === selectedMode;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setSelectedMode(mode.id);
                          setOpen(false);
                          setShowModes(false);
                        }}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/40 last:border-b-0 font-mono",
                          isActive
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 flex items-center justify-center border shrink-0 mt-0.5",
                          isActive ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                        )}>
                          <MIcon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] tracking-widest text-muted-foreground/50">{mode.key}</span>
                            <span className="text-xs font-mono font-medium tracking-wide">
                              {mode.label}
                            </span>
                            {isActive && (
                              <span className="ml-auto text-[8px] tracking-widest text-primary uppercase">active</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                            {mode.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
