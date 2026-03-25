"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useCssVars } from "@/hooks/use-css-vars";

interface RadarChartProps {
  data: { metric: string; value: number }[];
}

const VARS = ["--svg-chart-grid", "--svg-chart-line", "--svg-text-muted"];

export default function RadarChart({ data }: RadarChartProps) {
  const cssVars = useCssVars(VARS);

  const gridColor   = cssVars["--svg-chart-grid"]  || "#333";
  const lineColor   = cssVars["--svg-chart-line"]   || "#c8a060";
  const mutedColor  = cssVars["--svg-text-muted"]   || "#888";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid gridType="polygon" stroke={gridColor} strokeWidth={1} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{
            fill: mutedColor,
            fontSize: 9,
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 500,
          }}
        />
        <Radar
          name="Cognitive Profile"
          dataKey="value"
          stroke={lineColor}
          fill={lineColor}
          fillOpacity={0.12}
          strokeWidth={1.5}
          dot={{ fill: lineColor, r: 3, strokeWidth: 0 }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
