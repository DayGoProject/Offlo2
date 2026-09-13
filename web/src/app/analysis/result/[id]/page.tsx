"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisContext } from "@/services/ai";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import AnalysisChat from "@/components/analysis/AnalysisChat";
import { fmt, fmtHM, fmtDate } from "@/lib/format";

/* ── 타입 ── */
interface AppUsage {
  appName: string;
  minutes: number;
  category: string;
}
interface TimePattern {
  timeSlot: string;
  apps: string[];
  question: string;
}
interface DailyRoutine {
  morning: string;
  afternoon: string;
  evening: string;
}

interface Analysis {
  id: string;
  totalMinutes: number;
  periodType?: "daily" | "weekly";
  apps: AppUsage[];
  topCategories: { category: string; minutes: number }[];
  recommendations: string[];
  detoxScore: number;
  isPremium: boolean;
  createdAt: string; // ISO 문자열 (Supabase)
  coreProblems?: string[];
  psychologicalCauses?: string[];
  detoxStrategies?: string[];
  dailyRoutine?: DailyRoutine;
  timePatterns?: TimePattern[];
}

/* ── 공통 조각 ─────────────────────────────────────────────── */

function Section({
  title,
  icon,
  children,
  className = "",
  pad = "px-[22px] sm:px-[30px] py-6",
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-[18px] w-full rounded-card ${pad} ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** 01·02·03 번호가 붙은 문단 목록 */
function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items.map((text, i) => (
        <div key={i} className="flex items-start gap-3">
          <span
            className="num text-xs leading-[22px] shrink-0 w-3.5"
            style={{ color: "var(--color-bloom)", fontWeight: 500, letterSpacing: 0 }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-[13px] leading-[22px]" style={{ color: "var(--text-primary-soft)" }}>
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}

const WARN_ICON = (
  <svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M8 1.4 14.6 13H1.4L8 1.4z" fill="none" stroke="var(--color-bloom)" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 6v3" fill="none" stroke="var(--color-bloom)" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.7" fill="var(--color-bloom)" />
  </svg>
);

const WHY_ICON = (
  <svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <circle cx="8" cy="8" r="6.4" fill="none" stroke="var(--color-bloom)" strokeWidth="1.3" />
    <path
      d="M6.2 6.2a1.9 1.9 0 1 1 2.4 2.2c-.4.2-.6.5-.6.9v.3"
      fill="none"
      stroke="var(--color-bloom)"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.6" r="0.7" fill="var(--color-bloom)" />
  </svg>
);

/* ── 메인 결과 페이지 ── */
export default function ResultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/analyses/${id}`, { headers: { Authorization: `Bearer ${token}` } });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error ?? "분석 결과를 찾을 수 없습니다.");
          return;
        }
        setAnalysis((await res.json()).analysis as Analysis);
      } catch {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setFetching(false);
      }
    })();
  }, [user, id]);

  if (loading || !user) return null;

  if (fetching)
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-5 py-32">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(61,219,135,0.2)", borderTopColor: "#3DDB87" }}
          />
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            결과를 불러오는 중…
          </p>
        </div>
      </AppShell>
    );

  if (error || !analysis)
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-5 py-32">
          <p className="text-[15px] text-center" style={{ color: "var(--danger)" }}>
            {error ?? "알 수 없는 오류가 발생했습니다."}
          </p>
          <Pill href="/analysis" variant="accent">
            다시 분석하기
          </Pill>
        </div>
      </AppShell>
    );

  const maxMinutes = Math.max(...analysis.apps.map((a) => a.minutes), 1);
  const periodLabel = analysis.periodType === "weekly" ? "주간 분석" : "일간 분석";
  const score = analysis.detoxScore;
  const scoreLabel = score >= 70 ? "건강한 사용" : score >= 40 ? "주의 필요" : "디톡스 필요";

  // 링 둘레 — r=62 → 2πr ≈ 389.6
  const CIRC = 2 * Math.PI * 62;

  // 채팅 초기 질문: timePatterns[0]의 question 사용
  const initialChatQuestion = analysis.timePatterns?.[0]?.question;

  // 채팅에 전달할 분석 컨텍스트
  const analysisContext: AnalysisContext = {
    periodType: analysis.periodType ?? "daily",
    totalMinutes: analysis.totalMinutes,
    apps: analysis.apps,
    detoxScore: analysis.detoxScore,
    coreProblems: analysis.coreProblems ?? [],
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${periodLabel} · ${fmtDate(analysis.createdAt)}`}
        title="분석 결과"
        actions={
          <>
            <Pill href="/history">기록 보기</Pill>
            <Pill href="/analysis" variant="primary">
              새 분석하기
            </Pill>
          </>
        }
      />

      {/* ── ① 요약 — 점수 · 총시간 · 카테고리 ── */}
      <section
        className="flex flex-col sm:flex-row sm:items-center gap-7 sm:gap-[34px] w-full px-[22px] sm:px-[30px] py-[26px] rounded-card"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        <div className="relative flex items-center justify-center w-[142px] h-[142px] shrink-0 self-center sm:self-auto">
          <svg width="142" height="142" viewBox="0 0 142 142" xmlns="http://www.w3.org/2000/svg">
            <circle cx="71" cy="71" r="62" fill="none" stroke="var(--score-track)" strokeWidth="10" />
            <circle
              cx="71"
              cy="71"
              r="62"
              transform="rotate(-90 71 71)"
              fill="none"
              stroke="var(--color-bloom)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(Math.min(score, 100) / 100) * CIRC} ${CIRC}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="num text-[44px] leading-[44px]" style={{ color: "var(--text-primary)", letterSpacing: "-0.04em" }}>
              {score}
            </span>
            <span
              className="text-[11px] leading-[14px] font-medium"
              style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
            >
              디톡스 점수
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="num text-[46px] sm:text-[56px] leading-[1.02]" style={{ color: "var(--text-primary)", letterSpacing: "-0.05em" }}>
              {fmtHM(analysis.totalMinutes)}
            </span>
            <span className="text-sm leading-[18px] font-medium" style={{ color: "var(--color-bloom)" }}>
              {scoreLabel}
            </span>
          </div>

          <p className="text-sm leading-[18px] tracking-[-0.01em]" style={{ color: "var(--text-muted)" }}>
            {analysis.periodType === "weekly" ? "이번 주" : "오늘 하루"} 총 스크린타임입니다. 아래 항목은 이 기록을 바탕으로 AI가 정리한 내용이에요.
          </p>

          {analysis.topCategories.length > 0 && (
            <div className="flex flex-wrap gap-[7px]">
              {analysis.topCategories.map((cat) => (
                <span
                  key={cat.category}
                  className="flex items-center h-[26px] px-3 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(61,219,135,0.08)",
                    border: "1px solid rgba(61,219,135,0.2)",
                    color: "var(--color-bloom)",
                  }}
                >
                  {cat.category} {fmt(cat.minutes)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ④ 앱별 사용 시간 ── */}
      <Section title="앱별 사용 시간">
        <div className="flex flex-col gap-3.5 w-full">
          {analysis.apps.map((app, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 w-full">
              <span
                className="text-[13px] leading-4 shrink-0 w-[86px] sm:w-[110px] truncate"
                style={{ color: "var(--text-primary)" }}
                title={`${app.appName} · ${app.category}`}
              >
                {app.appName}
              </span>
              <div className="flex-1 h-1.5 rounded-full min-w-0" style={{ background: "var(--score-track)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(app.minutes / maxMinutes) * 100}%`,
                    // 위에서 아래로 갈수록 옅어진다 — 순위가 색으로도 읽힌다
                    background: `rgba(61,219,135,${Math.max(0.28, 1 - i * 0.18).toFixed(2)})`,
                  }}
                />
              </div>
              <span
                className="hidden sm:block text-xs leading-4 shrink-0 w-[72px] truncate"
                style={{ color: "var(--text-faint)" }}
              >
                {app.category}
              </span>
              <span
                className="num text-xs leading-4 shrink-0 w-14 text-right"
                style={{ color: "var(--text-muted)", fontWeight: 500, letterSpacing: 0 }}
              >
                {fmtHM(app.minutes)}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ⑤ 시간대별 사용 패턴 / 프리미엄 안내 ── */}
      {analysis.timePatterns && analysis.timePatterns.length > 0 ? (
        <Section title="시간대별 사용 패턴">
          <div className="flex flex-col gap-3 w-full">
            {analysis.timePatterns.map((p, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 w-full px-[18px] py-4 rounded-[9px]"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
              >
                <span
                  className="num text-[11px] leading-[14px] shrink-0 sm:w-[90px]"
                  style={{ color: "var(--color-bloom)", fontWeight: 500, letterSpacing: "0.08em" }}
                >
                  {p.timeSlot}
                </span>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {p.apps?.length > 0 && (
                    <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-primary)" }}>
                      {p.apps.join(" · ")}
                    </p>
                  )}
                  {p.question && (
                    <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-muted)" }}>
                      {p.question}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        !analysis.isPremium && (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 w-full px-[22px] sm:px-[26px] py-[18px] rounded-card"
            style={{ background: "rgba(61,219,135,0.05)", border: "1px solid rgba(61,219,135,0.18)" }}
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
                시간대별 사용 패턴 차트를 보려면
              </p>
              <p className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
                프리미엄에서 상세 차트와 주간 리포트를 제공합니다
              </p>
            </div>
            <Pill variant="accent" className="shrink-0 self-start sm:self-auto">
              프리미엄 보기
            </Pill>
          </div>
        )
      )}

      {/* ── ⑥ 핵심 문제 · ⑦ 원인 ── */}
      {((analysis.coreProblems?.length ?? 0) > 0 || (analysis.psychologicalCauses?.length ?? 0) > 0) && (
        <div className="flex flex-col lg:flex-row gap-3.5 w-full">
          {analysis.coreProblems && analysis.coreProblems.length > 0 && (
            <Section title="내 사용 패턴의 핵심 문제" icon={WARN_ICON} className="flex-1 min-w-0" pad="px-[22px] sm:px-7 py-6">
              <NumberedList items={analysis.coreProblems} />
            </Section>
          )}
          {analysis.psychologicalCauses && analysis.psychologicalCauses.length > 0 && (
            <Section title="왜 이런 패턴이 생겼을까요?" icon={WHY_ICON} className="flex-1 min-w-0" pad="px-[22px] sm:px-7 py-6">
              <NumberedList items={analysis.psychologicalCauses} />
            </Section>
          )}
        </div>
      )}

      {/* ── ⑧ 디톡스 전략 ── */}
      {analysis.detoxStrategies && analysis.detoxStrategies.length > 0 && (
        <Section title="가장 효과적인 디톡스 전략">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 w-full">
            {analysis.detoxStrategies.map((s, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 px-[18px] py-4 rounded-[9px]"
                style={{ background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.14)" }}
              >
                <span
                  className="num text-[11px] leading-[14px]"
                  style={{ color: "var(--color-bloom)", fontWeight: 500, letterSpacing: "0.08em" }}
                >
                  STRATEGY {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-primary-soft)" }}>
                  {s}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── ⑨ 하루 실천 루틴 ── */}
      {analysis.dailyRoutine && (
        <Section title="하루 실천 루틴">
          <div className="flex flex-col md:flex-row gap-5 md:gap-0 w-full">
            {[
              { label: "아침", content: analysis.dailyRoutine.morning },
              { label: "낮", content: analysis.dailyRoutine.afternoon },
              { label: "밤", content: analysis.dailyRoutine.evening },
            ].map(({ label, content }, i, arr) => (
              <div
                key={label}
                className="flex flex-col gap-2.5 flex-1 min-w-0 md:pr-5 md:not-first:pl-5"
                style={{ borderRight: i < arr.length - 1 ? "1px solid var(--border-card)" : undefined }}
              >
                <span
                  className="text-xs leading-4 font-semibold"
                  style={{ color: "var(--color-bloom)", letterSpacing: "0.06em" }}
                >
                  {label}
                </span>
                <p className="text-[13px] leading-[21px]" style={{ color: "var(--text-primary-soft)" }}>
                  {content}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── ⑩ 맞춤 디톡스 추천 ── */}
      {analysis.recommendations.length > 0 && (
        <Section title="맞춤 디톡스 추천">
          <div className="flex flex-col gap-3 w-full">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3">
                <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-1">
                  <path
                    d="M2.4 7.2 5.6 10.4 11.6 4"
                    fill="none"
                    stroke="var(--color-bloom)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-[13px] leading-[22px]" style={{ color: "var(--text-primary-soft)" }}>
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── ⑪ AI 코치 채팅 ── */}
      <AnalysisChat analysisId={id} analysisContext={analysisContext} initialQuestion={initialChatQuestion} />

      {/* ── 하단 액션 ── */}
      <div className="flex flex-wrap gap-2.5 w-full">
        <Pill href="/analysis" variant="accent">
          새로운 분석하기
        </Pill>
        <Pill href="/dashboard">대시보드 보기</Pill>
      </div>
    </AppShell>
  );
}
