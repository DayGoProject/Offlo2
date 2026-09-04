"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import Card from "@/components/ui/Card";
import { fmt, fmtDate } from "@/lib/format";

interface Analysis {
  id: string;
  periodType: "daily" | "weekly";
  totalMinutes: number;
  detoxScore: number;
  createdAt: string;
  isPremium: boolean;
}

type Filter = "all" | "daily" | "weekly";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#3DDB87" : score >= 40 ? "#facc15" : "#f87171";
  return (
    <span className="text-2xl font-extrabold" style={{ color }}>
      {score}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// recharts 지연 로딩 — 정적 import면 기록 페이지 초기 JS가 ~107kB 늘어난다
const ScoreTrendChart = dynamic(() => import("@/components/charts/ScoreTrendChart"), {
  ssr: false,
  loading: () => (<div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }} /></div>),
});

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
        const res = await fetch("/api/analyses?limit=100", {
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

  const avg = filtered.length
    ? Math.round(filtered.reduce((s, a) => s + a.detoxScore, 0) / filtered.length)
    : null;

  /* 트렌드 차트 — 최근 20개 역순 정렬 */
  const trendData = [...filtered]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20)
    .map((a) => ({
      label: fmtDate(a.createdAt),
      score: a.detoxScore,
      type: a.periodType,
    }));

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />

      <div className="lg:ml-56 pt-14 lg:pt-0 flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 sm:px-7 py-4 sm:py-5 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              분석 기록
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              총 {loading ? "—" : `${analyses.length}건`}의 분석
            </p>
          </div>
          <Link
            href="/analysis"
            className="text-sm font-bold py-2 px-5 rounded-full transition-opacity hover:opacity-80"
            style={{ background: "#3DDB87", color: "#0A0A0F" }}
          >
            새 분석
          </Link>
        </div>

        <div className="p-4 sm:p-6 flex-1 space-y-5">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "전체 분석", value: loading ? "—" : `${analyses.length}회` },
              { label: "평균 디톡스 점수", value: avg !== null ? `${avg}점` : "—" },
              { label: "주간 분석", value: loading ? "—" : `${analyses.filter((a) => a.periodType === "weekly").length}회` },
            ].map(({ label, value }) => (
              <Card key={label}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-2xl font-extrabold text-brand">{value}</p>
              </Card>
            ))}
          </div>

          {/* 점수 트렌드 차트 */}
          {!loading && trendData.length >= 2 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  디톡스 점수 변화
                </h3>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>최근 {trendData.length}개</span>
              </div>
              <div style={{ height: 160 }}>
                <ScoreTrendChart data={trendData} />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                점선: 70점 기준선 (좋음)
              </p>
            </Card>
          )}

          {/* 필터 탭 */}
          <div className="flex gap-2">
            {(["all", "daily", "weekly"] as Filter[]).map((f) => {
              const label = f === "all" ? "전체" : f === "daily" ? "일간" : "주간";
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all"
                  style={{
                    background: active ? "#3DDB87" : "var(--bg-subtle)",
                    color: active ? "#0A0A0F" : "var(--text-secondary)",
                    border: active ? "none" : "1px solid var(--border-card)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 목록 */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl h-20 animate-pulse"
                  style={{ background: "var(--bg-bar)" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="text-5xl">📊</span>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {filter === "all" ? "분석 기록이 없어요" : `${filter === "daily" ? "일간" : "주간"} 분석 기록이 없어요`}
              </p>
              <Link
                href="/analysis"
                className="text-sm font-bold py-2 px-5 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "#3DDB87", color: "#0A0A0F" }}
              >
                분석 시작하기
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <Link
                  key={a.id}
                  href={`/analysis/result/${a.id}`}
                  className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-2xl transition-colors hover:opacity-80"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: "rgba(61,219,135,0.1)" }}
                    >
                      {a.periodType === "weekly" ? "📊" : "📱"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {a.periodType === "weekly" ? "주간 분석" : "일간 분석"}
                        {a.isPremium && (
                          <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(61,219,135,0.15)", color: "#3DDB87" }}>
                            PRO
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {fmtDate(a.createdAt)} · {fmt(a.totalMinutes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>디톡스 점수</p>
                      <ScoreBadge score={a.detoxScore} />
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ color: "var(--text-muted)" }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
