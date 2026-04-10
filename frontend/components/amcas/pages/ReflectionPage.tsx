"use client";

import { useEffect, useMemo, useState } from "react";
import { getReflectionData, ReflectionData } from "@/lib/api";
import RadarChart from "../RadarChart";
import ReflectionReport from "../ReflectionReport";
import ConfidenceBar from "../ConfidenceBar";
import { FlaskConical, Brain, CheckCircle2, XCircle, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReflectionPage() {
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReflectionData();
        if (mounted) setReflectionData(data);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load reflection data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const fallbackData: ReflectionData = {
    scores: {
      confidenceScore: 0,
      logicalConsistency: 0,
      factualReliability: 0,
      selfCorrectionTriggered: false,
    },
    radarData: [
      { metric: "Planning", value: 0 },
      { metric: "Reasoning", value: 0 },
      { metric: "Verification", value: 0 },
      { metric: "Adaptation", value: 0 },
      { metric: "Confidence", value: 0 },
    ],
    issues: [],
  };

  const { scores, radarData, issues } = reflectionData ?? fallbackData;

  const scoreItems = useMemo(() => [
    { label: "Confidence Score", value: scores.confidenceScore, icon: TrendingUp, color: "text-primary" },
    { label: "Logical Consistency", value: scores.logicalConsistency, icon: Brain, color: "text-chart-2" },
    { label: "Factual Reliability", value: scores.factualReliability, icon: Shield, color: "text-chart-3" },
  ], [scores.confidenceScore, scores.logicalConsistency, scores.factualReliability]);

  return (
    <div className="h-full overflow-y-auto font-mono">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2.5 shrink-0">
        <FlaskConical className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono tracking-widest text-foreground uppercase">Self-Reflection Lab</span>
        <span className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase hidden sm:block">
          / Autonomous reasoning quality evaluation
        </span>
      </div>

      <div className="p-5 space-y-5">
        {loading && (
          <div className="text-[10px] tracking-widest text-muted-foreground uppercase">Loading reflection telemetry...</div>
        )}
        {error && (
          <div className="text-[10px] tracking-widest text-destructive uppercase">
            Reflection data unavailable: {error}
          </div>
        )}

        {/* Score cards */}
        <div className="grid grid-cols-4 gap-3">
          {scoreItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("w-3.5 h-3.5", item.color)} />
                  <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase leading-tight">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-end gap-1 mb-3">
                  <p className="text-3xl font-bold font-mono text-foreground leading-none">{item.value}</p>
                  <span className="text-base text-muted-foreground mb-0.5">%</span>
                </div>
                <ConfidenceBar value={item.value} size="sm" showValue={false} />
              </div>
            );
          })}

          {/* Self-correction card */}
          <div className="bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-3.5 h-3.5 text-chart-4" />
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Self-Correction</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-sm font-bold font-mono mb-2",
              scores.selfCorrectionTriggered ? "text-chart-4" : "text-chart-2"
            )}>
              {scores.selfCorrectionTriggered ? (
                <><CheckCircle2 className="w-4 h-4" /> TRIGGERED</>
              ) : (
                <><XCircle className="w-4 h-4" /> NOMINAL</>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed tracking-wide">
              {scores.selfCorrectionTriggered
                ? `Applied corrections informed by ${issues.length} detected issue${issues.length === 1 ? "" : "s"}.`
                : "All validation checks passed cleanly."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {/* Radar chart */}
          <div className="col-span-2 bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Cognitive Profile</span>
            </div>
            <p className="text-[9px] font-mono text-muted-foreground/60 tracking-wide mb-3">
              Multi-dimensional capability assessment
            </p>
            <RadarChart data={radarData} />
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {radarData.map((d) => (
                <div key={d.metric} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary" />
                  <span className="text-[9px] font-mono text-muted-foreground">{d.metric}</span>
                  <span className="text-[9px] font-mono text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reflection report */}
          <div className="col-span-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
                Structured Reflection Report
              </span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] font-mono text-muted-foreground">{issues.length} issues</span>
            </div>
            {issues.length > 0 ? (
              <ReflectionReport issues={issues} />
            ) : (
              <div className="border border-border bg-card p-4 text-[10px] text-muted-foreground tracking-wide uppercase">
                No detected mistakes to report.
              </div>
            )}
          </div>
        </div>

        {/* Performance matrix */}
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Performance Matrix</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {radarData.map((d) => (
              <div key={d.metric} className="text-center space-y-2">
                <div className="relative w-full pt-[100%]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 60 60" className="w-full h-full">
                      <circle cx="30" cy="30" r="24" fill="none"
                        stroke="var(--border)" strokeWidth="3" />
                      <circle cx="30" cy="30" r="24" fill="none"
                        stroke="var(--primary)" strokeWidth="3"
                        strokeLinecap="square"
                        strokeDasharray={`${(d.value / 100) * 150.8} 150.8`}
                        strokeDashoffset="37.7"
                        transform="rotate(-90 30 30)"
                        style={{ transition: "stroke-dasharray 1s ease" }}
                      />
                      <text x="30" y="35" textAnchor="middle"
                        fill="var(--foreground)" fontSize="13" fontWeight="700"
                        fontFamily="JetBrains Mono, monospace">
                        {d.value}
                      </text>
                    </svg>
                  </div>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground tracking-wide uppercase">{d.metric}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
