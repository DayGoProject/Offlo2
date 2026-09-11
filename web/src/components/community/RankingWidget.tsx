"use client";

import { useEffect, useState } from "react";
import { fetchRanking, type RankingEntry } from "@/services/community";

/* ── 주간 랭킹 위젯 ────────────────────────────────────────────
   기준: 최근 7일 일간 분석의 디톡스 점수 평균.
   분석 횟수가 기준 미만인 사용자는 서버에서 제외된다.

   메달 이모지를 쓰지 않는다 — 다크 팔레트에서 컬러 이모지 세 개가
   유일한 색 덩어리가 되어 정작 강조해야 할 내 순위를 이긴다.
   1~3위는 숫자 굵기와 색으로만 구분한다.
   ────────────────────────────────────────────────────────── */

function Row({ entry }: { entry: RankingEntry }) {
  const top3 = entry.rank <= 3;
  const accent = entry.isMe || entry.rank === 1;

  return (
    <div
      className="flex items-center gap-3 h-[42px] shrink-0 rounded-lg"
      style={{
        background: entry.isMe ? "var(--accent-soft)" : undefined,
        paddingInline: entry.isMe ? 10 : 0,
      }}
    >
      <span
        className="num text-[13px] shrink-0 w-5"
        style={{
          color: accent ? "var(--color-bloom)" : "var(--text-muted)",
          fontWeight: top3 || entry.isMe ? 600 : 400,
          letterSpacing: 0,
        }}
      >
        {entry.rank}
      </span>

      <span
        className="text-[13px] leading-4 flex-1 min-w-0 truncate"
        style={{
          color: entry.isMe ? "var(--color-bloom)" : top3 ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: entry.isMe ? 600 : 400,
        }}
        title={`분석 ${entry.analysisCount}회`}
      >
        {entry.name}
        {entry.isMe && " (나)"}
      </span>

      <span
        className="num text-sm leading-[18px] shrink-0 w-[34px] text-right"
        style={{
          color: entry.isMe ? "var(--color-bloom)" : top3 ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: entry.isMe ? 600 : 500,
          letterSpacing: 0,
        }}
      >
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
  const showMyRankSeparately = data?.myRank != null && !data.ranking.some((r) => r.isMe);

  return (
    <aside
      className="flex flex-col gap-4 w-full px-6 py-[22px] rounded-card"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
          주간 디톡스 랭킹
        </h2>
        <span className="text-[11px] leading-[14px] shrink-0" style={{ color: "var(--text-muted)" }}>
          최근 7일
        </span>
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : !data ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[42px] rounded-lg animate-pulse shrink-0" style={{ background: "var(--bg-bar)" }} />
          ))}
        </div>
      ) : data.ranking.length === 0 ? (
        <p className="text-xs leading-[18px]" style={{ color: "var(--text-muted)" }}>
          아직 랭킹에 오른 사람이 없어요. 최근 7일간 일간 분석을 {data.minAnalyses}회 이상 하면 순위에 등록됩니다.
        </p>
      ) : (
        <div className="flex flex-col w-full">
          {data.ranking.map((entry) => (
            <Row key={entry.rank} entry={entry} />
          ))}

          {showMyRankSeparately && (
            <>
              <div className="text-center text-xs py-1" style={{ color: "var(--text-ghost)" }}>
                ⋯
              </div>
              <Row entry={data.myRank!} />
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-2.5 w-full pt-3.5" style={{ borderTop: "1px solid var(--border-card)" }}>
        <svg width="13" height="13" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-[3px]">
          <circle cx="7" cy="7" r="5.8" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" />
          <path d="M7 4.2v3.2" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="7" cy="9.6" r="0.7" fill="var(--text-muted)" />
        </svg>
        <p className="text-[11px] leading-[18px]" style={{ color: "var(--text-muted)" }}>
          최근 7일 일간 분석의 디톡스 점수 평균입니다. 분석 {data?.minAnalyses ?? 3}회 미만은 순위에서 제외됩니다.
        </p>
      </div>
    </aside>
  );
}
