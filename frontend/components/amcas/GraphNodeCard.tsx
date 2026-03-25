"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, RefreshCw, Clock, X } from "lucide-react";
import type { GraphNode as StoreGraphNode, GraphNodeType } from "@/lib/store";

export type NodeType = GraphNodeType;
export type NodeStatus = "pending" | "running" | "completed" | "error";

// Re-export from store to keep consistent
export type GraphNode = StoreGraphNode;

const TYPE_BADGE: Record<NodeType, string> = {
  orchestrator: "border-chart-1/40 text-chart-1",
  agent:        "border-chart-1/30 text-chart-1",
  critic:       "border-chart-5/40 text-chart-5",
  output:       "border-chart-4/40 text-chart-4",
};

interface GraphNodePanelProps {
  node: GraphNode;
  onClose: () => void;
}

export function GraphNodePanel({ node, onClose }: GraphNodePanelProps) {
  const badgeClass = TYPE_BADGE[node.type];

  return (
    <div className="h-full flex flex-col font-mono">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-muted/20 shrink-0">
        <div className="min-w-0">
          <span className={cn("text-[8px] tracking-widest border px-1.5 py-0.5 uppercase", badgeClass)}>
            {node.type}
          </span>
          <h3 className="text-xs font-bold text-foreground mt-2 tracking-wide uppercase">{node.label}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{node.description}</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0 ml-2"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Status row */}
        <div className="flex items-center gap-2 border border-border bg-secondary/30 px-3 py-2">
          {node.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-chart-2 shrink-0" />}
          {node.status === "running" && <RefreshCw className="w-3.5 h-3.5 text-chart-3 shrink-0 animate-spin" />}
          {node.status === "error" && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
          <span className="text-[10px] uppercase tracking-widest text-foreground">{node.status}</span>
          {node.timeTaken && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground">{node.timeTaken}</span>
            </div>
          )}
        </div>

        {/* Output block */}
        <div>
          <p className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase mb-1.5">Agent Output</p>
          <div className="border border-border bg-background/60 p-3 text-[10px] text-muted-foreground leading-relaxed max-h-60 overflow-y-auto">
            <span className="text-primary/60">&gt;</span>{" "}
            {node.output || `${node.label} processed input and produced a structured result contributing to the final synthesis.`}
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy default export kept for compatibility
export default function GraphNodeCard({ node, isSelected, onClick }: {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  return null; // Rendered inline in SVG now
}
