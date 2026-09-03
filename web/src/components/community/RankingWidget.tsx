"use client";

import { useEffect, useState } from "react";
import { fetchRanking, type RankingEntry } from "@/services/community";

/* ── 주간 랭킹 위젯 ────────────────────────────────────────────
   기준: 최근 7일 일간 분석의 디톡스 점수 평균.
   분석 횟수가 기준 미만인 사용자는 서버에서 제외된다.
   ────────────────────────────────────────────────────────── */

const MEDALS = ["🥇", "🥈", "🥉"];

function Row({ entry }: { entry: RankingEntry }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: entry.isMe ? "rgba(61,219,135,0.08)" : "transparent",
        border: `1px solid ${entry.isMe ? "rgba(61,219,135,0.22)" : "transparent"}`,
      }}
    >
      <span
        className="w-6 text-center text-sm font-bold shrink-0"
        style={{ color: entry.rank <= 3 ? undefined : "var(--text-faint)" }}
      >
        {MEDALS[entry.rank - 1] ?? entry.rank}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
          {entry.name}
          {entry.isMe && <span style={{ color: "#3DDB87" }}> (나)</span>}
        </p>
        <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
          분석 {entry.analysisCount}회
        </p>
      </div>

      <span className="text-sm font-extrabold shrink-0" style={{ color: "#3DDB87" }}>
        {entry.avgScore}
      </span>
    </div>
  );
}

export default function RankingWidget() {
  const [data, setData] = useState<{
    ranking: RankingEntry[];
    myRank: RankingEntry | null;
    minAnalyses: number;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRanking()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "랭킹을 불러오지 못했습니다."));
  }, []);

  // Top 10 안에 이미 내가 있으면 하단에 중복 표시하지 않는다
  const showMyRankSeparately =
    data?.myRank != null && !data.ranking.some((r) => r.isMe);

  return (
    <aside
      className="rounded-2xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>
          주간 디톡스 랭킹
        </h2>
        <span className="text-xs" style={{ color: "var(--text-ghost)" }}>최근 7일</span>
      </div>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-faint)" }}>
        일간 분석 디톡스 점수 평균 기준
      </p>

      {error ? (
        <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
      ) : !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "var(--bg-bar)" }} />
          ))}
        </div>
      ) : data.ranking.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
          아직 랭킹에 오른 사람이 없어요.
          <br />
          최근 7일간 일간 분석을 {data.minAnalyses}회 이상 하면 순위에 등록됩니다.
        </p>
      ) : (
        <div className="space-y-0.5">
          {data.ranking.map((entry) => (
            <Row key={entry.rank} entry={entry} />
          ))}

          {showMyRankSeparately && (
            <>
              <div className="my-2 text-center text-xs" style={{ color: "var(--text-ghost)" }}>⋯</div>
              <Row entry={data.myRank!} />
            </>
          )}
        </div>
      )}
    </aside>
  );
}
