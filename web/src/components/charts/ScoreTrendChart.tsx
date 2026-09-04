"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

/**
 * 디톡스 점수 트렌드 라인 차트.
 *
 * WeeklyBarChart와 같은 이유로 recharts를 이 파일에 격리하고
 * 페이지에서는 next/dynamic({ ssr: false })로 불러온다.
 */

export interface TrendPoint {
  label: string;
  score: number;
  type: "daily" | "weekly";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.score >= 70 ? "#3DDB87" : d.score >= 40 ? "#facc15" : "#f87171";
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>{d.label}</p>
      <p className="font-bold mt-0.5" style={{ color }}>{d.score}점</p>
    </div>
  );
}

export default function ScoreTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -28 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
          axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
        <ReferenceLine y={70} stroke="rgba(61,219,135,0.2)" strokeDasharray="4 4" />
        <Line
          type="monotone" dataKey="score"
          stroke="#3DDB87" strokeWidth={2}
          dot={{ fill: "#3DDB87", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#3DDB87", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
