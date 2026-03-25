"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Issue {
  id: string;
  issue: string;
  improvement: string;
  strategy: string;
  severity: "low" | "medium" | "high";
}

interface ReflectionReportProps {
  issues: Issue[];
}

const SEVERITY_CONFIG = {
  low: {
    icon: Info,
    borderClass: "border-chart-2/25",
    accentClass: "text-chart-2 border-chart-2/40",
    label: "LOW",
    code: "SEV_01",
  },
  medium: {
    icon: AlertTriangle,
    borderClass: "border-chart-4/25",
    accentClass: "text-chart-4 border-chart-4/40",
    label: "MED",
    code: "SEV_02",
  },
  high: {
    icon: AlertTriangle,
    borderClass: "border-destructive/30",
    accentClass: "text-destructive border-destructive/40",
    label: "HGH",
    code: "SEV_03",
  },
};

export default function ReflectionReport({ issues }: ReflectionReportProps) {
  return (
    <div className="space-y-2.5 font-mono">
      {issues.map((issue) => {
        const config = SEVERITY_CONFIG[issue.severity];
        const Icon = config.icon;
        return (
          <div key={issue.id} className={cn("border bg-card p-0 overflow-hidden", config.borderClass)}>
            {/* Header bar */}
            <div className={cn("flex items-center gap-2 px-3 py-2 border-b bg-muted/20", config.borderClass)}>
              <span className={cn("text-[8px] tracking-widest border px-1.5 py-0.5 uppercase font-bold", config.accentClass)}>
                {config.label}
              </span>
              <span className="text-[8px] tracking-widest text-muted-foreground uppercase">{config.code}</span>
              <Icon className={cn("w-3 h-3 ml-auto", config.accentClass.split(" ")[0])} />
              <CheckCircle2 className="w-3 h-3 text-chart-2" />
            </div>
            {/* Content */}
            <div className="p-3 space-y-2.5">
              <div>
                <p className="text-[8px] tracking-widest text-muted-foreground/60 uppercase mb-0.5">Issue Detected</p>
                <p className="text-[11px] text-foreground font-medium leading-relaxed">{issue.issue}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-2.5">
                <div>
                  <p className="text-[8px] tracking-widest text-muted-foreground/60 uppercase mb-0.5">Improvement Applied</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{issue.improvement}</p>
                </div>
                <div>
                  <p className="text-[8px] tracking-widest text-muted-foreground/60 uppercase mb-0.5">Future Strategy</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{issue.strategy}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
