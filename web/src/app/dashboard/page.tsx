"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import AppShell from "@/components/app/AppShell";
import PageHeader, { Pill } from "@/components/app/PageHeader";
import Stat, { StatRow } from "@/components/app/Stat";
import PlantImage from "@/components/garden/PlantImage";
import { fmt, fmtHM, fmtDateEyebrow } from "@/lib/format";
import {
  getPlantLevel,
  nextPlantLevel,
  getAnimalStage,
  ANIMAL_STAGES,
  type AnimalTypeId,
} from "@/lib/garden-utils";

/* ── 타입 ─────────────────────────────────────────────────────── */

interface Analysis {
  id: string;
  periodType: "daily" | "weekly";
  totalMinutes: number;
  detoxScore: number;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  targetMinutes: number;
  startDate: string;
  endDate: string;
}

interface WeekBar {
  day: string;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

/* ── 유틸 ─────────────────────────────────────────────────────── */

/** 월요일 시작 7칸. 미래 요일은 흐리게 그린다. */
function buildWeek(analyses: Analysis[]): WeekBar[] {
  const DAY = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date();
  const offsetToMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - offsetToMonday);

  const daily = analyses.filter((a) => a.periodType === "daily");

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const match = daily.find((a) => a.createdAt.slice(0, 10) === key);
    return {
      day: DAY[d.getDay()],
      minutes: match?.totalMinutes ?? 0,
      isToday: i === offsetToMonday,
      isFuture: i > offsetToMonday,
    };
  });
}

/** 목표 기간에서 오늘까지 며칠이 지났는지 (0 ~ 전체 일수) */
function goalProgress(g: Goal): { done: number; total: number } {
  const start = new Date(g.startDate).getTime();
  const end = new Date(g.endDate).getTime();
  const total = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const done = Math.max(0, Math.min(total, Math.round((Date.now() - start) / 86400000) + 1));
  return { done, total };
}

/* ── 조각 ─────────────────────────────────────────────────────── */

function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`rounded-lg animate-pulse ${className}`} style={{ background: "var(--bg-bar)" }} />;
}

/**
 * 주간 막대. recharts를 쓰지 않는다 — Paper 디자인의 막대는 툴팁도 축도 없는
 * 단색 막대 7개라 div로 충분하고, 대시보드 초기 JS에서 ~107kB가 빠진다.
 */
