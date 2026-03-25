"use client";

import { MEMORY_DATA } from "@/lib/mock-api";
import MemoryCard from "../MemoryCard";
import ConfidenceBar from "../ConfidenceBar";
import { Brain, TrendingUp, Network, Layers } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useCssVars } from "@/hooks/use-css-vars";

const CLUSTER_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Recharts tooltip needs actual computed string values — read them via hook
const CHART_VAR_KEYS = [
  "--svg-tooltip-bg",
  "--svg-tooltip-border",
  "--svg-tooltip-text",
  "--svg-text-muted",
  "--svg-chart-line",
  "--svg-chart-grid",
];

export default function MemoryPage() {
  const { pastTasks, clusters, timeline } = MEMORY_DATA;
  const cssVars = useCssVars(CHART_VAR_KEYS);

  const tooltipBg     = cssVars["--svg-tooltip-bg"]     || "#1a1a1a";
  const tooltipBorder = cssVars["--svg-tooltip-border"]  || "#333";
  const tooltipText   = cssVars["--svg-tooltip-text"]    || "#e0e0e0";
  const textMuted     = cssVars["--svg-text-muted"]      || "#888";
  const chartLine     = cssVars["--svg-chart-line"]      || "#c8a060";
  const chartGrid     = cssVars["--svg-chart-grid"]      || "#2a2a2a";

  // Compute dynamic viewBox from cluster positions to fit all clusters
  const xs = clusters.map(c => c.x);
  const ys = clusters.map(c => c.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  // Ensure non-zero range
  if (minX === maxX) { minX -= 10; maxX += 10; }
  if (minY === maxY) { minY -= 10; maxY += 10; }

  // Add 15% padding around data
  const padX = (maxX - minX) * 0.20;
  const padY = (maxY - minY) * 0.20;
  const vbX = minX - padX;
  const vbY = minY - padY;
  const vbW = maxX - minX + 2 * padX;
  const vbH = maxY - minY + 2 * padY;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  return (
    <div className="h-full overflow-y-auto font-mono">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border shrink-0 flex items-center gap-2.5">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono tracking-widest text-foreground uppercase">Memory Intelligence</span>
        <span className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase hidden sm:block">
          / Episodic retrieval + knowledge indexing
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Stored Tasks",    value: "147", icon: Layers,    sub: "+12 this week" },
            { label: "Avg Similarity",  value: "0.81", icon: Network,  sub: "Top retrieved" },
            { label: "Active Memories", value: "003", icon: Brain,     sub: "Influencing now" },
            { label: "Quality Score",   value: "93%",  icon: TrendingUp, sub: "+8% this month" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground leading-none">{stat.value}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-1.5 tracking-wide">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Retrieved Tasks */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Retrieved Past Tasks</p>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {pastTasks.map((task) => (
                <MemoryCard key={task.id} {...task} />
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Knowledge Clusters SVG — uses CSS variables */}
            <div className="bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Knowledge Clusters</span>
              </div>
              <div className="relative h-44">
                <svg
                  width="100%" height="100%"
                  viewBox={viewBox}
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  <defs>
                    <pattern id="memgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="0.5" cy="0.5" r="0.5" fill="var(--svg-grid)" />
                    </pattern>
                  </defs>
                  <rect width="320" height="180" fill="url(#memgrid)" />

                  {/* Connector lines */}
                  {clusters.slice(0, -1).map((c, i) => {
                    const next = clusters[i + 1];
                    return (
                      <line key={i}
                        x1={c.x} y1={c.y} x2={next.x} y2={next.y}
                        stroke="var(--svg-edge)" strokeWidth="1" strokeDasharray="3 3"
                      />
                    );
                  })}

                  {/* Cluster bubbles */}
                  {clusters.map((cluster, i) => {
                    const colorVar = CLUSTER_COLOR_VARS[i % CLUSTER_COLOR_VARS.length];
                    const size = 18 + cluster.count * 1.8;
                    return (
                      <g key={cluster.id}>
                        <circle
                          cx={cluster.x} cy={cluster.y} r={size}
                          fill="currentColor"
                          style={{
                            color: colorVar,
                            fillOpacity: 0.1,
                          }}
                          stroke="currentColor"
                          strokeOpacity={0.45}
                          strokeWidth="1"
                        />
                        <text x={cluster.x} y={cluster.y - 1} textAnchor="middle"
                          fill="var(--svg-text-primary)" fontSize="8" fontWeight="600">
                          {cluster.label}
                        </text>
                        <text x={cluster.x} y={cluster.y + 10} textAnchor="middle"
                          fill="var(--svg-text-muted)" fontSize="7">
                          {cluster.count}t
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Memory Influence */}
            <div className="bg-card border border-border p-4">
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Memory Influence</p>
              <div className="space-y-3">
                {pastTasks.filter((t) => t.influenced).map((task) => (
                  <div key={task.id} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-muted-foreground truncate max-w-[140px] tracking-wide">{task.title}</span>
                      <span className="text-primary">{Math.round(task.similarity * 100)}%</span>
                    </div>
                    <ConfidenceBar value={Math.round(task.similarity * 100)} size="sm" showValue={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Growth Timeline — Recharts with theme-aware colors via hook */}
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Knowledge Growth Timeline</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: textMuted, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fill: textMuted, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false} tickLine={false} width={24}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "0px",
                  color: tooltipText,
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
                labelStyle={{ color: textMuted }}
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke={chartLine}
                strokeWidth={1.5}
                dot={{ fill: chartLine, r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: chartLine, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
