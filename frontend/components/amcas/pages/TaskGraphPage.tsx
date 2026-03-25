"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { GraphNodePanel } from "../GraphNodeCard";
import type { GraphNode } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GitFork, Info } from "lucide-react";

type NodeType = "orchestrator" | "agent" | "critic" | "output";

const TYPE_COLORS: Record<NodeType, { fillAlpha: string; strokeAlpha: string; colorVar: string; label: string; badge: string }> = {
  orchestrator: {
    fillAlpha: "0.12",
    strokeAlpha: "0.55",
    colorVar: "var(--chart-1)",
    label: "Orchestrator",
    badge: "border-chart-1/40 text-chart-1 bg-chart-1/8",
  },
  agent: {
    fillAlpha: "0.08",
    strokeAlpha: "0.35",
    colorVar: "var(--chart-1)",
    label: "Agent",
    badge: "border-chart-1/30 text-chart-1 bg-chart-1/5",
  },
  critic: {
    fillAlpha: "0.12",
    strokeAlpha: "0.55",
    colorVar: "var(--chart-5)",
    label: "Critic",
    badge: "border-chart-5/40 text-chart-5 bg-chart-5/8",
  },
  output: {
    fillAlpha: "0.12",
    strokeAlpha: "0.55",
    colorVar: "var(--chart-4)",
    label: "Output",
    badge: "border-chart-4/40 text-chart-4 bg-chart-4/8",
  },
};

const LEGEND_TYPES: NodeType[] = ["orchestrator", "agent", "critic", "output"];

export default function TaskGraphPage() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const { graphNodes, graphEdges } = useAppStore();
  const nodeMap = useMemo(() => Object.fromEntries(graphNodes.map((n) => [n.id, n])), [graphNodes]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Graph area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-2.5">
            <GitFork className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono tracking-widest text-foreground uppercase">Task Graph Explorer</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEGEND_TYPES.map((type) => (
              <span
                key={type}
                className={cn(
                  "text-[8px] font-mono tracking-widest px-1.5 py-0.5 border uppercase",
                  TYPE_COLORS[type].badge
                )}
              >
                {TYPE_COLORS[type].label}
              </span>
            ))}
          </div>
        </div>

        {/* SVG Graph — uses CSS variables so it responds to theme */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          {graphNodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <GitFork className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-xs font-mono tracking-widest uppercase">No execution data yet</p>
              <p className="text-[10px] mt-1">Run deep research to visualize the task graph</p>
            </div>
          ) : (
            <svg
              width="800"
              height="620"
              viewBox="0 0 800 620"
              className="w-full max-w-3xl mx-auto"
              style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace" }}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.8" fill="var(--svg-grid, currentColor)" fillOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="800" height="620" fill="url(#grid)" />

              {/* Edges */}
              <g>
                {graphEdges.map((edge) => {
                  const from = nodeMap[edge.from];
                  const to = nodeMap[edge.to];
                  if (!from || !to) return null;
                  return (
                    <g key={edge.id}>
                      <line
                        x1={from.x} y1={from.y + 25}
                        x2={to.x} y2={to.y - 25}
                        stroke="var(--svg-edge)"
                        strokeWidth="1"
                        strokeDasharray="5 4"
                      />
                      <circle cx={to.x} cy={to.y - 26} r="2" fill="var(--svg-edge)" />
                    </g>
                  );
                })}
              </g>

              {/* Nodes */}
              {graphNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const type = node.type as NodeType;
                const colors = TYPE_COLORS[type];
                const colorVar = colors.colorVar;

                const statusColor =
                  node.status === "completed" ? "var(--chart-2)"
                  : node.status === "running"  ? "var(--chart-3)"
                  : "var(--muted)";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - 70}, ${node.y - 25})`}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Node background */}
                    <rect
                      width="140" height="50" rx="0"
                      fill={isSelected ? `color-mix(in oklch, ${colorVar} ${colors.fillAlpha === "0.12" ? "12%" : "8%"}, transparent)` : "var(--svg-node-default-fill)"}
                      stroke={isSelected ? colorVar : "var(--svg-node-default-stroke)"}
                      strokeWidth={isSelected ? "1.5" : "1"}
                    />
                    {/* Corner bracket marks when selected */}
                    {isSelected && (
                      <>
                        <line x1="0" y1="5" x2="0" y2="0" stroke={colorVar} strokeWidth="2" />
                        <line x1="0" y1="0" x2="5" y2="0" stroke={colorVar} strokeWidth="2" />
                        <line x1="135" y1="0" x2="140" y2="0" stroke={colorVar} strokeWidth="2" />
                        <line x1="140" y1="0" x2="140" y2="5" stroke={colorVar} strokeWidth="2" />
                        <line x1="0" y1="45" x2="0" y2="50" stroke={colorVar} strokeWidth="2" />
                        <line x1="0" y1="50" x2="5" y2="50" stroke={colorVar} strokeWidth="2" />
                        <line x1="135" y1="50" x2="140" y2="50" stroke={colorVar} strokeWidth="2" />
                        <line x1="140" y1="45" x2="140" y2="50" stroke={colorVar} strokeWidth="2" />
                      </>
                    )}
                    {/* Status dot */}
                    
                    <circle cx="128" cy="10" r="3" fill={statusColor} />
                    {/* Label */}
                    <text
                      x="70" y="22"
                      textAnchor="middle"
                      fill={isSelected ? colorVar : "var(--svg-text-primary)"}
                      fontSize="10" fontWeight="600"
                    >
                      {node.label}
                    </text>
                    {/* Sub-label */}
                    <text
                      x="70" y="37"
                      textAnchor="middle"
                      fill="var(--svg-text-muted)"
                      fontSize="8"
                    >
                      {node.type.toUpperCase()} · {node.timeTaken}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {!selectedNode && (
          <div className="px-5 pb-3 flex items-center gap-2 text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase">
            <Info className="w-3 h-3" />
            Click any node to inspect output and execution details
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedNode && (
        <div className="w-72 border-l border-border bg-card shrink-0 overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <GraphNodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      )}
    </div>
  );
}
