"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import Navbar from "@/components/Navbar";

/* ── 타입 ────────────────────────────────────────────────── */

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
  status: string;
}

/* ── 유틸 ────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-brand";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
}

/* ── 페이지 ──────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [detoxMinutes, setDetoxMinutes] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      setDataLoading(true);
      const token = await user!.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [analysesRes, goalsRes, plantSnap] = await Promise.all([
        fetch("/api/analyses?limit=5", { headers }),
        fetch("/api/goals?status=active", { headers }),
        getDoc(doc(db, "users", user!.uid, "garden", "plant")),
      ]);

      if (analysesRes.ok) {
        const data = await analysesRes.json();
        setAnalyses(data.analyses ?? []);
      }
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals ?? []);
      }
      if (plantSnap.exists()) {
        setDetoxMinutes(plantSnap.data()?.totalDetoxMinutes ?? 0);
      } else {
        setDetoxMinutes(0);
      }

      setDataLoading(false);
    }

    fetchAll();
  }, [user]);

  if (authLoading || (!user && !authLoading)) return null;

  const latestAnalysis = analyses[0] ?? null;
  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "사용자";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">

        {/* ── 헤더 ── */}
        <div className="mb-10">
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{getTodayKST()}</p>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            안녕하세요, <span className="text-brand">{displayName}</span>님
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--text-secondary)" }}>
            오늘도 건강한 디지털 습관을 만들어 봐요.
          </p>
        </div>

        {/* ── 통계 카드 ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard
            label="누적 디톡스"
            value={detoxMinutes === null ? "—" : formatMinutes(detoxMinutes)}
            sub="확장 프로그램 기록"
            loading={dataLoading}
          />
          <StatCard
            label="최근 분석 점수"
            value={latestAnalysis ? `${latestAnalysis.detoxScore}점` : "—"}
            valueClass={latestAnalysis ? scoreColor(latestAnalysis.detoxScore) : undefined}
            sub={latestAnalysis ? formatDate(latestAnalysis.createdAt) : "분석 기록 없음"}
            loading={dataLoading}
          />
          <StatCard
            label="활성 목표"
            value={dataLoading ? "—" : `${goals.length}개`}
            sub="진행 중인 목표"
            loading={dataLoading}
          />
        </div>

        {/* ── 최근 분석 ── */}
        <Section
          title="최근 분석"
          action={analyses.length > 0 ? { label: "분석 시작", href: "/analysis" } : undefined}
        >
          {dataLoading ? (
            <SkeletonList count={3} />
          ) : analyses.length === 0 ? (
            <EmptyState
              icon="📊"
              message="아직 분석 기록이 없어요"
              action={{ label: "AI 분석 시작하기", href: "/analysis" }}
            />
          ) : (
            <div className="space-y-3">
              {analyses.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/analysis/result/${a.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{a.periodType === "weekly" ? "📅" : "📱"}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {a.periodType === "weekly" ? "주간 분석" : "일간 분석"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {formatDate(a.createdAt)} · 총 {formatMinutes(a.totalMinutes)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-extrabold ${scoreColor(a.detoxScore)}`}>
                      {a.detoxScore}
                    </span>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>점</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* ── 활성 목표 ── */}
        <Section
          title="활성 목표"
          action={{ label: "목표 관리", href: "/goals" }}
        >
          {dataLoading ? (
            <SkeletonList count={2} />
          ) : goals.length === 0 ? (
            <EmptyState
              icon="🎯"
              message="진행 중인 목표가 없어요"
              action={{ label: "목표 만들기", href: "/goals" }}
            />
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{g.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        목표: {formatMinutes(g.targetMinutes)}/일 · ~{formatDate(g.endDate)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(61,219,135,0.1)", color: "#3DDB87" }}
                  >
                    진행 중
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── CTA ── */}
        <div
          className="mt-4 rounded-2xl px-6 py-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(61,219,135,0.1) 0%, rgba(61,219,135,0.04) 100%)",
            border: "1px solid rgba(61,219,135,0.2)",
          }}
        >
          <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            스크린타임을 분석해 디지털 습관을 개선해보세요
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            스크린샷 하나로 AI가 상세히 분석해드려요
          </p>
          <Link
            href="/analysis"
            className="inline-block bg-brand text-[#0A0A0F] font-bold text-sm px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            AI 분석 시작하기
          </Link>
        </div>

      </main>
    </div>
  );
}

/* ── 하위 컴포넌트 ────────────────────────────────────────── */

function StatCard({
  label, value, sub, loading, valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  loading: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: "var(--bg-bar)" }} />
      ) : (
        <p className={`text-2xl font-extrabold tracking-tight ${valueClass ?? "text-brand"}`}>
          {value}
        </p>
      )}
      <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{sub}</p>
    </div>
  );
}

function Section({
  title, action, children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity">
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon, message, action,
}: {
  icon: string;
  message: string;
  action: { label: string; href: string };
}) {
  return (
    <div
      className="rounded-2xl px-4 py-10 text-center"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <p className="text-3xl mb-3">{icon}</p>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{message}</p>
      <Link
        href={action.href}
        className="inline-block text-sm font-semibold text-brand border border-brand/30 px-4 py-2 rounded-full hover:bg-brand/10 transition-colors"
      >
        {action.label}
      </Link>
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl animate-pulse"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
        />
      ))}
    </div>
  );
}
