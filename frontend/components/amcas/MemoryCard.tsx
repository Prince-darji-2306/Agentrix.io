"use client";

import { cn } from "@/lib/utils";
import ConfidenceBar from "./ConfidenceBar";
import { Clock, Tag, Zap } from "lucide-react";

interface MemoryCardProps {
  id: string;
  title: string;
  summary: string;
  similarity: number;
  timestamp: string;
  cluster: string;
  influenced: boolean;
}

export default function MemoryCard({ title, summary, similarity, timestamp, cluster, influenced }: MemoryCardProps) {
  return (
    <div className={cn(
      "bg-card border p-4 space-y-3 transition-all duration-150 hover:border-primary/35 hover:bg-primary/4 cursor-default font-mono",
      influenced ? "border-primary/25" : "border-border"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[11px] font-bold text-foreground truncate tracking-wide uppercase">{title}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{summary}</p>
        </div>
        {influenced && (
          <div className="shrink-0 flex items-center gap-1 text-primary border border-primary/30 px-1.5 py-0.5">
            <Zap className="w-2.5 h-2.5" />
            <span className="text-[8px] tracking-widest uppercase">Active</span>
          </div>
        )}
      </div>

      <ConfidenceBar label="Similarity" value={Math.round(similarity * 100)} size="sm" />

      <div className="flex items-center gap-3 text-[9px] text-muted-foreground tracking-wide uppercase">
        <span className="flex items-center gap-1">
          <Tag className="w-2.5 h-2.5" />
          {cluster}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-2.5 h-2.5" />
          {timestamp}
        </span>
      </div>
    </div>
  );
}
