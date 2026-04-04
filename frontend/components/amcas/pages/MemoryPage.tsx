"use client";

import { useState, useEffect } from "react";
import { getMemoryPdfs, PdfSummary } from "@/lib/api";
import ConfidenceBar from "../ConfidenceBar";
import { Brain, TrendingUp, Network, Layers, FileText, Loader2 } from "lucide-react";
import { useCssVars } from "@/hooks/use-css-vars";

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
  const [pdfs, setPdfs] = useState<PdfSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cssVars = useCssVars(CHART_VAR_KEYS);

  useEffect(() => {
    loadPdfs();
  }, []);

  async function loadPdfs() {
    try {
      setLoading(true);
      const data = await getMemoryPdfs();
      setPdfs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load PDFs");
    } finally {
      setLoading(false);
    }
  }

  const tooltipBg = cssVars["--svg-tooltip-bg"] || "#1a1a1a";
  const tooltipBorder = cssVars["--svg-tooltip-border"] || "#333";
  const tooltipText = cssVars["--svg-tooltip-text"] || "#e0e0e0";
  const textMuted = cssVars["--svg-text-muted"] || "#888";
  const chartLine = cssVars["--svg-chart-line"] || "#c8a060";
  const chartGrid = cssVars["--svg-chart-grid"] || "#2a2a2a";

  // Group PDFs by topic tags for cluster visualization
  const tagCounts: Record<string, number> = {};
  pdfs.forEach((pdf) => {
    (pdf.topic_tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const clusters = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count], i) => ({
      id: `c${i}`,
      label,
      count,
      x: 80 + (i % 3) * 120,
      y: 60 + Math.floor(i / 3) * 100,
    }));

  let totalQuality = 0;
  let qualityCount = 0;
  pdfs.forEach((pdf) => {
    if (typeof pdf.quality_score === "number") {
      totalQuality += pdf.quality_score;
      qualityCount++;
    }
  });
  const avgQualityStr = qualityCount > 0 ? Math.round(totalQuality / qualityCount) + "%" : "N/A";

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
            { label: "Uploaded PDFs", value: String(pdfs.length).padStart(3, "0"), icon: FileText, sub: "Total documents" },
            { label: "Topic Clusters", value: String(clusters.length).padStart(2, "0"), icon: Network, sub: "Knowledge areas" },
            { label: "Active Memories", value: String(Math.min(pdfs.length, 3)).padStart(3, "0"), icon: Brain, sub: "Ready for RAG" },
            { label: "Quality Score", value: pdfs.length > 0 ? avgQualityStr : "N/A", icon: TrendingUp, sub: pdfs.length > 0 ? "Average relevance" : "Upload PDFs to score" },
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
          {/* PDF Summaries */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Uploaded Documents</p>
              <div className="flex-1 h-px bg-border" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="ml-2 text-xs text-muted-foreground">Loading documents...</span>
              </div>
            ) : error ? (
              <div className="bg-card border border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">{error}</p>
                <button
                  onClick={loadPdfs}
                  className="mt-2 text-[9px] text-primary hover:underline uppercase tracking-widest"
                >
                  Retry
                </button>
              </div>
            ) : pdfs.length === 0 ? (
              <div className="bg-card border border-border p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1">Upload PDFs in the chat to build your knowledge base</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pdfs.map((pdf) => (
                  <div key={pdf.id} className="bg-card border border-border p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <FileText className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono font-semibold text-foreground truncate">{pdf.doc_name}</p>
                        {pdf.topic_tags && pdf.topic_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pdf.topic_tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="text-[7px] font-mono px-1.5 py-0.5 border border-border text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground line-clamp-2 leading-relaxed">
                      {pdf.doc_summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Knowledge Clusters SVG */}
            <div className="bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Knowledge Clusters</span>
              </div>
              <div className="relative h-44">
                {clusters.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[9px] text-muted-foreground/50 text-center">
                      No clusters yet.<br />Upload PDFs to generate.
                    </p>
                  </div>
                ) : (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 200"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    <defs>
                      <pattern id="memgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="0.5" cy="0.5" r="0.5" fill="var(--svg-grid)" />
                      </pattern>
                    </defs>
                    <rect width="400" height="200" fill="url(#memgrid)" />

                    {/* Connector lines */}
                    {clusters.slice(0, -1).map((c, i) => {
                      const next = clusters[i + 1];
                      return (
                        <line
                          key={i}
                          x1={c.x}
                          y1={c.y}
                          x2={next.x}
                          y2={next.y}
                          stroke="var(--svg-edge)"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                      );
                    })}

                    {/* Cluster bubbles */}
                    {clusters.map((cluster, i) => {
                      const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];
                      const colorVar = colors[i % colors.length];
                      const size = 18 + cluster.count * 5;
                      return (
                        <g key={cluster.id}>
                          <circle
                            cx={cluster.x}
                            cy={cluster.y}
                            r={size}
                            fill="currentColor"
                            style={{
                              color: colorVar,
                              fillOpacity: 0.1,
                            }}
                            stroke="currentColor"
                            strokeOpacity={0.45}
                            strokeWidth="1"
                          />
                          <text
                            x={cluster.x}
                            y={cluster.y - 1}
                            textAnchor="middle"
                            fill="var(--svg-text-primary)"
                            fontSize="8"
                            fontWeight="600"
                          >
                            {cluster.label}
                          </text>
                          <text
                            x={cluster.x}
                            y={cluster.y + 10}
                            textAnchor="middle"
                            fill="var(--svg-text-muted)"
                            fontSize="7"
                          >
                            {cluster.count}t
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border p-4">
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Document Stats</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground">Total documents</span>
                  <span className="text-primary">{pdfs.length}</span>
                </div>
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground">Unique tags</span>
                  <span className="text-primary">{Object.keys(tagCounts).length}</span>
                </div>
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground">Avg tags/doc</span>
                  <span className="text-primary">
                    {pdfs.length > 0
                      ? (pdfs.reduce((s, p) => s + (p.topic_tags?.length || 0), 0) / pdfs.length).toFixed(1)
                      : "0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}