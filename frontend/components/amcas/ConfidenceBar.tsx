"use client";

import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  value: number; // 0–100
  label?: string;
  size?: "sm" | "md";
  showValue?: boolean;
}

export default function ConfidenceBar({
  value,
  label,
  size = "md",
  showValue = true,
}: ConfidenceBarProps) {
  const segmentCount = size === "sm" ? 20 : 25;
  const filledCount = Math.round((value / 100) * segmentCount);

  const segmentColor =
    value >= 80
      ? "bg-chart-2"
      : value >= 60
      ? "bg-primary"
      : "bg-chart-4";

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className={cn(
              "font-mono uppercase tracking-widest text-muted-foreground",
              size === "sm" ? "text-[9px]" : "text-[10px]"
            )}>
              {label}
            </span>
          )}
          {showValue && (
            <span className={cn(
              "font-mono font-medium text-foreground",
              size === "sm" ? "text-[9px]" : "text-xs"
            )}>
              {value}%
            </span>
          )}
        </div>
      )}
      {/* Segmented block bar — retro terminal style */}
      <div className="flex items-center gap-px">
        {Array.from({ length: segmentCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 transition-colors duration-500",
              size === "sm" ? "h-1.5" : "h-2",
              i < filledCount ? segmentColor : "bg-secondary border border-border/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}
