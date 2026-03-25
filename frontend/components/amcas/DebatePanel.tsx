"use client";

import { cn } from "@/lib/utils";
import { DebateMessage } from "@/lib/store";

interface DebatePanelProps {
  role: "proposer" | "critic";
  messages: DebateMessage[];
  isActive?: boolean;
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={cn("leading-relaxed", line === "" ? "h-2" : "")}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export default function DebatePanel({ role, messages, isActive = false }: DebatePanelProps) {
  const filtered = messages.filter((m) => m.role === role);

  const config = {
    proposer: {
      label: "PROPOSER",
      desc: "Defends thesis with evidence",
      headerColor: "border-chart-1/40 text-chart-1",
      activeBar: "bg-chart-1",
      id: "01",
    },
    critic: {
      label: "CRITIC",
      desc: "Challenges with counterarguments",
      headerColor: "border-chart-4/40 text-chart-4",
      activeBar: "bg-chart-4",
      id: "02",
    },
  }[role];

  return (
    <div className={cn(
      "flex flex-col h-full border bg-card overflow-hidden transition-all duration-300",
      isActive ? "border-border shadow-[inset_0_0_20px_-10px_var(--glow)]" : "border-border"
    )}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2.5 shrink-0">
        <span className={cn("text-[8px] font-mono tracking-widest border px-1.5 py-0.5 uppercase", config.headerColor)}>
          {config.id}
        </span>
        <div>
          <span className={cn("text-[10px] font-mono tracking-widest font-bold uppercase", config.headerColor)}>
            {config.label}
          </span>
          <p className="text-[9px] font-mono text-muted-foreground/60 tracking-wide">{config.desc}</p>
        </div>
        {isActive && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 animate-pulse", config.activeBar)} />
            <span className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase">Active</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground/40 uppercase">
              Awaiting debate topic…
            </span>
            <span className="inline-block w-1.5 h-3.5 bg-muted-foreground/20 animate-pulse" />
          </div>
        ) : (
          filtered.map((msg) => (
            <div key={msg.id} className="space-y-1">
              {msg.round !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono tracking-widest text-muted-foreground/50 uppercase">
                    Round_{msg.round.toString().padStart(2, "0")}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className="border border-border bg-background/50 p-3 text-[11px] font-mono text-foreground">
                {renderContent(msg.content)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