function WeekBars({ data }: { data: WeekBar[] }) {
  const max = Math.max(...data.map((d) => d.minutes), 120);

  return (
    <div className="flex items-end justify-between gap-1 px-1 w-full h-[200px]">
      {data.map((d, i) => {
        const h = d.minutes === 0 ? 70 : Math.max(16, Math.round((d.minutes / max) * 178));
        return (
          <div key={i} className="flex flex-col items-center gap-2.5 flex-1 min-w-0" style={{ opacity: d.isFuture ? 0.5 : 1 }}>
            <div
              className="w-full max-w-[34px] rounded-md shrink-0"
              style={{
                height: h,
                background: d.isToday ? "rgba(61,219,135,0.55)" : "var(--score-track)",
              }}
              title={d.minutes > 0 ? fmt(d.minutes) : "기록 없음"}
            />
            <span
              className="text-[11px] leading-[14px]"
              style={{ color: d.isToday ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 메인 페이지 ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [detoxMin, setDetoxMin] = useState<number | null>(null);
  const [animalData, setAnimalData] = useState<{ type: AnimalTypeId | null; streak: number } | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const h = { Authorization: `Bearer ${token}` };
        const [aRes, gRes, plantSnap, animalSnap] = await Promise.all([
          fetch("/api/analyses?limit=10", { headers: h }),
          fetch("/api/goals?status=active", { headers: h }),
          getDoc(doc(db, "users", user.uid, "garden", "plant")),
          getDoc(doc(db, "users", user.uid, "garden", "animal")),
        ]);

        let list: Analysis[] = [];
        if (aRes.ok) {
          list = (await aRes.json()).analyses ?? [];
          setAnalyses(list);
        }
        if (gRes.ok) setGoals((await gRes.json()).goals ?? []);
        setDetoxMin(plantSnap.exists() ? (plantSnap.data()?.totalDetoxMinutes ?? 0) : 0);
        if (animalSnap.exists()) {
          const d = animalSnap.data();
          setAnimalData({ type: d.type ?? null, streak: d.streak ?? 0 });
        }

        // 목록 API는 recommendations를 싣지 않는다(응답 크기 때문에).
        // AI 한마디 한 줄을 위해 최신 분석 한 건만 상세로 더 읽는다.
        if (list[0]) {
          const dRes = await fetch(`/api/analyses/${list[0].id}`, { headers: h });
          if (dRes.ok) {
            const { analysis } = await dRes.json();
            const recs: unknown = analysis?.recommendations;
            if (Array.isArray(recs) && typeof recs[0] === "string") setTip(recs[0]);
          }
        }
      } catch (e) {
        // 실패해도 스켈레톤이 영원히 남지 않도록 finally에서 반드시 푼다
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || !user) return null;

  /* ── 파생값 ── */
  const daily = analyses.filter((a) => a.periodType === "daily");
  const today = daily[0] ?? null;
  const yesterday = daily[1] ?? null;
  const diff = today && yesterday ? yesterday.totalMinutes - today.totalMinutes : null;

  const streak = animalData?.streak ?? 0;
  const stage = getAnimalStage(streak);
  const nextStage = ANIMAL_STAGES.find((s) => s.minStreak > streak) ?? null;

  const plant = getPlantLevel(detoxMin ?? 0);
  const next = nextPlantLevel(plant);
  const remain = next ? next.minMinutes - (detoxMin ?? 0) : 0;
  const plantRatio = next
    ? ((detoxMin ?? 0) - plant.minMinutes) / (next.minMinutes - plant.minMinutes)
    : 1;

  const week = buildWeek(analyses);
  const recorded = week.filter((d) => d.minutes > 0);
  const avg = recorded.length ? Math.round(recorded.reduce((s, d) => s + d.minutes, 0) / recorded.length) : 0;

  const firstName = (user.displayName ?? user.email?.split("@")[0] ?? "사용자").split(" ")[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow={fmtDateEyebrow()}
        title={
          streak > 0 ? `${streak}일째, 잘 버티고 있어요` : `${firstName}님, 오늘부터 시작해요`
        }
        actions={
          <>
            <Pill href="/history">기록 보기</Pill>
            <Pill href="/analysis" variant="primary">
              오늘 분석하기
            </Pill>
          </>
        }
      />

      {/* ── 지표 4개 ── */}
      <StatRow>
        <Stat
          label="오늘 스크린타임"
          value={loading ? "—" : today ? fmtHM(today.totalMinutes) : "—"}
          note={
            diff === null
              ? today
                ? "어제 기록이 없어요"
                : "오늘 분석을 올려주세요"
              : diff > 0
                ? `어제보다 ${diff}분 ↓`
                : diff < 0
                  ? `어제보다 ${-diff}분 ↑`
                  : "어제와 같아요"
          }
          noteTone={diff !== null && diff > 0 ? "bloom" : "muted"}
        />
        <Stat
          label="디톡스 점수"
          value={loading ? "—" : today ? today.detoxScore : "—"}
          progress={today ? today.detoxScore / 100 : 0}
        />
        <Stat
          label="연속 기록"
          value={loading ? "—" : streak}
          unit="일째"
          note={
            nextStage
              ? `${nextStage.minStreak}일이면 ${nextStage.name}가 돼요`
              : `${stage.name} 단계에 도달했어요`
          }
        />
        <Stat
          label="누적 디톡스"
          value={detoxMin === null ? "—" : detoxMin.toLocaleString()}
          unit="분"
          note={next ? `${plant.name} · 다음까지 ${remain.toLocaleString()}분` : `${plant.name} · 최고 단계`}
        />
      </StatRow>

      {/* ── 주간 + 정원 ── */}
      <div className="flex flex-col lg:flex-row gap-3.5 w-full">
        {/* 주간 스크린타임 · 목표 · AI 한마디 */}
        <section
          className="flex flex-col gap-[22px] flex-1 min-w-0 px-[22px] sm:px-[26px] py-6 rounded-card"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
        >
          <div className="flex items-center justify-between gap-3 w-full">
            <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
              이번 주 스크린타임
            </h2>
            <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
              {loading ? "—" : recorded.length ? `일 평균 ${fmt(avg)}` : "기록 없음"}
            </span>
          </div>

          {loading ? <Skeleton className="h-[200px] w-full" /> : <WeekBars data={week} />}

          {/* 진행 중인 목표 */}
          <div className="flex flex-col gap-4 w-full pt-[22px]" style={{ borderTop: "1px solid var(--border-card)" }}>
            <div className="flex items-center justify-between gap-3 w-full">
              <h3 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
                진행 중인 목표
              </h3>
              <Link
                href="/goals"
                className="text-xs font-medium shrink-0 transition-opacity hover:opacity-70"
                style={{ color: loading || goals.length ? "var(--text-muted)" : "var(--color-bloom)" }}
              >
                {loading ? "—" : goals.length ? `${goals.length}개` : "목표 만들기 →"}
              </Link>
            </div>

            {loading ? (
              <Skeleton className="h-5 w-full" />
            ) : goals.length === 0 ? (
              <p className="text-[13px] leading-5" style={{ color: "var(--text-muted)" }}>
                아직 목표가 없어요. 하루 사용 시간 상한을 하나만 정해도 달라집니다.
              </p>
            ) : (
              goals.slice(0, 3).map((g) => {
                const { done, total } = goalProgress(g);
                return (
                  <div key={g.id} className="flex items-center gap-3 sm:gap-4 w-full">
                    <span
                      className="text-[13px] leading-4 truncate shrink-0 w-[110px] sm:w-[150px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {g.title}
                    </span>
                    <div className="flex-1 h-[5px] rounded-full min-w-0" style={{ background: "var(--score-track)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ background: "var(--color-bloom)", width: `${Math.round((done / total) * 100)}%` }}
                      />
                    </div>
                    <span
                      className="num text-xs leading-4 shrink-0 w-[60px] text-right"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {done} / {total}일
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* AI 한마디 */}
          {tip && (
            <div
              className="flex items-start gap-3 w-full px-4 py-4 rounded-[9px]"
              style={{ background: "var(--accent-soft)", border: "1px solid rgba(61,219,135,0.14)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-1">
                <path
                  d="M7 1.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L7 10l-3.5 1.9.8-3.9L1.4 5.3l3.9-.5L7 1.2z"
                  fill="var(--color-bloom)"
                  opacity="0.85"
                />
              </svg>
              <p className="text-xs leading-[19px]" style={{ color: "var(--text-primary-soft)", letterSpacing: "0.01em" }}>
                {tip}
              </p>
            </div>
          )}
        </section>

        {/* 반려 정원 */}
        <section
          className="relative flex flex-col w-full lg:w-[330px] shrink-0 px-[26px] py-6 rounded-card overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
        >
          <div className="relative z-10 flex items-center justify-between gap-3 w-full">
            <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
              반려 정원
            </h2>
            <Link
              href="/garden"
              className="text-xs font-medium shrink-0 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-bloom)" }}
            >
              Lv.{plant.level} {plant.name}
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center py-6">
            <PlantImage totalMinutes={detoxMin ?? 0} size={250} priority />
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <span className="num text-[22px] leading-7" style={{ color: "var(--text-muted)", letterSpacing: "-0.03em" }}>
              {(detoxMin ?? 0).toLocaleString()}
              {next ? ` / ${next.minMinutes.toLocaleString()}분` : "분"}
            </span>
            <div className="h-[5px] w-full rounded-full shrink-0" style={{ background: "var(--score-track)" }}>
              <div
                className="h-full rounded-full"
                style={{ background: "var(--color-bloom)", width: `${Math.round(Math.max(0, Math.min(1, plantRatio)) * 100)}%` }}
              />
            </div>
            <p className="text-xs leading-4" style={{ color: "var(--text-muted)" }}>
              {next ? `${next.name}까지 ${remain.toLocaleString()}분 남았어요` : "마지막 단계까지 키웠어요"}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
