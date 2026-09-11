"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Segmented from "@/components/app/Segmented";
import TrendLine from "@/components/charts/TrendLine";
import { fmtHM, fmtDate, fmtDateShort } from "@/lib/format";

interface AppUsage {
  name?: string;
  minutes?: number;
}

interface Analysis {
  id: string;
  periodType: "daily" | "weekly";
  totalMinutes: number;
  detoxScore: number;
  createdAt: string;
  isPremium: boolean;
  apps?: AppUsage[];
}

type Filter = "all" | "daily" | "weekly";

/** 상위 앱 2개를 "인스타그램 · 유튜브" 형태로 */
function topApps(a: Analysis): string {
  if (a.periodType === "weekly") return "주간 종합 리포트";
  if (!Array.isArray(a.apps) || a.apps.length === 0) return "—";
  return [...a.apps]
    .sort((x, y) => (y.minutes ?? 0) - (x.minutes ?? 0))
    .slice(0, 2)
    .map((x) => x.name)
    .filter(Boolean)
    .join(" · ");
}

/* 열 너비를 상수로 묶는다. 헤더와 데이터 행이 같은 값을 공유해야
   세로 라인이 어긋나지 않는다 — gap만으로는 정렬되지 않는다. */
const COL = {
  date: "w-[110px]",
  type: "w-[64px]",
  time: "w-[84px]",
  score: "w-[70px]",
};

function HeadCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[11px] leading-[14px] font-semibold shrink-0 ${className}`}
      style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
    >
      {children}
    </span>
  );
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        // 표의 "상위 앱" 열이 apps를 쓴다 — 목록 API의 옵트인 파라미터로 받는다
        const res = await fetch("/api/analyses?limit=100&includeApps=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAnalyses((await res.json()).analyses ?? []);
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || !user) return null;

  const filtered = filter === "all" ? analyses : analyses.filter((a) => a.periodType === filter);

  /* 추이 — 오래된 → 최신 순, 최근 20개 */
  const trend = [...filtered]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20)
    .map((a) => ({ label: fmtDateShort(a.createdAt), score: a.detoxScore }));

  const latest = trend[trend.length - 1]?.score ?? null;
  // 최근 7건의 변화폭 — 첫 값 대비 마지막 값
  const recent = trend.slice(-7);
  const delta = recent.length >= 2 ? recent[recent.length - 1].score - recent[0].score : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={loading ? "불러오는 중" : `총 ${analyses.length}개의 기록`}
        title="분석 기록"
        actions={
          <>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "전체" },
                { value: "daily", label: "일간" },
                { value: "weekly", label: "주간" },
              ]}
            />
            <Pill href="/analysis" variant="primary">
              오늘 분석하기
            </Pill>
          </>
        }
      />

      {/* ── 점수 추이 ── */}
      <section
        className="flex flex-col gap-[18px] w-full px-[22px] sm:px-7 py-6 rounded-card"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        <div className="flex items-center justify-between gap-3 w-full">
          <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
            디톡스 점수 추이
          </h2>
          {latest !== null && (
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="num text-[22px] leading-7" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                {latest}
              </span>
              {delta !== null && (
                <span
                  className="text-xs font-medium"
                  style={{ color: delta >= 0 ? "var(--color-bloom)" : "var(--danger)" }}
                >
                  최근 {recent.length}일 {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-[190px] w-full rounded-lg animate-pulse" style={{ background: "var(--bg-bar)" }} />
        ) : trend.length < 2 ? (
          <p className="py-16 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
            기록이 2건 이상 쌓이면 추이가 그려져요
          </p>
        ) : (
          <TrendLine data={trend} />
        )}
      </section>

      {/* ── 기록 표 ── */}
      <section
        className="flex flex-col w-full rounded-card overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        {/* 표 헤더는 데스크톱에서만. 모바일에선 행 자체가 카드처럼 읽힌다 */}
        <div
          className="hidden lg:flex items-center gap-4 w-full px-[26px] py-[15px]"
          style={{ borderBottom: "1px solid var(--border-card)" }}
        >
          <HeadCell className={COL.date}>날짜</HeadCell>
          <HeadCell className={COL.type}>유형</HeadCell>
          <HeadCell className={COL.time}>사용시간</HeadCell>
          <HeadCell className="flex-1">상위 앱</HeadCell>
          <HeadCell className={`${COL.score} text-right`}>점수</HeadCell>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-[26px] py-4" style={{ borderBottom: "1px solid var(--border-card)" }}>
              <div className="h-5 w-full rounded animate-pulse" style={{ background: "var(--bg-bar)" }} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20">
            <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
              {filter === "all" ? "아직 기록이 없어요" : `${filter === "daily" ? "일간" : "주간"} 기록이 없어요`}
            </p>
            <Pill href="/analysis" variant="accent">
              분석 시작하기
            </Pill>
          </div>
        ) : (
          filtered.map((a, i) => (
            <Link
              key={a.id}
              href={`/analysis/result/${a.id}`}
              className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-4 w-full px-[22px] sm:px-[26px] py-4 transition-colors hover:bg-chalk/[0.02]"
              style={{
                borderBottom: i === filtered.length - 1 ? undefined : "1px solid var(--border-card)",
                // 가장 최근 기록 한 줄만 강조한다
                background: i === 0 && filter === "all" ? "var(--accent-soft)" : undefined,
              }}
            >
              <span className={`num text-[13px] leading-4 shrink-0 ${COL.date}`} style={{ color: "var(--text-primary)", letterSpacing: 0 }}>
                {fmtDate(a.createdAt)}
              </span>

              <span
                className={`text-xs leading-4 shrink-0 ${COL.type}`}
                style={{ color: i === 0 && filter === "all" ? "var(--color-bloom)" : "var(--text-muted)" }}
              >
                {a.periodType === "weekly" ? "주간" : "일간"}
                {a.isPremium && <span className="ml-1.5 num text-[10px]">PRO</span>}
              </span>

              <span className={`num text-[13px] leading-4 shrink-0 ${COL.time}`} style={{ color: "var(--text-primary)", letterSpacing: 0 }}>
                {fmtHM(a.totalMinutes)}
              </span>

              <span className="text-[13px] leading-4 flex-1 min-w-0 truncate" style={{ color: "var(--text-muted)" }}>
                {topApps(a)}
              </span>

              <span
                className={`num text-base leading-5 shrink-0 lg:text-right ${COL.score}`}
                style={{
                  color: i === 0 && filter === "all" ? "var(--color-bloom)" : "var(--text-primary)",
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                {a.detoxScore}
              </span>
            </Link>
          ))
        )}
      </section>
    </AppShell>
  );
}
