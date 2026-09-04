"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fmt } from "@/lib/format";

/**
 * 주간 스크린타임 바 차트.
 *
 * recharts를 이 파일에만 두고 페이지에서는 next/dynamic({ ssr: false })로 불러온다.
 * 차트는 어차피 클라이언트 전용이라 SSR로 얻을 게 없고,
 * 정적 import로 두면 대시보드 초기 JS가 ~107kB 늘어난다.
 */

export interface WeekPoint {
  day: string;
  minutes: number;
  isToday: boolean;
}

// recharts의 Tooltip content prop은 내부 타입이 공개되지 않아 any로 받는다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="font-bold text-brand mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function WeeklyBarChart({ data, maxMin }: { data: WeekPoint[]; maxMin: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={22} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
          axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => v === 0 ? "" : `${Math.floor(v / 60)}h`}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          axisLine={false} tickLine={false} domain={[0, maxMin]} />
        <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
        <Bar dataKey="minutes" radius={[5, 5, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i}
              fill={d.isToday ? "#3DDB87" : d.minutes > 0 ? "rgba(61,219,135,0.3)" : "rgba(255,255,255,0.04)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
